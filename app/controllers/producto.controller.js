const db = require("../models");
const Producto = db.productos;

exports.create = (req, res) => {
  const producto = {
    codigo_barras: req.body.codigo_barras,
    nombre: req.body.nombre,
    descripcion: req.body.descripcion,
    precio_costo: req.body.precio_costo,
    precio_venta: req.body.precio_venta,
    stock_actual: req.body.stock_actual,
    stock_minimo: req.body.stock_minimo,
    id_proveedor: req.body.id_proveedor,
    requiere_receta: req.body.requiere_receta,
    estado: req.body.estado ? req.body.estado : true
  };

  Producto.create(producto)
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Error al crear el Producto." }));
};

exports.findAll = (req, res) => {
  Producto.findAll()
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Error al recuperar los productos." }));
};

exports.findOne = (req, res) => {
  const id = req.params.id;
  Producto.findByPk(id)
    .then(data => {
      if (data) res.send(data);
      else res.status(404).send({ message: `No se encontró el Producto con id=${id}.` });
    })
    .catch(err => res.status(500).send({ message: "Error al recuperar el Producto con id=" + id }));
};

exports.update = (req, res) => {
  const id = req.params.id;
  Producto.update(req.body, { where: { id_producto: id } })
    .then(num => {
      if (num == 1) res.send({ message: "Producto actualizado exitosamente." });
      else res.send({ message: `No se pudo actualizar el Producto con id=${id}.` });
    })
    .catch(err => res.status(500).send({ message: "Error al actualizar el Producto." }));
};

exports.delete = (req, res) => {
  const id = req.params.id;
  Producto.destroy({ where: { id_producto: id } })
    .then(num => {
      if (num == 1) res.send({ message: "Producto eliminado exitosamente." });
      else res.send({ message: `No se pudo eliminar el Producto con id=${id}.` });
    })
    .catch(err => res.status(500).send({ message: "Error al eliminar el Producto." }));
};

exports.deleteAll = (req, res) => {
  Producto.destroy({ where: {}, truncate: false })
    .then(nums => res.send({ message: `${nums} Productos eliminados exitosamente.` }))
    .catch(err => res.status(500).send({ message: err.message || "Error al eliminar productos." }));
};

exports.findAllStatus = (req, res) => {
  Producto.findAll({ where: { estado: true } })
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Error al recuperar productos activos." }));
};
