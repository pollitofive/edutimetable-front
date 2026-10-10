<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import { Dialog } from '@/components/Base/Headless'
import {
  enrollmentService,
  type ScheduleData,
  type ScheduleSlot,
  type ScheduleChangeSlot,
  type ScheduleChangePreview,
  type ScheduleChangeApplyResult,
} from '@/services/enrollmentService'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

interface Props {
  visible: boolean
  schedule: ScheduleData | null
  // Set when the change comes from dragging/resizing a block: skips the form
  // and goes straight to the impact step
  proposal: ScheduleChangeSlot[] | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  applied: [result: ScheduleChangeApplyResult]
}>()

// One row per day of the course; the end time is derived from start + minutes
interface Row {
  schedule_id: number
  day_of_week: number
  starts_at: string
  minutes: number
  original: ScheduleSlot
}

const rows = ref<Row[]>([])
const sameTime = ref(false)
const step = ref<'form' | 'impact'>('form')
const fromForm = ref(false)
const preview = ref<ScheduleChangePreview | null>(null)
const dropIds = ref<number[]>([])
const loading = ref(false)
const applying = ref(false)
const error = ref('')

const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const dayOptions = [1, 2, 3, 4, 5, 6]
const dayName = (dow: number) => t(`schedules.days.${dayKeys[dow]}`)
const slotLabel = (s: ScheduleSlot) => `${dayName(s.day_of_week)} ${s.starts_at} - ${s.ends_at}`
const rangeLabel = (s: ScheduleSlot) => `${s.starts_at} - ${s.ends_at}`

// What the student declared, next to "not available": the ranges of that day,
// or the whole week when they have nothing that day
function availabilityHint(availabilities: ScheduleSlot[], dow: number): string {
  const sameDay = availabilities.filter(a => a.day_of_week === dow)
  if (sameDay.length)
    return t('enrollments.scheduleChange.availableThatDay', { ranges: sameDay.map(rangeLabel).join(', ') })
  if (availabilities.length)
    return t('enrollments.scheduleChange.availableOtherDays', {
      ranges: availabilities.map(a => `${dayName(a.day_of_week).slice(0, 3)} ${rangeLabel(a)}`).join(', '),
    })
  return t('enrollments.scheduleChange.noAvailabilityDeclared')
}

// ── Time helpers ──────────────────────────────────────────────────────────
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const fromMinutes = (total: number) =>
  `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`

const endOf = (row: Row) => fromMinutes(toMinutes(row.starts_at) + row.minutes)

const formError = computed(() => {
  if (rows.value.some(r => !r.starts_at || r.minutes <= 0)) return t('enrollments.scheduleChange.invalidTime')
  if (rows.value.some(r => toMinutes(r.starts_at) + r.minutes >= 24 * 60)) return t('enrollments.scheduleChange.invalidTime')
  return ''
})

const hasChanges = computed(() => rows.value.some(r =>
  r.day_of_week !== r.original.day_of_week || r.starts_at !== r.original.starts_at || endOf(r) !== r.original.ends_at
))

function buildSlots(): ScheduleChangeSlot[] {
  return rows.value.map(r => ({
    schedule_id: r.schedule_id,
    day_of_week: r.day_of_week,
    starts_at: r.starts_at,
    ends_at: endOf(r),
  }))
}

// ── Form handlers ─────────────────────────────────────────────────────────
function onStartChange(row: Row) {
  if (sameTime.value) rows.value.forEach(r => { r.starts_at = row.starts_at })
}

// A new duration on any day applies to every day of the course
function onEndChange(row: Row, value: string) {
  if (!value || !row.starts_at) return
  const minutes = toMinutes(value) - toMinutes(row.starts_at)
  rows.value.forEach(r => { r.minutes = minutes })
}

function onSameTimeChange() {
  if (!sameTime.value || !rows.value.length) return
  const first = rows.value[0]
  rows.value.forEach(r => { r.starts_at = first.starts_at })
}

// ── Preview / apply ───────────────────────────────────────────────────────
async function runPreview() {
  loading.value = true
  error.value = ''
  preview.value = null
  dropIds.value = []
  step.value = 'impact'
  try {
    preview.value = await enrollmentService.previewScheduleChange(buildSlots())
  } catch (err: any) {
    error.value = err.response?.data?.message || t('enrollments.scheduleChange.previewError')
  } finally {
    loading.value = false
  }
}

function goToImpact() {
  fromForm.value = true
  runPreview()
}

function backToForm() {
  step.value = 'form'
  error.value = ''
  preview.value = null
}

