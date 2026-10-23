const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth.config.js");
const db = require("../models");
const Empleado = db.empleados;

// 1. Verificar que la petición traiga un token válido (Header: Authorization: Bearer <token>)
exports.verificarToken = async (req, res, next) => {
  const header = req.headers["authorization"] || "";
  const [tipo, token] = header.split(" ");

  if (tipo !== "Bearer" || !token) {
    return res.status(401).send({ message: "No se proporcionó un token de acceso." });
  }

  let payload;
  try {
    payload = jwt.verify(token, authConfig.SECRET);
  } catch (err) {
    return res.status(401).send({ message: "Token inválido o expirado." });
  }

  try {
    // Confirmamos que el empleado siga existiendo y activo (permite revocar acceso al desactivarlo)
    const empleado = await Empleado.findByPk(payload.id);
    if (!empleado || !empleado.estado) {
      return res.status(401).send({ message: "El empleado no existe o está inactivo." });
    }
    req.empleado = empleado;
    next();
  } catch (err) {
    res.status(500).send({ message: "Error al validar el token." });
  }
};

// 2. Token opcional: para rutas que usan tanto la tienda (clientes sin cuenta) como los empleados.
//    Sin header sigue sin req.empleado; con header, el token tiene que ser válido (si no, 401).
exports.tokenOpcional = (req, res, next) => {
  if (!req.headers["authorization"]) return next();
  return exports.verificarToken(req, res, next);
};

// 3. Permitir solo a administradores (usar después de verificarToken)
exports.esAdmin = (req, res, next) => {
  if (req.empleado && req.empleado.rol === "admin") {
    return next();
  }
  res.status(403).send({ message: "Se requiere rol de administrador." });
};
