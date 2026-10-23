# Farmacia · Backend

API de la farmacia: Express 5 + Sequelize + PostgreSQL, login de empleados con JWT y pagos con Stripe.
El frontend vive en otro repositorio (`farmacia-frontend`).

## Correrlo en tu computadora

```bash
npm install
cp .env.example .env   # y llena los valores (ver abajo)
npm start              # http://localhost:8080
```

Al arrancar, `sequelize.sync({ alter: true })` crea o actualiza las tablas y, si no existe ningún
administrador, crea uno con `ADMIN_EMAIL` y `ADMIN_PASSWORD`.

## Variables de entorno

Todas están explicadas en `.env.example`. Sin `DATABASE_URL`, `JWT_SECRET` o `STRIPE_SECRET_KEY` el
servidor no arranca y dice cuál falta.

## Publicarlo en Render

1. **Base de datos**: New → Postgres. Cuando esté lista, en *Connections* copia la
   **Internal Database URL** (para el servicio web) y la **External Database URL** (para tu computadora).
2. **Servicio web**: New → Web Service, conecta este repositorio de GitHub.
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment: las variables de `.env.example`, con `DATABASE_URL` = la Internal Database URL y
     `FRONTEND_URL` = la URL donde publiques el frontend.
3. En el frontend, `VITE_API_URL` = la URL del servicio web (por ejemplo `https://farmacia-api.onrender.com`).

El plan gratis de Render duerme el servicio sin uso: la primera petición puede tardar ~50 s.
La base gratis de Render vence a los 30 días; revisa la fecha en su panel.

## Rutas

| Recurso | Públicas | Con token de empleado | Solo admin |
| --- | --- | --- | --- |
| `/api/auth` | `POST /login` | `GET /perfil`, `PUT /cambiar-password` | |
| `/api/productos`, `/api/proveedores` | `GET` | crear, editar, eliminar | eliminar todos |
| `/api/clientes` | `POST /checkout` (solo devuelve el id) | listar, ver, crear, editar, eliminar | eliminar todos |
| `/api/facturas` | `POST /` (compra web) | listar, ver; al crear queda registrado el empleado | |
| `/api/pagos` | `POST /crear-sesion` (cobra el total guardado en la factura) | | |
| `/api/empleados` | | listar, ver | crear, editar, eliminar |

Los precios y totales de una factura se calculan en el servidor con `precio_venta` de la base de datos.
