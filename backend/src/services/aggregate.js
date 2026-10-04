/**
 * Groups resolved tracks by country and counts unidentified/no-country tracks.
 * @param {{ artistName: string|null, country: string|null }[]} resolvedTracks
 */
export function aggregateByCountry(resolvedTracks) {
  const countryCounts = {};
  let unidentified = 0;

  for (const track of resolvedTracks) {
    if (!track.artistName || !track.country) {
      unidentified += 1;
      continue;
    }
    countryCounts[track.country] = (countryCounts[track.country] || 0) + 1;
  }

  return {
    countries: Object.entries(countryCounts).map(([country, count]) => ({ country, count })),
    unidentified,
    total: resolvedTracks.length,
  };
}
