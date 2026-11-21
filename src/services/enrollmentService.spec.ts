// Base example of mocking the API: replace the axios instance (@/api/http) with
// vi.mock and assert on the request the service builds and on what it returns.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import http from '@/api/http'
import { enrollmentService } from './enrollmentService'
import { makeSchedule } from '@/test/factories'

vi.mock('@/api/http', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}))

const get = vi.mocked(http.get)
const post = vi.mocked(http.post)

describe('enrollmentService', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('getSchedules', () => {
    it('returns the schedules of the response', async () => {
      const schedules = [makeSchedule()]
      get.mockResolvedValue({ data: schedules })

      await expect(enrollmentService.getSchedules()).resolves.toEqual(schedules)
    })

    it('sends only the filters that have a value', async () => {
      get.mockResolvedValue({ data: [] })

      await enrollmentService.getSchedules({ course_ids: ['1', '2'], track_ids: [], days_of_week: ['3'], student_id: '' })

      expect(get).toHaveBeenCalledWith('/enrollments/schedules', {
        params: { course_ids: ['1', '2'], days_of_week: ['3'] },
      })
    })
  })

  it('dropEnrollment posts to the drop endpoint', async () => {
    post.mockResolvedValue({ data: { dropped: 1 } })

    await expect(enrollmentService.dropEnrollment(5)).resolves.toEqual({ dropped: 1 })
    expect(post).toHaveBeenCalledWith('/enrollments/5/drop')
  })
})
