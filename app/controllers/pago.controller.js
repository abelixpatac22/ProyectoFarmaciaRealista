// Importamos stripe y le pasamos tu clave secreta de entorno
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require("../models");
const TransaccionPago = db.transacciones_pago;
const Factura = db.facturas;
const { devolverALotes } = require("../services/inventario.js");

// Marca como pagadas la transacción y su factura
async function marcarPagada(transaccion) {
  await transaccion.update({ estado_pago: 'Pagado' });
  await Factura.update({ estado_factura: 'Pagada' }, { where: { id_factura: transaccion.id_factura } });
}

// Cancela una factura Pendiente y devuelve a sus lotes el stock que había apartado.
// Si ya estaba Pagada o Cancelada no hace nada, así el stock nunca se devuelve dos veces.
async function cancelarFactura(id_factura) {
  await db.sequelize.transaction(async (t) => {
    // lock: si llegan dos cancelaciones al mismo tiempo, la segunda espera a que termine la primera
    const factura = await Factura.findByPk(id_factura, { transaction: t, lock: t.LOCK.UPDATE });
    if (!factura || factura.estado_factura !== 'Pendiente') return;

    // Cada unidad regresa al mismo lote del que salió
    await devolverALotes(id_factura, t);

    await factura.update({ estado_factura: 'Cancelada' }, { transaction: t });
    await TransaccionPago.update(
      { estado_pago: 'Cancelado' },
      { where: { id_factura, estado_pago: 'Pendiente' }, transaction: t }
    );
  });
}

exports.createCheckout = async (req, res) => {
  const { id_factura, email_cliente } = req.body;

  // El monto se toma de la factura guardada, no del body: así nadie puede pagar menos de lo facturado
  const factura = await db.facturas.findByPk(id_factura).catch(() => null);
  if (!factura) {
    return res.status(404).send({ message: `No se encontró la factura con id=${id_factura}.` });
  }
  if (factura.estado_factura !== 'Pendiente') {
    return res.status(400).send({ message: `La factura #${id_factura} ya está ${factura.estado_factura} y no se puede cobrar.` });
  }
  const total = Number(factura.total);
  if (!(total > 0)) {
    return res.status(400).send({ message: "La factura no tiene un total válido para cobrar." });
  }

  try {
    // FRONTEND_URL puede traer varias URLs separadas por coma: Stripe regresa a la página desde donde se compró
    const frontendUrls = (process.env.FRONTEND_URL || "").split(",").map(url => url.trim()).filter(Boolean);
    const frontendUrl = frontendUrls.includes(req.headers.origin) ? req.headers.origin : frontendUrls[0];

    // 1. Generar la sesión de cobro segura en Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email_cliente,
      line_items: [{
        price_data: {
          currency: 'gtq', // Quetzales
          product_data: {
            name: `Pago de Factura #${id_factura}`,
            description: 'Compra en Farmacia',
          },
          unit_amount: Math.round(total * 100), // Stripe maneja todo en centavos
        },
        quantity: 1,
      }],
      mode: 'payment',
      // Si en 30 minutos (el mínimo de Stripe) no paga, la sesión vence y ya no se puede usar
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      // Tras pagar (o cancelar) Stripe regresa al usuario a la tienda, que ya tiene esas dos páginas.
      // Sin FRONTEND_URL usa las páginas de texto de este backend.
      success_url: frontendUrl
        ? `${frontendUrl}/pago/exitoso?factura=${id_factura}`
        : `${process.env.BACKEND_URL || 'http://localhost:8080'}/api/pagos/success`,
      cancel_url: frontendUrl
        ? `${frontendUrl}/pago/cancelado?factura=${id_factura}`
        : `${process.env.BACKEND_URL || 'http://localhost:8080'}/api/pagos/cancel`,
    });

    // 2. Guardar el registro en la tabla transacciones_pago (NOMBRES DE COLUMNAS CORREGIDOS)
    await TransaccionPago.create({
      id_factura: id_factura,
      id_transaccion_externa: session.id, // <-- Corregido para PostgreSQL
      monto: total,
      pasarela: 'Stripe',                 // <-- Corregido para PostgreSQL
      estado_pago: 'Pendiente'
    });

    // 3. Devolver la URL de la pasarela al frontend, y el id de la sesión para confirmar o cancelar al volver
    res.status(200).json({ url: session.url, id_sesion: session.id });

  } catch (error) {
    // Sin sesión de Stripe el cliente no puede pagar: se libera el stock que la factura había apartado
    await cancelarFactura(id_factura).catch(() => {});
    res.status(500).send({ message: "Error con Stripe: " + error.message });
  }
};

// La tienda llama aquí al volver a /pago/exitoso. No se confía en que el navegador diga "ya pagué":
// se le pregunta a Stripe por la sesión y solo si Stripe dice 'paid' la factura queda Pagada.
exports.confirmar = async (req, res) => {
  try {
    const transaccion = await TransaccionPago.findOne({ where: { id_transaccion_externa: req.body.id_sesion || '' } });
    if (!transaccion) {
      return res.status(404).send({ message: "No se encontró ese pago." });
    }

    const session = await stripe.checkout.sessions.retrieve(transaccion.id_transaccion_externa);
    if (session.payment_status === 'paid') {
      await marcarPagada(transaccion);
    }

    const factura = await Factura.findByPk(transaccion.id_factura);
    res.send({ id_factura: factura.id_factura, estado_factura: factura.estado_factura });
  } catch (error) {
    res.status(500).send({ message: "No se pudo confirmar el pago: " + error.message });
  }
};

