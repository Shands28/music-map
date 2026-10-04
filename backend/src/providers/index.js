import youtubeProvider from './youtube.js';
import spotifyProvider from './spotify.js';

const PROVIDERS = {
  youtube: youtubeProvider,
  spotify: spotifyProvider,
};

function getEnabledProviderNames() {
  return (process.env.ENABLED_PROVIDERS || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);
}

export function getProvider(name) {
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(`Unknown provider "${name}". Available: ${Object.keys(PROVIDERS).join(', ')}`);
  }
  if (!getEnabledProviderNames().includes(name)) {
    throw new Error(`Provider "${name}" is not enabled. Set it in ENABLED_PROVIDERS.`);
  }
  return provider;
}

export function listEnabledProviders() {
  return getEnabledProviderNames().filter((name) => name in PROVIDERS);
}
