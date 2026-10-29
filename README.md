# Farmacia Bendición · Backend

API REST de la farmacia: catálogo, ventas con pago en línea, control de inventario por lotes con
fechas de vencimiento y panel de administración para empleados.

- **Tienda publicada:** https://farmaciabendiciontienda.onrender.com
- **API publicada:** https://proyectofarmaciarealista.onrender.com
- **Frontend:** repositorio [ProyectoFarmaciaFrontend](https://github.com/abelixpatac22/ProyectoFarmaciaFrontend)

## Tecnologías

| | |
| --- | --- |
| Servidor | Node.js + Express 5 |
| Base de datos | PostgreSQL con Sequelize 6 (ORM) |
| Autenticación | JWT (jsonwebtoken) y contraseñas cifradas con bcrypt |
| Pagos | Stripe Checkout |
| Hosting | Render (Web Service + PostgreSQL) |

## Qué hace

- **Catálogo** de productos con precio, imagen, proveedor y si requiere receta médica.
- **Compra en línea:** el cliente llena sus datos, se crea la factura y paga con tarjeta en Stripe.
  El servidor recalcula precios y totales con su propia base de datos (el navegador no puede cambiarlos)
  y el IVA del 12 % se desglosa del precio, que ya lo incluye.
- **Stock apartado:** una compra web nace **Pendiente** y aparta las unidades. Al volver de Stripe el
  servidor le pregunta a Stripe si se pagó: queda **Pagada**, o **Cancelada** y las unidades regresan.
  Si el cliente cierra la ventana sin pagar ni cancelar, una revisión que corre cada minuto cancela la
  compra pasados 2 minutos y devuelve el stock.
- **Lotes y vencimientos:** cada entrada de mercadería es un lote con su fecha de vencimiento.
  - Las ventas descuentan primero del lote que vence primero (**FEFO**) y nunca de uno vencido.
  - Cada factura guarda de qué lote salió cada unidad (**trazabilidad**).
  - Los lotes vencidos o dañados se **retiran** (merma) y salen del stock.
  - El stock de un producto es la suma de sus lotes: no se escribe a mano.
- **Medicamentos con receta:** no se venden en línea; solo un empleado puede registrar esa venta en la
  farmacia física.
- **Panel de empleados** con login, roles (`admin` y `empleado`) y gestión de productos, proveedores,
  clientes, empleados, lotes y facturas.

## Para poder correrlo en tu computadora .

Necesitas Node.js 20 o más reciente y una base PostgreSQL.

```bash
npm install
cp .env.example .env   # y llena los valores (ver abajo)
npm start              # http://localhost:8080
```

Al arrancar, el servidor:

1. Crea o actualiza las tablas (`sequelize.sync({ alter: true })`).
2. Crea el primer administrador con `ADMIN_EMAIL` y `ADMIN_PASSWORD` si todavía no existe ninguno.
3. Pasa a un lote `L-INICIAL` el stock de los productos que aún no tienen lotes.
4. Empieza la revisión de compras pendientes (cada minuto).

## Variables de entorno

Todas están explicadas en `.env.example`. El `.env` nunca se sube a GitHub.

| Variable | Para qué |
| --- | --- |
| `DATABASE_URL` | Conexión a PostgreSQL |
| `JWT_SECRET` | Clave para firmar las sesiones de empleados |
| `JWT_EXPIRES_IN` | Cuánto dura una sesión (por defecto `8h`) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Primer administrador |
| `STRIPE_SECRET_KEY` | Clave secreta de Stripe (`sk_test_...` en modo prueba) |
| `STRIPE_WEBHOOK_SECRET` | Opcional: solo si se configura el webhook de Stripe |
| `FRONTEND_URL` | URL de la tienda, para CORS y para que Stripe regrese a ella. Acepta varias separadas por coma |

Sin `DATABASE_URL`, `JWT_SECRET` o `STRIPE_SECRET_KEY` el servidor no arranca y dice cuál falta.

## Rutas de la API

Las rutas marcadas con **empleado** necesitan el header `Authorization: Bearer <token>`, que se obtiene
con `POST /api/auth/login`. Las de **admin** necesitan además el rol de administrador.

| Recurso | Pública | Empleado | Admin |
| --- | --- | --- | --- |
| `/api/auth` | `POST /login` | `GET /perfil`, `PUT /cambiar-password` | |
| `/api/productos` | `GET /`, `GET /activos/lista`, `GET /:id` | `POST /`, `PUT /:id`, `DELETE /:id` | `DELETE /` |
| `/api/proveedores` | `GET /`, `GET /activos/lista`, `GET /:id` | `POST /`, `PUT /:id`, `DELETE /:id` | `DELETE /` |
| `/api/clientes` | `POST /checkout` | `GET`, `POST`, `PUT /:id`, `DELETE /:id` | `DELETE /` |
| `/api/empleados` | | `GET /`, `GET /activos/lista`, `GET /:id` | `POST /`, `PUT /:id`, `DELETE /:id`, `DELETE /` |
| `/api/lotes` | | `GET /`, `POST /`, `PUT /:id`, `PUT /:id/retirar` | |
| `/api/facturas` | `POST /` (compra web) | `GET /`, `GET /:id` | |
| `/api/pagos` | `POST /crear-sesion`, `POST /confirmar`, `POST /cancelar` | | |

Notas:

- `POST /api/facturas` sin token es una **compra web** (queda Pendiente y no acepta productos con receta).
  Con token de empleado es una **venta en la farmacia física** (queda Completada y registra al empleado).
- Los productos devuelven `stock_actual` (todo lo que hay en bodega) y `stock_disponible`
  (lo que se puede vender: solo lotes sin vencer).
- `/api/lotes` acepta los filtros `?estado=Activo|Retirado` e `?id_producto=`.
- `POST /api/pagos/webhook` recibe los avisos de Stripe si se configura `STRIPE_WEBHOOK_SECRET`.

## Base de datos

```
proveedores 1───N productos 1───N lotes
                     │                │
                     1                1
                     │                │
                     N                N
clientes 1───N facturas 1───N detalle_facturas 1───N detalle_factura_lotes
                  │
empleados 1───N ──┤
                  1───N transacciones_pago
```

| Tabla | Guarda |
| --- | --- |
| `productos` | Catálogo; `stock_actual` se calcula con los lotes |
| `lotes` | Entradas de mercadería: número de lote, vencimiento, cantidades, estado (Activo o Retirado) |
| `facturas` | Encabezado de la venta: cliente, empleado (si fue en la farmacia), totales y estado |
| `detalle_facturas` | Cada producto vendido con su precio |
| `detalle_factura_lotes` | De qué lote salió cada unidad vendida |
| `transacciones_pago` | Cada sesión de pago de Stripe y su estado |
| `clientes`, `empleados`, `proveedores` | Datos de cada uno; se desactivan con `estado` en vez de borrarse |

Estados de una factura: `Pendiente` (compra web esperando el pago), `Pagada`, `Cancelada` y
`Completada` (venta registrada por un empleado).

## Estructura

```
server.js            Arranque: CORS, rutas, sincronización de tablas y revisión de pendientes
app/
├── config/          Conexión a la base y configuración de JWT
├── models/          Modelos de Sequelize y sus relaciones (index.js)
├── services/
│   └── inventario.js  Reglas de lotes: FEFO, devolver a lotes, recalcular stock
├── controllers/     Lógica de cada recurso
├── middleware/      verificarToken, tokenOpcional, esAdmin
└── routes/          Rutas de cada recurso
```

## Publicarlo en Render

1. **Base de datos:** New → Postgres. En *Connections* están la **Internal Database URL** (para el
   servicio web) y la **External Database URL** (para conectarse desde una computadora).
2. **Servicio web:** New → Web Service, conectado a este repositorio.
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment: las variables de `.env.example`, con `DATABASE_URL` = la Internal Database URL y
     `FRONTEND_URL` = la URL de la tienda.
3. Cada `git push` a `main` vuelve a publicar el servicio.

En el plan gratis de Render el servicio se duerme tras 15 minutos sin visitas y la primera petición
tarda unos 50 segundos; la base gratis vence a los 30 días de creada.
