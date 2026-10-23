module.exports = app => {
  const empleados = require("../controllers/empleado.controller.js");
  const { verificarToken, esAdmin } = require("../middleware/auth.js");
  var router = require("express").Router();

  router.post("/", verificarToken, esAdmin, empleados.create);
  router.get("/", verificarToken, empleados.findAll);
  router.get("/activos/lista", verificarToken, empleados.findAllStatus);
  router.get("/:id", verificarToken, empleados.findOne);
  router.put("/:id", verificarToken, esAdmin, empleados.update);
  router.delete("/:id", verificarToken, esAdmin, empleados.delete);
  router.delete("/", verificarToken, esAdmin, empleados.deleteAll);

  app.use('/api/empleados', router);
};
