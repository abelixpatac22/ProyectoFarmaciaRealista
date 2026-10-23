// La conexión completa viene en DATABASE_URL (Render la da al crear la base):
// postgresql://usuario:contraseña@host:5432/basededatos
const url = process.env.DATABASE_URL;

// SSL: la "External Database URL" de Render (host con puntos, ej. dpg-xxx.oregon-postgres.render.com)
// lo exige; la "Internal Database URL" (host sin puntos, ej. dpg-xxx-a) no lo usa.
// DB_SSL=true o DB_SSL=false fuerza el valor.
const host = url ? new URL(url).hostname : "";
const usarSSL = process.env.DB_SSL ? process.env.DB_SSL === "true" : host.includes(".");

module.exports = {
  URL: url,
  dialect: "postgres",
  dialectOptions: usarSSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};
