# SecureNotes API — Examen 3.º Parcial

API REST segura para la gestión de notas personales construida con **NestJS 11**, **PostgreSQL** y **TypeORM**. 

Este proyecto evalúa y aplica los mecanismos de seguridad para las unidades de autenticación, control de acceso a nivel de objeto y gestión avanzada de sesiones (GL7 y GL8).

---

## 🛠️ Requisitos Previos

- **Node.js**: v20 LTS o superior.
- **PostgreSQL**: v14 o superior.

---

## 🚀 Pasos de Ejecución

### 1. Clonación e Instalación de Dependencias
Una vez clonado el repositorio, entra en el directorio del proyecto e instala todas las dependencias requeridas:
```bash
npm install
```

### 2. Configuración de Variables de Entorno (`.env`)
1. Copia el archivo de plantilla `.env.example` y crea el archivo `.env`:
   ```bash
   cp .env.example .env
   ```
2. Abre el archivo `.env` y define tus secretos y credenciales de base de datos.
   
   *Ejemplo de configuración para la evaluación:*
   ```env
   DATABASE_HOST=localhost
   DATABASE_PORT=5432
   DATABASE_NAME=securenotes
   DATABASE_USER=postgres
   DATABASE_PASSWORD=admin

   JWT_ACCESS_SECRET=super_secret_access_key_inf781_securenotes_2026_xK9mP2qR
   JWT_REFRESH_SECRET=super_secret_refresh_key_inf781_securenotes_2026_zN7vL4wT
   JWT_ACCESS_EXPIRES=15m
   JWT_REFRESH_EXPIRES=7d

   NODE_ENV=development
   PORT=3000
   ```

### 3. Crear la Base de Datos en PostgreSQL
Antes de iniciar la aplicación, debes asegurarte de que la base de datos `securenotes` exista en tu servidor PostgreSQL local. Puedes crearla ejecutando el siguiente comando en tu cliente de base de datos o consola de PostgreSQL:
```sql
CREATE DATABASE securenotes;
```

### 4. Arrancar la Aplicación
Inicia el servidor en modo desarrollo:
```bash
npm run start:dev
```
Una vez iniciado, la consola mostrará el inicio de la aplicación y el mapeo de todas las rutas:
`🚀 SecureNotes API running on http://localhost:3000`

Las tablas correspondientes (`users`, `notes` y `refresh_tokens`) se crearán automáticamente gracias a TypeORM (sincronización activa únicamente en desarrollo).

---

## 🧪 Pruebas de Validación (Postman)

El proyecto incluye una colección preconfigurada para probar de forma ordenada y automatizada todos los escenarios de seguridad solicitados.

El archivo de la colección se encuentra en:
👉 `securenotes_postman_collection.json`

### Cómo utilizar la colección:
1. Abre **Postman** e importa el archivo `securenotes_postman_collection.json`.
2. Se cargará la colección **SecureNotes API** con 12 peticiones ordenadas numéricamente del `01` al `12`.
3. Ejecútalas en orden secuencial para simular y validar todos los flujos del examen:
   - **Registro y Login (`01` y `02`)**: Registra al *Usuario A*, inicia su sesión y genera las cookies seguras httpOnly correspondientes.
   - **Rutas Protegidas (`03`)**: Confirma el rechazo de peticiones sin token con `401 Unauthorized`.
   - **CRUD Notas Propias (`04` y `05`)**: Crea y lista notas de forma exclusiva para el *Usuario A*.
   - **Control de Acceso de Objeto (`06` y `07`)**: Registra al *Usuario B* e intenta leer la nota del *Usuario A*, confirmando que la respuesta es **`404 Not Found`** para mitigar la enumeración de recursos.
   - **Rotación de Sesiones (`08`)**: Renueva el `accessToken` consumiendo y rotando la cookie de sesión del servidor.
   - **Detección de Reúso (`09`)**: Envía un token de refresco antiguo y ya utilizado para simular un robo. La API detectará el reúso, bloqueará e invalidará todas las sesiones del usuario y devolverá **`403 Forbidden`**.
   - **Cierre de Sesión (`10`)**: Realiza logout revocando el token del lado del servidor.
   - **Perfil y Sesiones (`11` y `12`)**: Valida que `/auth/me` no exponga el campo `password` y que `/auth/sessions` devuelva el listado de dispositivos activos de forma limpia.

---

## 🔒 Mecanismos de Seguridad Implementados

1. **Argon2 Password Hashing:** Las contraseñas se encriptan inmediatamente en el registro con `argon2` y nunca se almacenan o exponen en texto plano.
2. **DTO Validation:** Entrada de datos estrictamente saneada con `class-validator` y `ValidationPipe` en modo whitelist/forbidNonWhitelisted.
3. **httpOnly, Secure & SameSite Cookies:** Los refresh tokens se almacenan en cookies protegidas del lado del cliente, haciéndolos inmunes a ataques XSS.
4. **Refresh Token Rotation & Reuse Detection:** Cada refresco invalida el token previo y genera uno nuevo. Si un token revocado es enviado de nuevo, se interpreta como un ataque de replay e invalida inmediatamente todas las sesiones del usuario afectado.
5. **No Exposure of Passwords:** Hiding implícito del campo `password` en el decorador de la entidad de TypeORM (`select: false`).
6. **Object-Level Access Control (OLAC):** Consultas cruzadas de base de datos blindadas por `ownerId` devolviendo HTTP 404 en vez de 403 para evitar escaneo/enumeración de IDs de notas.
