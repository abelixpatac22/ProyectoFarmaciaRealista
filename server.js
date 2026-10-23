// Importar dependencias
require('dotenv').config();

// Sin estas variables el servidor no puede funcionar: mejor avisar y detenerse al arrancar
for (const variable of ["DATABASE_URL", "JWT_SECRET", "STRIPE_SECRET_KEY"]) {
  if (!process.env[variable]) {
    console.error(`Falta la variable de entorno ${variable}. Agrégala al .env (mira .env.example) antes de iniciar el servidor.`);
    process.exit(1);
  }
}
const express = require("express");
const cors = require("cors");

const app = express();

// Configuración de CORS: con FRONTEND_URL solo acepta peticiones de esa página; sin ella, de cualquiera
var corsOptions = {
  origin: process.env.FRONTEND_URL || "*"
};

app.use(cors(corsOptions));

// Webhook de Stripe (Debe ir estrictamente ANTES de express.json)
const pagosController = require("./app/controllers/pago.controller.js");
app.post('/api/pagos/webhook', express.raw({type: 'application/json'}), pagosController.webhook);

app.use(express.json()); // Permite recibir datos en formato JSON
app.use(express.urlencoded({ extended: true }));

// Sincronización con la Base de Datos
const db = require("./app/models");
// Utilizamos { alter: true } para que Sequelize cree o actualice las tablas sin borrar datos existentes
db.sequelize.sync({ alter: true })
  .then(async () => {
    console.log("¡Sincronización exitosa con la base de datos!");
    await crearAdminInicial();
  })
  .catch((err) => {
    console.log("Error al sincronizar la base de datos: " + err.message);
  });

// Crea el primer administrador (ADMIN_EMAIL / ADMIN_PASSWORD del .env) si aún no existe ninguno
async function crearAdminInicial() {
  const bcrypt = require("bcryptjs");
  const authConfig = require("./app/config/auth.config.js");
  const Empleado = db.empleados;

  if (await Empleado.count({ where: { rol: "admin" } }) > 0) return;

  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log("No hay ningún administrador. Define ADMIN_EMAIL y ADMIN_PASSWORD en el .env para crearlo.");
    return;
  }

  const hash = await bcrypt.hash(password, authConfig.SALT_ROUNDS);
  const existente = await Empleado.findOne({ where: { email } });
  if (existente) {
    // El email ya pertenece a un empleado: se le asciende a admin con la contraseña indicada
    await existente.update({ rol: "admin", password: hash, estado: true });
  } else {
    await Empleado.create({
      codigo_empleado: "ADMIN-001",
      nombre: "Administrador",
      puesto: "Administrador",
      email,
      password: hash,
      rol: "admin",
      estado: true,
      fecha_ingreso: new Date()
    });
  }
  console.log(`Administrador inicial listo: ${email}`);
}

// Ruta de prueba
app.get("/", (req, res) => {
  res.json({ message: "Bienvenido a la API del Sistema de Farmacia." });
});

// Importar e inicializar todas las rutas de la API
require("./app/routes/auth.routes")(app);
require("./app/routes/cliente.routes")(app);
require("./app/routes/empleado.routes")(app);
require("./app/routes/proveedor.routes")(app);
require("./app/routes/producto.routes")(app);
require("./app/routes/factura.routes")(app);
require("./app/routes/pago.routes")(app);

// Configurar el puerto y encender el servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`El servidor está corriendo en el puerto ${PORT}.`);
});


