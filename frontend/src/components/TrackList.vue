<script setup>
import { computed, reactive } from 'vue'
import iso from 'iso-3166-1'

const props = defineProps({
  tracks: { type: Array, required: true }, // [{ title, artistName, country, sourceUrl, confidence, channelTitle }]
  filterCountry: { type: String, default: null }, // alpha2
})

const emit = defineEmits(['clear-filter'])

const flagged = reactive(new Set())

function countryName(alpha2) {
  if (!alpha2) return null
  const entry = iso.whereAlpha2(alpha2)
  return entry ? entry.country : alpha2
}

function statusOf(track) {
  if (!track.artistName) return { label: 'No identificado', className: 'status-error' }
  if (!track.country) return { label: 'Sin país', className: 'status-warning' }
  if (track.confidence === 'low') return { label: 'Baja confianza', className: 'status-warning' }
  return { label: 'OK', className: 'status-ok' }
}

function addedAtLabel(addedAt) {
  if (!addedAt) return null
  return new Date(addedAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' })
}

const rows = computed(() =>
  props.tracks.map((track, index) => ({
    ...track,
    rowId: `${index}-${track.sourceId || 'row'}`,
    countryLabel: countryName(track.country),
    addedAtLabel: addedAtLabel(track.addedAt),
    status: statusOf(track),
  })),
)

const filteredRows = computed(() => {
  if (!props.filterCountry) return rows.value
  return rows.value.filter((row) => row.country === props.filterCountry)
})

const filterCountryLabel = computed(() => countryName(props.filterCountry))

function toggleFlag(rowId) {
  if (flagged.has(rowId)) flagged.delete(rowId)
  else flagged.add(rowId)
}

function exportReview() {
  const entries = filteredRows.value
    .filter((row) => row.status.className !== 'status-ok' || flagged.has(row.rowId))
    .map((row) => ({
      title: row.title,
      channelTitle: row.channelTitle,
      artistNameGuessed: row.artistName,
      countryGuessed: row.country,
      confidence: row.confidence,
      autoStatus: row.status.label,
      manuallyFlagged: flagged.has(row.rowId),
      sourceUrl: row.sourceUrl,
    }))

  const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'tracks-para-revisar.json'
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="track-list-wrapper">
    <div class="track-list-header">
      <h2>Canciones ({{ filteredRows.length }}<span v-if="filterCountry">&nbsp;/ {{ rows.length }}</span>)</h2>
      <button type="button" class="export-button" @click="exportReview">
        Exportar para revisar
      </button>
    </div>
    <div v-if="filterCountry" class="filter-bar">
      <span class="filter-chip">
        Filtrado por: {{ filterCountryLabel }}
        <button type="button" class="clear-filter" @click="emit('clear-filter')">✕ Borrar filtro</button>
      </span>
    </div>
    <p class="hint">
      Marca con el checkbox cualquier fila que creas incorrecta (aunque diga "OK"). Haz click en un país
      del mapa para filtrar esta tabla. Al exportar se incluyen las marcadas a mano y todas las que no
      quedaron en estado OK (dentro del filtro actual).
    </p>
    <div class="track-list">
      <table>
        <thead>
          <tr>
            <th class="col-flag"></th>
            <th>Título</th>
            <th>Artista detectado</th>
            <th>País</th>
            <th>Añadida</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filteredRows" :key="row.rowId" :class="row.status.className">
            <td class="col-flag">
              <input
                type="checkbox"
                :checked="flagged.has(row.rowId)"
                title="Marcar como incorrecta"
                @change="toggleFlag(row.rowId)"
              />
            </td>
            <td>
              <a v-if="row.sourceUrl" :href="row.sourceUrl" target="_blank" rel="noopener noreferrer">{{ row.title }}</a>
              <span v-else>{{ row.title }}</span>
            </td>
            <td>{{ row.artistName || '—' }}</td>
            <td>{{ row.countryLabel || '—' }}</td>
            <td>{{ row.addedAtLabel || '—' }}</td>
            <td><span class="badge" :class="row.status.className">{{ row.status.label }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.track-list-wrapper {
  margin-top: 1.5rem;
}

.track-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.track-list-header h2 {
  margin: 0;
  font-size: 1.1rem;
}

.export-button {
  background: var(--surface);
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 6px;
  padding: 0.4rem 0.9rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.export-button:hover {
  background: var(--accent);
  color: var(--accent-contrast);
}

.hint {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin: 0.4rem 0 0.75rem;
}

.filter-bar {
  margin-top: 0.5rem;
}

.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--accent-bg);
  color: var(--accent);
  border: 1px solid var(--accent);
  border-radius: 999px;
  padding: 0.2rem 0.3rem 0.2rem 0.75rem;
  font-size: 0.82rem;
}

.clear-filter {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-size: 0.78rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.clear-filter:hover {
  background: var(--accent);
  color: var(--accent-contrast);
}

.track-list {
  max-height: 420px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

thead th {
  position: sticky;
  top: 0;
  background: var(--surface);
  text-align: left;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--border);
  color: var(--text-muted);
  font-weight: 600;
}

.col-flag {
  width: 2.5rem;
  text-align: center;
}

tbody td {
  padding: 0.4rem 0.75rem;
  border-bottom: 1px solid var(--border);
  color: var(--text);
}

tbody a {
  color: var(--accent);
}

tbody tr:hover {
  background: rgba(79, 70, 229, 0.05);
}

.badge {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.78rem;
}

.badge.status-ok {
  background: var(--ok-bg);
  color: var(--ok-text);
}

.badge.status-warning {
  background: var(--warning-bg);
  color: var(--warning-text);
}

.badge.status-error {
  background: var(--error-bg);
  color: var(--error-text);
}
</style>
