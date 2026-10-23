module.exports = (sequelize, Sequelize) => {
  const Empleado = sequelize.define("empleado", {
    id_empleado: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    codigo_empleado: { type: Sequelize.STRING(20) },
    nombre: { type: Sequelize.STRING(100) },
    apellido: { type: Sequelize.STRING(100) },
    puesto: { type: Sequelize.STRING(50) },
    telefono: { type: Sequelize.STRING(20) },
    email: { type: Sequelize.STRING(150) },
    password: { type: Sequelize.STRING(255) }, // Hash bcrypt, nunca texto plano
    rol: { type: Sequelize.STRING(20), defaultValue: "empleado" }, // 'admin' | 'empleado'
    estado: { type: Sequelize.BOOLEAN, defaultValue: true },
    fecha_ingreso: { type: Sequelize.DATE }
  }, {
    timestamps: false,
    // Nunca devolver el hash de la contraseña en las consultas normales
    defaultScope: { attributes: { exclude: ["password"] } },
    scopes: { conPassword: { attributes: { include: ["password"] } } }
  });

  // Tampoco exponerlo al serializar una instancia (ej. la que devuelve create)
  Empleado.prototype.toJSON = function () {
    const valores = { ...this.get() };
    delete valores.password;
    return valores;
  };

  return Empleado;
};
