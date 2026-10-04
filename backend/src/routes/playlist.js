import { Router } from 'express';
import { getProvider } from '../providers/index.js';
import { getArtistCountry } from '../services/artistCountry.js';
import { aggregateByCountry } from '../services/aggregate.js';

const router = Router();

router.get('/countries', async (req, res) => {
  const { provider: providerName, ref } = req.query;

  if (!providerName || !ref) {
    return res.status(400).json({ error: 'Both "provider" and "ref" query params are required.' });
  }

  let provider;
  try {
    provider = getProvider(providerName);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    const tracks = await provider.getPlaylistTracks(ref);

    const uniqueArtists = [...new Set(tracks.filter((t) => t.artistName).map((t) => t.artistName))];
    const artistCountries = {};
    for (const artistName of uniqueArtists) {
      artistCountries[artistName] = await getArtistCountry(artistName);
    }

    const resolvedTracks = tracks.map((track) => ({
      ...track,
      country: track.artistName ? artistCountries[track.artistName] : null,
    }));

    const aggregate = aggregateByCountry(resolvedTracks);

    return res.json({
      provider: providerName,
      ...aggregate,
      tracks: resolvedTracks,
    });
  } catch (err) {
    if (err.code === 'QUOTA_EXCEEDED') {
      return res.status(403).json({ error: 'YouTube API quota exceeded for today. Try again tomorrow.' });
    }
    if (err.code === 'PLAYLIST_NOT_FOUND') {
      return res.status(404).json({ error: 'Playlist not found or is private.' });
    }
    return res.status(500).json({ error: err.message });
  }
});

export default router;
