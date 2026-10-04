import { Router } from 'express';

const router = Router();

// Spotify OAuth (Phase 2). Not implemented until the Spotify provider lands.
router.get('/spotify/login', (_req, res) => {
  res.status(501).json({ error: 'Spotify auth is not implemented yet.' });
});

router.get('/spotify/callback', (_req, res) => {
  res.status(501).json({ error: 'Spotify auth is not implemented yet.' });
});

export default router;
