// Builders of API data for the specs: a valid object by default, override only
// what the test cares about.
import type { ScheduleData } from '@/services/enrollmentService'

let nextId = 1

export function makeSchedule(overrides: Partial<ScheduleData> & {
  trackId?: number
  courseName?: string
  teacherName?: string
} = {}): ScheduleData {
  const { trackId = 1, courseName, teacherName, ...rest } = overrides
  const id = rest.id ?? nextId++
  const courseId = rest.course_id ?? id
  const teacherId = rest.teacher_id ?? id
  const day = rest.day_of_week ?? 1
  const startsAt = rest.starts_at ?? '18:00'
  const endsAt = rest.ends_at ?? '19:30'
  return {
    id,
    course_id: courseId,
    teacher_id: teacherId,
    day_of_week: day,
    starts_at: startsAt,
    ends_at: endsAt,
    description: null,
    group_id: null,
    capacity: 10,
    enrolled_count: 0,
    available_spots: 10,
    group_slots: [{ id, teacher_id: teacherId, day_of_week: day, starts_at: startsAt, ends_at: endsAt }],
    course: {
      id: courseId,
      name: courseName ?? `Curso ${courseId}`,
      course_level: { id: courseId, name: 'Inicial', track: { id: trackId, name: `Track ${trackId}` } },
    },
    teacher: { id: teacherId, name: teacherName ?? `Profe ${teacherId}` },
    active_enrollments: [],
    ...rest,
  }
}
