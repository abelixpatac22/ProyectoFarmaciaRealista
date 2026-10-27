module.exports = app => {
  const pagos = require("../controllers/pago.controller.js");
  const { tokenOpcional } = require("../middleware/auth.js");
  var router = require("express").Router();

  // Pública para la tienda: el monto sale de la factura guardada, no de lo que mande el navegador
  router.post("/crear-sesion", tokenOpcional, pagos.createCheckout);
  // Al volver de Stripe: la tienda manda el id de la sesión y el backend le pregunta a Stripe si se pagó
  router.post("/confirmar", pagos.confirmar);
  router.post("/cancelar", pagos.cancelar);
  router.get("/success", pagos.success);
  router.get("/cancel", pagos.cancel);

  app.use('/api/pagos', router);
};
