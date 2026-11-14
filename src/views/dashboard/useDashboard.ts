import { ref, computed, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useLoading } from '@/composables/useLoading'
import { dashboardService, type DashboardData, type CourseWithCapacity } from '@/services/dashboardService'

export function useDashboard() {
  const { t } = useI18n()
  const { show: showLoading, hide: hideLoading } = useLoading()

  const data = ref<DashboardData | null>(null)
  const error = ref(false)

  async function load() {
    error.value = false
    showLoading()
    try {
      data.value = await dashboardService.getSummary()
    } catch {
      error.value = true
    } finally {
      hideLoading()
    }
  }

  const totalCards = computed(() => {
    const totals = data.value?.totals
    if (!totals) return []
    return [
      { icon: 'GraduationCap', label: t('dashboard.totals.activeStudents'), value: totals.active_students, to: '/students' },
      { icon: 'BookOpen', label: t('dashboard.totals.courses'), value: totals.courses, to: '/courses' },
      { icon: 'SquareUser', label: t('dashboard.totals.teachers'), value: totals.teachers, to: '/teachers' },
      { icon: 'UserCheck', label: t('dashboard.totals.activeEnrollments'), value: totals.active_enrollments, to: '/student-enrollments' },
    ] as const
  })

  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

  // "Lun y Mié 09:00 - 10:30", or one line per day when the times differ
  function slotsLabel(course: CourseWithCapacity): string {
    const days = course.slots.map(s => t(`schedules.days.${dayKeys[s.day_of_week]}`).slice(0, 3))
    const times = new Set(course.slots.map(s => `${s.starts_at} - ${s.ends_at}`))
    if (times.size === 1) return `${days.join(' y ')} ${[...times][0]}`
    return course.slots.map((s, i) => `${days[i]} ${s.starts_at} - ${s.ends_at}`).join(' · ')
  }

  // Filters of the "courses with open spots" table, applied on the client
  const filterTeacherId = ref('')
  const filterDay = ref('')

  const teacherOptions = computed(() =>
    [...(data.value?.teacher_load ?? [])].map(l => l.teacher).sort((a, b) => a.name.localeCompare(b.name))
  )

  const dayOptions = computed(() =>
    [1, 2, 3, 4, 5, 6, 0].map(d => ({ value: String(d), label: t(`schedules.days.${dayKeys[d]}`) }))
  )

  const filteredCourses = computed(() =>
    (data.value?.courses_with_capacity ?? []).filter(course =>
      (!filterTeacherId.value || course.teachers.some(teacher => String(teacher.id) === filterTeacherId.value)) &&
      (!filterDay.value || course.slots.some(slot => String(slot.day_of_week) === filterDay.value))
    )
  )

  const hasActiveFilters = computed(() => !!filterTeacherId.value || !!filterDay.value)

  function clearFilters() {
    filterTeacherId.value = ''
    filterDay.value = ''
  }

  const occupancy = (course: CourseWithCapacity) =>
    course.capacity > 0 ? Math.round((course.enrolled / course.capacity) * 100) : 0

  const maxWeeklyHours = computed(() =>
    Math.max(1, ...(data.value?.teacher_load ?? []).map(l => l.weekly_hours))
  )

  onMounted(load)

  return {
    t, data, error, load, totalCards, slotsLabel, occupancy, maxWeeklyHours,
    filterTeacherId, filterDay, teacherOptions, dayOptions, filteredCourses, hasActiveFilters, clearFilters,
  }
}
