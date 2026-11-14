<script setup lang="ts">
import { computed } from 'vue'
import { type ScheduleData } from '@/services/enrollmentService'
import { getTrackColor } from '@/utils/trackColor'
import { usePrintSchedules } from './usePrintSchedules'

// Weekly grid for printing: a plain table (FullCalendar prints badly), days Mon–Sat in
// columns and one row per time range; courses at the same day and time stack in the cell
interface Props {
  schedules: ScheduleData[]
  showTeacher?: boolean
  // Days filtered by the user (0 = Sunday … 6 = Saturday): only those columns
  days?: number[]
}

const props = withDefaults(defineProps<Props>(), { showTeacher: true, days: () => [] })
const { t, dayName } = usePrintSchedules()

// The filtered days, or Mon–Sat plus Sunday only when something happens that day
const mondayFirst = (d: number) => (d === 0 ? 7 : d)
const days = computed(() => {
  if (props.days.length) return [...new Set(props.days)].sort((a, b) => mondayFirst(a) - mondayFirst(b))
  const list = [1, 2, 3, 4, 5, 6]
  return props.schedules.some(s => s.day_of_week === 0) ? [...list, 0] : list
})

const ranges = computed(() =>
  [...new Set(props.schedules.map(s => `${s.starts_at}–${s.ends_at}`))].sort()
)

const cell = (day: number, range: string) =>
  props.schedules
    .filter(s => s.day_of_week === day && `${s.starts_at}–${s.ends_at}` === range)
    .sort((a, b) => a.course.name.localeCompare(b.course.name))

const tracks = computed(() => {
  const seen = new Map<number, string>()
  for (const s of props.schedules) seen.set(s.course.course_level.track.id, s.course.course_level.track.name)
  return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
})
</script>

<template>
  <div v-if="!schedules.length" class="print-empty">{{ t('print.noSchedules') }}</div>
  <template v-else>
    <table class="print-grid">
      <thead>
        <tr>
          <th class="print-grid__time">{{ t('print.time') }}</th>
          <th v-for="day in days" :key="day">{{ dayName(day) }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="range in ranges" :key="range">
          <th class="print-grid__time">{{ range }}</th>
          <td v-for="day in days" :key="day">
            <div
              v-for="s in cell(day, range)"
              :key="s.id"
              class="print-block"
              :style="{ '--track-color': getTrackColor(s.course.course_level.track.id) }"
            >
              <span class="print-block__title">{{ s.course.name }}</span>
              <span v-if="showTeacher" class="print-block__meta">{{ s.teacher.name }}</span>
              <span class="print-block__meta print-block__count">{{ s.enrolled_count }}/{{ s.capacity }}</span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <div v-if="tracks.length > 1" class="print-legend">
      <span v-for="track in tracks" :key="track.id">
        <span class="print-legend__dot" :style="{ '--track-color': getTrackColor(track.id) }" />{{ track.name }}
      </span>
    </div>
  </template>
</template>
