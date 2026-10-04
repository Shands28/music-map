<script setup>
import { ref } from 'vue'
import ProviderSelector from '../components/ProviderSelector.vue'
import WorldMap from '../components/WorldMap.vue'

const provider = ref('youtube')
const playlistRef = ref('')
const loading = ref(false)
const error = ref(null)
const result = ref(null)

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
    <h1>World Music Map</h1>
    <p class="subtitle">See where the artists in your playlist come from.</p>

    <form class="controls" @submit.prevent="submit">
      <ProviderSelector v-model="provider" />
      <input
        v-model="playlistRef"
        type="text"
        placeholder="Playlist URL or ID"
        class="playlist-input"
      />
      <button type="submit" :disabled="loading">
        {{ loading ? 'Loading…' : 'Map it' }}
      </button>
    </form>

    <p v-if="loading" class="status">
      Resolving artist countries via MusicBrainz, this can take a while (rate-limited)…
    </p>
    <p v-if="error" class="status error">{{ error }}</p>

    <template v-if="result">
      <WorldMap :countries="result.countries" />
      <p class="summary">
        {{ result.total - result.unidentified }} of {{ result.total }} tracks placed on the map.
        <span v-if="result.unidentified > 0">
          {{ result.unidentified }} track(s) could not be identified or had no known country.
        </span>
      </p>
    </template>
  </main>
</template>

<style scoped>
.playlist-view {
  max-width: 960px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

.subtitle {
  color: #666;
  margin-top: -0.5rem;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  margin: 1.5rem 0;
}

.playlist-input {
  flex: 1;
  min-width: 240px;
  padding: 0.5rem 0.75rem;
  font-size: 1rem;
}

.status {
  color: #666;
}

.status.error {
  color: #c0392b;
}

.summary {
  margin-top: 1rem;
  color: #444;
}
</style>
