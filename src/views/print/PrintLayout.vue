<script setup lang="ts">
import { computed } from 'vue'
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
        <Button variant="primary" :disabled="loading || error" @click="print">
          <Lucide icon="Printer" class="w-4 h-4 mr-2" />
          {{ t('print.print') }}
        </Button>
      </div>
    </div>

    <div class="print-sheet">
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
</template>
