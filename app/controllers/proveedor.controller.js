const db = require("../models");
const Proveedor = db.proveedores;

// 1. Crear y guardar un nuevo Proveedor
exports.create = (req, res) => {
  if (!req.body.nombre_empresa) {
    res.status(400).send({ message: "El nombre de la empresa es obligatorio." });
    return;
  }

  const proveedor = {
    nombre_empresa: req.body.nombre_empresa,
    nit_proveedor: req.body.nit_proveedor,
    contacto_nombre: req.body.contacto_nombre,
    telefono: req.body.telefono,
    email: req.body.email,
    direccion: req.body.direccion,
    estado: req.body.estado !== undefined ? req.body.estado : true
  };

  Proveedor.create(proveedor)
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrió un error al crear el Proveedor." }));
};

// 2. Obtener todos los Proveedores
exports.findAll = (req, res) => {
  Proveedor.findAll()
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrió un error al recuperar los proveedores." }));
};

// 3. Encontrar un Proveedor por su ID
exports.findOne = (req, res) => {
  const id = req.params.id;

  Proveedor.findByPk(id)
    .then(data => {
      if (data) {
        res.send(data);
      } else {
        res.status(404).send({ message: `No se encontró el Proveedor con id=${id}.` });
      }
    })
    .catch(err => res.status(500).send({ message: "Error al recuperar el Proveedor con id=" + id }));
};

// 4. Actualizar un Proveedor por su ID
exports.update = (req, res) => {
  const id = req.params.id;

  Proveedor.update(req.body, { where: { id_proveedor: id } })
    .then(num => {
      if (num == 1) {
        res.send({ message: "El Proveedor fue actualizado exitosamente." });
      } else {
        res.send({ message: `No se pudo actualizar el Proveedor con id=${id}.` });
      }
    })
    .catch(err => res.status(500).send({ message: "Error al actualizar el Proveedor." }));
};

// 5. Eliminar un Proveedor por su ID
exports.delete = (req, res) => {
  const id = req.params.id;

  Proveedor.destroy({ where: { id_proveedor: id } })
    .then(num => {
      if (num == 1) {
        res.send({ message: "El Proveedor fue eliminado exitosamente." });
      } else {
        res.send({ message: `No se pudo eliminar el Proveedor con id=${id}.` });
      }
    })
    .catch(err => res.status(500).send({ message: "No se pudo eliminar el Proveedor." }));
};

// 6. Eliminar todos los Proveedores
exports.deleteAll = (req, res) => {
  Proveedor.destroy({ where: {}, truncate: false })
    .then(nums => res.send({ message: `${nums} Proveedores fueron eliminados exitosamente.` }))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrió un error al eliminar a todos los proveedores." }));
};

// 7. Encontrar todos los Proveedores Activos
exports.findAllStatus = (req, res) => {
  Proveedor.findAll({ where: { estado: true } })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrió un error al recuperar los proveedores activos." }));
};
