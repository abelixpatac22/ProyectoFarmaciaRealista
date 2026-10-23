module.exports = (sequelize, Sequelize) => {
  const Producto = sequelize.define("producto", {
    id_producto: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    codigo_barras: { type: Sequelize.STRING(50), unique: true },
    nombre: { type: Sequelize.STRING(150) },
    descripcion: { type: Sequelize.TEXT },
    precio_costo: { type: Sequelize.DECIMAL(10,2) },
    precio_venta: { type: Sequelize.DECIMAL(10,2) },
    stock_actual: { type: Sequelize.INTEGER },
    stock_minimo: { type: Sequelize.INTEGER },
    requiere_receta: { type: Sequelize.BOOLEAN },
    estado: { type: Sequelize.BOOLEAN, defaultValue: true }
  }, { timestamps: false });
  return Producto;
};
