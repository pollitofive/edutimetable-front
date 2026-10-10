<script setup lang="ts">
import FullCalendar from '@fullcalendar/vue3'
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import TomSelect from '@/components/Base/TomSelect'
import { Dialog } from '@/components/Base/Headless'
import ToastNotification from '@/views/components/ToastNotification.vue'
import QuickEnrollModal from '@/views/components/enrollments/QuickEnrollModal.vue'
import FullEnrollModal from '@/views/components/enrollments/FullEnrollModal.vue'
import ScheduleChangeModal from '@/views/components/enrollments/ScheduleChangeModal.vue'
import { useEnrollments } from './useEnrollments'

const {
  t, filters, loading, selectedSchedule, showQuickModal, showFullModal,
  showToast, toastMessage, toastType, calendarOptions,
  uniqueCourses, uniqueTeachers, uniqueTracks, days,
  selectedGroupDaysLabel, selectedGroupIds,
  getTrackColor, applyFilters, openQuickModal, openFullModal, onEnrolled,
  enrollmentToDrop, dropping, openDropConfirm, cancelDrop, handleDrop,
  changeSchedule, changeProposal, openScheduleChange, closeScheduleChange, onScheduleChanged,
} = useEnrollments()
</script>

<template>
  <!-- Page header -->
  <div class="flex flex-col gap-y-3 md:h-10 md:flex-row md:items-center">
    <div>
      <div class="text-base font-medium">{{ t('enrollments.title') }}</div>
      <div class="text-xs text-slate-400 mt-0.5">{{ t('enrollments.subtitle') }}</div>
    </div>
    <div class="md:ml-auto">
      <Button variant="primary" @click="openFullModal">
        <Lucide icon="UserPlus" class="w-4 h-4 mr-2" />
        {{ t('enrollments.enrollStudent') }}
      </Button>
    </div>
  </div>

  <!-- Filters -->
  <div class="box box--stacked p-4 mt-5">
    <div class="flex gap-3 items-center">
      <TomSelect v-model="filters.course_ids" :options="{ placeholder: t('enrollments.filters.allCourses'), create: false, onDelete: () => true }" class="flex-1" multiple @update:modelValue="applyFilters">
        <option v-for="course in uniqueCourses" :key="course.id" :value="String(course.id)">{{ course.name }}</option>
      </TomSelect>
      <TomSelect v-model="filters.track_ids" :options="{ placeholder: t('enrollments.filters.allTracks'), create: false, onDelete: () => true }" class="flex-1" multiple @update:modelValue="applyFilters">
        <option v-for="track in uniqueTracks" :key="track.id" :value="track.id">{{ track.name }}</option>
      </TomSelect>
      <TomSelect v-model="filters.teacher_ids" :options="{ placeholder: t('enrollments.filters.allTeachers'), create: false, onDelete: () => true }" class="flex-1" multiple @update:modelValue="applyFilters">
        <option v-for="teacher in uniqueTeachers" :key="teacher.id" :value="String(teacher.id)">{{ teacher.name }}</option>
      </TomSelect>
      <TomSelect v-model="filters.days_of_week" :options="{ placeholder: t('enrollments.filters.allDays'), create: false, onDelete: () => true }" class="flex-1" multiple @update:modelValue="applyFilters">
        <option v-for="day in days" :key="day.value" :value="day.value">{{ day.label }}</option>
      </TomSelect>
      <Lucide v-if="loading" icon="Loader" class="w-4 h-4 animate-spin text-slate-400 flex-shrink-0" />
    </div>
  </div>

  <!-- Calendar + Panel -->
  <div class="flex gap-4 mt-4 items-start">
    <div class="flex-1 min-w-0 box box--stacked overflow-hidden">
      <FullCalendar :options="calendarOptions" />
    </div>

    <div class="w-80 flex-shrink-0 box box--stacked overflow-hidden">
      <!-- Empty state -->
      <div v-if="!selectedSchedule" class="flex flex-col items-center justify-center h-64 text-center px-6 text-slate-400">
        <Lucide icon="CalendarSearch" class="w-8 h-8 mb-2 text-slate-300" />
        <p class="text-sm">Seleccioná un horario del calendario para ver los detalles</p>
      </div>

      <!-- Schedule detail -->
      <template v-if="selectedSchedule">
        <div class="px-5 py-4 text-white" :style="{ backgroundColor: getTrackColor(selectedSchedule.course.course_level.track.id) }">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-sm leading-tight">{{ selectedSchedule.course.course_level.track.name }} - {{ selectedSchedule.course.course_level.name }}</h3>
            <span class="text-xs bg-white/20 rounded-full px-2 py-0.5 font-medium">{{ selectedSchedule.enrolled_count }}/{{ selectedSchedule.capacity }}</span>
          </div>
        </div>
        <div class="px-5 py-4 space-y-2 border-b border-slate-100 text-sm text-slate-600">
          <div class="flex items-center gap-2"><Lucide icon="User" class="w-4 h-4 text-slate-400 flex-shrink-0" />Prof. {{ selectedSchedule.teacher.name }}</div>
          <div class="flex items-center gap-2"><Lucide icon="Clock" class="w-4 h-4 text-slate-400 flex-shrink-0" />{{ selectedGroupDaysLabel }} {{ selectedSchedule.starts_at }} - {{ selectedSchedule.ends_at }}</div>
          <div class="flex items-center gap-2"><Lucide icon="BookOpen" class="w-4 h-4 text-slate-400 flex-shrink-0" />{{ selectedSchedule.course.name }}</div>
        </div>
        <div class="px-5 py-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-slate-700">{{ t('enrollments.enrolledStudents') }} ({{ selectedSchedule.active_enrollments.length }})</span>
            <button class="text-xs text-orange-500 font-medium hover:underline" @click="openQuickModal">{{ t('enrollments.add') }}</button>
          </div>
          <div v-if="!selectedSchedule.active_enrollments.length" class="text-xs text-slate-400 py-2">{{ t('enrollments.noStudentsEnrolled') }}</div>
          <ul class="space-y-2">
            <li v-for="enrollment in selectedSchedule.active_enrollments" :key="enrollment.id" class="flex items-center gap-2.5">
              <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
                {{ enrollment.student.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase() }}
              </div>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-slate-800 truncate">{{ enrollment.student.name }}</p>
                <p v-if="enrollment.student.course_level" class="text-xs text-slate-400 truncate">{{ enrollment.student.course_level.name }}</p>
              </div>
              <button
                type="button"
                class="p-1.5 rounded text-slate-400 hover:text-danger hover:bg-danger/10 transition flex-shrink-0"
                :title="t('enrollments.drop.action')"
                @click="openDropConfirm(enrollment)"
              >
                <Lucide icon="UserMinus" class="w-4 h-4" />
              </button>
            </li>
          </ul>
        </div>
        <div class="px-5 pb-5 pt-2 border-t border-slate-100">
          <div class="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
            <Lucide icon="Users" class="w-3.5 h-3.5" />
            {{ selectedSchedule.available_spots }} {{ t('enrollments.availableSpots', { n: '' }).replace('{n} ', '') }}
          </div>
          <Button variant="primary" class="w-full" @click="openQuickModal">
            <Lucide icon="UserPlus" class="w-4 h-4 mr-2" />{{ t('enrollments.enrollStudentInSchedule') }}
          </Button>
          <Button variant="outline-secondary" class="w-full mt-2" @click="openScheduleChange">
            <Lucide icon="CalendarClock" class="w-4 h-4 mr-2" />{{ t('enrollments.scheduleChange.open') }}
          </Button>
          <p v-if="selectedSchedule.group_slots.length === 1" class="mt-2 text-xs text-slate-400 text-center">{{ t('enrollments.scheduleChange.dragHint') }}</p>
        </div>
      </template>
    </div>
  </div>

  <QuickEnrollModal :visible="showQuickModal" :schedule="selectedSchedule" :schedule-ids="selectedGroupIds" :group-days-label="selectedGroupDaysLabel" @close="showQuickModal = false" @enrolled="onEnrolled" />
  <FullEnrollModal :visible="showFullModal" @close="showFullModal = false" @enrolled="onEnrolled" />
  <ScheduleChangeModal :visible="!!changeSchedule" :schedule="changeSchedule" :proposal="changeProposal" @close="closeScheduleChange" @applied="onScheduleChanged" />
  <Dialog :open="!!enrollmentToDrop" @close="cancelDrop" :staticBackdrop="true">
    <Dialog.Panel>
      <div class="p-5 text-center">
        <Lucide icon="UserMinus" class="w-16 h-16 mx-auto mt-3 text-danger" />
        <div class="mt-5 text-2xl">{{ t('enrollments.drop.title') }}</div>
        <div class="mt-2 text-slate-500">
          {{ t('enrollments.drop.message', { student: enrollmentToDrop?.student.name ?? '', days: selectedGroupDaysLabel }) }}
        </div>
      </div>
      <div class="px-5 pb-8 text-center">
        <Button type="button" variant="outline-secondary" :disabled="dropping" class="w-24 mr-2" @click="cancelDrop">{{ t('enrollments.cancel') }}</Button>
        <Button type="button" variant="danger" :disabled="dropping" class="w-24" @click="handleDrop">
          <Lucide v-if="dropping" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else>{{ t('enrollments.drop.confirm') }}</span>
        </Button>
      </div>
    </Dialog.Panel>
  </Dialog>
  <ToastNotification :show="showToast" :message="toastMessage" :type="toastType" @close="showToast = false" />
</template>

<style>
.fc-event.fc-selected-schedule {
  outline: 3px solid #f97316;
  outline-offset: -3px;
}
</style>
