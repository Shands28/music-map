function normalizeArtist(artistName) {
  return artistName.trim().toLowerCase()
}

/**
 * Mirrors the backend's aggregateByCountry: counts each distinct artist once
 * per country. Used to recompute the map client-side as the time slider
 * moves, without re-querying MusicBrainz.
 * @param {{ artistName: string|null, country: string|null }[]} tracks
 */
export function aggregateByCountry(tracks) {
  const artistsByCountry = new Map()

  for (const track of tracks) {
    if (!track.artistName || !track.country) continue
    if (!artistsByCountry.has(track.country)) {
      artistsByCountry.set(track.country, new Set())
    }
    artistsByCountry.get(track.country).add(normalizeArtist(track.artistName))
  }

  return [...artistsByCountry.entries()].map(([country, artists]) => ({
    country,
    count: artists.size,
  }))
}
