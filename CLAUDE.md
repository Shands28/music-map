# CLAUDE.md

Este archivo da contexto a Claude Code sobre el proyecto. Colócalo en la raíz del repositorio (al mismo nivel que las carpetas `backend/` y `frontend/`).

## Resumen del proyecto

Aplicación web que lee playlists de una plataforma de música, obtiene el país de origen de cada artista (vía MusicBrainz) y dibuja un mapa mundial mostrando de dónde son las canciones que escucha el usuario.

La **fuente de datos es intercambiable**: en el producto final el usuario elegirá entre **YouTube** y **Spotify**. Durante el desarrollo inicial se implementa **solo YouTube**; Spotify se añade después sin tocar el resto de la aplicación.

## Stack tecnológico

- **Backend**: Node.js + Express
- **Frontend**: Vue 3 (Vite)
- **Fuentes de datos (providers)**: YouTube Data API v3 (primera fase), Spotify Web API (segunda fase)
- **País del artista**: MusicBrainz API (común a todos los providers)

## Estructura de carpetas

```
/
├── CLAUDE.md          <- este archivo
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── playlist.js        <- endpoint común a todos los providers
│   │   │   └── auth.js            <- OAuth (solo providers que lo necesiten)
│   │   ├── providers/
│   │   │   ├── index.js           <- registro de providers por nombre
│   │   │   ├── youtube.js         <- fase 1
│   │   │   └── spotify.js         <- fase 2
│   │   ├── services/
│   │   │   ├── artistCountry.js   <- MusicBrainz + caché
│   │   │   └── aggregate.js       <- conteo por país
│   │   └── index.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── ProviderSelector.vue
    │   │   └── WorldMap.vue
    │   ├── views/
    │   └── main.js
    └── package.json
```

## Arquitectura: patrón provider

Cada fuente de datos implementa la misma interfaz y devuelve **tracks normalizados**. Todo lo que viene después (MusicBrainz, agregación, mapa) es independiente de la fuente.

### Contrato de un provider

```js
export default {
  name: 'youtube',
  requiresAuth: false,
  async getPlaylistTracks(playlistRef, options) {
    return [{ title, artistName, sourceId, sourceUrl }];
  },
};
```

- `playlistRef`: ID o URL de la playlist (el provider se encarga de extraer el ID).
- `artistName`: nombre de artista ya limpio. Cada provider es responsable de obtenerlo de su fuente.
- Si un provider no puede determinar el artista de un track, devuelve `artistName: null` y el track se omite del mapa (se cuenta aparte como "sin identificar").

### Selección del provider

- El frontend envía el provider elegido por el usuario.
- Endpoint único: `GET /api/playlist/countries?provider=youtube&ref=<id_o_url>`
- `providers/index.js` resuelve el provider por nombre y lanza un error claro si no existe o no está habilitado.
- Un flag de configuración (`ENABLED_PROVIDERS` en `.env`) permite activar Spotify solo cuando esté implementado.

## Flujo general

1. Usuario elige provider y pega el link/ID de la playlist.
2. Backend llama al provider y obtiene tracks normalizados.
3. Backend extrae artistas únicos y resuelve su país en MusicBrainz (con caché).
4. Backend agrega por país y devuelve el resultado.
5. Frontend dibuja el mapa mundial coloreado por conteo.

## Fase 1: provider de YouTube (desarrollar primero)

### API

- YouTube Data API v3, gratuita, sin suscripción.
- Playlists **públicas**: basta una API key (sin OAuth).
- Playlists privadas del usuario: requeriría OAuth de Google; dejar fuera del alcance inicial.

### Endpoints a usar

- `GET /youtube/v3/playlistItems?part=snippet&playlistId={id}&maxResults=50` — paginar con `nextPageToken`. Cuesta 1 unidad de cuota por llamada.
- Evitar `search.list`: cuesta 100 unidades por llamada.

### Cuota

- 10,000 unidades por día por proyecto de Google Cloud (se reinicia a medianoche, hora del Pacífico).
- Un error `403 quotaExceeded` significa cuota agotada: devolver un mensaje claro al frontend.
- Verificar en la documentación oficial si hay cupos adicionales específicos para ciertos endpoints.

### Extracción del artista (punto crítico)

YouTube devuelve videos, no artistas estructurados. De cada item solo hay título del video y nombre del canal. Heurísticas a implementar, en orden de prioridad:

1. Si el canal termina en `- Topic` (canales autogenerados de YouTube Music), el artista es el nombre del canal sin ese sufijo.
2. Si el título sigue el patrón `Artista - Canción`, tomar lo que está antes del guion.
3. Limpiar ruido: `(Official Video)`, `[Lyrics]`, `ft.`, `feat.`, `(Audio)`, `HD`, etc.
4. Si nada funciona, usar el nombre del canal como último recurso y marcar el track como baja confianza.

Mantener estas reglas aisladas en una función pura y testeable (`parseArtistFromVideo`), porque es la parte que más iteración va a necesitar.

### Variables de entorno

```
YOUTUBE_API_KEY=
```

## Fase 2: provider de Spotify (después)

### Requisitos y restricciones conocidas (verificar antes de empezar)

