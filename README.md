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

### Sincronización con Google Calendar

La API puede crear automáticamente un evento de 30 minutos en Google Calendar y enviar la invitación al cliente. Para activarlo, crea una cuenta de servicio de Google, comparte con ella el calendario de reservas y define en Railway `GOOGLE_CALENDAR_ID` y `GOOGLE_SERVICE_ACCOUNT_JSON`. La reserva y el archivo `.ics` siguen funcionando aunque estas variables estén vacías.

## Producción y panel privado

Con `DATABASE_URL` configurada, la API crea las tablas `service_packages`, `bookings` y `contacts` al arrancar. Sin esa variable mantiene un fallback temporal en memoria para desarrollo. En el plan gratuito de Railway, usa Brevo por HTTPS: define `MAIL_PROVIDER=brevo`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` y `BREVO_SENDER_NAME` en Railway, con el remitente verificado en Brevo. Cuando se habilite un plan de Railway con SMTP saliente, puedes cambiar `MAIL_PROVIDER=smtp` y utilizar las variables `SMTP_*`. Nunca guardes una API key o contraseña en Git.

La ruta `/admin` contiene un panel privado para consultar reservas, mensajes y paquetes publicados. Actívalo definiendo en Railway una variable `ADMIN_TOKEN` larga y aleatoria (solo en Variables, nunca en el repositorio). El token se introduce en la pantalla y se conserva únicamente en `sessionStorage` del navegador. La API aplica además un honeypot y un límite temporal de cinco envíos por email para reducir spam.

Antes de cada publicación, ejecuta `npm run build:api` y `npm run build:web` desde la raíz. Las claves locales, archivos `.env` y credenciales de Google están incluidos en `.gitignore` y no deben copiarse al repositorio.
