const dbConfig = require("../config/db.config.js");
const Sequelize = require("sequelize");

// Inicializamos Sequelize con la URL de la base de datos (DATABASE_URL en el .env)
const sequelize = new Sequelize(dbConfig.URL, {
  dialect: dbConfig.dialect,
  dialectOptions: dbConfig.dialectOptions, // SSL cuando la conexión es desde fuera de Render
  logging: false, // Sin esto imprime cada consulta SQL en los logs
  pool: {
    max: dbConfig.pool.max,
    min: dbConfig.pool.min,
    acquire: dbConfig.pool.acquire,
    idle: dbConfig.pool.idle
  }
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// 1. Cargar todos los modelos
db.clientes = require("./cliente.model.js")(sequelize, Sequelize);
db.empleados = require("./empleado.model.js")(sequelize, Sequelize);
db.proveedores = require("./proveedor.model.js")(sequelize, Sequelize);
db.productos = require("./producto.model.js")(sequelize, Sequelize);
db.facturas = require("./factura.model.js")(sequelize, Sequelize);
db.detalle_facturas = require("./detalle_factura.model.js")(sequelize, Sequelize);
db.transacciones_pago = require("./transaccion_pago.model.js")(sequelize, Sequelize);

// 2. Definir las Relaciones (Claves Foráneas)

// Proveedor -> Productos (1:N)
db.proveedores.hasMany(db.productos, { foreignKey: 'id_proveedor' });
db.productos.belongsTo(db.proveedores, { foreignKey: 'id_proveedor' });

// Cliente -> Facturas (1:N)
db.clientes.hasMany(db.facturas, { foreignKey: 'id_cliente' });
db.facturas.belongsTo(db.clientes, { foreignKey: 'id_cliente' });

// Empleado -> Facturas (1:N)
db.empleados.hasMany(db.facturas, { foreignKey: 'id_empleado' });
db.facturas.belongsTo(db.empleados, { foreignKey: 'id_empleado' });

// Factura -> Detalle Factura (1:N)
db.facturas.hasMany(db.detalle_facturas, { foreignKey: 'id_factura' });
db.detalle_facturas.belongsTo(db.facturas, { foreignKey: 'id_factura' });

// Producto -> Detalle Factura (1:N)
db.productos.hasMany(db.detalle_facturas, { foreignKey: 'id_producto' });
db.detalle_facturas.belongsTo(db.productos, { foreignKey: 'id_producto' });

// Factura -> Transacciones Pago (1:N)
db.facturas.hasMany(db.transacciones_pago, { foreignKey: 'id_factura' });
db.transacciones_pago.belongsTo(db.facturas, { foreignKey: 'id_factura' });

module.exports = db;

