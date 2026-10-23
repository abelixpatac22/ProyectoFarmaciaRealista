module.exports = {
  // Clave para firmar los tokens JWT (definirla en el .env)
  SECRET: process.env.JWT_SECRET,
  // Duración de la sesión
  EXPIRES_IN: process.env.JWT_EXPIRES_IN || "8h",
  // Costo del hash bcrypt
  SALT_ROUNDS: 10,
  ROLES: ["admin", "empleado"]
};
