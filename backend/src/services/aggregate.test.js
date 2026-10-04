import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateByCountry } from './aggregate.js';

test('counts each artist once per country, even with repeated tracks', () => {
  const result = aggregateByCountry([
    { artistName: 'Queen', country: 'GB' },
    { artistName: 'Queen', country: 'GB' },
    { artistName: 'queen', country: 'GB' }, // same artist, different casing
    { artistName: 'Daft Punk', country: 'FR' },
  ]);

  assert.deepEqual(result.countries, [
    { country: 'GB', count: 1 },
    { country: 'FR', count: 1 },
  ]);
  assert.equal(result.unidentified, 0);
  assert.equal(result.total, 4);
});

test('counts different artists in the same country separately', () => {
  const result = aggregateByCountry([
    { artistName: 'Queen', country: 'GB' },
    { artistName: 'Adele', country: 'GB' },
  ]);

  assert.deepEqual(result.countries, [{ country: 'GB', count: 2 }]);
});

test('tracks with no artist or no resolved country count as unidentified', () => {
  const result = aggregateByCountry([
    { artistName: null, country: null },
    { artistName: 'Some Obscure Band', country: null },
  ]);

  assert.deepEqual(result.countries, []);
  assert.equal(result.unidentified, 2);
});