function toggleDrop(studentId: number) {
  dropIds.value = dropIds.value.includes(studentId)
    ? dropIds.value.filter(id => id !== studentId)
    : [...dropIds.value, studentId]
}

async function apply() {
  if (!preview.value?.can_apply) return
  applying.value = true
  error.value = ''
  try {
    const result = await enrollmentService.applyScheduleChange(buildSlots(), dropIds.value)
    emit('applied', result)
  } catch (err: any) {
    error.value = err.response?.data?.message || t('enrollments.scheduleChange.applyError')
  } finally {
    applying.value = false
  }
}

function close() {
  if (applying.value) return
  emit('close')
}

watch(() => props.visible, (val) => {
  if (!val || !props.schedule) return

  rows.value = props.schedule.group_slots.map(s => {
    const proposed = props.proposal?.find(p => p.schedule_id === s.id) ?? s
    return {
      schedule_id: s.id,
      day_of_week: proposed.day_of_week,
      starts_at: proposed.starts_at,
      minutes: toMinutes(proposed.ends_at) - toMinutes(proposed.starts_at),
      original: { day_of_week: s.day_of_week, starts_at: s.starts_at, ends_at: s.ends_at },
    }
  })
  sameTime.value = new Set(rows.value.map(r => r.starts_at)).size === 1
  preview.value = null
  dropIds.value = []
  error.value = ''
  fromForm.value = false

  if (props.proposal) runPreview()
  else step.value = 'form'
})
</script>

