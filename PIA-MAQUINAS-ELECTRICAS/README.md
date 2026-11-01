# Transformador monofásico

Calculadora del circuito equivalente, pérdidas, eficiencia y regulación de un transformador monofásico a partir de las pruebas de vacío y corto circuito.

## Estructura

```
index.html      página
style.css       estilos
app.js          interfaz y diagrama del circuito
icon.svg        ícono
api/calcular.py función de Vercel (POST /api/calcular), contiene el motor de cálculo
vercel.json     configuración
dev.py          servidor para probar en tu computadora
```

No usa librerías externas de Python, así que no hace falta `requirements.txt`.

## Probar en local

```
python dev.py
```

Abre http://localhost:8000

## Publicar en Vercel

**Opción A, con GitHub (recomendada):**

1. Crea un repositorio en GitHub y sube todos estos archivos (respetando la carpeta `api/`).
2. Entra a https://vercel.com, inicia sesión con GitHub y pulsa **Add New → Project**.
3. Elige el repositorio. En *Framework Preset* deja **Other**. No cambies Build ni Output.
4. Pulsa **Deploy**. Te da una dirección tipo `https://tu-proyecto.vercel.app`.

Cada vez que subas cambios a GitHub, Vercel vuelve a publicar solo.

**Opción B, desde la terminal:**

```
npm i -g vercel
vercel          # primera vez: responde las preguntas, acepta los valores por defecto
vercel --prod   # publica la versión final
```
