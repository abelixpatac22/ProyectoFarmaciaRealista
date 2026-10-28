// Un lote es un grupo de unidades de un producto que llegó junto y vence en la misma fecha.
// El stock del producto es la suma de lo que queda en sus lotes activos.
module.exports = (sequelize, Sequelize) => {
  const Lote = sequelize.define("lote", {
    id_lote: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    numero_lote: { type: Sequelize.STRING(50), allowNull: false },
    // DATEONLY: solo la fecha (2027-06-30), sin hora
    fecha_vencimiento: { type: Sequelize.DATEONLY, allowNull: false },
    cantidad_inicial: { type: Sequelize.INTEGER, allowNull: false },
    cantidad_actual: { type: Sequelize.INTEGER, allowNull: false },
    fecha_ingreso: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    // Activo: se puede vender (si no está vencido). Retirado: dado de baja (merma), ya no cuenta en el stock
    estado: { type: Sequelize.STRING(20), defaultValue: "Activo" },
    cantidad_retirada: { type: Sequelize.INTEGER, defaultValue: 0 },
    motivo_retiro: { type: Sequelize.STRING(200) },
    fecha_retiro: { type: Sequelize.DATE }
  }, { timestamps: false });
  return Lote;
};
