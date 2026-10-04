// Phase 2 stub. Implemented once Spotify's Development Mode requirements
// (owner Premium, 5-user cap, etc.) are verified against current docs.
export default {
  name: 'spotify',
  requiresAuth: true,

  async getPlaylistTracks(_playlistRef, _options = {}) {
    throw new Error('Spotify provider is not implemented yet.');
  },
};
