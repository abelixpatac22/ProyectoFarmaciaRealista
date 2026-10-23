module.exports = (sequelize, Sequelize) => {
  const Cliente = sequelize.define("cliente", {
    id_cliente: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    nit: { type: Sequelize.STRING(20) },
    nombre: { type: Sequelize.STRING(100) },
    apellido: { type: Sequelize.STRING(100) },
    telefono: { type: Sequelize.STRING(20) },
    email: { type: Sequelize.STRING(150) },
    direccion: { type: Sequelize.TEXT },
    estado: { type: Sequelize.BOOLEAN, defaultValue: true },
    fecha_creacion: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
  }, { timestamps: false });
  return Cliente;
};
