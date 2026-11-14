import '@/assets/css/vendors/full-calendar.css'
import axios from 'axios'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import { type CalendarApi, type CalendarOptions, type EventApi, type EventInput } from '@fullcalendar/core'
import esLocale from '@fullcalendar/core/locales/es'
import { ref, reactive, computed, onMounted, onUnmounted, watch, toRef } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useLoading } from '@/composables/useLoading'
import { useQueryFilterSync } from '@/composables/useQueryFilterSync'
import {
  enrollmentService,
  type ScheduleData,
  type ScheduleFilters,
  type ScheduleChangeSlot,
  type ScheduleChangeApplyResult,
} from '@/services/enrollmentService'
import { useTrackOptions } from '@/views/tracks/useTracks'

type EnrollmentToDrop = ScheduleData['active_enrollments'][number]

const toArr =(v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v]

export function useEnrollments() {
  const { t, locale } = useI18n()
  const { show: showLoading, hide: hideLoading } = useLoading()
  const route = useRoute()
  const router = useRouter()
  const { trackOptions } = useTrackOptions()

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
  const enrollmentToDrop = ref<EnrollmentToDrop | null>(null)
  const dropping = ref(false)

  // Schedule change simulator: the course being moved, the proposal from a
  // drag/resize (null when opened from the panel) and how to undo the drag
  const changeSchedule = ref<ScheduleData | null>(null)
  const changeProposal = ref<ScheduleChangeSlot[] | null>(null)
  let revertDrag: (() => void) | null = null

  // Below md the week grid doesn't fit: the calendar switches to a list per
  // day and the course detail opens in a bottom sheet instead of the side panel
  const mobileQuery = window.matchMedia('(max-width: 767px)')
  const isMobile = ref(mobileQuery.matches)
  const onMobileQueryChange = (e: MediaQueryListEvent) => { isMobile.value = e.matches }
  const calendarRef = ref<{ getApi: () => CalendarApi } | null>(null)
  const calendarView = () => (isMobile.value ? 'listWeek' : 'timeGridWeek')

  // The service accepts partial filters; the page always holds all four combos
  // (the student filter is apart: it has no combo)
  const filters = reactive<Required<Omit<ScheduleFilters, 'student_id'>>>({
    course_ids: toArr(route.query.courses as string | string[]),
    track_ids: toArr(route.query.track_ids as string | string[]),
    teacher_ids: toArr(route.query.teachers as string | string[]),
    days_of_week: toArr(route.query.days as string | string[]),
  })

  // ?student=<id> (from the quick search): only the courses that student attends. It has no
  // combo of its own, just a removable chip with the name taken from the enrollments
  const studentId = ref((route.query.student as string) || '')
  const studentName = computed(() => {
    if (!studentId.value) return ''
    for (const s of allSchedules.value) {
      const e = s.active_enrollments.find(e => String(e.student.id) === studentId.value)
      if (e) return e.student.name
    }
    return ''
  })

  // ── Filter options ─────────────────────────────────────────────────────────
  // Narrowed to the selected tracks; with no track selected it lists them all
  const uniqueCourses = computed(() => {
    const seen = new Set<number>()
    const trackIds = filters.track_ids.map(String)
    return allSchedules.value
      .filter(s => !trackIds.length || trackIds.includes(String(s.course.course_level.track.id)))
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

  const uniqueTracks = computed(() => [...trackOptions.value].sort((a, b) => a.name.localeCompare(b.name)))

  const days = computed(() => [
    { value: '1', label: t('schedules.days.monday') },
    { value: '2', label: t('schedules.days.tuesday') },
    { value: '3', label: t('schedules.days.wednesday') },
    { value: '4', label: t('schedules.days.thursday') },
    { value: '5', label: t('schedules.days.friday') },
    { value: '6', label: t('schedules.days.saturday') },
  ])

  // ── Selected group helpers ─────────────────────────────────────────────────
  // group_slots comes from the API with every day of the course, so it stays
  // complete even when the day filter hides some of them from the calendar
  const selectedGroupSchedules = computed(() => selectedSchedule.value?.group_slots ?? [])

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

  // Deterministic color per track id — stays stable regardless of locale or
  // track name, and needs no hardcoded entry when a new track is created.
  const trackColorPalette = ['#10b981', '#f97316', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#eab308', '#ef4444']

  function getTrackColor(trackId: number | string): string {
    const id = Number(trackId)
    if (isNaN(id)) return '#6b7280'
    return trackColorPalette[id % trackColorPalette.length]
  }

  function buildEvents(data: ScheduleData[]): EventInput[] {
    return data.map(s => ({
      id: String(s.id),
      start: `${getDateForDow(s.day_of_week)}T${s.starts_at}`,
      end: `${getDateForDow(s.day_of_week)}T${s.ends_at}`,
      backgroundColor: getTrackColor(s.course.course_level.track.id),
      borderColor: 'transparent',
      // Only single-day courses are moved by dragging; the others go through
      // the "simulate schedule change" button in the panel
      editable: s.group_slots.length === 1,
      extendedProps: { schedule: s },
    }))
  }

  const toHHmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`

  // Drop or resize of a single-day course: simulate it right away. The block
  // stays where it was dropped until the change is applied or cancelled.
  function onEventChanged({ event, revert }: { event: EventApi; revert: () => void }) {
    if (!event.start || !event.end) return revert()
    const schedule = event.extendedProps.schedule as ScheduleData
    revertDrag = revert
    changeSchedule.value = schedule
    changeProposal.value = [{
      schedule_id: schedule.id,
      day_of_week: event.start.getDay(),
      starts_at: toHHmm(event.start),
      ends_at: toHHmm(event.end),
    }]
  }

  // ── Calendar options ───────────────────────────────────────────────────────
  const calendarOptions = reactive<CalendarOptions>({
    plugins: [timeGridPlugin, listPlugin, interactionPlugin],
    initialView: calendarView(),
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
    editable: true,
    eventDurationEditable: true,
    snapDuration: '00:15:00',
    selectable: false,
    dayHeaderFormat: { weekday: 'long' },
    listDayFormat: { weekday: 'long' },
    listDaySideFormat: false,
    events: [],

    eventContent({ event, view }) {
      const s: ScheduleData = event.extendedProps.schedule
      const isFull = s.enrolled_count >= s.capacity
      if (view.type === 'listWeek') {
        return {
          html: `
            <div class="flex items-start gap-2 text-sm leading-tight">
              <span class="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${getTrackColor(s.course.course_level.track.id)}"></span>
              <div class="min-w-0">
                <div class="font-medium">${s.course.course_level.track.name} - ${s.course.course_level.name}</div>
                <div class="text-xs text-slate-500">Prof. ${s.teacher.name} · <span class="${isFull ? 'text-danger font-medium' : ''}">${s.enrolled_count}/${s.capacity} ${isFull ? 'completo' : 'alumnos'}</span></div>
              </div>
            </div>
          `,
        }
      }
      return {
        html: `
          <div class="p-1.5 text-xs leading-tight overflow-hidden h-full">
            <div class="font-semibold truncate">${s.course.course_level.track.name} - ${s.course.course_level.name}</div>
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

    eventDrop: onEventChanged,
    eventResize: onEventChanged,
  })

  // ── Data loading ───────────────────────────────────────────────────────────
  const hasActiveFilters = () =>
    filters.course_ids.length > 0 || filters.track_ids.length > 0 ||
    filters.teacher_ids.length > 0 || filters.days_of_week.length > 0 || studentId.value !== ''

  async function loadAllSchedules() {
    allSchedules.value = await enrollmentService.getSchedules({})
    return allSchedules.value
  }

  // preloaded lets onMounted reuse the unfiltered fetch instead of firing the
  // same request twice when the page loads with no filters active.
  async function loadSchedules(preloaded?: ScheduleData[]) {
    loading.value = true
    showLoading()
    try {
      const data = preloaded ?? await enrollmentService.getSchedules({ ...filters, student_id: studentId.value || undefined })
      schedules.value = data
      if (selectedSchedule.value)
        selectedSchedule.value = data.find(s => s.id === selectedSchedule.value!.id) ?? null
      calendarOptions.events = buildEvents(data)
    } catch (err) {
      // ?student= of a student that doesn't exist (or isn't of this business): drop it
      if (axios.isAxiosError(err) && err.response?.status === 422 && err.response.data?.errors?.student_id) {
        studentId.value = ''
        notify(t('enrollments.studentFilter.notFound'), 'error')
        await loadSchedules()
        return
      }
      throw err
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

  function clearStudentFilter() {
    studentId.value = ''
    applyFilters()
  }

  // Filters changed from outside while the page is open (the quick search): reload now
  useQueryFilterSync(
    {
      student: studentId,
      courses: toRef(filters, 'course_ids'),
      track_ids: toRef(filters, 'track_ids'),
      teachers: toRef(filters, 'teacher_ids'),
      days: toRef(filters, 'days_of_week'),
    },
    () => {
      selectedSchedule.value = null
      calendarOptions.hiddenDays = computeHiddenDays()
      void loadSchedules()
    }
  )

  // Drops the selected courses that no longer belong to the selected tracks,
  // so the calendar never ends up filtered by a course the combo doesn't show
  function onTracksChanged() {
    const available = new Set(uniqueCourses.value.map(c => String(c.id)))
    filters.course_ids = filters.course_ids.filter(id => available.has(id))
    applyFilters()
  }

  function closeDetail() {
    document.querySelectorAll('.fc-event.fc-selected-schedule')
      .forEach(e => e.classList.remove('fc-selected-schedule'))
    selectedSchedule.value = null
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

  function openDropConfirm(enrollment: EnrollmentToDrop) { enrollmentToDrop.value = enrollment }
  function cancelDrop() { if (!dropping.value) enrollmentToDrop.value = null }

  async function handleDrop() {
    if (!enrollmentToDrop.value) return
    dropping.value = true
    try {
      await enrollmentService.dropEnrollment(enrollmentToDrop.value.id)
      enrollmentToDrop.value = null
      notify(t('enrollments.drop.success'))
      await loadSchedules()
    } catch (err: any) {
      notify(err.response?.data?.message || t('enrollments.drop.error'), 'error')
    } finally {
      dropping.value = false
    }
  }

  // ── Schedule change simulator ──────────────────────────────────────────────
  function openScheduleChange() {
    if (!selectedSchedule.value) return
    revertDrag = null
    changeProposal.value = null
    changeSchedule.value = selectedSchedule.value
  }

  function closeScheduleChange() {
    revertDrag?.()
    revertDrag = null
    changeSchedule.value = null
    changeProposal.value = null
  }

  async function onScheduleChanged(result: ScheduleChangeApplyResult) {
    revertDrag = null
    changeSchedule.value = null
    changeProposal.value = null
    notify(result.dropped_students
      ? t('enrollments.scheduleChange.successWithDrops', { n: result.dropped_students })
      : t('enrollments.scheduleChange.success'))
    await loadAllSchedules()
    await loadSchedules()
  }

  // ── Watchers ───────────────────────────────────────────────────────────────
  watch(isMobile, () => {
    calendarRef.value?.getApi().changeView(calendarView())
  })

  watch(locale, (newLocale) => {
    calendarOptions.locale = newLocale === 'es' ? esLocale : 'en'
  })

  watch(
    () => ({ ...filters, student: studentId.value }),
    (v) => {
      const q: Record<string, string | string[]> = {}
      if (v.student) q.student = v.student
      if (v.course_ids.length) q.courses = v.course_ids
      if (v.track_ids.length) q.track_ids = v.track_ids
      if (v.teacher_ids.length) q.teachers = v.teacher_ids
      if (v.days_of_week.length) q.days = v.days_of_week
      void router.replace({ query: q })
    },
    { deep: true }
  )

  onMounted(async () => {
    mobileQuery.addEventListener('change', onMobileQueryChange)
    showLoading()
    const all = await loadAllSchedules()
    await loadSchedules(hasActiveFilters() ? undefined : all)
  })

  onUnmounted(() => {
    mobileQuery.removeEventListener('change', onMobileQueryChange)
  })

  return {
    isMobile, calendarRef, closeDetail,
    t, filters, loading, selectedSchedule, schedules, studentId, studentName, clearStudentFilter, showQuickModal, showFullModal,
    showToast, toastMessage, toastType, calendarOptions,
    uniqueCourses, uniqueTeachers, uniqueTracks, days,
    selectedGroupDaysLabel, selectedGroupIds,
    getTrackColor, applyFilters, onTracksChanged, openQuickModal, openFullModal, onEnrolled,
    enrollmentToDrop, dropping, openDropConfirm, cancelDrop, handleDrop,
    changeSchedule, changeProposal, openScheduleChange, closeScheduleChange, onScheduleChanged,
  }
}
