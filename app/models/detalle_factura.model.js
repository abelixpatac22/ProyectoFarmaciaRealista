module.exports = (sequelize, Sequelize) => {
  const DetalleFactura = sequelize.define("detalle_factura", {
    id_detalle: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    cantidad: { type: Sequelize.INTEGER },
    precio_unitario: { type: Sequelize.DECIMAL(10,2) },
    subtotal_linea: { type: Sequelize.DECIMAL(10,2) }
  }, { timestamps: false });
  return DetalleFactura;
};
