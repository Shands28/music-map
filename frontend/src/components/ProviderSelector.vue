<script setup>
defineProps({
  modelValue: { type: String, required: true },
})

const emit = defineEmits(['update:modelValue'])

const providers = [
  { id: 'youtube', label: 'YouTube', enabled: true },
  { id: 'spotify', label: 'Spotify', enabled: false },
]
</script>

<template>
  <fieldset class="provider-selector">
    <legend>Source</legend>
    <label v-for="provider in providers" :key="provider.id" class="option" :class="{ disabled: !provider.enabled }">
      <input
        type="radio"
        name="provider"
        :value="provider.id"
        :checked="modelValue === provider.id"
        :disabled="!provider.enabled"
        @change="emit('update:modelValue', provider.id)"
      />
      {{ provider.label }}
      <span v-if="!provider.enabled" class="coming-soon">(próximamente)</span>
    </label>
  </fieldset>
</template>

<style scoped>
.provider-selector {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  border: none;
  padding: 0;
  margin: 0;
  color: var(--text);
}

.option {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
}

.option.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.coming-soon {
  font-size: 0.8em;
  color: var(--text-muted);
}
</style>
