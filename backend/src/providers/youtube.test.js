import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArtistFromVideo } from './youtube.js';

test('uses the channel name when it is an auto-generated "- Topic" channel', () => {
  const result = parseArtistFromVideo({
    videoTitle: 'Bohemian Rhapsody',
    channelTitle: 'Queen - Topic',
  });
  assert.deepEqual(result, { artistName: 'Queen', confidence: 'high' });
});

test('extracts the artist from an "Artist - Song" title', () => {
  const result = parseArtistFromVideo({
    videoTitle: 'Daft Punk - One More Time (Official Video)',
    channelTitle: 'Daft Punk',
  });
  assert.deepEqual(result, { artistName: 'Daft Punk', confidence: 'high' });
});

test('strips [Lyrics] and other noise before matching the dash pattern', () => {
  const result = parseArtistFromVideo({
    videoTitle: '[Lyrics] Tame Impala - The Less I Know The Better',
    channelTitle: 'Some Lyrics Channel',
  });
  assert.deepEqual(result, { artistName: 'Tame Impala', confidence: 'high' });
});

test('drops a feat./ft. tail from the title before matching', () => {
  const result = parseArtistFromVideo({
    videoTitle: 'Calvin Harris - This Is What You Came For ft. Rihanna',
    channelTitle: 'Calvin Harris',
  });
  assert.deepEqual(result, { artistName: 'Calvin Harris', confidence: 'high' });
});

test('falls back to the channel name when no pattern matches', () => {
  const result = parseArtistFromVideo({
    videoTitle: 'Live Session Full Concert HD',
    channelTitle: 'Some Random Channel',
  });
  assert.deepEqual(result, { artistName: 'Some Random Channel', confidence: 'low' });
});

test('returns null artistName when there is nothing usable', () => {
  const result = parseArtistFromVideo({ videoTitle: '', channelTitle: '' });
  assert.deepEqual(result, { artistName: null, confidence: 'low' });
});
