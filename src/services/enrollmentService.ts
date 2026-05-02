import http from '@/api/http'

export interface CourseLevel {
  id: number
  track: string
  name: string
}

export interface ScheduleData {
  id: number
  course_id: number
  teacher_id: number
  day_of_week: number
  starts_at: string
  ends_at: string
  description: string | null
  group_id: string | null
  capacity: number
  enrolled_count: number
  available_spots: number
  course: {
    id: number
    name: string
    course_level: CourseLevel
  }
  teacher: {
    id: number
    name: string
  }
  active_enrollments: Array<{
    id: number
    student: {
      id: number
      name: string
      email: string
      course_level: { name: string; track: string } | null
    }
    status: string
  }>
}

export interface EligibleStudent {
  id: number
  name: string
  email: string
  already_enrolled: boolean
  is_available: boolean
  course_level: { name: string; track: string } | null
}

export interface StudentData {
  id: number
  name: string
  email: string
  phone: string | null
  course_level: { name: string; track: string } | null
}

export interface ScheduleGroup {
  group_id: string | null
  schedule_ids: number[]
  course_name: string
  teacher_name: string
  days_label: string
  starts_at: string
  ends_at: string
  enrolled_count: number
  capacity: number
  available_spots: number
  is_compatible: boolean
  already_enrolled: boolean
}

export interface CompatibleSchedulesResponse {
  student: StudentData & {
    availabilities: Array<{
      day_of_week: number
      day_name: string
      start_time: string
      end_time: string
    }>
  }
  schedule_groups: ScheduleGroup[]
}

export interface ScheduleFilters {
  course_ids?: string[]
  tracks?: string[]
  teacher_ids?: string[]
  days_of_week?: string[]
}

export const enrollmentService = {
  async getSchedules(filters: ScheduleFilters = {}): Promise<ScheduleData[]> {
    const params: Record<string, unknown> = {}
    if (filters.course_ids?.length) params.course_ids = filters.course_ids
    if (filters.tracks?.length) params.tracks = filters.tracks
    if (filters.teacher_ids?.length) params.teacher_ids = filters.teacher_ids
    if (filters.days_of_week?.length) params.days_of_week = filters.days_of_week
    const res = await http.get('/enrollments/schedules', { params })
    return res.data
  },

  async getEligibleStudents(scheduleId: number, search = ''): Promise<EligibleStudent[]> {
    const res = await http.get(`/schedules/${scheduleId}/eligible-students`, {
      params: { search },
    })
    return res.data
  },

  async getCompatibleSchedules(studentId: number): Promise<CompatibleSchedulesResponse> {
    const res = await http.get(`/students/${studentId}/compatible-schedules`)
    return res.data
  },

  async searchStudents(search = ''): Promise<StudentData[]> {
    const res = await http.get('/students', { params: { search } })
    return res.data
  },

  async createEnrollment(studentId: number, scheduleIds: number[]): Promise<void> {
    await http.post('/enrollments', { student_id: studentId, schedule_ids: scheduleIds })
  },
}