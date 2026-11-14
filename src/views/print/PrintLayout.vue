<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import { useI18n } from '@/composables/useI18n'
import { useBusinessStore } from '@/stores/business'
import './print.css'

// Printable page (no menu or header): an on-screen toolbar to print / save as PDF and
// go back, and a heading with the business, the title and the printing date
interface Props {
  title: string
  subtitle?: string
  orientation?: 'landscape' | 'portrait'
  loading?: boolean
  error?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  orientation: 'portrait',
  loading: false,
  error: false,
})

const { t, locale } = useI18n()
const router = useRouter()
const business = useBusinessStore()

const businessName = computed(() => business.currentBusiness?.name ?? '')
const printedAt = computed(() =>
  new Date().toLocaleDateString(locale.value, { day: 'numeric', month: 'long', year: 'numeric' })
)
// @page can't be scoped per route from a stylesheet: each page sets its own
const pageStyle = computed(() => `@page { size: A4 ${props.orientation}; margin: 10mm; }`)

// Screen preview: the A4-wide sheet shrinks to the available width, and the −/+ buttons
// zoom it (the sheet width comes from the paper size, not from the DOM, which zoom alters)
const MM_TO_PX = 96 / 25.4
const ZOOM_STEP = 1.25
const MAX_SCALE = 2
const sheetWidth = computed(() => (props.orientation === 'landscape' ? 297 : 210) * MM_TO_PX)
const stage = ref<HTMLElement | null>(null)
const fitScale = ref(1)
// null: follow the screen width; a number once the user zooms
const userScale = ref<number | null>(null)
const scale = computed(() => userScale.value ?? fitScale.value)
const fit = () => {
  if (stage.value) fitScale.value = Math.min(1, stage.value.clientWidth / sheetWidth.value)
}
const zoomIn = () => { userScale.value = Math.min(MAX_SCALE, scale.value * ZOOM_STEP) }
const zoomOut = () => { userScale.value = Math.max(fitScale.value, scale.value / ZOOM_STEP) }
const resetZoom = () => { userScale.value = null }
const canZoomOut = computed(() => scale.value > fitScale.value + 0.001)
const canZoomIn = computed(() => scale.value < MAX_SCALE - 0.001)
const observer = new ResizeObserver(fit)
onMounted(() => {
  if (stage.value) observer.observe(stage.value)
  fit()
})
onUnmounted(() => observer.disconnect())
watch(() => props.orientation, () => nextTick(fit))

const goBack = () => (window.history.length > 1 ? router.back() : router.push('/'))
const print = () => window.print()
</script>

<template>
  <component :is="'style'">{{ pageStyle }}</component>

  <div class="print-page" :class="`print-page--${orientation}`">
    <!-- Toolbar (screen only) -->
    <div class="print-toolbar no-print">
      <Button variant="outline-secondary" @click="goBack">
        <Lucide icon="ArrowLeft" class="w-4 h-4 mr-2" />
        {{ t('print.back') }}
      </Button>
      <div class="flex flex-wrap items-center gap-3 ml-auto">
        <slot name="controls" />
        <div class="flex items-center gap-1" role="group" :aria-label="t('print.zoom.label')">
          <Button variant="outline-secondary" class="px-3" :disabled="!canZoomOut" :title="t('print.zoom.out')" :aria-label="t('print.zoom.out')" @click="zoomOut">
            <Lucide icon="ZoomOut" class="w-4 h-4" />
          </Button>
          <button type="button" class="w-16 text-sm text-center text-slate-600" :title="t('print.zoom.fit')" @click="resetZoom">
            {{ Math.round(scale * 100) }}%
          </button>
          <Button variant="outline-secondary" class="px-3" :disabled="!canZoomIn" :title="t('print.zoom.in')" :aria-label="t('print.zoom.in')" @click="zoomIn">
            <Lucide icon="ZoomIn" class="w-4 h-4" />
          </Button>
          <Button v-if="userScale !== null" variant="outline-secondary" :title="t('print.zoom.fit')" @click="resetZoom">
            <Lucide icon="Maximize2" class="w-4 h-4 sm:mr-2" />
            <span class="hidden sm:inline">{{ t('print.zoom.fit') }}</span>
          </Button>
        </div>
        <Button variant="primary" :disabled="loading || error" @click="print">
          <Lucide icon="Printer" class="w-4 h-4 mr-2" />
          {{ t('print.print') }}
        </Button>
      </div>
    </div>

    <div ref="stage" class="print-stage">
      <div class="print-sheet" :style="{ zoom: scale }">
        <header class="print-header">
          <div>
            <div class="print-header__business">{{ businessName }}</div>
            <h1 class="print-header__title">{{ title }}</h1>
            <div v-if="subtitle" class="print-header__subtitle">{{ subtitle }}</div>
          </div>
          <div class="print-header__date">{{ t('print.printedAt', { date: printedAt }) }}</div>
        </header>

        <div v-if="loading" class="print-state no-print">
          <Lucide icon="Loader" class="w-6 h-6 animate-spin text-slate-400" />
        </div>
        <div v-else-if="error" class="print-state">
          <Lucide icon="AlertCircle" class="w-8 h-8 text-danger" />
          <div>{{ t('print.loadError') }}</div>
        </div>
        <slot v-else />
      </div>
    </div>
  </div>
</template>
