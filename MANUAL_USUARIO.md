# Manual de Usuario — Sinfonía Salud  
## Sistema de Gestión y Control de Facturación (Pro Live & Fast)

Este manual explica cómo usar el sistema **sin necesidad de conocimientos técnicos**. Siga los pasos en orden la primera vez; después podrá usarlo con fluidez.

---

## 1. ¿Qué es este sistema?

**Sinfonía Salud** es una aplicación para llevar el control de las facturas de **Ambulatorio** y **Urgencias**. Permite:

- Cargar facturas desde archivos Excel (alimentación).
- Actualizar estados (Facturador, Empaquetamiento, Radicación) subiendo otros Excel.
- Ver resúmenes por mes (cuántas facturas, radicadas, vencidas, etc.).
- Filtrar y buscar en la tabla.
- Escribir observaciones por factura.
- Exportar todo a un Excel para reportes o respaldos.
- Sincronizar los datos con **Google Sheets** para tener respaldo en la nube.

Los datos de **Ambulatorio** y **Urgencias** son independientes: cada sección tiene su propia tabla y su propio código de acceso para alimentar información.

---

## 2. Cómo abrir el sistema

1. **Abrir la aplicación**  
   - Si le pasaron una carpeta del proyecto, abra el archivo **`index.html`** con el navegador (doble clic o arrastrar al Chrome/Edge).  
   - O bien, si le indicaron una dirección web (por ejemplo `http://localhost:...`), escriba esa dirección en el navegador.

2. **Recomendación**  
   - Para que **Google** funcione (iniciar sesión y guardar en Google Sheets), la aplicación debe abrirse desde una **dirección web** (por ejemplo `http://localhost` o un servidor), **no** desde “abrir archivo” (`file://`).  
   - Si solo abre el archivo desde su carpeta y Google no inicia sesión, pida a su área de sistemas que le indique la URL correcta (por ejemplo con “npx serve” o un servidor similar).

3. **Navegador**  
   - Use **Chrome** o **Edge** (versiones recientes) para mejor compatibilidad.

---

## 3. Pantalla de inicio

Al abrir **`index.html`** verá:

- **Título:** Sinfonía Salud — Sistema de Gestión y Control de Facturación.
- **Dos botones grandes:**
  - **Ambulatorio:** gestión de facturas ambulatorias.
  - **Urgencias:** gestión de facturas de urgencias.

Haga clic en el que corresponda a su trabajo. Cada uno lleva a una pantalla distinta con su propia tabla y datos.

---

## 4. Inicio de sesión con Google

La primera vez que entre a **Ambulatorio** o **Urgencias**, el sistema puede pedirle **iniciar sesión con Google**. Esto sirve para:

- Guardar y leer datos en **Google Sheets** (respaldo en la nube).
- Mantener la misma información aunque cambie de computador (si usa la misma cuenta de Google).

**Qué hacer:**

1. Cuando aparezca el mensaje de “Autenticación requerida” o “Iniciando sesión con Google…”, haga clic donde le pida **iniciar sesión**.
2. Elija su cuenta de Google (correo corporativo o personal, según lo que use su empresa).
3. Acepte los permisos que pida la aplicación (acceso a Google Sheets).
4. Después de eso, la sesión se **mantiene guardada** en el navegador. No tendrá que volver a iniciar sesión cada vez que entre, salvo que borre los datos del sitio o pase mucho tiempo sin usar (en ese caso le pedirá iniciar de nuevo).

Si no usa Google Sheets, puede seguir usando la aplicación; los datos se guardan en el navegador de todas formas.

---

## 5. Pantalla de Ambulatorio o Urgencias

Una vez dentro de **Ambulatorio** o **Urgencias** verá:

### 5.1 Barra superior (header)

- **Inicio / Ambulatorio / Urgencias:** para cambiar de sección o volver al inicio.
- **Exportar:** descarga un archivo Excel con todos los datos que está viendo (según filtros y mes).
- **Selector de año:** desplegable para elegir el año (ej. 2024, 2025).
- **Alimentación:** botón para cargar un Excel con **nuevas facturas** (pide código de acceso; ver sección 6).
- **Facturador:** carga un Excel que actualiza estado y fecha del facturador.
- **Empaquetamiento:** carga un Excel que actualiza estado y fecha de empaquetamiento.
- **Radicador:** carga un Excel que actualiza estado y fecha de radicación en la entidad.

### 5.2 Panel de estadísticas (tarjetas)

Debajo del header hay varias tarjetas con números:

- **Facturas:** cantidad de facturas en el mes y filtros actuales.
- **Radicadas:** cuántas están con estado “Radicado” en la entidad.
- **Entregadas:** cuántas están “ENTREGADO” en facturador.
- **Pendientes:** cuántas están “PENDIENTE” en empaquetamiento.
- **Vencidas:** cuántas facturas ya pasaron la fecha de vencimiento.
- **Cartera Filtrada:** suma del valor de las facturas que está viendo (con los filtros aplicados).

