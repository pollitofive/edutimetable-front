<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PrintLayout from './PrintLayout.vue'
import TimetableGrid from './TimetableGrid.vue'
import { usePrintSchedules } from './usePrintSchedules'

// General weekly grid, with the same URL filters as the enrollments calendar
// (courses, track_ids, teachers, days, student)
const route = useRoute()
const { t, schedules, loading, error, load } = usePrintSchedules()

const list = (v: unknown): string[] => (v === undefined ? [] : Array.isArray(v) ? v.map(String) : [String(v)])

const days = computed(() => list(route.query.days).map(Number).filter(d => d >= 0 && d <= 6))

const filtered = computed(() =>
  ['courses', 'track_ids', 'teachers', 'days', 'student'].some(key => route.query[key] !== undefined)
)

onMounted(() =>
  load({
    course_ids: list(route.query.courses),
    track_ids: list(route.query.track_ids),
    teacher_ids: list(route.query.teachers),
    days_of_week: list(route.query.days),
    student_id: (route.query.student as string) || undefined,
  })
)
</script>

<template>
  <PrintLayout
    :title="t('print.timetable.title')"
    :subtitle="filtered ? t('print.timetable.filtered') : ''"
    orientation="landscape"
    :loading="loading"
    :error="error"
  >
    <TimetableGrid :schedules="schedules" :days="days" />
  </PrintLayout>
</template>
