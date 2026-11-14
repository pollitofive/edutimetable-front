import http from '@/api/http'

export interface DashboardTotals {
  active_students: number
  courses: number
  teachers: number
  active_enrollments: number
}

// One course offering (schedule group) that still has room
export interface CourseWithCapacity {
  group_id: string | null
  schedule_id: number
  course: { id: number; name: string }
  track: { id: number; name: string }
  level: string
  teachers: Array<{ id: number; name: string }>
  slots: Array<{ day_of_week: number; starts_at: string; ends_at: string }>
  capacity: number
  enrolled: number
  available_spots: number
}

export interface TeacherLoad {
  teacher: { id: number; name: string }
  weekly_hours: number
  active_students: number
}

export interface DashboardData {
  totals: DashboardTotals
  courses_with_capacity: CourseWithCapacity[]
  teacher_load: TeacherLoad[]
}

export const dashboardService = {
  async getSummary(): Promise<DashboardData> {
    const res = await http.get('/dashboard')
    return res.data
  },
}
