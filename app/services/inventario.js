// Reglas del inventario por lotes, en un solo lugar para que ventas, cancelaciones y retiros las compartan.
//  - El stock_actual del producto = suma de cantidad_actual de sus lotes Activos (incluye vencidos sin retirar).
//  - Solo se vende de lotes que no han vencido, empezando por el que vence primero (FEFO).
//  - El día de su fecha de vencimiento un lote ya no se vende.
const db = require("../models");
const { Op, fn, col } = db.Sequelize;
const Lote = db.lotes;
const Producto = db.productos;
const DetalleFactura = db.detalle_facturas;
const DetalleFacturaLote = db.detalle_factura_lotes;

// Fecha de hoy en Guatemala como texto "2026-10-27" (el servidor de Render usa la hora de Londres)
function hoy() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Guatemala" });
}

// Condición de "se puede vender": lote activo, con unidades y que vence después de hoy
function condicionVendible() {
  return { estado: "Activo", cantidad_actual: { [Op.gt]: 0 }, fecha_vencimiento: { [Op.gt]: hoy() } };
}

// Vuelve a calcular stock_actual del producto sumando sus lotes activos
async function recalcularStock(id_producto, t) {
  const total = await Lote.sum("cantidad_actual", {
    where: { id_producto, estado: "Activo" },
    transaction: t
  });
  await Producto.update({ stock_actual: total || 0 }, { where: { id_producto }, transaction: t });
}

// Unidades que se pueden vender de cada producto (sin contar las vencidas): { id_producto: cantidad }
async function stockDisponiblePorProducto() {
  const filas = await Lote.findAll({
    attributes: ["id_producto", [fn("SUM", col("cantidad_actual")), "disponible"]],
    where: condicionVendible(),
    group: ["id_producto"],
    raw: true
  });
  const disponible = {};
  for (const fila of filas) disponible[fila.id_producto] = Number(fila.disponible);
  return disponible;
}

// Descuenta 'cantidad' de los lotes del producto, del que vence primero al último, y anota de cuál salió
// cada unidad en detalle_factura_lotes. Si los lotes sin vencer no alcanzan, lanza un error (la factura se cancela).
async function descontarFEFO(producto, cantidad, id_detalle, t) {
  // lock: mientras esta venta toma unidades, nadie más cambia estos lotes
  const lotes = await Lote.findAll({
    where: { id_producto: producto.id_producto, ...condicionVendible() },
    order: [["fecha_vencimiento", "ASC"], ["id_lote", "ASC"]],
    transaction: t,
    lock: t.LOCK.UPDATE
  });

  const disponible = lotes.reduce((suma, lote) => suma + lote.cantidad_actual, 0);
  if (disponible < cantidad) {
    throw new Error(`Stock insuficiente para '${producto.nombre}'. Solicitado: ${cantidad}, Disponible: ${disponible}`);
  }

  let faltan = cantidad;
  for (const lote of lotes) {
    if (faltan === 0) break;
    const tomar = Math.min(faltan, lote.cantidad_actual);
    await lote.update({ cantidad_actual: lote.cantidad_actual - tomar }, { transaction: t });
    await DetalleFacturaLote.create({ id_detalle, id_lote: lote.id_lote, cantidad: tomar }, { transaction: t });
    faltan -= tomar;
  }

  await recalcularStock(producto.id_producto, t);
}

// Devuelve a sus lotes las unidades de una factura (cuando se cancela). Cada unidad regresa al mismo lote
// del que salió, gracias a detalle_factura_lotes.
async function devolverALotes(id_factura, t) {
  const detalles = await DetalleFactura.findAll({
    where: { id_factura },
    include: [DetalleFacturaLote],
    transaction: t
  });

  const productos = new Set();
  for (const detalle of detalles) {
    for (const salida of detalle.detalle_factura_lotes) {
      await Lote.increment("cantidad_actual", { by: salida.cantidad, where: { id_lote: salida.id_lote }, transaction: t });
    }
    productos.add(detalle.id_producto);
  }

  for (const id_producto of productos) await recalcularStock(id_producto, t);
}

module.exports = { hoy, recalcularStock, stockDisponiblePorProducto, descontarFEFO, devolverALotes };
