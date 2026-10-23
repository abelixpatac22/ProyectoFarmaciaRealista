module.exports = app => {
  const proveedores = require("../controllers/proveedor.controller.js");
  const { verificarToken, esAdmin } = require("../middleware/auth.js");
  var router = require("express").Router();

  router.post("/", verificarToken, proveedores.create);
  router.get("/", proveedores.findAll);
  router.get("/activos/lista", proveedores.findAllStatus);
  router.get("/:id", proveedores.findOne);
  router.put("/:id", verificarToken, proveedores.update);
  router.delete("/:id", verificarToken, proveedores.delete);
  router.delete("/", verificarToken, esAdmin, proveedores.deleteAll);

  app.use('/api/proveedores', router);
};
