// De qué lote salió cada línea vendida (trazabilidad). Una línea puede salir de varios lotes:
// 5 cajas = 3 del lote que vence primero + 2 del siguiente.
module.exports = (sequelize, Sequelize) => {
  const DetalleFacturaLote = sequelize.define("detalle_factura_lote", {
    id_detalle_lote: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    cantidad: { type: Sequelize.INTEGER, allowNull: false }
  }, { timestamps: false });
  return DetalleFacturaLote;
};
