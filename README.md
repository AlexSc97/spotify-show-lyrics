# 🎵 Spotify Show Lyrics

Una aplicación de escritorio construida con **Electron** que muestra un overlay flotante, transparente y "click-through" (modo fantasma) con las letras sincronizadas de las canciones que estás escuchando en Spotify. Diseñada específicamente para usarse sobre videojuegos u otras aplicaciones en pantalla completa sin interrumpir tu experiencia.

Además, ¡cuenta con **traducción automática al español en tiempo real** para canciones en otros idiomas!

## ✨ Características Principales

- **👻 Modo Fantasma (Ghost Mode)**: La ventana es completamente transparente y permite hacer clic a través de ella. Puedes jugar a tus juegos favoritos mientras ves la letra en pantalla sin problemas.
- **🎤 Letras Sincronizadas (Synced Lyrics)**: Obtiene las letras sincronizadas automáticamente desde [LRCLIB](https://lrclib.net/) basándose en lo que estás escuchando en Spotify.
- **🌎 Traducción al Español en Tiempo Real**: Detecta canciones en idiomas extranjeros (como inglés) y muestra automáticamente una traducción elegante al español justo debajo de la letra original. (Activada/Desactivada mediante interfaz o atajo de teclado).
- **🕹️ Controles Flotantes Ocultables**: Presionando `Ctrl+Alt+L` puedes desactivar el Modo Fantasma para arrastrar la ventana, ajustar el tamaño de la letra o calibrar el tiempo de sincronización si hay retraso.
- **⚙️ Sincronización Manual**: Botones para adelantar o retrasar las letras con precisión de milisegundos para lograr la sincronización perfecta.

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:
- **Node.js** (versión 18 o superior recomendada).
- Una cuenta de **Spotify** y la aplicación de Spotify Desktop abierta.
- **Credenciales de la API de Spotify**: Necesitarás un `Client ID` y `Client Secret` del [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).

## 🚀 Instalación y Configuración

1. **Clona el repositorio**:
   ```bash
   git clone https://github.com/AlexSc97/spotify-show-lyrics.git
   cd spotify-show-lyrics
   ```

2. **Instala las dependencias**:
   ```bash
   npm install
   ```

3. **Configura tus credenciales de Spotify**:
   Crea un archivo llamado `.env` en la raíz del proyecto y añade tus credenciales. Asegúrate de configurar la URI de redirección exactamente igual en tu Spotify Developer Dashboard.
   ```env
   SPOTIFY_CLIENT_ID=tu_client_id_aqui
   SPOTIFY_CLIENT_SECRET=tu_client_secret_aqui
   SPOTIFY_REDIRECT_URI=http://127.0.0.1:8888/callback
   ```

## 🎮 Uso

1. **Inicia la aplicación**:
   ```bash
   npm start
   ```
2. **Autenticación inicial**:
   La primera vez que la ejecutes, se abrirá tu navegador predeterminado para que inicies sesión en Spotify y autorices la aplicación. Una vez autorizado, la aplicación se conectará automáticamente.
3. **Reproduce música**:
   Abre Spotify y reproduce una canción. ¡La letra sincronizada aparecerá en el overlay!

### ⌨️ Atajos de Teclado Globales

- `Ctrl + Alt + L`: **Bloquear/Desbloquear Modo Fantasma**. Úsalo para interactuar con la aplicación (moverla, cambiar tamaño de fuente) o bloquearla para que los clics la atraviesen hacia tu juego.
- `Ctrl + Alt + T`: **Alternar Traducción (ES)**. Muestra u oculta rápidamente los subtítulos traducidos al español.
- `Ctrl + Alt + R`: **Reintentar Autenticación**. Útil si la sesión caduca o hay problemas de conexión.

## 💻 Tecnologías Utilizadas

- **[Electron](https://www.electronjs.org/)**: Framework principal para la aplicación de escritorio y el overlay transparente.
- **[Express](https://expressjs.com/)**: Servidor local ligero para manejar el flujo de autorización OAuth de Spotify.
- **[spotify-web-api-node](https://github.com/thelinmichael/spotify-web-api-node)**: Para interactuar con la API de Spotify y obtener el estado de reproducción actual.
- **[google-translate-api-x](https://github.com/AidanWelch/google-translate-api-x)**: Para la traducción automática fluida y rápida en tiempo real.
- **[LRCLIB API](https://lrclib.net/)**: Fuente abierta para la obtención de letras sincronizadas (LRC).

## 📜 Licencia

Este proyecto está bajo la licencia ISC. Eres libre de usarlo, modificarlo y distribuirlo.