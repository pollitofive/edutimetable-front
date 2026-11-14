<script setup lang="ts">
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import Table from '@/components/Base/Table'
import { useDashboard } from './useDashboard'

const { t, data, error, load, totalCards, slotsLabel, occupancy, maxWeeklyHours } = useDashboard()
</script>

<template>
  <div>
    <div class="text-base font-medium">{{ t('dashboard.title') }}</div>
    <div class="text-xs text-slate-400 mt-0.5">{{ t('dashboard.subtitle') }}</div>
  </div>

  <!-- Error State -->
  <div v-if="error" class="box box--stacked flex items-center justify-center p-10 mt-5">
    <div class="flex flex-col items-center gap-3">
      <Lucide icon="AlertCircle" class="w-8 h-8 text-danger" />
      <div class="text-sm text-slate-500">{{ t('dashboard.error') }}</div>
      <Button variant="outline-primary" @click="load">{{ t('dashboard.retry') }}</Button>
    </div>
  </div>

  <template v-else-if="data">
    <!-- Totals -->
    <div class="grid grid-cols-2 gap-4 mt-5 lg:grid-cols-4">
      <router-link
        v-for="card in totalCards"
        :key="card.label"
        :to="card.to"
        class="box box--stacked flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5 transition hover:bg-slate-50 dark:hover:bg-darkmode-400"
      >
        <div class="flex items-center justify-center flex-shrink-0 w-11 h-11 rounded-full bg-primary/10">
          <Lucide :icon="card.icon" class="w-5 h-5 text-primary" />
        </div>
        <div class="min-w-0">
          <div class="text-2xl font-medium leading-none">{{ card.value }}</div>
          <div class="mt-1.5 text-xs text-slate-500">{{ card.label }}</div>
        </div>
      </router-link>
    </div>

    <div class="grid grid-cols-1 gap-5 mt-5 2xl:grid-cols-3">
      <!-- Courses with open spots -->
      <div class="box box--stacked flex flex-col 2xl:col-span-2">
        <div class="p-5 border-b border-slate-200/60">
          <div class="font-medium">{{ t('dashboard.coursesWithCapacity.title') }}</div>
          <div class="text-xs text-slate-400 mt-0.5">{{ t('dashboard.coursesWithCapacity.subtitle') }}</div>
        </div>
        <div v-if="!data.courses_with_capacity.length" class="flex flex-col items-center gap-3 py-10 text-sm text-slate-500">
          <Lucide icon="Inbox" class="w-10 h-10 text-slate-300" />
          {{ t('dashboard.coursesWithCapacity.empty') }}
        </div>
        <div v-else class="overflow-x-auto">
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('dashboard.coursesWithCapacity.course') }}</Table.Td>
                <Table.Td class="hidden md:table-cell py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('dashboard.coursesWithCapacity.schedule') }}</Table.Td>
                <Table.Td class="hidden lg:table-cell py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('dashboard.coursesWithCapacity.teacher') }}</Table.Td>
                <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('dashboard.coursesWithCapacity.occupancy') }}</Table.Td>
                <Table.Td class="py-4 bg-slate-50 dark:bg-darkmode-800 border-slate-200/60"></Table.Td>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              <Table.Tr v-for="course in data.courses_with_capacity" :key="course.group_id ?? course.schedule_id" class="[&_td]:last:border-b-0">
                <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
                  <div class="font-medium">{{ course.course.name }}</div>
                  <div class="px-2 py-0.5 mt-1 text-xs font-semibold rounded-md bg-primary/10 text-primary inline-block">{{ course.track.name }} · {{ course.level }}</div>
                  <div class="mt-1 text-xs text-slate-500 md:hidden">{{ slotsLabel(course) }}</div>
                </Table.Td>
                <Table.Td class="hidden md:table-cell py-4 border-dashed dark:bg-darkmode-600 text-slate-600">{{ slotsLabel(course) }}</Table.Td>
                <Table.Td class="hidden lg:table-cell py-4 border-dashed dark:bg-darkmode-600 text-slate-600">{{ course.teachers.join(', ') }}</Table.Td>
                <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
                  <div class="flex items-center gap-2 whitespace-nowrap">
                    <span class="font-mono text-sm">{{ course.enrolled }}/{{ course.capacity }}</span>
                    <div class="hidden sm:block w-20 h-1.5 rounded-full bg-slate-200">
                      <div class="h-full rounded-full bg-primary" :style="{ width: `${occupancy(course)}%` }"></div>
                    </div>
                  </div>
                  <div class="mt-1 text-xs text-success">{{ t('dashboard.coursesWithCapacity.spots', { n: course.available_spots }) }}</div>
                </Table.Td>
                <Table.Td class="py-4 border-dashed dark:bg-darkmode-600 text-right">
                  <router-link
                    :to="{ path: '/student-enrollments', query: { courses: String(course.course.id) } }"
                    class="inline-flex items-center gap-1 text-xs text-primary hover:underline whitespace-nowrap"
                    :title="t('dashboard.coursesWithCapacity.goToEnrollments')"
                  >
                    <span class="hidden sm:inline">{{ t('dashboard.coursesWithCapacity.goToEnrollments') }}</span>
                    <Lucide icon="ArrowRight" class="w-4 h-4" />
                  </router-link>
                </Table.Td>
              </Table.Tr>
            </Table.Tbody>
          </Table>
        </div>
      </div>

      <!-- Teacher load -->
      <div class="box box--stacked flex flex-col">
        <div class="p-5 border-b border-slate-200/60">
          <div class="font-medium">{{ t('dashboard.teacherLoad.title') }}</div>
        </div>
        <div v-if="!data.teacher_load.length" class="flex flex-col items-center gap-3 py-10 text-sm text-slate-500">
          <Lucide icon="Inbox" class="w-10 h-10 text-slate-300" />
          {{ t('dashboard.teacherLoad.empty') }}
        </div>
        <ul v-else class="p-5 space-y-4">
          <li v-for="load in data.teacher_load" :key="load.teacher.id">
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="font-medium truncate">{{ load.teacher.name }}</span>
              <span class="flex-shrink-0 text-xs text-slate-500">
                {{ t('dashboard.teacherLoad.hoursValue', { n: load.weekly_hours }) }} · {{ load.active_students }} {{ t('dashboard.teacherLoad.students').toLowerCase() }}
              </span>
            </div>
            <div class="h-1.5 mt-1.5 rounded-full bg-slate-200">
              <div class="h-full rounded-full bg-primary" :style="{ width: `${(load.weekly_hours / maxWeeklyHours) * 100}%` }"></div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </template>
</template>
