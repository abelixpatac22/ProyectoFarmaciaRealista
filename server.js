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

// Configuración de CORS: con FRONTEND_URL solo acepta peticiones de esas páginas; sin ella, de cualquiera.
// Puede llevar varias URLs separadas por coma, ej. la tienda publicada y http://localhost:5173
const frontendUrls = (process.env.FRONTEND_URL || "").split(",").map(url => url.trim()).filter(Boolean);
var corsOptions = {
  origin: frontendUrls.length > 0 ? frontendUrls : "*"
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
    await crearLotesIniciales();
    // Cada minuto se devuelve el stock de las compras web que se quedaron sin pagar (ventana de Stripe cerrada)
    const revisarPendientes = () => pagosController.liberarPendientesVencidas()
      .catch(err => console.error("Error revisando compras pendientes:", err.message));
    revisarPendientes();
    setInterval(revisarPendientes, 60 * 1000);
  })
  .catch((err) => {
    console.log("Error al sincronizar la base de datos: " + err.message);
  });

// Migración a lotes: el stock que existía antes del control de vencimientos no tenía lote.
// A cada producto con stock y sin ningún lote se le crea el lote L-INICIAL con esas unidades.
async function crearLotesIniciales() {
  const { Op } = db.Sequelize;
  const productos = await db.productos.findAll({ where: { stock_actual: { [Op.gt]: 0 } } });
  for (const producto of productos) {
    if (await db.lotes.count({ where: { id_producto: producto.id_producto } }) > 0) continue;
    await db.lotes.create({
      id_producto: producto.id_producto,
      numero_lote: "L-INICIAL",
      fecha_vencimiento: "2027-06-30",
      cantidad_inicial: producto.stock_actual,
      cantidad_actual: producto.stock_actual
    });
    console.log(`Lote L-INICIAL creado para '${producto.nombre}' con ${producto.stock_actual} unidades.`);
  }
}

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
require("./app/routes/lote.routes")(app);

// Configurar el puerto y encender el servidor
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`El servidor está corriendo en el puerto ${PORT}.`);
});


