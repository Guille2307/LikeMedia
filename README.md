# Like Media · plataforma web

Implementación de Like Media con **Angular 22** (frontend) y **NestJS 12** (API), basada en el diseño de Figma `Like Media · Web y flujos v1`.

## Estructura

- `web/`: aplicación Angular standalone, responsive y con la identidad visual de Like Media.
- `api/`: API NestJS con catálogo de servicios, reservas, contacto y conexión PostgreSQL opcional/segura.
- `web/public/like-media/`: imágenes de marca exportadas desde el sitio aprobado.

## Arranque local

En dos terminales:

```powershell
cd G:\LikeMedia\api
npm run start:dev
```

```powershell
cd G:\LikeMedia\web
npm start
```

La web queda en `http://localhost:4200` y la API en `http://localhost:3000/api`.

Para activar PostgreSQL localmente, copia `api/.env.example` a `api/.env` y completa `DATABASE_URL`. En Railway, configura `DATABASE_URL` como variable del servicio API; nunca la guardes en Git.

## Videollamadas

La implementación inicial usa **Jitsi Meet** como proveedor gratuito: al confirmar una cita la API genera una sala `meet.jit.si` sin coste de licencia ni cuenta obligatoria para el cliente. Para producción conviene evaluar Google Meet si se necesita una agenda de Google Workspace, o autoalojar Jitsi si se requiere control de datos.

## Producción pendiente

Con `DATABASE_URL` configurada, la API crea las tablas `service_packages`, `bookings` y `contacts` al arrancar. Sin esa variable mantiene un fallback temporal en memoria para desarrollo. Antes de publicar se debe conectar un proveedor de correo, un calendario real (Google Calendar/Cal.com/Calendly) y las credenciales de dominio/hosting.