- Desde febrero-marzo de 2026, las apps en Development Mode exigen que el **propietario de la app tenga Spotify Premium activo**.
- Límite de 5 usuarios autorizados por app y un client ID por desarrollador en apps nuevas.
- Se eliminaron `popularity`, `followers`, `available_markets` y los audio features para apps nuevas.
- Los endpoints de playlist usan `/items` en lugar de `/tracks`.
- Estas reglas han cambiado varias veces en 2026: **consultar la documentación oficial antes de implementar**.

### Implementación

- OAuth Authorization Code en el backend (el `client_secret` nunca va al frontend).
- Endpoints propios: `GET /auth/spotify/login` y `GET /auth/spotify/callback`.
- `GET /playlists/{id}/items` para leer las canciones; el artista viene estructurado, así que `artistName` es directo (mucho más fiable que en YouTube).
- Implementar el refresh del access token.

### Variables de entorno

```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://localhost:3000/auth/spotify/callback
```

## País del artista: MusicBrainz (común)

- Base URL: `https://musicbrainz.org/ws/2/artist/`
- Búsqueda: `?query=artist:{nombre}&fmt=json`
- Extraer `country` (código ISO) o `area` del mejor resultado.
- Enviar siempre un `User-Agent` que identifique la app (requisito de MusicBrainz).
- Rate limit: máximo 1 request por segundo sin autenticación. Usar una cola con delay.
- Caché de artista → país en disco o SQLite, para que sobreviva a reinicios.
- Problemas esperados: nombres homónimos, artistas poco conocidos sin país registrado, nombres mal extraídos (especialmente con YouTube). Guardar también el resultado "no encontrado" en caché para no repetir la consulta.

## Frontend (Vue 3)

### Vistas y componentes

- `ProviderSelector` — el usuario elige YouTube o Spotify (Spotify deshabilitado hasta la fase 2).
- Vista de entrada de playlist — input para link/ID.
- `WorldMap` — mapa coloreado por país, con tooltip de conteo.
- Indicador de progreso mientras se resuelven artistas (MusicBrainz es lento por el rate limit).
- Resumen de tracks no identificados o con baja confianza.

### Librería de mapa

Evaluar D3.js + TopoJSON de países (más control) frente a una librería de choropleth ya hecha (más rápido).

### Regla de comunicación

El frontend **nunca** habla directo con YouTube, Spotify ni MusicBrainz. Todo pasa por el backend.

## Seguridad de credenciales

- Ninguna API key, client secret o token debe ser público ni subirse a git.
- Todas las credenciales viven solo en `backend/.env`, que debe estar en `.gitignore` desde el primer commit.
- Mantener un `backend/.env.example` con los nombres de las variables y valores vacíos; ese sí se versiona.
- No hardcodear credenciales en el código, en tests ni en ejemplos.
- El frontend nunca recibe ni usa claves: todas las llamadas a YouTube, Spotify y MusicBrainz pasan por el backend. No usar variables `VITE_*` para secretos, porque Vite las incluye en el bundle público.
- No registrar credenciales en logs ni devolverlas en respuestas de error.
- Antes de cada commit, verificar que `.env` no aparece en `git status`. Si una clave llegara a subirse por error, revocarla y generar una nueva (borrar el commit no basta, queda en el historial).

## Variables de entorno globales (backend/.env)

```
PORT=3000
ENABLED_PROVIDERS=youtube
MUSICBRAINZ_USER_AGENT=WorldMusicMap/0.1 (contact@example.com)
```

## Checklist de desarrollo

### Base
- [ ] Inicializar `backend/` (Express) y `frontend/` (Vue + Vite)
- [ ] Crear `.gitignore` (incluyendo `.env`) y `backend/.env.example` antes del primer commit
- [ ] Definir el contrato de provider y el registro en `providers/index.js`
- [ ] Servicio MusicBrainz con cola de rate limit y caché persistente
- [ ] Servicio de agregación por país
- [ ] Endpoint `GET /api/playlist/countries`

### Fase 1: YouTube
- [ ] Crear proyecto en Google Cloud y obtener API key
- [ ] Provider de YouTube: lectura paginada de playlist
- [ ] `parseArtistFromVideo` con tests sobre títulos reales
- [ ] Manejo de errores (playlist privada o inexistente, cuota agotada)
- [ ] Frontend: input de playlist, selector de provider, mapa
- [ ] Indicador de progreso y resumen de tracks no identificados

### Fase 2: Spotify
- [ ] Verificar requisitos vigentes (Premium del propietario, límites de usuarios)
- [ ] Registrar la app en el Dashboard de Spotify for Developers
- [ ] OAuth: login, callback, refresh de token
- [ ] Provider de Spotify con la misma interfaz normalizada
- [ ] Habilitar Spotify en `ENABLED_PROVIDERS` y en el selector del frontend

## Convenciones de código

- Todo el código y los comentarios en inglés.
- Comentarios mínimos: solo donde la lógica no sea evidente.
- Nunca incluir credenciales reales en commits, código o ejemplos (ver sección de seguridad).
- Los providers no deben importar nada de otros providers ni de MusicBrainz.
- Añadir un provider nuevo no debe requerir cambios fuera de `providers/` y del selector del frontend.