// La tienda llama aquí al volver a /pago/cancelado: la factura queda Cancelada y el stock regresa.
exports.cancelar = async (req, res) => {
  try {
    const transaccion = await TransaccionPago.findOne({ where: { id_transaccion_externa: req.body.id_sesion || '' } });
    if (!transaccion) {
      return res.status(404).send({ message: "No se encontró ese pago." });
    }

    const session = await stripe.checkout.sessions.retrieve(transaccion.id_transaccion_externa);
    if (session.payment_status === 'paid') {
      // Ya estaba pagado (por ejemplo, pagó y luego abrió la página de cancelar): no se cancela nada
      await marcarPagada(transaccion);
    } else {
      // Se cierra la sesión en Stripe para que ese enlace de pago ya no sirva, y luego se cancela la factura
      if (session.status === 'open') {
        await stripe.checkout.sessions.expire(session.id);
      }
      await cancelarFactura(transaccion.id_factura);
    }

    const factura = await Factura.findByPk(transaccion.id_factura);
    res.send({ id_factura: factura.id_factura, estado_factura: factura.estado_factura });
  } catch (error) {
    res.status(500).send({ message: "No se pudo cancelar el pago: " + error.message });
  }
};

// Minutos que tiene el cliente para pagar. Stripe no deja sesiones de menos de 30 minutos, así que pasado
// este tiempo es el backend quien cierra la sesión de Stripe y devuelve el stock apartado.
const MINUTOS_PARA_PAGAR = 3;

// Revisión automática (server.js la corre cada minuto): si el cliente cerró la ventana de Stripe sin
// pagar ni cancelar, la tienda nunca avisa. Aquí se buscan las compras web que llevan más de
// MINUTOS_PARA_PAGAR Pendientes y se le pregunta a Stripe qué pasó con cada una.
exports.liberarPendientesVencidas = async () => {
  const { Op } = db.Sequelize;
  const limite = new Date(Date.now() - MINUTOS_PARA_PAGAR * 60 * 1000);

  const facturas = await Factura.findAll({
    where: { estado_factura: 'Pendiente', id_empleado: null, fecha: { [Op.lt]: limite } }
  });

  for (const factura of facturas) {
    try {
      const transaccion = await TransaccionPago.findOne({
        where: { id_factura: factura.id_factura },
        order: [['id_transaccion', 'DESC']]
      });

      // Sin transacción nunca se llegó a abrir Stripe: no hay nada que esperar
      if (!transaccion) {
        await cancelarFactura(factura.id_factura);
        console.log(`Factura ${factura.id_factura} sin pago iniciado: cancelada y stock devuelto.`);
        continue;
      }

      const session = await stripe.checkout.sessions.retrieve(transaccion.id_transaccion_externa);
      if (session.payment_status === 'paid') {
        await marcarPagada(transaccion);
        console.log(`Factura ${factura.id_factura} estaba pagada: marcada como Pagada.`);
      } else {
        // Se acabó el tiempo sin pago: si la sesión sigue abierta se cierra para que ya no se pueda pagar
        if (session.status === 'open') {
          await stripe.checkout.sessions.expire(session.id);
        }
        await cancelarFactura(factura.id_factura);
        console.log(`Factura ${factura.id_factura} sin pago tras ${MINUTOS_PARA_PAGAR} minutos: cancelada y stock devuelto.`);
      }
    } catch (error) {
      // Si justo pagó mientras se cerraba la sesión, Stripe rechaza el cierre y en la siguiente vuelta queda Pagada
      console.error(`Error revisando la factura ${factura.id_factura}:`, error.message);
    }
  }
};

// Métodos de respuesta simples para las redirecciones
exports.success = (req, res) => res.send("¡Pago completado con éxito!");
exports.cancel = (req, res) => res.send("El pago fue cancelado.");

exports.webhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // 1. Verificamos la firma criptográfica (Stripe usa la variable de entorno aquí)
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Error de seguridad del Webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 2. Nos interesan dos eventos: pago completado y sesión vencida (el cliente cerró la página sin pagar)
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.expired') {
    const session = event.data.object;

    try {
      // 3. Buscamos esa transacción específica en tu base de datos (COLUMNA CORREGIDA)
      const transaccion = await TransaccionPago.findOne({
        where: { id_transaccion_externa: session.id } // <-- Corregido para PostgreSQL
      });

      if (transaccion && event.type === 'checkout.session.completed') {
        // 4. Cambiamos el estado de 'Pendiente' a 'Pagado', también en la factura
        await marcarPagada(transaccion);
        console.log(`Transacción ${session.id} actualizada a Pagado automáticamente.`);
      } else if (transaccion) {
        // 4. La sesión venció sin pago: se cancela la factura y se devuelve el stock
        await cancelarFactura(transaccion.id_factura);
        console.log(`Sesión ${session.id} vencida: factura ${transaccion.id_factura} cancelada.`);
      }
    } catch (error) {
      console.error("Error actualizando la base de datos:", error);
    }
  }

  // 5. Siempre debemos responderle a Stripe con un 200 OK para que sepa que lo recibimos
  res.json({ recibido: true });
};
