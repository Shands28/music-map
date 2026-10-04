<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as d3 from 'd3'
import { feature } from 'topojson-client'
import worldTopology from 'world-atlas/countries-110m.json'
import iso from 'iso-3166-1'

const props = defineProps({
  countries: { type: Array, required: true }, // [{ country: 'US', count: 12 }]
})

const svgRef = ref(null)
const tooltip = ref({ visible: false, x: 0, y: 0, text: '' })

const worldFeatures = feature(worldTopology, worldTopology.objects.countries).features

let zoomBehavior = null

function alpha2ToNumericId(alpha2) {
  const entry = iso.whereAlpha2(alpha2)
  return entry ? entry.numeric : null
}

function render() {
  const container = svgRef.value
  if (!container) return

  const width = container.clientWidth || 800
  const height = Math.min(width * 0.6, Math.max(window.innerHeight * 0.7, 480))

  const countsByNumericId = new Map()
  for (const { country, count } of props.countries) {
    const numericId = alpha2ToNumericId(country)
    if (numericId) countsByNumericId.set(numericId, count)
  }

  const maxCount = Math.max(1, ...countsByNumericId.values())
  const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, maxCount])

  const projection = d3.geoNaturalEarth1().fitSize([width, height], { type: 'Sphere' })
  const path = d3.geoPath(projection)

  const svg = d3.select(container)
  svg.selectAll('*').remove()
  svg.attr('viewBox', `0 0 ${width} ${height}`).attr('width', '100%').attr('height', height)

  const g = svg.append('g')

  g.append('path')
    .attr('class', 'sphere')
    .attr('d', path({ type: 'Sphere' }))
    .attr('fill', '#eef2ff')

  g.selectAll('path.country')
    .data(worldFeatures)
    .join('path')
    .attr('class', 'country')
    .attr('d', path)
    .attr('fill', (d) => {
      const count = countsByNumericId.get(d.id)
      return count ? colorScale(count) : '#d8dce3'
    })
    .attr('stroke', '#ffffff')
    .attr('stroke-width', 0.5)
    .on('mousemove', (event, d) => {
      const count = countsByNumericId.get(d.id) || 0
      tooltip.value = {
        visible: true,
        x: event.offsetX,
        y: event.offsetY,
        text: `${d.properties.name}: ${count}`,
      }
    })
    .on('mouseleave', () => {
      tooltip.value.visible = false
    })

  zoomBehavior = d3
    .zoom()
    .scaleExtent([1, 10])
    .translateExtent([[0, 0], [width, height]])
    .on('zoom', (event) => {
      g.attr('transform', event.transform)
      tooltip.value.visible = false
    })

  svg.call(zoomBehavior)
}

function zoomBy(factor) {
  const svg = d3.select(svgRef.value)
  svg.transition().duration(200).call(zoomBehavior.scaleBy, factor)
}

function resetZoom() {
  const svg = d3.select(svgRef.value)
  svg.transition().duration(200).call(zoomBehavior.transform, d3.zoomIdentity)
}

function handleResize() {
  render()
}

onMounted(() => {
  render()
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => window.removeEventListener('resize', handleResize))
watch(() => props.countries, render, { deep: true })
</script>

<template>
  <div class="world-map">
    <svg ref="svgRef"></svg>
    <div class="zoom-controls">
      <button type="button" @click="zoomBy(1.5)">+</button>
      <button type="button" @click="zoomBy(1 / 1.5)">−</button>
      <button type="button" class="reset" @click="resetZoom">Reset</button>
    </div>
    <div v-if="tooltip.visible" class="tooltip" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
      {{ tooltip.text }}
    </div>
  </div>
</template>

<style scoped>
.world-map {
  position: relative;
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.world-map svg {
  display: block;
  cursor: grab;
}

.zoom-controls {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.zoom-controls button {
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.zoom-controls button.reset {
  width: auto;
  font-size: 0.75rem;
  padding: 0 0.5rem;
}

.zoom-controls button:hover {
  background: var(--accent);
  color: var(--accent-contrast);
  border-color: var(--accent);
}

.tooltip {
  position: absolute;
  pointer-events: none;
  background: rgba(20, 20, 25, 0.9);
  color: #ffffff;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.85rem;
  transform: translate(-50%, -120%);
}
</style>
