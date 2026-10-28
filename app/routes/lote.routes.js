module.exports = app => {
  const lotes = require("../controllers/lote.controller.js");
  const { verificarToken } = require("../middleware/auth.js");
  var router = require("express").Router();

  // Todo el control de lotes es del panel: solo empleados con sesión
  router.get("/", verificarToken, lotes.findAll);
  router.post("/", verificarToken, lotes.create);
  router.put("/:id", verificarToken, lotes.update);
  router.put("/:id/retirar", verificarToken, lotes.retirar);

  app.use('/api/lotes', router);
};