Estos números cambian al cambiar de mes, año o filtros.

### 5.3 Pestañas de meses y búsqueda

- **Ene, Feb, Mar, … Dic:** botones para ver la información de cada mes. El mes activo se ve resaltado (fondo indigo).
- **Búsqueda rápida:** caja de texto donde puede escribir cualquier palabra (número de factura, entidad, valor, etc.). La tabla se filtra al instante según lo que escriba.

### 5.4 Tabla de facturas

La tabla muestra una fila por factura. Columnas principales:

- **Factura:** número de factura.
- **Valor:** valor en pesos.
- **Fecha Factura / Vencimiento:** fechas calculadas o cargadas.
- **Entidad (EPS):** entidad.
- **Facturador:** nombre del facturador.
- **Estado Facturador / Fecha Facturador:** estado (PENDIENTE, ENTREGADO, ANULADA) y fecha; se actualizan con el Excel “Facturador”.
- **Estado Empaquetamiento / Fecha Empaquetamiento:** se actualizan con el Excel “Empaquetamiento”.
- **Estado Radicación Entidad / Fecha Radicación Entidad:** Radicado o Pendiente; se actualizan con el Excel “Radicador”.
- **Días Restantes:** días hábiles restantes hasta el vencimiento (o “VENCIDA” si ya pasó).
- **Observación:** campo de texto libre para notas (ej. “Reclamación”, “Glosa”, etc.). Puede escribir o editar aquí directamente; se guarda al salir del campo.

**Colores en “Días Restantes”:**

- **Verde:** muchos días hábiles.
- **Amarillo:** pocos días (alerta).
- **Rojo:** muy pocos o vencimiento próximo.
- **Negro (VENCIDA):** ya venció.

### 5.5 Filtros por columna

En cada encabezado de columna hay un **icono de embudo (filter)**. Al hacer clic:

- Se abre un menú con los valores que existen en esa columna (por ejemplo, listado de entidades o de estados).
- Puede marcar o desmarcar casillas para **mostrar solo** las facturas que cumplan lo elegido.
- **Limpiar:** quita el filtro de esa columna. **Cerrar:** cierra el menú sin quitar el filtro.

Puede combinar filtros de varias columnas y la búsqueda rápida a la vez.

### 5.6 Editar en la tabla

- **Observación:** haga clic en la celda de observación, escriba o modifique el texto y, al salir del campo (clic fuera o Tab), se guarda solo.
- **Estado Facturador y Estado Empaquetamiento:** son listas desplegables. Elija **PENDIENTE**, **ENTREGADO** o **ANULADA**; al cambiar, se guarda al instante.

### 5.7 Paginación

Al final de la tabla:

- **Mostrando X registros:** indica cuántas filas hay con los filtros actuales.
- **Mostrar:** desplegable para ver 50, 100 o 200 filas por página.
- **Botones de página:** para pasar a la siguiente o anterior página cuando hay más registros.

---

## 6. Código de Alimentación

Solo el botón **Alimentación** pide un **código** antes de permitir cargar un archivo. Así se evita que cualquiera agregue facturas nuevas.

- **En Ambulatorio** el código es: **1001**
- **En Urgencias** el código es: **1002**

**Pasos:**

1. Clic en **Alimentación**.
2. Se abre una ventana pidiendo el código. Escriba el código correcto (1001 o 1002 según la sección).
3. Clic en **Verificar**. Si es correcto, se abrirá la ventana para elegir el archivo Excel.
4. Si el código es incorrecto, aparecerá un mensaje de error y no se abrirá el archivo.

Puede usar **Cancelar** o **Escape** para cerrar la ventana sin cargar nada.

---

## 7. Carga de archivos Excel

Los cuatro botones (Alimentación, Facturador, Empaquetamiento, Radicador) permiten subir archivos **Excel** (`.xlsx` o `.xls`). Cada uno tiene un uso distinto.

### 7.1 Alimentación (código 1001 / 1002)

- **Qué hace:** agrega **nuevas facturas** o actualiza datos básicos (valor, fecha, entidad, facturador, etc.) si la factura ya existe.
- **Columnas que suele usar el sistema (nombres aproximados):**
  - Número de factura: **FACTURA**, **NÚMERO_DE_FACTURA** o similar.
  - Fecha: **FEC_FACTURA** (fecha y hora; si la hora es 23:59 o después, se toma el día siguiente).
  - Valor: **VLR_FACTURADO**.
  - Entidad: **PB_FACTURA**.
  - Facturador: **FACTURADOR**.
