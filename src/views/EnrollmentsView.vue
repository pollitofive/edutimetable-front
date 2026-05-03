<script setup lang="ts">
import '@/assets/css/vendors/full-calendar.css'
import FullCalendar from '@fullcalendar/vue3'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { type CalendarOptions, type EventInput } from '@fullcalendar/core'
import esLocale from '@fullcalendar/core/locales/es'
import { ref, reactive, computed, onMounted, watch } from 'vue'
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import TomSelect from '@/components/Base/TomSelect'
import ToastNotification from '@/views/components/ToastNotification.vue'
import QuickEnrollModal from '@/views/components/enrollments/QuickEnrollModal.vue'
import FullEnrollModal from '@/views/components/enrollments/FullEnrollModal.vue'
import { enrollmentService, type ScheduleData, type ScheduleFilters } from '@/services/enrollmentService'
import { useI18n } from '@/composables/useI18n'
import { useLoading } from '@/composables/useLoading'
import { useRoute, useRouter } from 'vue-router'

const { t, locale } = useI18n()
const { show: showLoading, hide: hideLoading } = useLoading()
const route = useRoute()
const router = useRouter()

const toArr = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v]

// ─── State ────────────────────────────────────────────────────────────────────

const allSchedules = ref<ScheduleData[]>([])  // unfiltered — used for filter options only
const schedules = ref<ScheduleData[]>([])      // filtered — used for the calendar
const selectedSchedule = ref<ScheduleData | null>(null)
const loading = ref(false)
const showQuickModal = ref(false)
const showFullModal = ref(false)
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error'>('success')

const filters = reactive<ScheduleFilters>({
  course_ids: toArr(route.query.courses as string | string[]),
  tracks: toArr(route.query.tracks as string | string[]),
  teacher_ids: toArr(route.query.teachers as string | string[]),
  days_of_week: toArr(route.query.days as string | string[]),
})

// ─── Filter options — always from unfiltered allSchedules so TomSelect stays stable ───

const uniqueCourses = computed(() => {
  const seen = new Set<number>()
  return allSchedules.value
    .filter(s => { const ok = !seen.has(s.course.id); seen.add(s.course.id); return ok })
    .map(s => s.course)
    .sort((a, b) => a.name.localeCompare(b.name))
})

const uniqueTeachers = computed(() => {
  const seen = new Set<number>()
  return allSchedules.value
    .filter(s => { const ok = !seen.has(s.teacher.id); seen.add(s.teacher.id); return ok })
    .map(s => s.teacher)
    .sort((a, b) => a.name.localeCompare(b.name))
})

const uniqueTracks = computed(() => {
  return [...new Set(allSchedules.value.map(s => s.course.course_level.track))].sort()
})

const days = computed(() => [
  { value: '1', label: t('schedules.days.monday') },
  { value: '2', label: t('schedules.days.tuesday') },
  { value: '3', label: t('schedules.days.wednesday') },
  { value: '4', label: t('schedules.days.thursday') },
  { value: '5', label: t('schedules.days.friday') },
  { value: '6', label: t('schedules.days.saturday') },
])

// ─── Selected schedule group helpers ──────────────────────────────────────────

const selectedGroupSchedules = computed(() => {
  if (!selectedSchedule.value) return []
  const gid = selectedSchedule.value.group_id
  if (!gid) return [selectedSchedule.value]
  return schedules.value.filter(s => s.group_id === gid)
})

const selectedGroupDaysLabel = computed(() => {
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return selectedGroupSchedules.value
    .slice()
    .sort((a, b) => a.day_of_week - b.day_of_week)
    .map(s => dayNames[s.day_of_week])
    .join(' y ')
})

const selectedGroupIds = computed(() =>
  selectedGroupSchedules.value.map(s => s.id)
)

// ─── Calendar ─────────────────────────────────────────────────────────────────

function getMonday(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  return monday.toISOString().split('T')[0]
}

function getDateForDow(dow: number): string {
  const monday = new Date(getMonday())
  const offset = dow === 0 ? 6 : dow - 1
  monday.setDate(monday.getDate() + offset)
  return monday.toISOString().split('T')[0]
}

