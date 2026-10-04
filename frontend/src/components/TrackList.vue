<script setup>
import { computed, reactive, ref } from 'vue'
import iso from 'iso-3166-1'

const props = defineProps({
  tracks: { type: Array, required: true }, // [{ title, artistName, country, sourceUrl, confidence, channelTitle }]
})

const flagged = reactive(new Set())
const reasons = reactive({}) // rowId -> reason text
const copyState = ref('idle') // 'idle' | 'copied' | 'error'
const showExportModal = ref(false)

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

const rows = computed(() =>
  props.tracks.map((track, index) => ({
    ...track,
    rowId: track.sourceId || String(index),
    countryLabel: countryName(track.country),
    status: statusOf(track),
  })),
)

function toggleFlag(rowId) {
  if (flagged.has(rowId)) {
    flagged.delete(rowId)
    delete reasons[rowId]
  } else {
    flagged.add(rowId)
  }
}

const flaggedRows = computed(() => rows.value.filter((row) => flagged.has(row.rowId)))

function downloadJson(json) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'tracks-para-revisar.json'
  link.click()
  URL.revokeObjectURL(url)
}

function openExportModal() {
  if (flagged.size === 0) return
  showExportModal.value = true
}

function closeExportModal() {
  showExportModal.value = false
}

async function confirmExport() {
  const entries = flaggedRows.value.map((row) => ({
    title: row.title,
    channelTitle: row.channelTitle,
    artistNameGuessed: row.artistName,
    countryGuessed: row.country,
    confidence: row.confidence,
    autoStatus: row.status.label,
    reason: (reasons[row.rowId] || '').trim(),
    sourceUrl: row.sourceUrl,
  }))

  const json = JSON.stringify(entries, null, 2)

  try {
    await navigator.clipboard.writeText(json)
    copyState.value = 'copied'
  } catch {
    // Clipboard API unavailable (e.g. insecure context) — fall back to a file download.
    downloadJson(json)
    copyState.value = 'error'
  }
  showExportModal.value = false
  setTimeout(() => (copyState.value = 'idle'), 2000)
}
</script>

<template>
  <div class="track-list-wrapper">
    <div class="track-list-header">
      <h2>Canciones ({{ rows.length }})</h2>
      <button
        type="button"
        class="export-button"
        :disabled="flagged.size === 0"
        :title="flagged.size === 0 ? 'Marca al menos una canción para exportarla' : ''"
        @click="openExportModal"
      >
        <span v-if="copyState === 'copied'">Copiado al portapapeles ✓</span>
        <span v-else-if="copyState === 'error'">Portapapeles no disponible, descargado</span>
        <span v-else>Exportar marcadas ({{ flagged.size }})</span>
      </button>
    </div>
    <p class="hint">
      Marca con el checkbox cualquier fila que creas incorrecta. Al exportar podrás indicar el
      motivo de cada una antes de copiarlas al portapapeles.
    </p>
    <div class="track-list">
      <table>
        <thead>
          <tr>
            <th class="col-flag"></th>
            <th>Título</th>
            <th>Artista detectado</th>
            <th>País</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.rowId" :class="row.status.className">
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
            <td><span class="badge" :class="row.status.className">{{ row.status.label }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showExportModal" class="modal-backdrop" @click.self="closeExportModal">
      <div class="modal" role="dialog" aria-modal="true">
        <h3>Motivo de las {{ flaggedRows.length }} canciones marcadas</h3>
        <div class="modal-list">
          <div v-for="row in flaggedRows" :key="row.rowId" class="modal-row">
            <div class="modal-row-header">
              <strong>{{ row.artistName || row.title }}</strong>
              <span class="badge" :class="row.status.className">{{ row.status.label }}</span>
            </div>
            <div class="modal-row-title">{{ row.title }}</div>
            <textarea
              v-model="reasons[row.rowId]"
              rows="2"
              placeholder="¿Por qué está mal? (opcional)"
            ></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="secondary-button" @click="closeExportModal">Cancelar</button>
          <button type="button" class="export-button" @click="confirmExport">Copiar al portapapeles</button>
        </div>
      </div>
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

.export-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: var(--surface);
  color: var(--text-muted);
  border-color: var(--border);
}

.export-button:disabled:hover {
  background: var(--surface);
  color: var(--text-muted);
}

.hint {
  color: var(--text-muted);
  font-size: 0.85rem;
  margin: 0.4rem 0 0.75rem;
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

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 100;
}

.modal {
  background: var(--surface);
  border-radius: 10px;
  padding: 1.25rem;
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.modal h3 {
  margin: 0;
  font-size: 1rem;
}

.modal-list {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-right: 0.25rem;
}

.modal-row {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.modal-row-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.modal-row-title {
  color: var(--text-muted);
  font-size: 0.85rem;
}

.modal-row textarea {
  width: 100%;
  resize: vertical;
  font-family: inherit;
  font-size: 0.85rem;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.secondary-button {
  background: var(--surface);
  color: var(--text-muted);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.4rem 0.9rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.secondary-button:hover {
  background: var(--border);
}
</style>
