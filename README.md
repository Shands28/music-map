# Music Map

Aplicación web que lee una playlist de YouTube (y, próximamente, de Spotify), averigua el país de origen de cada artista a través de MusicBrainz, y dibuja un mapa mundial mostrando de dónde son las canciones que escuchas.

## Cómo funciona

1. Eliges un proveedor (por ahora, solo YouTube) y pegas el link o ID de una playlist.
2. El backend lee la playlist, extrae artista y título de cada vídeo y resuelve el país de cada artista en MusicBrainz (con caché en disco para no repetir consultas).
3. El backend agrega los resultados por país.
4. El frontend dibuja un mapa mundial coloreado por número de artistas distintos por país, con una tabla de canciones para revisar los casos dudosos.

La fuente de datos es intercambiable: la arquitectura usa un patrón de **providers**, así que añadir Spotify más adelante no debería requerir tocar el resto de la aplicación (ver `CLAUDE.md` para el detalle de la arquitectura).

## Stack

- **Backend**: Node.js + Express
- **Frontend**: Vue 3 (Vite) + D3.js para el mapa
- **Fuente de datos**: YouTube Data API v3
- **País del artista**: MusicBrainz API

## Estructura

```
/
├── backend/   # API Express: providers, resolución de país, agregación
└── frontend/  # SPA Vue: selector de playlist, mapa, tabla de revisión
```

## Puesta en marcha

### Backend

```
cd backend
npm install
cp .env.example .env   # y rellena YOUTUBE_API_KEY y MUSICBRAINZ_USER_AGENT
npm run dev
```

### Frontend

```
cd frontend
npm install
npm run dev
```

El frontend nunca llama directamente a YouTube ni a MusicBrainz: todo pasa por el backend.

## Funcionalidades de revisión

Como la extracción de artista desde YouTube (título del vídeo + nombre del canal) es heurística, la tabla de resultados marca cada canción como `OK`, `Baja confianza`, `Sin país` o `No identificado`. Puedes marcar manualmente cualquier fila adicional que creas incorrecta y, al exportar, se abre un modal donde indicar el motivo de cada canción marcada antes de copiar el resumen en JSON al portapapeles.

## Estado del proyecto

- ✅ Provider de YouTube (playlists públicas, sin OAuth)
- ✅ Resolución de país vía MusicBrainz con caché persistente
- ✅ Mapa mundial interactivo (filtro por país, scrubber por fecha de añadida)
- ⏳ Provider de Spotify (pendiente)

Más detalle de la arquitectura, convenciones y el checklist de desarrollo en [`CLAUDE.md`](./CLAUDE.md).
