<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { gql } from '@apollo/client/core'
import { apolloClient } from '@/apollo/clients'
import PrintLayout from './PrintLayout.vue'
import TimetableGrid from './TimetableGrid.vue'
import { usePrintSchedules, groupSchedules } from './usePrintSchedules'

// A teacher's week (/print/teacher/:id) or every teacher's (/print/teacher/all), one page
// each: their grid plus the list of their courses with days, time and students.
// /all takes the teachers list filters (?name=, ?email=)
const route = useRoute()
const { t, schedules, loading, error, load, slotsLabel } = usePrintSchedules()

const TEACHER_IDS = gql`
  query PrintTeacherIds($name: String, $email: String) {
    teachers(first: 1000, page: 1, name: $name, email: $email) {
      data { id }
    }
  }
`

const nameFilter = computed(() => (route.query.name as string) || '')
const emailFilter = computed(() => (route.query.email as string) || '')

const teacherId = computed(() => String(route.params.id))
const all = computed(() => teacherId.value === 'all')

const teachers = computed(() => {
  const map = new Map<number, { id: number; name: string; schedules: typeof schedules.value }>()
  for (const s of schedules.value) {
    const entry = map.get(s.teacher.id) ?? { id: s.teacher.id, name: s.teacher.name, schedules: [] }
    entry.schedules.push(s)
    map.set(s.teacher.id, entry)
  }
  return [...map.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(teacher => ({ ...teacher, groups: groupSchedules(teacher.schedules) }))
})

// Without schedules the API doesn't tell the name: the teachers list sends it
const title = computed(() =>
  all.value
    ? t('print.teacher.titleAll')
    : t('print.teacher.title', { name: teachers.value[0]?.name ?? (route.query.teacher_name as string) ?? '' })
)

const subtitle = computed(() =>
  all.value && (nameFilter.value || emailFilter.value)
    ? t('print.teacher.filtered', { filter: [nameFilter.value, emailFilter.value].filter(Boolean).join(' · ') })
    : ''
)

const loadFiltered = async () => {
  try {
    const { data } = await apolloClient.query({
      query: TEACHER_IDS,
      variables: {
        name: nameFilter.value ? `%${nameFilter.value}%` : undefined,
        email: emailFilter.value ? `%${emailFilter.value}%` : undefined,
      },
      fetchPolicy: 'network-only',
    })
    const ids: string[] = data.teachers.data.map((tc: { id: string }) => String(tc.id))
    // No teacher matches: nothing to print (an empty teacher_ids would bring them all)
    if (!ids.length) {
      schedules.value = []
      loading.value = false
      return
    }
    await load({ teacher_ids: ids })
  } catch {
    error.value = true
    loading.value = false
  }
}

onMounted(() => {
  if (!all.value) return load({ teacher_ids: [teacherId.value] })
  return nameFilter.value || emailFilter.value ? loadFiltered() : load()
})
</script>

<template>
  <PrintLayout :title="title" :subtitle="subtitle" orientation="landscape" :loading="loading" :error="error">
    <div v-if="!teachers.length" class="print-empty">{{ all ? t('print.teacher.noneMatch') : t('print.teacher.noSchedules') }}</div>
    <section
      v-for="(teacher, index) in teachers"
      :key="teacher.id"
      class="print-section"
      :class="{ 'print-page-break': index > 0 }"
    >
      <h2 v-if="all" class="print-section__title">{{ teacher.name }}</h2>
      <TimetableGrid :schedules="teacher.schedules" :show-teacher="false" />

      <table class="print-table mt-4">
        <thead>
          <tr>
            <th>{{ t('print.course') }}</th>
            <th>{{ t('print.daysAndTime') }}</th>
            <th>{{ t('print.enrolled') }}</th>
            <th>{{ t('print.students') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="group in teacher.groups" :key="group.key">
            <td>
              <div class="font-medium">{{ group.course.name }}</div>
              <div class="text-slate-500">{{ group.course.course_level.track.name }} · {{ group.course.course_level.name }}</div>
            </td>
            <td>{{ slotsLabel(group.slots) }}</td>
            <td class="whitespace-nowrap">{{ group.enrolledCount }}/{{ group.capacity }}</td>
            <td>{{ group.students.map(s => s.name).join(', ') || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </PrintLayout>
</template>
