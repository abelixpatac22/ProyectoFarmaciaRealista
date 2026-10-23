module.exports = (sequelize, Sequelize) => {
  const TransaccionPago = sequelize.define("transacciones_pago", {
    id_transaccion: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    pasarela: { type: Sequelize.STRING(20) },
    id_transaccion_externa: { type: Sequelize.STRING(250) },
    monto: { type: Sequelize.DECIMAL(10,2) },
    estado_pago: { type: Sequelize.STRING(30) },
    fecha_registro: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
  }, { timestamps: false });
  return TransaccionPago;
};