function getTrackColor(track: string): string {
  const palette: Record<string, string> = {
    English: '#10b981',
    Inglés: '#10b981',
    Spanish: '#f97316',
    Español: '#f97316',
    French: '#3b82f6',
    Francés: '#3b82f6',
    Portuguese: '#8b5cf6',
    Portugués: '#8b5cf6',
  }
  return palette[track] ?? '#6b7280'
}

function buildEvents(data: ScheduleData[]): EventInput[] {
  return data.map(s => ({
    id: String(s.id),
    start: `${getDateForDow(s.day_of_week)}T${s.starts_at}`,
    end: `${getDateForDow(s.day_of_week)}T${s.ends_at}`,
    backgroundColor: getTrackColor(s.course.course_level.track),
    borderColor: 'transparent',
    extendedProps: { schedule: s },
  }))
}

const calendarOptions = reactive<CalendarOptions>({
  plugins: [timeGridPlugin, interactionPlugin],
  initialView: 'timeGridWeek',
  initialDate: getMonday(),
  firstDay: 1,
  locale: locale.value === 'es' ? esLocale : 'en',
  headerToolbar: false,
  hiddenDays: [0],
  allDaySlot: false,
  slotMinTime: '07:00:00',
  slotMaxTime: '21:00:00',
  slotDuration: '00:30:00',
  height: 'auto',
  navLinks: false,
  editable: false,
  selectable: false,
  dayHeaderFormat: { weekday: 'long' },
  events: [],

  eventContent({ event }) {
    const s: ScheduleData = event.extendedProps.schedule
    const isFull = s.enrolled_count >= s.capacity
    return {
      html: `
        <div class="p-1.5 text-xs leading-tight overflow-hidden h-full">
          <div class="font-semibold truncate">${s.course.course_level.track} - ${s.course.course_level.name}</div>
          <div class="opacity-80 truncate">Prof. ${s.teacher.name}</div>
          <div class="opacity-70">${s.starts_at} - ${s.ends_at}</div>
          <div class="${isFull ? 'text-red-200 font-medium' : 'opacity-70'}">
            ${s.enrolled_count}/${s.capacity} ${isFull ? 'completo' : 'alumnos'}
          </div>
        </div>
      `,
    }
  },

  eventClick({ event, el }) {
    document.querySelectorAll('.fc-event.fc-selected-schedule')
      .forEach(e => e.classList.remove('fc-selected-schedule'))
    el.classList.add('fc-selected-schedule')
    selectedSchedule.value = event.extendedProps.schedule as ScheduleData
  },
})

// ─── Data loading ─────────────────────────────────────────────────────────────

async function loadAllSchedules() {
  const data = await enrollmentService.getSchedules({})
  allSchedules.value = data
}

async function loadSchedules() {
  loading.value = true
  showLoading()
  try {
    const data = await enrollmentService.getSchedules(filters)
    schedules.value = data

    if (selectedSchedule.value) {
      selectedSchedule.value = data.find(s => s.id === selectedSchedule.value!.id) ?? null
    }

    calendarOptions.events = buildEvents(data)
  } finally {
    loading.value = false
    hideLoading()
  }
}

const filterTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

function computeHiddenDays(): number[] {
  if (!filters.days_of_week.length) return [0]
  const selected = filters.days_of_week.map(Number)
  return [0, 1, 2, 3, 4, 5, 6].filter(d => !selected.includes(d))
}

function applyFilters() {
  selectedSchedule.value = null
  calendarOptions.hiddenDays = computeHiddenDays()
  if (filterTimeout.value) clearTimeout(filterTimeout.value)
  filterTimeout.value = setTimeout(loadSchedules, 1000)
}

watch(
  () => ({ ...filters }),
  (v) => {
    const q: Record<string, string | string[]> = {}
    if (v.course_ids.length) q.courses = v.course_ids
    if (v.tracks.length) q.tracks = v.tracks
    if (v.teacher_ids.length) q.teachers = v.teacher_ids
    if (v.days_of_week.length) q.days = v.days_of_week
    router.replace({ query: q })
  },
  { deep: true }
)

