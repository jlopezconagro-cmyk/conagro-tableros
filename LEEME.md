# Tableros Conagro — cómo ponerlo en marcha

Esta carpeta es la app completa. Las páginas viven en GitHub Pages y los datos, usuarios y contraseñas en Supabase.
Los datos nunca están en GitHub: ahí solo vive el código.

```
index.html           la app
js/config.js         dirección de tu proyecto de Supabase (lo único que se edita)
js/lectores.js       lee tus 5 archivos de Excel
js/tableros.js       las vistas (Resumen, Ventas, Cartera, etc.)
js/app.js            sesión, carga de datos y administración
img/logo.png         logo
supabase/esquema.sql base de datos y reglas de seguridad (se pega una vez en Supabase)
```

## 1. Base de datos (una sola vez, 2 minutos)
1. En Supabase abre **SQL Editor → New query**.
2. Abre `supabase/esquema.sql`, copia todo, pégalo y dale **Run**. Debe terminar con "Success".
   (Si algún día lo vuelves a correr, no borra datos.)

## 2. Ajustes de seguridad en Supabase
1. **Authentication → Sign In / Providers → Email**: apaga **"Allow new users to sign up"**.
   Así solo tú das de alta usuarios; nadie puede registrarse solo.
2. **Authentication → URL Configuration → Site URL**: pon la dirección de la app en GitHub Pages
   (paso 4), por ejemplo `https://tu-usuario.github.io/conagro-tableros/`. Sirve para los correos de "olvidé mi contraseña".

## 3. Conexión
Abre `js/config.js` y en `SUPABASE_URL` pon tu **Project URL** (botón verde **Connect** en Supabase).
La llave publishable ya está puesta. **Nunca** pongas ahí la llave secret / service_role.

## 4. Publicar en GitHub Pages
1. En GitHub crea un repositorio nuevo llamado `conagro-tableros` (público; el código no contiene datos).
2. **Add file → Upload files** y arrastra el contenido de esta carpeta (index.html, js, img; la carpeta supabase es opcional). **Commit changes**.
3. **Settings → Pages → Build and deployment**: Source "Deploy from a branch", Branch **main** y carpeta **/(root)**, **Save**.
4. En uno o dos minutos la app queda en `https://tu-usuario.github.io/conagro-tableros/`.

## 5. Tu usuario de Dirección (la primera vez)
1. Supabase → **Authentication → Users → Add user → Create new user**: tu correo, una contraseña y marca **Auto Confirm User**.
2. SQL Editor → corre esto con tu correo:
   ```sql
   update perfiles set rol = 'direccion', nombre = 'José Manuel López Contreras' where email = 'TU-CORREO';
   ```
3. Entra a la app. Los demás usuarios (incluido José Delmar) se asignan ya desde la página **Usuarios** de la app.

## 6. Cargar los datos
En la app, **Cargar datos**: arrastra tus archivos (puedes soltar los 5 juntos). La app reconoce cada uno,
muestra una revisión (totales, cortes, cosas que no cuadran) y solo publica cuando das **Publicar**.
- Cartera, ventas, situación financiera y estado de resultados **reemplazan** lo que había (cada archivo trae su historia completa).
- Inventario se **agrega** como informe nuevo (la fecha va en el nombre: `AAAAMMDD_inventario_conagro.xlsx`);
  las sucursales responden las sugerencias del CEDIS de cada informe desde cero.

## 7. Usuarios
- Alta: Supabase → Authentication → Users → Add user (correo + contraseña + Auto Confirm). Luego en la app → **Usuarios**:
  nombre, rol (Vendedor / Dirección) y sucursal(es) → **Guardar**. Una cuenta por persona, aunque compartan sucursal.
- Baja: en **Usuarios** desmarca **Activo** y guarda. Deja de ver datos de inmediato.
- Contraseñas: cada quien la cambia en "Cambiar mi contraseña" (en computadora), o con "¿Olvidaste tu contraseña?" en la entrada.

## Qué ve cada quien (lo aplica la base de datos, no la pantalla)
| | Dirección | Vendedor |
|---|---|---|
| Ventas en pesos, gastos, objetivos | ✓ | — (solo porcentajes de su sucursal en "Mi meta") |
| Cartera | todas las sucursales | solo la suya |
| Estado de resultados, situación financiera | ✓ | — |
| Inventario con costos y valor | ✓ | — (productos, existencias y precios de su almacén) |
| Sugerencias del CEDIS | ve las respuestas | responde las de su sucursal |
| Estatus "Incobrable" | confirma o quita | solo puede proponerlo |

## Formatos: qué se puede cambiar en tus Excel
| Archivo | Puedes cambiar | Hay que respetar |
|---|---|---|
| Cartera de clientes | orden de columnas, columnas extra, clientes y cortes nuevos | pestaña "BASE DE DATOS" y los nombres de sus columnas; los 6 rangos de vencimiento escritos igual |
| Reporte Dashboard | todo lo demás del libro, meses y años nuevos | pestaña "datos_macro_ventas" y sus encabezados |
| Situación financiera | bancos, cuentas y renglones nuevos; mover filas | pestañas "Al dd-mm-aa" y los títulos de sección (📦 Inventario, 🏦 Bancos, 👥 Clientes, 🧾, 📉, Total pasivos, Capital Contable) |
| Estado de resultados | conceptos y meses nuevos | pestaña "Trabajado", fila "Mes" y la sangría de la columna A |
| Inventario | — (lo genera tu script) | fecha AAAAMMDD en el nombre y nombres de las pestañas |

Si aparece una sucursal nueva, la revisión te avisa: agrégala en Supabase → **Table Editor → sucursales**
(clave como viene en ventas, nombre, cómo se llama en cartera, en inventario y como destino del CEDIS).

## Bueno saber
- El plan gratuito de Supabase pausa el proyecto si nadie lo usa en una semana; se reactiva desde el panel de Supabase.
- La llave publishable de `config.js` es pública por diseño: sin usuario y contraseña no da acceso a ningún dato.
