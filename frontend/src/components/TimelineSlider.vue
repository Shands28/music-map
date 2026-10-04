<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  tracks: { type: Array, required: true }, // sorted ascending by addedAt
})

const emit = defineEmits(['update:index'])

const index = ref(props.tracks.length ? props.tracks.length - 1 : 0)
const playing = ref(false)
let playTimer = null

watch(
  () => props.tracks.length,
  (length) => {
    index.value = length ? length - 1 : 0
  },
)

watch(index, (value) => emit('update:index', value), { immediate: true })

const current = computed(() => props.tracks[index.value] || null)

const dateLabel = computed(() => {
  if (!current.value?.addedAt) return ''
  return new Date(current.value.addedAt).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
})

function stopPlaying() {
  clearInterval(playTimer)
  playTimer = null
  playing.value = false
}

function togglePlay() {
  if (playing.value) {
    stopPlaying()
    return
  }
  if (index.value >= props.tracks.length - 1) index.value = 0
  playing.value = true
  playTimer = setInterval(() => {
    if (index.value >= props.tracks.length - 1) {
      stopPlaying()
      return
    }
    index.value += 1
  }, 120)
}

onUnmounted(stopPlaying)
</script>

<template>
  <div v-if="tracks.length" class="timeline">
    <div class="timeline-row">
      <button type="button" class="play-button" @click="togglePlay">
        {{ playing ? '⏸' : '▶' }}
      </button>
      <input
        type="range"
        min="0"
        :max="tracks.length - 1"
        v-model.number="index"
        class="slider"
        @input="stopPlaying"
      />
      <span class="count">{{ index + 1 }} / {{ tracks.length }}</span>
    </div>
    <p class="meta">
      Mostrando canciones añadidas hasta <strong>{{ dateLabel }}</strong>
      <span v-if="current"> — última: "{{ current.title }}"<span v-if="current.artistName"> ({{ current.artistName }})</span></span>
    </p>
  </div>
</template>

<style scoped>
.timeline {
  margin: 1rem 0;
}

.timeline-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.play-button {
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.play-button:hover {
  background: var(--accent);
  color: var(--accent-contrast);
  border-color: var(--accent);
}

.slider {
  flex: 1;
  accent-color: var(--accent);
}

.count {
  color: var(--text-muted);
  font-size: 0.85rem;
  min-width: 4.5rem;
  text-align: right;
}

.meta {
  margin-top: 0.4rem;
  color: var(--text-muted);
  font-size: 0.85rem;
}
</style>
