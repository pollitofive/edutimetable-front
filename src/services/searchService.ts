import http from '@/api/http'

export interface StudentResult {
  id: number
  name: string
  email: string
  level: string | null
  track: string | null
}

export interface TeacherResult {
  id: number
  name: string
  email: string | null
}

export interface CourseResult {
  id: number
  name: string
  level: string | null
  track: string | null
}

export interface SearchResults {
  students: StudentResult[]
  teachers: TeacherResult[]
  courses: CourseResult[]
}

export const SEARCH_MIN_LENGTH = 2

export const searchService = {
  // Up to 5 results per type, from the current business
  async search(q: string, signal?: AbortSignal): Promise<SearchResults> {
    const res = await http.get('/search', { params: { q }, signal })
    return res.data
  },
}
