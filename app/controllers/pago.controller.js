// Importamos stripe y le pasamos tu clave secreta de entorno
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require("../models");
const TransaccionPago = db.transacciones_pago;

exports.createCheckout = async (req, res) => {
  try {
    const { id_factura, email_cliente } = req.body;

    // El monto se toma de la factura guardada, no del body: así nadie puede pagar menos de lo facturado
    const factura = await db.facturas.findByPk(id_factura);
    if (!factura) {
      return res.status(404).send({ message: `No se encontró la factura con id=${id_factura}.` });
    }
    const total = Number(factura.total);
    if (!(total > 0)) {
      return res.status(400).send({ message: "La factura no tiene un total válido para cobrar." });
    }

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

    // 3. Devolver la URL de la pasarela al frontend
    res.status(200).json({ url: session.url });

  } catch (error) {
    res.status(500).send({ message: "Error con Stripe: " + error.message });
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

  // 2. Si la verificación es exitosa y el evento es un pago completado
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      // 3. Buscamos esa transacción específica en tu base de datos (COLUMNA CORREGIDA)
      const transaccion = await TransaccionPago.findOne({ 
        where: { id_transaccion_externa: session.id } // <-- Corregido para PostgreSQL
      });

      if (transaccion) {
        // 4. ¡Magia! Cambiamos el estado de 'Pendiente' a 'Pagado'
        transaccion.estado_pago = 'Pagado';
        await transaccion.save();
        console.log(`Transacción ${session.id} actualizada a Pagado automáticamente.`);
      }
    } catch (error) {
      console.error("Error actualizando la base de datos:", error);
    }
  }

  // 5. Siempre debemos responderle a Stripe con un 200 OK para que sepa que lo recibimos
  res.json({ recibido: true });
};