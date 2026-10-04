<script setup>
import { computed, ref } from 'vue'
import ProviderSelector from '../components/ProviderSelector.vue'
import WorldMap from '../components/WorldMap.vue'
import TrackList from '../components/TrackList.vue'
import TimelineSlider from '../components/TimelineSlider.vue'
import { aggregateByCountry } from '../utils/aggregate.js'

const provider = ref('youtube')
const playlistRef = ref('')
const loading = ref(false)
const error = ref(null)
const result = ref(null)
const sliderIndex = ref(0)

const timedTracks = computed(() => {
  if (!result.value) return []
  return result.value.tracks
    .filter((track) => track.addedAt)
    .slice()
    .sort((a, b) => new Date(a.addedAt) - new Date(b.addedAt))
})

const mapCountries = computed(() => {
  if (!result.value) return []
  if (!timedTracks.value.length) return result.value.countries
  return aggregateByCountry(timedTracks.value.slice(0, sliderIndex.value + 1))
})

async function submit() {
  if (!playlistRef.value.trim()) return

  loading.value = true
  error.value = null
  result.value = null

  try {
    const url = `/api/playlist/countries?provider=${encodeURIComponent(provider.value)}&ref=${encodeURIComponent(playlistRef.value)}`
    const response = await fetch(url)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong.')
    }

    result.value = data
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main class="playlist-view">
    <section class="header">
      <h1>World Music Map</h1>
      <p class="subtitle">Descubre de dónde son los artistas de tu playlist.</p>

      <form class="controls" @submit.prevent="submit">
        <ProviderSelector v-model="provider" />
        <input
          v-model="playlistRef"
          type="text"
          placeholder="URL o ID de la playlist"
          class="playlist-input"
        />
        <button type="submit" class="primary-button" :disabled="loading">
          {{ loading ? 'Cargando…' : 'Mapear' }}
        </button>
      </form>

      <p v-if="loading" class="status">
        Resolviendo países de los artistas vía MusicBrainz, esto puede tardar (hay límite de 1 petición/segundo)…
      </p>
      <p v-if="error" class="status error">{{ error }}</p>
    </section>

    <section v-if="result" class="map-section">
      <WorldMap :countries="mapCountries" />
    </section>

    <section v-if="result" class="results">
      <TimelineSlider :tracks="timedTracks" @update:index="sliderIndex = $event" />
      <p class="summary">
        {{ result.total - result.unidentified }} de {{ result.total }} canciones ubicadas en el mapa.
        <span v-if="result.unidentified > 0">
          {{ result.unidentified }} canción(es) no se pudieron identificar o no tienen país conocido.
        </span>
      </p>
      <TrackList :tracks="result.tracks" />
    </section>
  </main>
</template>

<style scoped>
.playlist-view {
  padding-bottom: 3rem;
}

.header,
.results {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 1.5rem;
}

.header {
  padding-top: 2rem;
}

h1 {
  font-size: 2rem;
  margin: 0 0 0.25rem;
}

.subtitle {
  color: var(--text-muted);
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  margin: 1.5rem 0 1rem;
}

.playlist-input {
  flex: 1;
  min-width: 240px;
  padding: 0.6rem 0.9rem;
  font-size: 1rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
}

.playlist-input:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.primary-button {
  background: var(--accent);
  color: var(--accent-contrast);
  border: none;
  border-radius: 6px;
  padding: 0.6rem 1.3rem;
  font-size: 1rem;
  cursor: pointer;
}

.primary-button:hover:not(:disabled) {
  background: var(--accent-hover);
}

.primary-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status {
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.status.error {
  color: var(--error-text);
}

.map-section {
  width: 100vw;
  margin-left: calc(-50vw + 50%);
  padding: 1.5rem;
  box-sizing: border-box;
  height: 80vh;
  min-height: 560px;
  max-height: 900px;
}

.summary {
  color: var(--text);
  margin-bottom: 0.5rem;
}
</style>
