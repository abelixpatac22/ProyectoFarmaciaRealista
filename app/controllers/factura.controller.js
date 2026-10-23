const db = require("../models");
const Factura = db.facturas;
const DetalleFactura = db.detalle_facturas;
const Producto = db.productos;
const sequelize = db.sequelize; // Importante: Necesitamos esto para usar Transacciones

// En Guatemala el precio al público ya incluye IVA: el total se desglosa en subtotal + impuesto
const IVA = 0.12;
// Redondea a 2 decimales evitando errores como 0.1 + 0.2 = 0.30000000000000004
const redondear = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// 1. Crear una Factura (con Detalles y descuento de Stock)
//    La usan la tienda (sin sesión) y los empleados. Los precios y totales se calculan aquí con los
//    precios de la base de datos: se ignoran los que mande el navegador, que cualquiera podría cambiar.
exports.create = async (req, res) => {
  // Verificamos que vengan los datos principales y la lista de productos (detalles)
  if (!req.body.id_cliente || !Array.isArray(req.body.detalles) || req.body.detalles.length === 0) {
    return res.status(400).send({ message: "Faltan datos del cliente o no hay productos en la factura." });
  }

  // Iniciamos la transacción
  const t = await sequelize.transaction();

  try {
    // A. Guardamos el Encabezado de la Factura (los totales se completan al final, con los precios reales)
    const factura = await Factura.create({
      numero_factura: req.body.numero_factura,
      id_cliente: req.body.id_cliente,
      // El empleado autenticado que registra la venta; en una compra web no hay empleado
      id_empleado: req.empleado ? req.empleado.id_empleado : null,
      subtotal: 0,
      impuesto: 0,
      total: 0,
      metodo_pago: req.body.metodo_pago,
      estado_factura: req.body.estado_factura || "Completada"
    }, { transaction: t });

    // B. Recorremos la lista de productos vendidos (detalles)
    const detalles = req.body.detalles;
    let totalGeneral = 0;

    for (let i = 0; i < detalles.length; i++) {
      const item = detalles[i];
      const cantidad = Number(item.cantidad);

      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw new Error(`Cantidad inválida para el producto con ID ${item.id_producto}.`);
      }

      // 1. Buscar el producto en la base de datos
      const producto = await Producto.findByPk(item.id_producto, { transaction: t });

      // 2. Validar que exista, que se pueda vender y que haya suficiente stock
      if (!producto || producto.estado === false) {
        throw new Error(`El producto con ID ${item.id_producto} no existe o ya no está a la venta.`);
      }
      const precio = Number(producto.precio_venta);
      if (producto.precio_venta === null || !Number.isFinite(precio)) {
        throw new Error(`El producto '${producto.nombre}' no tiene precio de venta.`);
      }
      if (producto.stock_actual < cantidad) {
        throw new Error(`Stock insuficiente para '${producto.nombre}'. Solicitado: ${cantidad}, Disponible: ${producto.stock_actual}`);
      }

      // 3. Descontar el stock actual
      await producto.update({
        stock_actual: producto.stock_actual - cantidad
      }, { transaction: t });

      // 4. Guardar el detalle de la factura con el precio de la base de datos
      const subtotalLinea = redondear(precio * cantidad);
      totalGeneral += subtotalLinea;
      await DetalleFactura.create({
        id_factura: factura.id_factura,
        id_producto: item.id_producto,
        cantidad,
        precio_unitario: precio,
        subtotal_linea: subtotalLinea
      }, { transaction: t });
    }

    // C. Totales de la factura: total 112 -> subtotal 100 + IVA 12
    const total = redondear(totalGeneral);
    const subtotal = redondear(total / (1 + IVA));
    await factura.update({ subtotal, impuesto: redondear(total - subtotal), total }, { transaction: t });

    // D. Si todo salió perfecto, confirmamos (commit) la transacción
    await t.commit();

    // Respondemos con éxito
    res.status(201).send({
        message: "Factura procesada con éxito y stock actualizado.",
        id_factura: factura.id_factura,
        total
    });

  } catch (error) {
    // E. Si hubo CUALQUIER error, deshacemos todos los cambios (rollback)
    await t.rollback();
    res.status(500).send({
        message: "Error al procesar la factura. La transacción fue cancelada.",
        detalle: error.message
    });
  }
};

// 2. Obtener todas las Facturas (Incluyendo sus detalles)
exports.findAll = (req, res) => {
  Factura.findAll({
    include: [
      {
        model: db.clientes,
        attributes: ['nombre', 'apellido', 'nit'] // Trae datos del cliente
      }
    ]
  })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message }));
};

// 3. Obtener una Factura específica con todo su desglose
exports.findOne = (req, res) => {
  const id = req.params.id;

  Factura.findByPk(id, {
    include: [
      { model: db.clientes, attributes: ['nombre', 'apellido', 'nit'] },
      { model: db.empleados, attributes: ['nombre', 'puesto'] },
      { 
        model: db.detalle_facturas, 
        include: [{ model: db.productos, attributes: ['nombre'] }] // Trae el nombre del producto vendido
      }
    ]
  })
    .then(data => {
      if (data) res.send(data);
      else res.status(404).send({ message: `No se encontró la Factura con id=${id}.` });
    })
    .catch(err => res.status(500).send({ message: "Error al recuperar la Factura." }));
};
