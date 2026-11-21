<script setup lang="ts">
import { ref, toRef, watch } from 'vue'
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import { Dialog } from '@/components/Base/Headless'
import type { ImportType, RowStatus } from '@/services/importService'
import { useImportWizard, REVIEW_ROWS_LIMIT } from './useImportWizard'

const props = defineProps<{
  visible: boolean
  type: ImportType
}>()

const emit = defineEmits<{
  close: []
  // Something was created or updated: the list has to be reloaded
  imported: []
}>()

const {
  t, step, steps, parsed, fileName, mapping, levelMapping, duplicates, preview, statusFilter, result, busy, error,
  isStudents, fields, requiredFields, levelGroups, columnError, sampleRows, levelValues, unmappedLevels,
  filteredRows, visibleRows, importableCount,
  selectFile, downloadTemplate, next, back, setDuplicates, downloadErrorRows, reset,
} = useImportWizard(toRef(props, 'type'))

const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

const statuses: RowStatus[] = ['new', 'update', 'skip', 'error']
const statusClasses: Record<RowStatus, string> = {
  new: 'bg-success/10 text-success',
  update: 'bg-primary/10 text-primary',
  skip: 'bg-slate-100 text-slate-500',
  error: 'bg-danger/10 text-danger',
}

watch(() => props.visible, (open) => { if (open) reset() })

function onFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) void selectFile(file)
  if (fileInput.value) fileInput.value.value = ''
}

function onDrop(event: DragEvent) {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) void selectFile(file)
}

function close() {
  if (busy.value) return
  if (result.value && (result.value.created || result.value.updated)) emit('imported')
  emit('close')
}

const stepNumber = () => steps.value.indexOf(step.value) + 1
</script>

