## Requisitos
- Tener instalado Python (cualquier versión 3.x)
- Un navegador web moderno (Chrome, Firefox, Edge, etc.)

## Instrucciones rápidas

1. **Clona este repositorio**

```bash
git clone https://github.com/naimguar/cdd-integrador-front
cd cdd-integrador-front
```

2. **Levanta un servidor local**

En la carpeta del proyecto, ejecuta:

```bash
python -m http.server 8001
```

Esto iniciará un servidor local en el puerto 8001.

3. **Abre la aplicación en tu navegador**

Ve a la siguiente dirección:

```
http://localhost:8001/index.html
```

4. **Asegúrate de que el backend esté corriendo**

El frontend necesita que el backend esté funcionando en:
```
http://127.0.0.1:8000
```

5. **¿Cómo se usa?**
- Escribe o pega el texto a comprimir, o sube un archivo `.txt`.
- Haz clic en **Procesar**. Se descargará automáticamente un archivo `.json` con los datos comprimidos.
- Para decodificar, sube ese archivo `.json` en la sección de decodificación, elige el algoritmo y haz clic en **Decodificar**.
- El resultado aparecerá en pantalla.
