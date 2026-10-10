import http from '@/api/http'

export interface CourseLevel {
  id: number
  track: { id: number; name: string }
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
  // Every day of the course (schedule group), even the ones hidden by the day filter
  group_slots: Array<{
    id: number
    teacher_id: number
    day_of_week: number
    starts_at: string
    ends_at: string
  }>
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
      course_level: { name: string; track: { id: number; name: string } } | null
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
  course_level: { name: string; track: { id: number; name: string } } | null
}

export interface StudentData {
  id: number
  name: string
  email: string
  phone: string | null
  course_level: { name: string; track: { id: number; name: string } } | null
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
  track_ids?: string[]
  teacher_ids?: string[]
  days_of_week?: string[]
}

export interface EnrollmentData {
  id: number
  student_id: number
  schedule_id: number
  enrolled_at: string
  status: 'active' | 'completed' | 'dropped' | 'pending'
  notes: string | null
  created_at: string
  student: {
    id: number
    name: string
    email: string
    phone: string | null
    level: string | null
  }
  schedule: {
    id: number
    course_id: number
    teacher_id: number
    day_of_week: number
    starts_at: string
    ends_at: string
    description: string | null
    group_id: string | null
    course: { id: number; name: string; level: string | null }
    teacher: { id: number; name: string }
  }
}

export interface ScheduleSlot {
  day_of_week: number
  starts_at: string
  ends_at: string
}

// Proposed day/time for one schedule of the group being moved
export interface ScheduleChangeSlot extends ScheduleSlot {
  schedule_id: number
}

export interface ScheduleChangeIssue extends ScheduleSlot {
  type: 'unavailable' | 'overlap'
  other?: ScheduleSlot & { course_name: string }
}

export interface ScheduleChangePreview {
  can_apply: boolean
  changes: Array<{ schedule_id: number; from: ScheduleSlot; to: ScheduleSlot }>
  internal_conflicts: Array<{ slot: ScheduleSlot; other: ScheduleSlot }>
  teacher_conflicts: Array<{
    schedule_id: number
    teacher: { id: number; name: string }
    slot: ScheduleSlot
    conflict: ScheduleSlot & { schedule_id: number; course_name: string }
  }>
  affected_students: Array<{
    student: { id: number; name: string }
    issues: ScheduleChangeIssue[]
    // The student's whole declared availability, sorted by day and time
    availabilities: ScheduleSlot[]
  }>
}

export interface ScheduleChangeApplyResult {
  changes: ScheduleChangePreview['changes']
  dropped_students: number
}

export interface PaginatedResponse<T> {
  data: T[]
  current_page: number
  last_page: number
  total: number
  per_page: number
}

export interface EnrollmentFilters {
  student_id?: number | string
  schedule_id?: number | string
  status?: string
  page?: number
  per_page?: number
}

export const enrollmentService = {
  async getSchedules(filters: ScheduleFilters = {}): Promise<ScheduleData[]> {
    const params: Record<string, unknown> = {}
    if (filters.course_ids?.length) params.course_ids = filters.course_ids
    if (filters.track_ids?.length) params.track_ids = filters.track_ids
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

  async createEnrollment(studentId: number, scheduleIds: number[]): Promise<EnrollmentData[]> {
    const res = await http.post('/enrollments', { student_id: studentId, schedule_ids: scheduleIds })
    return res.data
  },

  async getEnrollments(filters: EnrollmentFilters = {}): Promise<PaginatedResponse<EnrollmentData>> {
    const res = await http.get('/enrollments', { params: filters })
    return res.data
  },

  async updateEnrollment(id: number, data: { status?: string; notes?: string }): Promise<EnrollmentData> {
    const res = await http.patch(`/enrollments/${id}`, data)
    return res.data
  },

  // Drops the student from every schedule of the enrollment's group.
  async dropEnrollment(id: number): Promise<{ dropped: number }> {
    const res = await http.post(`/enrollments/${id}/drop`)
    return res.data
  },

  async deleteEnrollment(id: number): Promise<void> {
    await http.delete(`/enrollments/${id}`)
  },

  // "What if": impact of moving a course to new days/times, nothing is saved.
  // slots must be every day of the course (its group_slots).
  async previewScheduleChange(slots: ScheduleChangeSlot[]): Promise<ScheduleChangePreview> {
    const res = await http.post('/schedule-changes/preview', { slots })
    return res.data
  },

  // Moves the schedules in place (enrollments are kept) and drops the given affected students.
  async applyScheduleChange(slots: ScheduleChangeSlot[], dropStudentIds: number[] = []): Promise<ScheduleChangeApplyResult> {
    const res = await http.post('/schedule-changes/apply', { slots, drop_student_ids: dropStudentIds })
    return res.data
  },
}