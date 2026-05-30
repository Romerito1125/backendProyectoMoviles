# Backend — Control de Asistencia Laboral

API REST construida con Node.js y Express. Base de datos PostgreSQL gestionada por Supabase.

---

## Requisitos

- Node.js 18 o superior
- Una cuenta y proyecto en Supabase con las tablas `employees`, `registros_jornada` y `pagos` creadas

---

## Instalación

```bash
npm install
cp .env.example .env
# Editar .env con los valores reales
npm run dev
```

El servidor corre en `http://localhost:3000` por defecto.

---

## Variables de entorno

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor. Default: 3000 |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave de servicio de Supabase. Solo en backend, nunca exponer al frontend |
| `SUPABASE_ANON_KEY` | Clave pública. Opcional |
| `INVITE_REDIRECT_URL` | URL a la que Supabase redirige al empleado tras aceptar la invitación |
| `ENCRYPTION_KEY` | Clave AES-256 para encriptar la cédula en base de datos |

Valores de `INVITE_REDIRECT_URL` según entorno:

- Desarrollo web: `http://localhost:8100/set-password`
- Red local / celular: `http://<IP_LOCAL>:8100/set-password`
- Producción móvil: `<appId>://set-password`

La URL que se use debe estar registrada en Supabase Dashboard bajo Authentication > URL Configuration > Redirect URLs.

---

## Autenticación

Las rutas protegidas requieren el JWT de Supabase en el header:

```
Authorization: Bearer <token>
```

El middleware verifica el token contra Supabase usando la service role key y adjunta el usuario en `req.user`. Si el token es inválido o está ausente, responde 401.

Rutas protegidas actualmente:
- `GET /api/employees/me`
- `POST /api/jornadas`
- `PATCH /api/jornadas/:id/salida`

---

## Formato de respuesta

Todas las respuestas siguen el mismo contrato:

```json
{ "success": true, "data": { } }
```

```json
{ "success": false, "message": "descripción del error" }
```

---

## Endpoints

### Employees

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/api/employees` | Lista todos los empleados | No |
| GET | `/api/employees/me` | Empleado del usuario autenticado | Si |
| GET | `/api/employees/:id` | Empleado por id entero o UUID de Supabase Auth | No |
| POST | `/api/employees` | Crea empleado y envía invitación por email | No |
| PUT | `/api/employees/:id` | Actualiza campos del empleado | No |
| DELETE | `/api/employees/:id` | Elimina empleado | No |

**POST /api/employees**

Crea el registro en la tabla `employees` e invita al usuario por email usando la Admin API de Supabase. El empleado recibe un correo con un link para establecer su contraseña. Si la invitación falla, el empleado no se guarda.

Body:
```json
{
  "cedula": "123456789",
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan@empresa.com",
  "salario": 2000000,
  "rol": "empleado"
}
```

`rol` es opcional, default `"empleado"`. Valores aceptados: `"empleado"` o `"admin"`.

La cédula se encripta con AES-256-CBC antes de guardarse en base de datos.

Errores:
- `400` — faltan campos requeridos
- `409` — ya existe un empleado con ese email o cédula
- `502` — Supabase no pudo enviar la invitación

**GET /api/employees/:id**

Acepta tanto el id numérico de la tabla como el UUID de Supabase Auth. El backend detecta el tipo automáticamente y consulta la columna correspondiente.

---

### Jornadas

El registro de jornada se hace en dos pasos separados.

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/api/jornadas` | Lista todos los registros | No |
| GET | `/api/jornadas/:id` | Registro por id | No |
| GET | `/api/jornadas/empleado/:idEmpleado` | Jornadas de un empleado | No |
| GET | `/api/jornadas/empleado/:idEmpleado/resumen-extras` | Total horas extra y valor monetario | No |
| POST | `/api/jornadas` | Marcar entrada | Si |
| PATCH | `/api/jornadas/:id/salida` | Marcar salida | Si |
| PUT | `/api/jornadas/:id` | Edicion completa (admin) | No |
| DELETE | `/api/jornadas/:id` | Eliminar registro (admin) | No |

**POST /api/jornadas — Marcar entrada**

Crea el registro con `hora_salida` en NULL.

Body:
```json
{
  "id_empleado": 5,
  "fecha": "2026-05-25",
  "hora_entrada": "08:00:00",
  "foto_entrada": "https://...",
  "lat_entrada": 4.7109886,
  "lng_entrada": -74.0721372
}
```

`foto_entrada`, `lat_entrada` y `lng_entrada` son opcionales. Devuelve el registro creado con su `id`, que el frontend debe guardar para la llamada de salida.

**PATCH /api/jornadas/:id/salida — Marcar salida**

Actualiza el registro con `hora_salida` y calcula automáticamente:
- `horas_trabajadas` = diferencia entre entrada y salida menos `descanso_horas`
- `horas_extra` = `MAX(0, horas_trabajadas - 7.33)`

Soporta turnos que cruzan medianoche.

Body:
```json
{
  "hora_salida": "17:30:00",
  "descanso_horas": 1,
  "lat_salida": 4.7109886,
  "lng_salida": -74.0721372
}
```

`descanso_horas`, `lat_salida` y `lng_salida` son opcionales. `descanso_horas` default 0.

La respuesta incluye `valor_horas_extra` (calculado, no persiste en base de datos).

Errores:
- `404` — no existe el registro
- `409` — el registro ya tiene hora de salida

**GET /api/jornadas/empleado/:idEmpleado/resumen-extras**

Devuelve el acumulado histórico de horas extra del empleado:

```json
{
  "success": true,
  "data": {
    "id_empleado": 5,
    "total_horas_extra": 12.5,
    "valor_hora_extra": 9948.32,
    "total_valor_extras": 124354.0
  }
}
```

---

### Pagos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/pagos` | Lista todos los pagos |
| GET | `/api/pagos/:id` | Pago por id |
| GET | `/api/pagos/empleado/:idEmpleado` | Pagos de un empleado |
| POST | `/api/pagos` | Crea un pago |
| PUT | `/api/pagos/:id` | Actualiza un pago |
| DELETE | `/api/pagos/:id` | Elimina un pago |

---

## Estructura del proyecto

```
src/
  app.js                        Entrada, configuración de Express
  config/
    supabase.js                 Clientes de Supabase (admin y público)
  controllers/
    employeeController.js       Lógica de empleados
    jornadaController.js        Lógica de jornadas
    pagosController.js          Lógica de pagos
  middlewares/
    auth.js                     Verificación de JWT con Supabase
    errorHandler.js             Manejo global de errores
  routes/
    index.js                    Definición de todas las rutas
  utils/
    encryption.js               Encriptación AES-256-CBC para cédulas
```

---

## Flujo de invitación de empleado

1. El admin hace `POST /api/employees` con los datos del empleado.
2. El backend llama a `supabaseAdmin.auth.admin.inviteUserByEmail`.
3. Supabase envía un email al empleado con un link firmado.
4. El empleado hace clic en el link. Supabase verifica el token y redirige a `INVITE_REDIRECT_URL` con la sesión activa en el hash de la URL.
5. El frontend detecta la sesión y muestra el formulario de nueva contraseña.
6. El empleado llama a `supabase.auth.updateUser({ password })` para establecer su contraseña.
7. Desde ese momento puede iniciar sesión con email y contraseña.

El link de invitación expira en 24 horas. El tiempo se puede ajustar en Supabase Dashboard bajo Authentication > Email Templates.
