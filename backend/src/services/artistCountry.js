import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, '..', '..', 'data', 'artist-country-cache.json');
const MUSICBRAINZ_BASE = 'https://musicbrainz.org/ws/2/artist/';
const RATE_LIMIT_MS = 1000;

let cache = loadCache();
let queueTail = Promise.resolve();

function loadCache() {
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveCache() {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

function cacheKey(artistName) {
  return artistName.trim().toLowerCase();
}

function scheduleAfterDelay(fn) {
  const run = () => new Promise((resolve) => setTimeout(() => resolve(fn()), RATE_LIMIT_MS));
  const result = queueTail.then(run);
  // Keep the chain alive even if this call's result isn't awaited elsewhere.
  queueTail = result.catch(() => {});
  return result;
}

async function queryMusicBrainz(artistName) {
  const userAgent = process.env.MUSICBRAINZ_USER_AGENT;
  if (!userAgent) {
    throw new Error('MUSICBRAINZ_USER_AGENT is not configured.');
  }

  const url = new URL(MUSICBRAINZ_BASE);
  url.searchParams.set('query', `artist:${artistName}`);
  url.searchParams.set('fmt', 'json');

  const response = await fetch(url, {
    headers: { 'User-Agent': userAgent },
  });
  if (!response.ok) {
    throw new Error(`MusicBrainz API error: ${response.status}`);
  }

  const data = await response.json();
  const best = data.artists?.[0];
  if (!best) return null;
  return best.country || best.area?.name || null;
}

/**
 * Resolves an artist's country, using a persistent cache and a queue that
 * respects MusicBrainz's 1 request/second rate limit without authentication.
 * "Not found" results are cached too, so we never repeat a failed lookup.
 * @returns {Promise<string|null>}
 */
export async function getArtistCountry(artistName) {
  const key = cacheKey(artistName);
  if (key in cache) {
    return cache[key];
  }

  const country = await scheduleAfterDelay(() => queryMusicBrainz(artistName));
  cache[key] = country;
  saveCache();
  return country;
}

export function _resetCacheForTests() {
  cache = {};
}
