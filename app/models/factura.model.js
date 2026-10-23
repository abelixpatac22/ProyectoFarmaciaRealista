module.exports = (sequelize, Sequelize) => {
  const Factura = sequelize.define("factura", {
    id_factura: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    numero_factura: { type: Sequelize.STRING(50) },
    fecha: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    subtotal: { type: Sequelize.DECIMAL(10,2) },
    impuesto: { type: Sequelize.DECIMAL(10,2) },
    total: { type: Sequelize.DECIMAL(10,2) },
    metodo_pago: { type: Sequelize.STRING(30) },
    estado_factura: { type: Sequelize.STRING(20) }
  }, { timestamps: false });
  return Factura;
};
