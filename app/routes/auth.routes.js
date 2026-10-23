module.exports = app => {
  const auth = require("../controllers/auth.controller.js");
  const { verificarToken } = require("../middleware/auth.js");
  var router = require("express").Router();

  router.post("/login", auth.login);
  router.get("/perfil", verificarToken, auth.perfil);
  router.put("/cambiar-password", verificarToken, auth.cambiarPassword);

  app.use('/api/auth', router);
};