- Las facturas nuevas se asocian al **mes y año** según la fecha de factura. El vencimiento se calcula automáticamente (22 días hábiles desde la fecha de factura, sin contar sábados, domingos ni festivos de Colombia).

### 7.2 Facturador

- **Qué hace:** actualiza **Estado Facturador** y **Fecha Facturador** de las facturas que coincidan con el Excel.
- El archivo debe tener una columna con el **número de factura** (FACTURA, NÚMERO_DE_FACTURA, etc.) y columnas de **fecha** y/o estado que el sistema reconoce (FECHA, FECHA_ENTREGA, FEC_ENTREGA, etc.).

### 7.3 Empaquetamiento

- **Qué hace:** actualiza **Estado Empaquetamiento** y **Fecha Empaquetamiento**.
- Igual que antes: el Excel debe identificar las facturas (por número) y traer fechas/estados en columnas con nombres que el sistema reconozca.

### 7.4 Radicador

- **Qué hace:** actualiza **Estado Radicación Entidad** (por ejemplo a “Radicado”) y **Fecha Radicación Entidad**.
- Suele usar columnas como **ListadoCxC.CxC.Factura** y **ListadoCxC.CxC.Fecha** (o FechaDocumento).

Si su Excel tiene otros nombres de columnas, el sistema intenta buscar columnas que contengan palabras como “FACTURA”, “FECHA”, “FEC_”, etc. En caso de dudas, consulte con el administrador o soporte para ajustar el formato del Excel.

Después de cada carga exitosa, los datos se ven actualizados en la tabla y, si está conectado a Google, se sincronizan con Google Sheets.

---

## 8. Exportar a Excel

- Clic en el botón **Exportar** (barra superior).
- Se descarga un archivo Excel con nombre parecido a: **Sinfonia_Ambulatorio_Ene.xlsx** (o el mes y la sección actual).
- El archivo incluye **todas las columnas** de la tabla para el **mes y año seleccionados** y con los **filtros que tenga aplicados** (si no hay filtros, exporta todo el mes).
- Úselo para reportes, respaldos o enviar información a otras áreas.

---

## 9. Vencimiento y días hábiles

- La **fecha de vencimiento** se calcula como **22 días hábiles** después de la fecha de factura (solo lunes a viernes, sin festivos de Colombia).
- **Días Restantes** muestra cuántos días hábiles faltan hasta esa fecha (o cuántos días hábiles pasaron si ya venció).
- Las facturas que ya pasaron la fecha de vencimiento se marcan como **VENCIDA** y suelen mostrarse en rojo/negro para priorizar su gestión.

---

## 10. Resumen rápido

| Acción | Dónde | Notas |
|--------|--------|--------|
| Ver facturas de un mes | Pestañas Ene–Dic | Elija mes y año. |
| Buscar algo en la tabla | Caja “Búsqueda rápida” | Escribe y filtra al instante. |
| Filtrar por columna | Icono embudo en el encabezado | Marca/desmarca valores. |
| Agregar facturas nuevas | Alimentación (código 1001 o 1002) | Solo con código correcto. |
| Actualizar estados | Facturador / Empaquetamiento / Radicador | Suba el Excel correspondiente. |
| Escribir notas | Columna Observación | Escribir y salir del campo para guardar. |
| Cambiar estado en tabla | Listas Estado Facturador / Empaquetamiento | PENDIENTE, ENTREGADO, ANULADA. |
| Descargar reporte | Exportar | Excel del mes/filtros actuales. |
| Ver resumen numérico | Tarjetas arriba de la tabla | Facturas, Radicadas, Vencidas, Cartera, etc. |

---

## 11. Solución de problemas sencillos

- **“No hay datos”:** asegúrese de haber elegido el **mes y año** correctos y de que no tenga filtros que oculten todo. Pruebe **Limpiar** en los filtros.
- **Google pide iniciar sesión siempre:** use la aplicación desde una **URL** (ej. `http://localhost`) y no desde “abrir archivo”. Si ya lo hace y sigue pasando, puede ser que se hayan borrado los datos del sitio en el navegador.
- **Alimentación no abre el archivo:** verifique que está usando el código correcto (**1001** en Ambulatorio, **1002** en Urgencias).
- **El Excel no actualiza nada:** revise que el archivo tenga columnas con número de factura y que los números coincidan con los de la tabla (sin espacios ni caracteres raros).
- **La tabla no se actualiza:** recargue la página (F5). Los datos se guardan en el navegador y en Google Sheets si está conectado.

---

## 12. Créditos

**Sinfonía Salud — Pro Live & Fast**  
Desarrollado por **Carlos Eduardo Correa Baloco**.

Para más ayuda o cambios en el sistema, contacte al administrador o al área de sistemas.
