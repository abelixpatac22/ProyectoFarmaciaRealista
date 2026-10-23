module.exports = app => {
  const productos = require("../controllers/producto.controller.js");
  const { verificarToken, esAdmin } = require("../middleware/auth.js");
  var router = require("express").Router();

  router.post("/", verificarToken, productos.create);
  router.get("/", productos.findAll);
  router.get("/activos/lista", productos.findAllStatus);
  router.get("/:id", productos.findOne);
  router.put("/:id", verificarToken, productos.update);
  router.delete("/:id", verificarToken, productos.delete);
  router.delete("/", verificarToken, esAdmin, productos.deleteAll);

  app.use('/api/productos', router);
};
