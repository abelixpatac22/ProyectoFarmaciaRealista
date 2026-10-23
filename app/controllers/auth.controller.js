const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const authConfig = require("../config/auth.config.js");
const db = require("../models");
const Empleado = db.empleados;

// 1. Iniciar sesión con email y contraseña
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ message: "El email y la contraseña son obligatorios." });
  }

  try {
    const empleado = await Empleado.scope("conPassword").findOne({
      where: { email: email.trim().toLowerCase() }
    });

    // Mismo mensaje si no existe o si la contraseña no coincide (no revelar cuál falló)
    const valido = empleado && empleado.password && await bcrypt.compare(password, empleado.password);
    if (!valido) {
      return res.status(401).send({ message: "Credenciales incorrectas." });
    }
    if (!empleado.estado) {
      return res.status(403).send({ message: "El empleado está inactivo." });
    }

    const token = jwt.sign(
      { id: empleado.id_empleado, rol: empleado.rol },
      authConfig.SECRET,
      { expiresIn: authConfig.EXPIRES_IN }
    );

    res.send({ token, empleado });
  } catch (err) {
    res.status(500).send({ message: err.message || "Ocurrió un error al iniciar sesión." });
  }
};

// 2. Obtener los datos del empleado autenticado
exports.perfil = (req, res) => {
  res.send(req.empleado);
};

// 3. Cambiar la contraseña del empleado autenticado
exports.cambiarPassword = async (req, res) => {
  const { password_actual, password_nueva } = req.body;

  if (!password_actual || !password_nueva) {
    return res.status(400).send({ message: "La contraseña actual y la nueva son obligatorias." });
  }
  if (password_nueva.length < 8) {
    return res.status(400).send({ message: "La nueva contraseña debe tener al menos 8 caracteres." });
  }

  try {
    const empleado = await Empleado.scope("conPassword").findByPk(req.empleado.id_empleado);
    if (!await bcrypt.compare(password_actual, empleado.password)) {
      return res.status(401).send({ message: "La contraseña actual es incorrecta." });
    }

    empleado.password = await bcrypt.hash(password_nueva, authConfig.SALT_ROUNDS);
    await empleado.save();
    res.send({ message: "Contraseña actualizada exitosamente." });
  } catch (err) {
    res.status(500).send({ message: err.message || "Ocurrió un error al cambiar la contraseña." });
  }
};
