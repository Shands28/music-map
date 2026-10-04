<script setup>
import { onMounted, ref, watch } from 'vue'
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

function alpha2ToNumericId(alpha2) {
  const entry = iso.whereAlpha2(alpha2)
  return entry ? entry.numeric : null
}

function render() {
  const container = svgRef.value
  if (!container) return

  const width = container.clientWidth || 800
  const height = width * 0.55

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

  svg
    .selectAll('path')
    .data(worldFeatures)
    .join('path')
    .attr('d', path)
    .attr('fill', (d) => {
      const count = countsByNumericId.get(d.id)
      return count ? colorScale(count) : '#e8e8e8'
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
}

onMounted(render)
watch(() => props.countries, render, { deep: true })
</script>

<template>
  <div class="world-map">
    <svg ref="svgRef"></svg>
    <div v-if="tooltip.visible" class="tooltip" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
      {{ tooltip.text }}
    </div>
  </div>
</template>

<style scoped>
.world-map {
  position: relative;
  width: 100%;
}

.tooltip {
  position: absolute;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  font-size: 0.85rem;
  transform: translate(-50%, -120%);
}
</style>
