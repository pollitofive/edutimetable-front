<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { FormInput, FormLabel } from '@/components/Base/Form'
import PrintLayout from './PrintLayout.vue'
import { usePrintSchedules, groupSchedules } from './usePrintSchedules'

// Sheet of one course offering (/print/course/:groupId): its data and the list of active
// students, optionally with empty columns to take attendance by hand
const route = useRoute()
const { t, schedules, loading, error, load, slotsLabel } = usePrintSchedules()

const MAX_ATTENDANCE_COLUMNS = 12
const attendanceColumns = ref(0)
const setAttendanceColumns = (value: string | number) => {
  const n = Math.round(Number(value))
  attendanceColumns.value = Number.isFinite(n) ? Math.min(Math.max(n, 0), MAX_ATTENDANCE_COLUMNS) : 0
}

const group = computed(() => groupSchedules(schedules.value).find(g => g.key === String(route.params.groupId)))

const title = computed(() => group.value?.course.name ?? t('print.course'))

onMounted(() => load())
</script>

<template>
  <PrintLayout :title="title" :loading="loading" :error="error">
    <template #controls>
      <div class="flex items-center gap-2">
        <FormLabel htmlFor="attendance-columns" class="mb-0 whitespace-nowrap">{{ t('print.courseSheet.attendanceColumns') }}</FormLabel>
        <FormInput
          id="attendance-columns"
          type="number"
          min="0"
          :max="MAX_ATTENDANCE_COLUMNS"
          class="w-20"
          :model-value="attendanceColumns"
          @update:model-value="setAttendanceColumns"
        />
      </div>
    </template>

    <div v-if="!group" class="print-empty">{{ t('print.courseSheet.notFound') }}</div>
    <template v-else>
      <table class="print-table">
        <tbody>
          <tr>
            <th class="w-40">{{ t('print.trackAndLevel') }}</th>
            <td>{{ group.course.course_level.track.name }} · {{ group.course.course_level.name }}</td>
          </tr>
          <tr>
            <th>{{ t('print.teacherLabel') }}</th>
            <td>{{ group.teachers.map(tc => tc.name).join(', ') }}</td>
          </tr>
          <tr>
            <th>{{ t('print.daysAndTime') }}</th>
            <td>{{ slotsLabel(group.slots) }}</td>
          </tr>
          <tr>
            <th>{{ t('print.enrolled') }}</th>
            <td>{{ group.students.length }}/{{ group.capacity }}</td>
          </tr>
        </tbody>
      </table>

      <section class="print-section mt-5">
        <h2 class="print-section__title">{{ t('print.students') }}</h2>
        <div v-if="!group.students.length" class="print-empty">{{ t('print.courseSheet.noStudents') }}</div>
        <table v-else class="print-table">
          <thead>
            <tr>
              <th class="w-8">#</th>
              <th>{{ t('print.name') }}</th>
              <th>{{ t('print.email') }}</th>
              <th>{{ t('print.phone') }}</th>
              <th v-for="n in attendanceColumns" :key="n" class="print-table__attendance" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="(student, index) in group.students" :key="student.id">
              <td>{{ index + 1 }}</td>
              <td class="font-medium">{{ student.name }}</td>
              <td>{{ student.email }}</td>
              <td class="whitespace-nowrap">{{ student.phone || '—' }}</td>
              <td v-for="n in attendanceColumns" :key="n" class="print-table__attendance" />
            </tr>
          </tbody>
        </table>
      </section>
    </template>
  </PrintLayout>
</template>
