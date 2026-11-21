// Pure helpers of the enrollments calendar: no Vue, no FullCalendar instance,
// no API. useEnrollments wires them to the page; the specs test them directly.
import type { EventInput } from '@fullcalendar/core'
import type { ScheduleData } from '@/services/enrollmentService'
import { getTrackColor } from '@/utils/trackColor'

export const toArr = (v: string | string[] | undefined): string[] =>
  v === undefined ? [] : Array.isArray(v) ? v : [v]

// YYYY-MM-DD in local time. toISOString() would convert to UTC first, which in
// Argentina (UTC-3) moves every date one day forward from 21:00 on.
export function toLocalDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Monday of the week of `now` (on Sunday, the Monday before)
export function getMonday(now: Date = new Date()): string {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  monday.setDate(monday.getDate() + (now.getDay() === 0 ? -6 : 1 - now.getDay()))
  return toLocalDate(monday)
}

// Date of the given weekday (0 = Sunday … 6 = Saturday) in the week of `now`
export function getDateForDow(dow: number, now: Date = new Date()): string {
  const [y, m, d] = getMonday(now).split('-').map(Number)
  return toLocalDate(new Date(y, m - 1, d + (dow === 0 ? 6 : dow - 1)))
}

export function buildEvents(data: ScheduleData[], now: Date = new Date()): EventInput[] {
  return data.map(s => ({
    id: String(s.id),
    start: `${getDateForDow(s.day_of_week, now)}T${s.starts_at}`,
    end: `${getDateForDow(s.day_of_week, now)}T${s.ends_at}`,
    backgroundColor: getTrackColor(s.course.course_level.track.id),
    borderColor: 'transparent',
    // Only single-day courses are moved by dragging; the others go through
    // the "simulate schedule change" button in the panel
    editable: s.group_slots.length === 1,
    extendedProps: { schedule: s },
  }))
}

// Sunday is always hidden; with a day filter, only the selected days show
export function computeHiddenDays(daysOfWeek: string[]): number[] {
  if (!daysOfWeek.length) return [0]
  const selected = daysOfWeek.map(Number)
  return [0, 1, 2, 3, 4, 5, 6].filter(d => !selected.includes(d))
}

// Courses for the combo, narrowed to the selected tracks (all when none is
// selected), without repeats and sorted by name
export function uniqueCoursesFor(schedules: ScheduleData[], trackIds: string[]): ScheduleData['course'][] {
  const seen = new Set<number>()
  const tracks = trackIds.map(String)
  return schedules
    .filter(s => !tracks.length || tracks.includes(String(s.course.course_level.track.id)))
    .filter(s => { const ok = !seen.has(s.course.id); seen.add(s.course.id); return ok })
    .map(s => s.course)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function uniqueTeachersFor(schedules: ScheduleData[]): ScheduleData['teacher'][] {
  const seen = new Set<number>()
  return schedules
    .filter(s => { const ok = !seen.has(s.teacher.id); seen.add(s.teacher.id); return ok })
    .map(s => s.teacher)
    .sort((a, b) => a.name.localeCompare(b.name))
}
