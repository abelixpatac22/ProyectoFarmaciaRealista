const db = require("../models");
const Lote = db.lotes;
const Producto = db.productos;
const { hoy, recalcularStock } = require("../services/inventario.js");

// Revisa que el texto sea una fecha real con formato 2027-06-30
const esFechaValida = (texto) => /^\d{4}-\d{2}-\d{2}$/.test(texto || "") && !isNaN(new Date(texto).getTime());

// 1. Listar lotes (con el nombre del producto), del que vence primero al último
//    ?estado=Activo o ?estado=Retirado para filtrar; ?id_producto=3 para ver los de un producto
exports.findAll = (req, res) => {
  const where = {};
  if (req.query.estado) where.estado = req.query.estado;
  if (req.query.id_producto) where.id_producto = req.query.id_producto;

  Lote.findAll({
    where,
    include: [{ model: Producto, attributes: ["nombre", "codigo_barras"] }],
    order: [["fecha_vencimiento", "ASC"], ["id_lote", "ASC"]]
  })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Error al recuperar los lotes." }));
};

// 2. Registrar la entrada de un lote: llega mercadería y el stock del producto sube
exports.create = async (req, res) => {
  const { id_producto, numero_lote, fecha_vencimiento } = req.body;
  const cantidad = Number(req.body.cantidad);

  if (!id_producto || !numero_lote || !String(numero_lote).trim()) {
    return res.status(400).send({ message: "Faltan el producto o el número de lote." });
  }
  if (!Number.isInteger(cantidad) || cantidad <= 0) {
    return res.status(400).send({ message: "La cantidad debe ser un número entero mayor que cero." });
  }
  if (!esFechaValida(fecha_vencimiento)) {
    return res.status(400).send({ message: "La fecha de vencimiento no es válida." });
  }
  if (fecha_vencimiento <= hoy()) {
    return res.status(400).send({ message: "No se puede registrar un lote que ya está vencido." });
  }

  try {
    const lote = await db.sequelize.transaction(async (t) => {
      const producto = await Producto.findByPk(id_producto, { transaction: t, lock: t.LOCK.UPDATE });
      if (!producto) throw new Error(`No existe el producto con id=${id_producto}.`);

      const nuevo = await Lote.create({
        id_producto,
        numero_lote: String(numero_lote).trim(),
        fecha_vencimiento,
        cantidad_inicial: cantidad,
        cantidad_actual: cantidad
      }, { transaction: t });

      await recalcularStock(id_producto, t);
      return nuevo;
    });
    res.status(201).send(lote);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
};

// 3. Corregir un error de escritura en el número de lote o la fecha. Las cantidades no se editan:
//    solo cambian con ventas, cancelaciones y retiros, así siempre se sabe de dónde salió cada número.
exports.update = async (req, res) => {
  const id = req.params.id;
  const cambios = {};
  if (req.body.numero_lote !== undefined) {
    if (!String(req.body.numero_lote).trim()) return res.status(400).send({ message: "El número de lote no puede quedar vacío." });
    cambios.numero_lote = String(req.body.numero_lote).trim();
  }
  if (req.body.fecha_vencimiento !== undefined) {
    if (!esFechaValida(req.body.fecha_vencimiento)) return res.status(400).send({ message: "La fecha de vencimiento no es válida." });
    cambios.fecha_vencimiento = req.body.fecha_vencimiento;
  }

  try {
    const [num] = await Lote.update(cambios, { where: { id_lote: id } });
    if (num === 1) res.send({ message: "Lote actualizado exitosamente." });
    else res.status(404).send({ message: `No se encontró el lote con id=${id}.` });
  } catch (error) {
    res.status(500).send({ message: "Error al actualizar el lote." });
  }
};

// 4. Retirar un lote (merma): vencido, dañado o retirado por el fabricante. Lo que quedaba sale del stock.
exports.retirar = async (req, res) => {
  const id = req.params.id;
  const motivo = String(req.body.motivo || "").trim() || "Vencido";

  try {
    const lote = await db.sequelize.transaction(async (t) => {
      const lote = await Lote.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
      if (!lote) throw new Error(`No se encontró el lote con id=${id}.`);
      if (lote.estado === "Retirado") throw new Error(`El lote ${lote.numero_lote} ya estaba retirado.`);

      await lote.update({
        estado: "Retirado",
        cantidad_retirada: lote.cantidad_actual,
        cantidad_actual: 0,
        motivo_retiro: motivo,
        fecha_retiro: new Date()
      }, { transaction: t });

      await recalcularStock(lote.id_producto, t);
      return lote;
    });
    res.send({ message: `Lote ${lote.numero_lote} retirado: ${lote.cantidad_retirada} unidades dadas de baja.`, lote });
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
};
