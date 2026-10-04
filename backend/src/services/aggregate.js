function normalizeArtist(artistName) {
  return artistName.trim().toLowerCase();
}

/**
 * Groups resolved tracks by country, counting each distinct artist once per
 * country (so three tracks by the same artist don't inflate that country's
 * count to 3). Also counts unidentified/no-country tracks.
 * @param {{ artistName: string|null, country: string|null }[]} resolvedTracks
 */
export function aggregateByCountry(resolvedTracks) {
  const artistsByCountry = new Map();
  let unidentified = 0;

  for (const track of resolvedTracks) {
    if (!track.artistName || !track.country) {
      unidentified += 1;
      continue;
    }
    if (!artistsByCountry.has(track.country)) {
      artistsByCountry.set(track.country, new Set());
    }
    artistsByCountry.get(track.country).add(normalizeArtist(track.artistName));
  }

  const countries = [...artistsByCountry.entries()].map(([country, artists]) => ({
    country,
    count: artists.size,
  }));

  return {
    countries,
    unidentified,
    total: resolvedTracks.length,
  };
}
