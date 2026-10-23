module.exports = app => {
  const clientes = require("../controllers/cliente.controller.js");
  const { verificarToken, esAdmin } = require("../middleware/auth.js");
  var router = require("express").Router();

  // Pública: la usa el checkout de la tienda. Solo devuelve el id, nunca datos de otros clientes.
  router.post("/checkout", clientes.buscarOCrear);

  // Datos personales (NIT, correo, teléfono, dirección): solo empleados
  router.post("/", verificarToken, clientes.create);
  router.get("/", verificarToken, clientes.findAll);
  router.get("/activos/lista", verificarToken, clientes.findAllStatus); // Ruta especial para activos
  router.get("/:id", verificarToken, clientes.findOne);
  router.put("/:id", verificarToken, clientes.update);
  router.delete("/:id", verificarToken, clientes.delete);
  router.delete("/", verificarToken, esAdmin, clientes.deleteAll);

  app.use('/api/clientes', router);
};
