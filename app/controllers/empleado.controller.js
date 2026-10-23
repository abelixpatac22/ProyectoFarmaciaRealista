const bcrypt = require("bcryptjs");
const authConfig = require("../config/auth.config.js");
const db = require("../models");
const Empleado = db.empleados;
const Op = db.Sequelize.Op;

// Valida y normaliza email, contraseña y rol. Devuelve un mensaje de error o null.
const prepararCredenciales = async (datos, idActual) => {
  if (datos.email !== undefined) {
    datos.email = String(datos.email).trim().toLowerCase();
    const where = { email: datos.email };
    if (idActual) where.id_empleado = { [Op.ne]: idActual };
    if (await Empleado.findOne({ where })) {
      return "Ya existe un empleado con ese email.";
    }
  }
  if (datos.rol !== undefined && !authConfig.ROLES.includes(datos.rol)) {
    return `Rol inválido. Valores permitidos: ${authConfig.ROLES.join(", ")}.`;
  }
  if (datos.password !== undefined) {
    if (String(datos.password).length < 8) {
      return "La contraseña debe tener al menos 8 caracteres.";
    }
    datos.password = await bcrypt.hash(String(datos.password), authConfig.SALT_ROUNDS);
  }
  return null;
};

// 1. Crear y guardar un nuevo Empleado
exports.create = async (req, res) => {
  if (!req.body.nombre || !req.body.codigo_empleado) {
    res.status(400).send({ message: "El código de empleado y el nombre son obligatorios." });
    return;
  }
  if (!req.body.email || !req.body.password) {
    res.status(400).send({ message: "El email y la contraseña son obligatorios para que el empleado pueda iniciar sesión." });
    return;
  }

  const empleado = {
    codigo_empleado: req.body.codigo_empleado,
    nombre: req.body.nombre,
    apellido: req.body.apellido,
    puesto: req.body.puesto,
    telefono: req.body.telefono,
    email: req.body.email,
    password: req.body.password,
    rol: req.body.rol || "empleado",
    estado: req.body.estado !== undefined ? req.body.estado : true,
    fecha_ingreso: req.body.fecha_ingreso
  };

  try {
    const error = await prepararCredenciales(empleado);
    if (error) return res.status(400).send({ message: error });
  } catch (err) {
    return res.status(500).send({ message: err.message || "Ocurrió un error al crear el Empleado." });
  }

  Empleado.create(empleado)
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrió un error al crear el Empleado." }));
};

// 2. Obtener todos los Empleados
exports.findAll = (req, res) => {
  Empleado.findAll()
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrió un error al recuperar los empleados." }));
};

// 3. Encontrar un Empleado por su ID
exports.findOne = (req, res) => {
  const id = req.params.id;

  Empleado.findByPk(id)
    .then(data => {
      if (data) {
        res.send(data);
      } else {
        res.status(404).send({ message: `No se encontró el Empleado con id=${id}.` });
      }
    })
    .catch(err => res.status(500).send({ message: "Error al recuperar el Empleado con id=" + id }));
};

// 4. Actualizar un Empleado por su ID
exports.update = async (req, res) => {
  const id = req.params.id;
  const datos = { ...req.body };
  delete datos.id_empleado;

  try {
    const error = await prepararCredenciales(datos, id);
    if (error) return res.status(400).send({ message: error });
  } catch (err) {
    return res.status(500).send({ message: "Error al actualizar el Empleado." });
  }

  Empleado.update(datos, { where: { id_empleado: id } })
    .then(num => {
      if (num == 1) {
        res.send({ message: "El Empleado fue actualizado exitosamente." });
      } else {
        res.send({ message: `No se pudo actualizar el Empleado con id=${id}.` });
      }
    })
    .catch(err => res.status(500).send({ message: "Error al actualizar el Empleado." }));
};

// 5. Eliminar un Empleado por su ID
exports.delete = (req, res) => {
  const id = req.params.id;

  if (Number(id) === req.empleado.id_empleado) {
    return res.status(400).send({ message: "No puedes eliminar tu propio usuario." });
  }

  Empleado.destroy({ where: { id_empleado: id } })
    .then(num => {
      if (num == 1) {
        res.send({ message: "El Empleado fue eliminado exitosamente." });
      } else {
        res.send({ message: `No se pudo eliminar el Empleado con id=${id}.` });
      }
    })
    .catch(err => res.status(500).send({ message: "No se pudo eliminar el Empleado." }));
};

// 6. Eliminar todos los Empleados
exports.deleteAll = (req, res) => {
  // Se conserva al administrador que ejecuta la acción para no quedar sin acceso
  Empleado.destroy({ where: { id_empleado: { [Op.ne]: req.empleado.id_empleado } }, truncate: false })
    .then(nums => res.send({ message: `${nums} Empleados fueron eliminados exitosamente.` }))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrió un error al eliminar a todos los empleados." }));
};

// 7. Encontrar todos los Empleados Activos
exports.findAllStatus = (req, res) => {
  Empleado.findAll({ where: { estado: true } })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrió un error al recuperar los empleados activos." }));
};
