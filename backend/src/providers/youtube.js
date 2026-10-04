const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

const NOISE_PATTERNS = [
  /\(official\s*(music\s*)?video\)/gi,
  /\(official\s*audio\)/gi,
  /\[official\s*(music\s*)?video\]/gi,
  /\[official\s*audio\]/gi,
  /\(lyrics?\)/gi,
  /\[lyrics?\]/gi,
  /\(audio\)/gi,
  /\[audio\]/gi,
  /\(hd\)/gi,
  /\[hd\]/gi,
  /\(hq\)/gi,
  /\[hq\]/gi,
  /\(4k\)/gi,
  /\[4k\]/gi,
  /\(visualizer\)/gi,
  /\[visualizer\]/gi,
  /\(m\/v\)/gi,
  /\[m\/v\]/gi,
];

function cleanNoise(text) {
  let result = text;
  for (const pattern of NOISE_PATTERNS) {
    result = result.replace(pattern, '');
  }
  // feat./ft. and whatever follows up to end or next separator
  result = result.replace(/\b(feat\.?|ft\.?)\s+.+$/i, '');
  return result.replace(/\s{2,}/g, ' ').trim();
}

function stripTopicSuffix(channelTitle) {
  return channelTitle.replace(/\s*-\s*Topic$/i, '').trim();
}

/**
 * Extracts an artist name from a YouTube video's title and channel title.
 * Pure function, no network calls, so it can be unit tested directly.
 * @returns {{ artistName: string, confidence: 'high' | 'low' }}
 */
export function parseArtistFromVideo({ videoTitle, channelTitle }) {
  const cleanedChannel = (channelTitle || '').trim();
  const cleanedTitle = cleanNoise(videoTitle || '');

  // 1. Auto-generated "Artist - Topic" channel (YouTube Music).
  if (/-\s*Topic$/i.test(cleanedChannel)) {
    return { artistName: stripTopicSuffix(cleanedChannel), confidence: 'high' };
  }

  // 2. "Artist - Song" pattern in the title.
  const dashMatch = cleanedTitle.match(/^(.+?)\s[-–—]\s(.+)$/);
  if (dashMatch && dashMatch[1].trim().length > 0) {
    return { artistName: dashMatch[1].trim(), confidence: 'high' };
  }

  // 3. Last resort: the channel name itself, low confidence.
  if (cleanedChannel.length > 0) {
    return { artistName: cleanedChannel, confidence: 'low' };
  }

  return { artistName: null, confidence: 'low' };
}

function extractPlaylistId(playlistRef) {
  const trimmed = (playlistRef || '').trim();
  try {
    const url = new URL(trimmed);
    const listParam = url.searchParams.get('list');
    if (listParam) return listParam;
  } catch {
    // not a URL, fall through to treat it as a raw ID
  }
  return trimmed;
}

async function fetchPlaylistPage(playlistId, apiKey, pageToken) {
  const url = new URL(`${YOUTUBE_API_BASE}/playlistItems`);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('playlistId', playlistId);
  url.searchParams.set('maxResults', '50');
  url.searchParams.set('key', apiKey);
  if (pageToken) url.searchParams.set('pageToken', pageToken);

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const reason = body?.error?.errors?.[0]?.reason;
    if (response.status === 403 && reason === 'quotaExceeded') {
      const err = new Error('YouTube API quota exceeded for today.');
      err.code = 'QUOTA_EXCEEDED';
      throw err;
    }
    if (response.status === 404 || reason === 'playlistNotFound') {
      const err = new Error('Playlist not found or is private.');
      err.code = 'PLAYLIST_NOT_FOUND';
      throw err;
    }
    const err = new Error(`YouTube API error: ${response.status}`);
    err.code = 'YOUTUBE_API_ERROR';
    throw err;
  }
  return response.json();
}

export default {
  name: 'youtube',
  requiresAuth: false,

  async getPlaylistTracks(playlistRef, options = {}) {
    const apiKey = options.apiKey || process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      throw new Error('YOUTUBE_API_KEY is not configured.');
    }

    const playlistId = extractPlaylistId(playlistRef);
    const tracks = [];
    let pageToken;

    do {
      const page = await fetchPlaylistPage(playlistId, apiKey, pageToken);
      for (const item of page.items || []) {
        const snippet = item.snippet || {};
        const videoTitle = snippet.title;
        const channelTitle = snippet.videoOwnerChannelTitle || snippet.channelTitle;
        const videoId = snippet.resourceId?.videoId;

        const { artistName, confidence } = parseArtistFromVideo({ videoTitle, channelTitle });

        tracks.push({
          title: videoTitle,
          artistName,
          sourceId: videoId,
          sourceUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
          confidence,
          channelTitle,
        });
      }
      pageToken = page.nextPageToken;
    } while (pageToken);

    return tracks;
  },
};

export { cleanNoise };
