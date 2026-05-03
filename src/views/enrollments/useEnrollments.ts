import '@/assets/css/vendors/full-calendar.css'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { type CalendarOptions, type EventInput } from '@fullcalendar/core'
import esLocale from '@fullcalendar/core/locales/es'
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useLoading } from '@/composables/useLoading'
import { enrollmentService, type ScheduleData, type ScheduleFilters } from '@/services/enrollmentService'

const toArr = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v]

export function useEnrollments() {
  const { t, locale } = useI18n()
  const { show: showLoading, hide: hideLoading } = useLoading()
  const route = useRoute()
  const router = useRouter()

  // ── State ──────────────────────────────────────────────────────────────────
  const allSchedules = ref<ScheduleData[]>([])
  const schedules = ref<ScheduleData[]>([])
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

  // ── Filter options ─────────────────────────────────────────────────────────
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

  const uniqueTracks = computed(() =>
    [...new Set(allSchedules.value.map(s => s.course.course_level.track))].sort()
  )

  const days = computed(() => [
    { value: '1', label: t('schedules.days.monday') },
    { value: '2', label: t('schedules.days.tuesday') },
    { value: '3', label: t('schedules.days.wednesday') },
    { value: '4', label: t('schedules.days.thursday') },
    { value: '5', label: t('schedules.days.friday') },
    { value: '6', label: t('schedules.days.saturday') },
  ])

  // ── Selected group helpers ─────────────────────────────────────────────────
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

  const selectedGroupIds = computed(() => selectedGroupSchedules.value.map(s => s.id))

  // ── Calendar helpers ───────────────────────────────────────────────────────
  function getMonday(): string {
    const now = new Date()
    const diff = now.getDay() === 0 ? -6 : 1 - now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() + diff)
    return monday.toISOString().split('T')[0]
  }

  function getDateForDow(dow: number): string {
    const monday = new Date(getMonday())
    monday.setDate(monday.getDate() + (dow === 0 ? 6 : dow - 1))
    return monday.toISOString().split('T')[0]
  }

  function getTrackColor(track: string): string {
    const palette: Record<string, string> = {
      English: '#10b981', Inglés: '#10b981',
      Spanish: '#f97316', Español: '#f97316',
      French: '#3b82f6', Francés: '#3b82f6',
      Portuguese: '#8b5cf6', Portugués: '#8b5cf6',
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

  // ── Calendar options ───────────────────────────────────────────────────────
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

  // ── Data loading ───────────────────────────────────────────────────────────
  async function loadAllSchedules() {
    allSchedules.value = await enrollmentService.getSchedules({})
  }

  async function loadSchedules() {
    loading.value = true
    showLoading()
    try {
      const data = await enrollmentService.getSchedules(filters)
      schedules.value = data
      if (selectedSchedule.value)
        selectedSchedule.value = data.find(s => s.id === selectedSchedule.value!.id) ?? null
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

  // ── Enrollment actions ─────────────────────────────────────────────────────
  function openQuickModal() { showQuickModal.value = true }
  function openFullModal() { showFullModal.value = true }

  function notify(message: string, type: 'success' | 'error' = 'success') {
    toastMessage.value = message; toastType.value = type; showToast.value = true
  }

  async function onEnrolled() {
    showQuickModal.value = false
    showFullModal.value = false
    notify(t('enrollments.enrollSuccess'))
    await loadSchedules()
  }

  // ── Watchers ───────────────────────────────────────────────────────────────
  watch(locale, (newLocale) => {
    calendarOptions.locale = newLocale === 'es' ? esLocale : 'en'
  })

  watch(
    () => ({ ...filters }),
    (v) => {
      const q: Record<string, string | string[]> = {}
      if (v.course_ids.length) q.courses = v.course_ids
      if (v.tracks.length) q.tracks = v.tracks
      if (v.teacher_ids.length) q.teachers = v.teacher_ids
      if (v.days_of_week.length) q.days = v.days_of_week
      void router.replace({ query: q })
    },
    { deep: true }
  )

  onMounted(async () => {
    showLoading()
    await loadAllSchedules()
    await loadSchedules()
  })

  return {
    t, filters, loading, selectedSchedule, showQuickModal, showFullModal,
    showToast, toastMessage, toastType, calendarOptions,
    uniqueCourses, uniqueTeachers, uniqueTracks, days,
    selectedGroupDaysLabel, selectedGroupIds,
    getTrackColor, applyFilters, openQuickModal, openFullModal, onEnrolled,
  }
}