<template>
  <Dialog :open="visible" size="xl" :staticBackdrop="true" @close="close">
    <Dialog.Panel class="p-0 overflow-hidden" data-testid="import-wizard">
      <!-- Header -->
      <div class="px-4 sm:px-6 pt-6 pb-4 border-b border-slate-100">
        <h2 class="text-lg font-semibold text-slate-800">{{ t(`imports.title.${type}`) }}</h2>
        <p class="mt-1 text-sm text-slate-500">
          {{ t('imports.stepOf', { n: stepNumber(), total: steps.length }) }} · {{ t(`imports.steps.${step}`) }}
          <template v-if="fileName"> · {{ fileName }}</template>
        </p>
      </div>

      <div class="px-4 sm:px-6 py-4 max-h-[65vh] overflow-y-auto">
        <!-- Step 1: file -->
        <div v-if="step === 'file'" class="space-y-4">
          <p class="text-sm text-slate-600">{{ t(`imports.file.intro.${type}`) }}</p>
          <label
            class="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors"
            :class="dragging ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-primary/50'"
            @dragover.prevent="dragging = true"
            @dragleave.prevent="dragging = false"
            @drop.prevent="onDrop"
          >
            <Lucide v-if="busy" icon="Loader" class="w-8 h-8 text-primary animate-spin" />
            <Lucide v-else icon="FileSpreadsheet" class="w-8 h-8 text-slate-400" />
            <span class="text-sm font-medium text-slate-700">{{ busy ? t('imports.file.reading') : t('imports.file.choose') }}</span>
            <span class="text-xs text-slate-400">{{ t('imports.file.formats') }}</span>
            <input ref="fileInput" data-testid="import-file" type="file" accept=".xlsx,.csv" class="hidden" :disabled="busy" @change="onFileChange" />
          </label>
          <button type="button" class="flex items-center gap-1.5 text-sm text-primary hover:underline" :disabled="busy" @click="downloadTemplate">
            <Lucide icon="Download" class="w-4 h-4" />{{ t('imports.file.template') }}
          </button>
        </div>

        <!-- Step 2: columns -->
        <div v-else-if="step === 'columns' && parsed" class="space-y-4">
          <p class="text-sm text-slate-600">{{ t('imports.columns.intro', { n: parsed.rows.length }) }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div v-for="field in fields" :key="field">
              <label class="block mb-1 text-xs font-medium text-slate-500">
                {{ t(`imports.fields.${field}`) }}<span v-if="requiredFields.includes(field)"> *</span>
              </label>
              <select v-model="mapping[field]" :data-testid="`import-column-${field}`" class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                <option :value="null">{{ requiredFields.includes(field) ? t('imports.columns.choose') : t('imports.columns.skip') }}</option>
                <option v-for="(header, i) in parsed.headers" :key="i" :value="i">{{ header }}</option>
              </select>
            </div>
          </div>
          <p v-if="columnError" class="text-xs text-danger">{{ columnError }}</p>

          <div v-else>
            <div class="mb-2 text-xs font-medium text-slate-500">{{ t('imports.columns.sample') }}</div>
            <div class="overflow-x-auto border border-slate-100 rounded-lg">
              <table class="w-full text-xs">
                <thead class="bg-slate-50 text-slate-500">
                  <tr><th v-for="field in fields" :key="field" class="px-3 py-2 text-left font-medium whitespace-nowrap">{{ t(`imports.fields.${field}`) }}</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(row, i) in sampleRows" :key="i" class="border-t border-slate-100">
                    <td v-for="field in fields" :key="field" class="px-3 py-2 text-slate-700 whitespace-nowrap">{{ row[field] || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Step 3: levels (students) -->
        <div v-else-if="step === 'levels'" class="space-y-3">
          <p class="text-sm text-slate-600">{{ t('imports.levels.intro') }}</p>
          <div v-if="levelGroups.length === 0" class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {{ t('imports.levels.noLevels') }}
          </div>
          <div v-for="item in levelValues" :key="item.value" class="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr] gap-1 sm:gap-3 sm:items-center">
            <div class="text-sm">
              <span class="font-medium text-slate-700">{{ item.value }}</span>
              <span class="ml-1 text-xs text-slate-400">{{ t('imports.levels.rows', { n: item.count }, item.count) }}</span>
            </div>
            <select
              v-model="levelMapping[item.value]"
              data-testid="import-level"
              class="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              :class="levelMapping[item.value] ? 'border-slate-200' : 'border-amber-300'"
            >
              <option value="">{{ t('imports.levels.unassigned') }}</option>
              <optgroup v-for="group in levelGroups" :key="group.track" :label="group.track">
                <option v-for="level in group.levels" :key="level.id" :value="level.id">{{ group.track }} · {{ level.name }}</option>
              </optgroup>
            </select>
          </div>
          <p v-if="unmappedLevels" class="text-xs text-amber-600">{{ t('imports.levels.unmappedHint', { n: unmappedLevels }, unmappedLevels) }}</p>
        </div>

        <!-- Step 4: review -->
        <div v-else-if="step === 'review' && preview" class="space-y-4">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              v-for="status in statuses"
              :key="status"
              type="button"
              :data-testid="`import-status-${status}`"
              :data-count="preview.summary[status]"
              class="rounded-lg border px-3 py-2 text-left transition-colors"
              :class="statusFilter === status ? 'border-primary ring-1 ring-primary' : 'border-slate-200 hover:border-slate-300'"
              @click="statusFilter = statusFilter === status ? 'all' : status"
            >
              <div class="text-xl font-semibold" :class="status === 'error' && preview.summary.error ? 'text-danger' : 'text-slate-800'">{{ preview.summary[status] }}</div>
              <div class="text-xs text-slate-500">{{ t(`imports.status.${status}`) }}</div>
            </button>
          </div>

          <div class="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
            <span class="text-slate-600">{{ t('imports.review.duplicates') }}</span>
            <div class="inline-flex rounded-lg border border-slate-200 p-0.5">
              <button
                v-for="mode in (['skip', 'update'] as const)"
                :key="mode"
                type="button"
                class="px-3 py-1 rounded-md text-xs"
                :class="duplicates === mode ? 'bg-primary text-white' : 'text-slate-600'"
                :disabled="busy"
                @click="setDuplicates(mode)"
              >{{ t(`imports.review.duplicatesMode.${mode}`) }}</button>
            </div>
            <button v-if="preview.summary.error" type="button" class="sm:ml-auto flex items-center gap-1.5 text-primary hover:underline" @click="downloadErrorRows">
              <Lucide icon="Download" class="w-4 h-4" />{{ t('imports.review.downloadErrors') }}
            </button>
          </div>

          <ul class="divide-y divide-slate-100 border border-slate-100 rounded-lg">
            <li v-if="filteredRows.length === 0" class="px-3 py-6 text-center text-sm text-slate-400">{{ t('imports.review.empty') }}</li>
            <li v-for="row in visibleRows" :key="row.row" data-testid="import-row" :data-row="row.row" :data-status="row.status" class="px-3 py-2 flex items-start gap-3">
              <span class="w-12 shrink-0 text-xs text-slate-400 pt-0.5">{{ t('imports.review.row', { n: row.row }) }}</span>
              <div class="min-w-0 flex-1">
                <div class="text-sm text-slate-800 truncate">
                  {{ row.data.name || '—' }}
                  <span class="text-slate-400">· {{ row.data.email || '—' }}</span>
                </div>
                <div v-if="isStudents && row.data.level" class="text-xs text-slate-500">{{ row.data.level }}</div>
                <div v-for="(e, i) in row.errors" :key="i" class="text-xs text-danger">{{ e.message }}</div>
              </div>
              <span class="shrink-0 px-2 py-0.5 rounded-md text-xs font-medium" :class="statusClasses[row.status]">{{ t(`imports.status.${row.status}`) }}</span>
            </li>
          </ul>
          <p v-if="filteredRows.length > REVIEW_ROWS_LIMIT" class="text-xs text-slate-400">
            {{ t('imports.review.truncated', { shown: REVIEW_ROWS_LIMIT, total: filteredRows.length }) }}
          </p>
        </div>

        <!-- Step 5: result -->
        <div v-else-if="step === 'result' && result" class="py-4 text-center space-y-3">
          <Lucide icon="CheckCircle" class="w-10 h-10 mx-auto text-success" />
          <div class="text-base font-medium text-slate-800">{{ t('imports.result.title') }}</div>
          <ul class="text-sm text-slate-600 space-y-0.5">
            <li>{{ t('imports.result.created', { n: result.created }, result.created) }}</li>
            <li v-if="result.updated">{{ t('imports.result.updated', { n: result.updated }, result.updated) }}</li>
            <li v-if="result.skipped">{{ t('imports.result.skipped', { n: result.skipped }, result.skipped) }}</li>
            <li v-if="result.rejected" class="text-danger">{{ t('imports.result.rejected', { n: result.rejected }, result.rejected) }}</li>
          </ul>
        </div>
      </div>

      <p v-if="error" data-testid="import-error" class="px-4 sm:px-6 pb-2 text-sm text-danger">{{ error }}</p>

      <!-- Footer -->
      <div class="px-4 sm:px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
        <template v-if="step === 'result'">
          <Button variant="primary" @click="close">{{ t(`imports.result.goToList.${type}`) }}</Button>
        </template>
        <template v-else>
          <Button v-if="step === 'file'" variant="outline-secondary" :disabled="busy" @click="close">{{ t('imports.cancel') }}</Button>
          <Button v-else variant="outline-secondary" :disabled="busy" @click="back">{{ t('imports.back') }}</Button>
          <Button
            v-if="step !== 'file'"
            variant="primary"
            data-testid="import-next"
            :disabled="busy || (step === 'columns' && !!columnError) || (step === 'review' && importableCount === 0)"
            @click="next"
          >
            <Lucide v-if="busy" icon="Loader" class="w-4 h-4 mr-2 animate-spin" />
            {{ step === 'review' ? t('imports.review.import', { n: importableCount }, importableCount) : t('imports.next') }}
          </Button>
        </template>
      </div>
    </Dialog.Panel>
  </Dialog>
</template>
