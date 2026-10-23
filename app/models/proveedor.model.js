module.exports = (sequelize, Sequelize) => {
  const Proveedor = sequelize.define("proveedor", {
    id_proveedor: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    nombre_empresa: { type: Sequelize.STRING(150) },
    nit_proveedor: { type: Sequelize.STRING(20) },
    contacto_nombre: { type: Sequelize.STRING(100) },
    telefono: { type: Sequelize.STRING(20) },
    email: { type: Sequelize.STRING(150) },
    direccion: { type: Sequelize.TEXT },
    estado: { type: Sequelize.BOOLEAN, defaultValue: true }
  }, { timestamps: false });
  return Proveedor;
};
