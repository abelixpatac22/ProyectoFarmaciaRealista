module.exports = app => {
  const facturas = require("../controllers/factura.controller.js");
  const { verificarToken, tokenOpcional } = require("../middleware/auth.js");
  var router = require("express").Router();

  // Crear: la tienda sin sesión (compra web) o un empleado (queda registrado quién vendió)
  router.post("/", tokenOpcional, facturas.create);
  // Ver facturas: solo empleados (traen nombre y NIT del cliente)
  router.get("/", verificarToken, facturas.findAll);
  router.get("/:id", verificarToken, facturas.findOne);

  app.use('/api/facturas', router);
};
