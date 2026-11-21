import { describe, it, expect } from 'vitest'
import { makeSchedule } from '@/test/factories'
import {
  toArr, toLocalDate, getMonday, getDateForDow, buildEvents, computeHiddenDays,
  uniqueCoursesFor, uniqueTeachersFor,
} from './calendarEvents'

// The specs run with TZ=America/Argentina/Buenos_Aires (vitest.config.ts):
// local dates below are Argentina dates.
const mondayMorning = new Date(2026, 10, 23, 10, 0) // lun 23/11/2026 10:00
const mondayNight = new Date(2026, 10, 23, 22, 0)   // lun 23/11/2026 22:00 (ya es martes en UTC)
const sundayNight = new Date(2026, 10, 29, 23, 30)  // dom 29/11/2026 23:30

describe('toArr', () => {
  it('normalizes a query value to an array', () => {
    expect(toArr(undefined)).toEqual([])
    expect(toArr('3')).toEqual(['3'])
    expect(toArr(['1', '2'])).toEqual(['1', '2'])
  })
})

describe('toLocalDate', () => {
  it('formats the local date, not the UTC one', () => {
    expect(toLocalDate(mondayNight)).toBe('2026-11-23')
  })
})

describe('getMonday', () => {
  it('returns the Monday of the current week', () => {
    expect(getMonday(mondayMorning)).toBe('2026-11-23')
    expect(getMonday(new Date(2026, 10, 28, 12, 0))).toBe('2026-11-23') // sábado
  })

  it('on Sunday returns the Monday before', () => {
    expect(getMonday(sundayNight)).toBe('2026-11-23')
  })

  // Regression: with toISOString() it returned the Tuesday from 21:00 on
  it('does not move to the next day at night', () => {
    expect(getMonday(mondayNight)).toBe('2026-11-23')
  })

  it('works across a month boundary', () => {
    expect(getMonday(new Date(2026, 11, 2, 22, 0))).toBe('2026-11-30') // mié 2/12 → lun 30/11
  })
})

describe('getDateForDow', () => {
  it.each([
    [1, '2026-11-23'],
    [3, '2026-11-25'],
    [6, '2026-11-28'],
    [0, '2026-11-29'],
  ])('weekday %i falls on %s', (dow, date) => {
    expect(getDateForDow(dow, mondayMorning)).toBe(date)
  })

  // Regression: at 22:00 every course was shown one day later (and Saturday's fell on the hidden Sunday)
  it('keeps the same dates at night', () => {
    expect(getDateForDow(1, mondayNight)).toBe('2026-11-23')
    expect(getDateForDow(6, mondayNight)).toBe('2026-11-28')
  })
})

describe('buildEvents', () => {
  it('builds one event per schedule on its weekday', () => {
    const s = makeSchedule({ id: 7, day_of_week: 3, starts_at: '18:00', ends_at: '19:30', trackId: 2 })
    const [event] = buildEvents([s], mondayNight)

    expect(event).toMatchObject({
      id: '7',
      start: '2026-11-25T18:00',
      end: '2026-11-25T19:30',
      backgroundColor: '#3b82f6',
      extendedProps: { schedule: s },
    })
  })

  it('only lets single-day courses be dragged', () => {
    const single = makeSchedule()
    const twoDays = makeSchedule()
    twoDays.group_slots = [...twoDays.group_slots, { ...twoDays.group_slots[0], id: 999, day_of_week: 4 }]

    const [a, b] = buildEvents([single, twoDays], mondayMorning)
    expect(a.editable).toBe(true)
    expect(b.editable).toBe(false)
  })
})

describe('computeHiddenDays', () => {
  it('hides only Sunday with no day filter', () => {
    expect(computeHiddenDays([])).toEqual([0])
  })

  it('hides every day not selected', () => {
    expect(computeHiddenDays(['1', '3'])).toEqual([0, 2, 4, 5, 6])
  })
})

describe('uniqueCoursesFor', () => {
  const schedules = [
    makeSchedule({ course_id: 1, courseName: 'Piano', trackId: 1 }),
    makeSchedule({ course_id: 1, courseName: 'Piano', trackId: 1 }), // otro día del mismo curso
    makeSchedule({ course_id: 2, courseName: 'Canto', trackId: 2 }),
    makeSchedule({ course_id: 3, courseName: 'Bajo', trackId: 1 }),
  ]

  it('lists every course once, sorted by name, with no track selected', () => {
    expect(uniqueCoursesFor(schedules, []).map(c => c.name)).toEqual(['Bajo', 'Canto', 'Piano'])
  })

  it('narrows to the selected tracks', () => {
    expect(uniqueCoursesFor(schedules, ['1']).map(c => c.name)).toEqual(['Bajo', 'Piano'])
  })
})

describe('uniqueTeachersFor', () => {
  it('lists every teacher once, sorted by name', () => {
    const schedules = [
      makeSchedule({ teacher_id: 1, teacherName: 'Zoe' }),
      makeSchedule({ teacher_id: 2, teacherName: 'Ana' }),
      makeSchedule({ teacher_id: 1, teacherName: 'Zoe' }),
    ]
    expect(uniqueTeachersFor(schedules).map(t => t.name)).toEqual(['Ana', 'Zoe'])
  })
})
