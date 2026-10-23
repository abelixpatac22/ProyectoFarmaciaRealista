const db = require("../models");
const Cliente = db.clientes;

// 1. Crear y guardar un nuevo Cliente
exports.create = (req, res) => {
  if (!req.body.nombre || !req.body.nit) {
    res.status(400).send({ message: "El contenido no puede estar vacío (nit y nombre son obligatorios)." });
    return;
  }

  const cliente = {
    nit: req.body.nit,
    nombre: req.body.nombre,
    apellido: req.body.apellido,
    telefono: req.body.telefono,
    email: req.body.email,
    direccion: req.body.direccion,
    estado: req.body.estado ? req.body.estado : true
  };

  Cliente.create(cliente)
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrió un error al crear el Cliente." }));
};

// 2. Obtener todos los Clientes
exports.findAll = (req, res) => {
  Cliente.findAll()
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrió un error al recuperar los clientes." }));
};

// 3. Encontrar un Cliente por su ID
exports.findOne = (req, res) => {
  const id = req.params.id;

  Cliente.findByPk(id)
    .then(data => {
      if (data) {
        res.send(data);
      } else {
        res.status(404).send({ message: `No se encontró el Cliente con id_cliente=${id}.` });
      }
    })
    .catch(err => res.status(500).send({ message: "Error al recuperar el Cliente con id_cliente=" + id }));
};

// 4. Actualizar un Cliente por su ID
exports.update = (req, res) => {
  const id = req.params.id;

  Cliente.update(req.body, { where: { id_cliente: id } })
    .then(num => {
      if (num == 1) {
        res.send({ message: "El Cliente fue actualizado exitosamente." });
      } else {
        res.send({ message: `No se pudo actualizar el Cliente con id=${id}. Tal vez el Cliente no fue encontrado o req.body está vacío.` });
      }
    })
    .catch(err => res.status(500).send({ message: "Error al actualizar el Cliente con id=" + id }));
};

// 5. Eliminar un Cliente por su ID
exports.delete = (req, res) => {
  const id = req.params.id;

  Cliente.destroy({ where: { id_cliente: id } })
    .then(num => {
      if (num == 1) {
        res.send({ message: "El Cliente fue eliminado exitosamente." });
      } else {
        res.send({ message: `No se pudo eliminar el Cliente con id=${id}.` });
      }
    })
    .catch(err => res.status(500).send({ message: "No se pudo eliminar el Cliente con id=" + id }));
};

// 6. Eliminar todos los Clientes (Cuidado con este método en producción)
exports.deleteAll = (req, res) => {
  Cliente.destroy({ where: {}, truncate: false })
    .then(nums => res.send({ message: `${nums} Clientes fueron eliminados exitosamente.` }))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrió un error al eliminar a todos los clientes." }));
};

// 8. Checkout de la tienda (ruta pública): busca al cliente por NIT o lo crea.
//    "CF" (consumidor final) lo comparten muchas personas, así que con CF se busca por NIT + email.
//    Solo devuelve el id: así nadie puede averiguar los datos de un cliente escribiendo su NIT.
exports.buscarOCrear = async (req, res) => {
  const nit = String(req.body.nit || "").replace(/[\s-]/g, "").toUpperCase();
  const nombre = String(req.body.nombre || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();

  if (!nit || !nombre || !email) {
    return res.status(400).send({ message: "El NIT, el nombre y el correo son obligatorios." });
  }

  const { fn, col, where } = db.Sequelize;
  // Compara el NIT guardado sin espacios ni guiones y en mayúsculas, igual que el que llega
  const condiciones = [where(fn("upper", fn("replace", fn("replace", col("nit"), " ", ""), "-", "")), nit)];
  if (nit === "CF") condiciones.push(where(fn("lower", col("email")), email));

  try {
    const existente = await Cliente.findOne({ where: { [db.Sequelize.Op.and]: condiciones } });
    if (existente) return res.send({ id_cliente: existente.id_cliente });

    const nuevo = await Cliente.create({
      nit,
      nombre,
      apellido: req.body.apellido || null,
      telefono: req.body.telefono || null,
      email,
      direccion: req.body.direccion || null,
      estado: true
    });
    res.status(201).send({ id_cliente: nuevo.id_cliente });
  } catch (err) {
    res.status(500).send({ message: err.message || "Ocurrió un error al registrar los datos del cliente." });
  }
};

// 7. Encontrar todos los Clientes Activos (findAllStatus)
exports.findAllStatus = (req, res) => {
  Cliente.findAll({ where: { estado: true } })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Ocurrió un error al recuperar los clientes activos." }));
};
