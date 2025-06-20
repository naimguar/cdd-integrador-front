# Visualizador de Algoritmos de Compresión

Este proyecto es una interfaz de usuario (frontend) diseñada para interactuar con una API de compresión de datos. Permite a los usuarios introducir texto, comprimirlo utilizando los algoritmos de Huffman y Shannon-Fano, y luego decodificar los resultados para verificar la integridad de los datos.

La aplicación muestra métricas detalladas de la compresión, como la tasa de compresión, la longitud promedio del código y la eficiencia de cada algoritmo.

## Requisitos Previos

Para ejecutar este proyecto, solo necesitas un navegador web moderno (como Google Chrome, Firefox, Microsoft Edge, etc.).

Para el desarrollo y para evitar problemas de CORS (Cross-Origin Resource Sharing) al comunicarte con la API del backend, se recomienda utilizar un servidor web local. Una de las formas más sencillas es usar la extensión **Live Server** en Visual Studio Code.

## Instalación y Puesta en Marcha

Sigue estos pasos para tener el proyecto funcionando en tu máquina local.

### 1. Clonar el Repositorio

Abre una terminal o Git Bash y clona este repositorio en el directorio que prefieras.

```bash
git clone <URL_DEL_REPOSITORIO>
```

Luego, navega al directorio del proyecto:

```bash
cd cdd-integrador-front
```

### 2. Ejecutar la Aplicación

Hay dos maneras de abrir la aplicación:

#### a) Usando un Servidor Local (Recomendado)

Esta es la mejor opción para asegurar que la comunicación con la API del backend funcione correctamente.

1.  Abre el directorio del proyecto en **Visual Studio Code**.
2.  Si no tienes la extensión **Live Server**, instálala desde el panel de Extensiones (Ctrl+Shift+X) buscando `Live Server`.
3.  Haz clic derecho sobre el archivo `index.html` en el explorador de archivos de VS Code.
4.  Selecciona **"Open with Live Server"**.

Esto abrirá la aplicación en tu navegador web por defecto, generalmente en una dirección como `http://127.0.0.1:5500/index.html`.

#### b) Abriendo el Archivo Directamente

También puedes abrir el archivo `index.html` directamente en tu navegador. Sin embargo, ten en cuenta que los navegadores modernos suelen bloquear las solicitudes a una API (`fetch`) desde un archivo local por razones de seguridad (CORS).

### 3. Conexión con el Backend

**Importante:** Este frontend necesita que el **servidor del backend esté en ejecución** para funcionar. El código asume que la API del backend se está ejecutando en la siguiente dirección:

`http://127.0.0.1:8000`

Asegúrate de que el proyecto del backend esté corriendo antes de usar las funciones de compresión y descompresión.

## Cómo Usar la Aplicación

1.  **Introducir Datos:** Escribe o pega texto en el área de texto principal, o carga un archivo `.txt` usando el botón correspondiente.
2.  **Comprimir:** Haz clic en el botón **"Procesar"**. La aplicación enviará el texto al backend para ser comprimido.
3.  **Descargar Resultado:** Inmediatamente después de procesar, el navegador iniciará automáticamente la descarga de un archivo `.json` que contiene los datos comprimidos y las tablas de códigos. Si la descarga no comienza, puedes usar el enlace manual que aparecerá.
4.  **Decodificar:**
    *   En la sección "Decodificación", haz clic para seleccionar el archivo `.json` que acabas de descargar.
    *   Elige el algoritmo que deseas usar para la decodificación (Huffman o Shannon-Fano) en el menú desplegable.
    *   Haz clic en el botón **"Decodificar"**.
5.  **Ver Resultados:** El texto decodificado aparecerá en la parte inferior, y podrás comparar las métricas de compresión en las tablas y gráficos.