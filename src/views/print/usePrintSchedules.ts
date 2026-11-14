import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { enrollmentService, type ScheduleData, type ScheduleFilters } from '@/services/enrollmentService'

export type PrintStudent = ScheduleData['active_enrollments'][number]['student']

/** A course offering: every weekly slot sharing a group_id (or a lone schedule) */
export interface PrintGroup {
  key: string
  course: ScheduleData['course']
  teachers: ScheduleData['teacher'][]
  slots: ScheduleData[]
  capacity: number
  enrolledCount: number
  students: PrintStudent[]
}

/** Route param of the course sheet: the group_id, or schedule-<id> for a schedule without group */
export const groupKey = (s: Pick<ScheduleData, 'id' | 'group_id'>) => s.group_id ?? `schedule-${s.id}`

const byTime = (a: ScheduleData, b: ScheduleData) =>
  a.day_of_week - b.day_of_week || a.starts_at.localeCompare(b.starts_at)

export function groupSchedules(schedules: ScheduleData[]): PrintGroup[] {
  const groups = new Map<string, PrintGroup>()

  for (const s of [...schedules].sort(byTime)) {
    const key = groupKey(s)
    let group = groups.get(key)
    if (!group) {
      group = { key, course: s.course, teachers: [], slots: [], capacity: s.capacity, enrolledCount: 0, students: [] }
      groups.set(key, group)
    }
    group.slots.push(s)
    group.enrolledCount = Math.max(group.enrolledCount, s.enrolled_count)
    if (!group.teachers.some(t => t.id === s.teacher.id)) group.teachers.push(s.teacher)
    // Students enroll in every slot of the group: list each one once
    for (const e of s.active_enrollments) {
      if (!group.students.some(st => st.id === e.student.id)) group.students.push(e.student)
    }
  }

  return [...groups.values()]
    .map(g => ({ ...g, students: [...g.students].sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => byTime(a.slots[0], b.slots[0]) || a.course.name.localeCompare(b.course.name))
}

export function usePrintSchedules() {
  const { t, locale } = useI18n()
  const schedules = ref<ScheduleData[]>([])
  const loading = ref(true)
  const error = ref(false)

  const load = async (filters: ScheduleFilters = {}) => {
    loading.value = true
    error.value = false
    try {
      schedules.value = await enrollmentService.getSchedules(filters)
    } catch {
      error.value = true
    } finally {
      loading.value = false
    }
  }

  // 0 = Sunday … 6 = Saturday, in the current locale (Jan 7 2024 was a Sunday)
  const dayName = (dow: number, style: 'long' | 'short' = 'long') => {
    const name = new Date(2024, 0, 7 + dow).toLocaleDateString(locale.value, { weekday: style })
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  /** "Lun, Mié y Vie" */
  const joinList = (items: string[]) =>
    items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} ${t('print.and')} ${items[items.length - 1]}`

  /** "Lun y Mié 09:00–10:30" (or one line per time when the slots differ) */
  const slotsLabel = (slots: Pick<ScheduleData, 'day_of_week' | 'starts_at' | 'ends_at'>[]) => {
    const byRange = new Map<string, number[]>()
    for (const s of slots) {
      const range = `${s.starts_at}–${s.ends_at}`
      byRange.set(range, [...(byRange.get(range) ?? []), s.day_of_week])
    }
    return [...byRange.entries()]
      .map(([range, days]) => `${joinList(days.map(d => dayName(d, 'short')))} ${range}`)
      .join(' · ')
  }

  return { t, locale, schedules, loading, error, load, dayName, slotsLabel }
}
