# 🔮 Tarot Web App con ChatGPT

Una aplicación web interactiva para realizar tiradas de tarot personalizadas utilizando la API de OpenAI (ChatGPT). El usuario introduce una pregunta, y el sistema genera una lectura con 5 cartas al azar y una interpretación espiritual y práctica.

---

## 🌐 Tecnologías Utilizadas

- **Frontend:** HTML + TailwindCSS + JavaScript
- **Backend:** Node.js + Express.js
- **IA:** OpenAI GPT-4
- **Despliegue sugerido:** Netlify (frontend) + Render (backend)

---

## 🛠️ Instalación Local

1. Clona este repositorio:
```bash
git clone https://github.com/tuusuario/tarot-app.git
cd tarot-app-full
```

2. Instala las dependencias del backend:
```bash
cd server
npm install express cors dotenv node-fetch
```

3. Crea un archivo `.env` en el directorio `server/` con tu clave de API:
```
OPENAI_API_KEY=tu_clave_secreta_aqui
```

4. Lanza el backend:
```bash
node server.js
```

5. Abre `public/index.html` en tu navegador local (o sirve con Live Server si usas VSCode).

---

## 🚀 Despliegue

### 1. Backend con Render

- Crea un nuevo servicio web en [Render](https://render.com/)
- Sube el contenido del directorio `server/`
- Agrega la variable de entorno `OPENAI_API_KEY`
- Define el puerto como `3001`

### 2. Frontend con Netlify

- Sube el directorio `public/` como un nuevo sitio estático
- Modifica el script JS para que el endpoint apunte al backend público Render:

```js
fetch("https://TU_BACKEND_RENDER.onrender.com/tarot", { ... })
```

---

## ✨ Créditos y Uso

Este proyecto fue generado con amor por Fran y ChatGPT.  
No olvides meditar antes de lanzar tu tirada 🙏
---

## 🚀 Déploiement en 1 clic

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start)