// ─── Enrollment actions ────────────────────────────────────────────────────────

function openQuickModal() {
  showQuickModal.value = true
}

function openFullModal() {
  showFullModal.value = true
}

function notify(message: string, type: 'success' | 'error' = 'success') {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
}

async function onEnrolled() {
  showQuickModal.value = false
  showFullModal.value = false
  notify(t('enrollments.enrollSuccess'))
  await loadSchedules()
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────

watch(locale, (newLocale) => {
  calendarOptions.locale = newLocale === 'es' ? esLocale : 'en'
})

onMounted(async () => {
  showLoading()
  await loadAllSchedules()
  await loadSchedules()
})
</script>

<template>
  <!-- Page header -->
  <div class="flex flex-col gap-y-3 md:h-10 md:flex-row md:items-center">
    <div>
      <div class="text-base font-medium">{{ t('enrollments.title') }}</div>
      <div class="text-xs text-slate-400 mt-0.5">{{ t('enrollments.subtitle') }}</div>
    </div>
    <div class="md:ml-auto">
      <Button variant="primary" @click="openFullModal">
        <Lucide icon="UserPlus" class="w-4 h-4 mr-2" />
        {{ t('enrollments.enrollStudent') }}
      </Button>
    </div>
  </div>

  <!-- Filters -->
  <div class="box box--stacked p-4 mt-5">
    <div class="flex gap-3 items-center">
      <!-- Course -->
      <TomSelect
        v-model="filters.course_ids"
        :options="{ placeholder: t('enrollments.filters.allCourses'), create: false, onDelete: () => true }"
        class="flex-1"
        multiple
        @update:modelValue="applyFilters"
      >
        <option v-for="course in uniqueCourses" :key="course.id" :value="String(course.id)">
          {{ course.name }}
        </option>
      </TomSelect>

      <!-- Track / Language -->
      <TomSelect
        v-model="filters.tracks"
        :options="{ placeholder: t('enrollments.filters.allLanguages'), create: false, onDelete: () => true }"
        class="flex-1"
        multiple
        @update:modelValue="applyFilters"
      >
        <option v-for="track in uniqueTracks" :key="track" :value="track">{{ track }}</option>
      </TomSelect>

      <!-- Teacher -->
      <TomSelect
        v-model="filters.teacher_ids"
        :options="{ placeholder: t('enrollments.filters.allTeachers'), create: false, onDelete: () => true }"
        class="flex-1"
        multiple
        @update:modelValue="applyFilters"
      >
        <option v-for="teacher in uniqueTeachers" :key="teacher.id" :value="String(teacher.id)">
          {{ teacher.name }}
        </option>
      </TomSelect>

      <!-- Day -->
      <TomSelect
        v-model="filters.days_of_week"
        :options="{ placeholder: t('enrollments.filters.allDays'), create: false, onDelete: () => true }"
        class="flex-1"
        multiple
        @update:modelValue="applyFilters"
      >
        <option v-for="day in days" :key="day.value" :value="day.value">{{ day.label }}</option>
      </TomSelect>

      <Lucide v-if="loading" icon="Loader" class="w-4 h-4 animate-spin text-slate-400 flex-shrink-0" />
    </div>
  </div>

  <!-- Calendar + Panel -->
  <div class="flex gap-4 mt-4 items-start">

    <!-- Calendar -->
    <div class="flex-1 min-w-0 box box--stacked overflow-hidden">
      <FullCalendar :options="calendarOptions" />
    </div>

    <!-- Right panel: always occupies space, content shown when schedule selected -->
    <div class="w-80 flex-shrink-0 box box--stacked overflow-hidden">

      <!-- Empty state -->
      <div
        v-if="!selectedSchedule"
        class="flex flex-col items-center justify-center h-64 text-center px-6 text-slate-400"
      >
        <Lucide icon="CalendarSearch" class="w-8 h-8 mb-2 text-slate-300" />
        <p class="text-sm">Seleccioná un horario del calendario para ver los detalles</p>
      </div>

      <!-- Schedule detail -->
      <template v-if="selectedSchedule">
      <!-- Panel header -->
      <div
        class="px-5 py-4 text-white"
        :style="{ backgroundColor: getTrackColor(selectedSchedule.course.course_level.track) }"
      >
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-sm leading-tight">
            {{ selectedSchedule.course.course_level.track }} - {{ selectedSchedule.course.course_level.name }}
          </h3>
          <span class="text-xs bg-white/20 rounded-full px-2 py-0.5 font-medium">
            {{ selectedSchedule.enrolled_count }}/{{ selectedSchedule.capacity }}
          </span>
        </div>
      </div>

      <!-- Panel meta -->
      <div class="px-5 py-4 space-y-2 border-b border-slate-100 text-sm text-slate-600">
        <div class="flex items-center gap-2">
          <Lucide icon="User" class="w-4 h-4 text-slate-400 flex-shrink-0" />
          Prof. {{ selectedSchedule.teacher.name }}
        </div>
        <div class="flex items-center gap-2">
          <Lucide icon="Clock" class="w-4 h-4 text-slate-400 flex-shrink-0" />
          {{ selectedGroupDaysLabel }} {{ selectedSchedule.starts_at }} - {{ selectedSchedule.ends_at }}
        </div>
        <div class="flex items-center gap-2">
          <Lucide icon="BookOpen" class="w-4 h-4 text-slate-400 flex-shrink-0" />
          {{ selectedSchedule.course.name }}
        </div>
      </div>

      <!-- Enrolled students -->
      <div class="px-5 py-4">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium text-slate-700">
            {{ t('enrollments.enrolledStudents') }}
            ({{ selectedSchedule.active_enrollments.length }})
          </span>
          <button
            class="text-xs text-orange-500 font-medium hover:underline"
            @click="openQuickModal"
          >
            {{ t('enrollments.add') }}
          </button>
        </div>

        <div v-if="!selectedSchedule.active_enrollments.length" class="text-xs text-slate-400 py-2">
          {{ t('enrollments.noStudentsEnrolled') }}
        </div>

        <ul class="space-y-2">
          <li
            v-for="enrollment in selectedSchedule.active_enrollments"
            :key="enrollment.id"
            class="flex items-center gap-2.5"
          >
            <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
              {{ enrollment.student.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() }}
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-slate-800 truncate">{{ enrollment.student.name }}</p>
              <p v-if="enrollment.student.course_level" class="text-xs text-slate-400 truncate">
                {{ enrollment.student.course_level.name }}
              </p>
            </div>
          </li>
        </ul>
      </div>

      <!-- Panel footer -->
      <div class="px-5 pb-5 pt-2 border-t border-slate-100">
        <div class="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
          <Lucide icon="Users" class="w-3.5 h-3.5" />
          {{ selectedSchedule.available_spots }} {{ t('enrollments.availableSpots', { n: '' }).replace('{n} ', '') }}
        </div>
        <Button variant="primary" class="w-full" @click="openQuickModal">
          <Lucide icon="UserPlus" class="w-4 h-4 mr-2" />
          {{ t('enrollments.enrollStudentInSchedule') }}
        </Button>
      </div>
      </template>

    </div>
  </div>

  <!-- Modals -->
  <QuickEnrollModal
    :visible="showQuickModal"
    :schedule="selectedSchedule"
    :schedule-ids="selectedGroupIds"
    :group-days-label="selectedGroupDaysLabel"
    @close="showQuickModal = false"
    @enrolled="onEnrolled"
  />

  <FullEnrollModal
    :visible="showFullModal"
    @close="showFullModal = false"
    @enrolled="onEnrolled"
  />

  <!-- Toast -->
  <ToastNotification
    :show="showToast"
    :message="toastMessage"
    :type="toastType"
    @close="showToast = false"
  />
</template>

<style>
.fc-event.fc-selected-schedule {
  outline: 3px solid #f97316;
  outline-offset: -3px;
}
</style>