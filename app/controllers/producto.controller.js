const db = require("../models");
const Producto = db.productos;
const { stockDisponiblePorProducto } = require("../services/inventario.js");

// Agrega a cada producto stock_disponible: lo que se puede vender (sus lotes sin vencer).
// stock_actual sigue siendo todo lo que hay en bodega, incluidos los lotes vencidos que falta retirar.
async function conStockDisponible(productos) {
  const disponible = await stockDisponiblePorProducto();
  return productos.map(p => ({ ...p.toJSON(), stock_disponible: disponible[p.id_producto] || 0 }));
}

// El stock no se escribe a mano: nace en 0 y solo cambia con entradas de lote, ventas, cancelaciones y retiros
exports.create = (req, res) => {
  const producto = {
    codigo_barras: req.body.codigo_barras,
    nombre: req.body.nombre,
    descripcion: req.body.descripcion,
    imagen_url: req.body.imagen_url,
    precio_costo: req.body.precio_costo,
    precio_venta: req.body.precio_venta,
    stock_actual: 0,
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
    .then(conStockDisponible)
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Error al recuperar los productos." }));
};

exports.findOne = (req, res) => {
  const id = req.params.id;
  Producto.findByPk(id)
    .then(async data => {
      if (data) res.send((await conStockDisponible([data]))[0]);
      else res.status(404).send({ message: `No se encontró el Producto con id=${id}.` });
    })
    .catch(err => res.status(500).send({ message: "Error al recuperar el Producto con id=" + id }));
};

exports.update = (req, res) => {
  const id = req.params.id;
  // stock_actual no se puede cambiar desde aquí: lo calculan los lotes
  const { stock_actual, ...cambios } = req.body;
  Producto.update(cambios, { where: { id_producto: id } })
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
    .then(conStockDisponible)
    .then(data => res.send(data))
    .catch(err => res.status(500).send({ message: err.message || "Error al recuperar productos activos." }));
};