<template>
  <Dialog :open="visible" size="xl" :staticBackdrop="true" @close="close">
    <Dialog.Panel class="p-0 overflow-hidden">
      <!-- Header -->
      <div class="px-6 pt-6 pb-4 border-b border-slate-100">
        <h2 class="text-lg font-semibold text-slate-800">{{ t('enrollments.scheduleChange.title') }}</h2>
        <p v-if="schedule" class="mt-1 text-sm text-slate-500">
          {{ schedule.course.course_level.track.name }} - {{ schedule.course.course_level.name }}
          · Prof. {{ schedule.teacher.name }}
          · {{ schedule.enrolled_count }} {{ t('enrollments.scheduleChange.students') }}
        </p>
      </div>

      <!-- Step 1: form (courses with several days) -->
      <div v-if="step === 'form'" class="px-6 py-4">
        <div class="grid grid-cols-[1fr_7rem_7rem_1fr] gap-x-3 gap-y-2 items-center text-sm">
          <div class="text-xs font-medium text-slate-500">{{ t('enrollments.scheduleChange.day') }}</div>
          <div class="text-xs font-medium text-slate-500">{{ t('enrollments.scheduleChange.from') }}</div>
          <div class="text-xs font-medium text-slate-500">{{ t('enrollments.scheduleChange.to') }}</div>
          <div class="text-xs font-medium text-slate-500">{{ t('enrollments.scheduleChange.current') }}</div>

          <template v-for="row in rows" :key="row.schedule_id">
            <select v-model.number="row.day_of_week" class="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option v-for="d in dayOptions" :key="d" :value="d">{{ dayName(d) }}</option>
            </select>
            <input v-model="row.starts_at" type="time" step="900" class="w-full px-2 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" @change="onStartChange(row)" />
            <input :value="endOf(row)" type="time" step="900" class="w-full px-2 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400" @change="onEndChange(row, ($event.target as HTMLInputElement).value)" />
            <div class="text-xs text-slate-400">{{ slotLabel(row.original) }}</div>
          </template>
        </div>

        <template v-if="rows.length > 1">
          <label class="flex items-center gap-2 mt-4 text-sm text-slate-600 cursor-pointer">
            <input v-model="sameTime" type="checkbox" class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0" @change="onSameTimeChange" />
            {{ t('enrollments.scheduleChange.sameTime') }}
          </label>
          <p class="mt-2 text-xs text-slate-400">{{ t('enrollments.scheduleChange.durationHint') }}</p>
        </template>
        <p v-if="formError" class="mt-2 text-xs text-danger">{{ formError }}</p>
      </div>

      <!-- Step 2: impact -->
      <div v-else class="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-4">
        <div v-if="loading" class="py-8 text-center text-sm text-slate-400">
          <Lucide icon="Loader" class="w-4 h-4 animate-spin inline mr-1" />
          {{ t('enrollments.scheduleChange.simulating') }}
        </div>

        <template v-else-if="preview">
          <!-- Changes -->
          <div>
            <div class="text-sm font-medium text-slate-700 mb-2">{{ t('enrollments.scheduleChange.changes') }}</div>
            <ul class="space-y-1 text-sm text-slate-600">
              <li v-for="change in preview.changes" :key="change.schedule_id" class="flex items-center gap-2">
                <span class="line-through text-slate-400">{{ slotLabel(change.from) }}</span>
                <Lucide icon="ArrowRight" class="w-3.5 h-3.5 text-slate-400" />
                <span class="font-medium">{{ slotLabel(change.to) }}</span>
              </li>
            </ul>
          </div>

          <!-- Blocking conflicts -->
          <div v-if="!preview.can_apply" class="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm">
            <div class="flex items-center gap-2 font-medium text-danger">
              <Lucide icon="Ban" class="w-4 h-4" /> {{ t('enrollments.scheduleChange.blocked') }}
            </div>
            <ul class="mt-2 space-y-1 text-slate-600">
              <li v-for="(c, i) in preview.teacher_conflicts" :key="`t${i}`">
                {{ t('enrollments.scheduleChange.teacherConflict', {
                  teacher: c.teacher.name,
                  course: c.conflict.course_name,
                  slot: slotLabel(c.conflict),
                }) }}
              </li>
              <li v-for="(c, i) in preview.internal_conflicts" :key="`i${i}`">
                {{ t('enrollments.scheduleChange.internalConflict', { slot: slotLabel(c.slot), other: slotLabel(c.other) }) }}
              </li>
            </ul>
          </div>

          <!-- Affected students -->
          <div>
            <div class="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Lucide v-if="preview.affected_students.length" icon="AlertTriangle" class="w-4 h-4 text-amber-500" />
              <Lucide v-else icon="CheckCircle" class="w-4 h-4 text-emerald-600" />
              {{ preview.affected_students.length
                ? t('enrollments.scheduleChange.affected', { n: preview.affected_students.length })
                : t('enrollments.scheduleChange.noAffected') }}
            </div>
            <p v-if="preview.affected_students.length" class="mb-2 text-xs text-slate-400">{{ t('enrollments.scheduleChange.dropHint') }}</p>
            <ul class="space-y-2">
              <li v-for="a in preview.affected_students" :key="a.student.id">
                <label class="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    class="mt-0.5 w-4 h-4 rounded border-slate-300 text-danger focus:ring-2 focus:ring-danger focus:ring-offset-0"
                    :checked="dropIds.includes(a.student.id)"
                    :disabled="!preview.can_apply"
                    @change="toggleDrop(a.student.id)"
                  />
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-slate-800">{{ a.student.name }}</p>
                    <p v-for="(issue, i) in a.issues" :key="i" class="text-xs text-slate-500">
                      <template v-if="issue.type === 'unavailable'">
                        {{ t('enrollments.scheduleChange.issueUnavailable', { slot: slotLabel(issue) }) }}
                        <span class="text-slate-400">· {{ availabilityHint(a.availabilities, issue.day_of_week) }}</span>
                      </template>
                      <template v-else>
                        {{ t('enrollments.scheduleChange.issueOverlap', { course: issue.other?.course_name ?? '', slot: slotLabel(issue.other ?? issue) }) }}
                      </template>
                    </p>
                  </div>
                </label>
              </li>
            </ul>
          </div>
        </template>
      </div>

      <p v-if="error" class="px-6 pb-2 text-sm text-danger">{{ error }}</p>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
        <template v-if="step === 'form'">
          <Button variant="outline-secondary" @click="close">{{ t('enrollments.cancel') }}</Button>
          <Button variant="primary" :disabled="!!formError || !hasChanges" @click="goToImpact">
            <Lucide icon="Search" class="w-4 h-4 mr-2" />{{ t('enrollments.scheduleChange.seeImpact') }}
          </Button>
        </template>
        <template v-else>
          <Button v-if="fromForm" variant="outline-secondary" :disabled="applying" @click="backToForm">{{ t('enrollments.scheduleChange.back') }}</Button>
          <Button v-else variant="outline-secondary" :disabled="applying" @click="close">{{ t('enrollments.cancel') }}</Button>
          <Button variant="primary" :disabled="loading || applying || !preview?.can_apply" @click="apply">
            <Lucide v-if="applying" icon="Loader" class="w-4 h-4 mr-2 animate-spin" />
            <Lucide v-else icon="CalendarCheck" class="w-4 h-4 mr-2" />
            {{ dropIds.length
              ? t('enrollments.scheduleChange.applyAndDrop', { n: dropIds.length })
              : t('enrollments.scheduleChange.apply') }}
          </Button>
        </template>
      </div>
    </Dialog.Panel>
  </Dialog>
</template>
