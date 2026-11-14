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
import ScheduleDetail from '@/views/components/enrollments/ScheduleDetail.vue'
import { onMounted, onUnmounted } from 'vue'
import { useEnrollments } from './useEnrollments'

const {
  isMobile, calendarRef, closeDetail,
  t, filters, loading, selectedSchedule, schedules, studentId, studentName, clearStudentFilter, showQuickModal, showFullModal,
  showToast, toastMessage, toastType, calendarOptions,
  uniqueCourses, uniqueTeachers, uniqueTracks, days,
  selectedGroupDaysLabel, selectedGroupIds,
  getTrackColor, applyFilters, onTracksChanged, openQuickModal, openFullModal, onEnrolled,
  enrollmentToDrop, dropping, openDropConfirm, cancelDrop, handleDrop,
  changeSchedule, changeProposal, openScheduleChange, closeScheduleChange, onScheduleChanged,
} = useEnrollments()

// ESC closes the bottom sheet, unless a modal opened from it is on top
function closeSheetOnEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !isMobile.value || !selectedSchedule.value) return
  if (showQuickModal.value || enrollmentToDrop.value || changeSchedule.value) return
  closeDetail()
}
onMounted(() => window.addEventListener('keydown', closeSheetOnEscape))
onUnmounted(() => window.removeEventListener('keydown', closeSheetOnEscape))
</script>

<template>
  <!-- Page header -->
  <div class="flex flex-col gap-y-3 md:h-10 md:flex-row md:items-center">
    <div>
      <div class="text-base font-medium">{{ t('enrollments.title') }}</div>
      <div class="text-xs text-slate-400 mt-0.5">{{ t('enrollments.subtitle') }}</div>
    </div>
    <div class="flex flex-col gap-2 sm:flex-row md:ml-auto">
      <Button as="router-link" variant="outline-secondary" :to="{ name: 'print-timetable', query: $route.query }">
        <Lucide icon="Printer" class="w-4 h-4 mr-2" />
        {{ t('print.actions.printTimetable') }}
      </Button>
      <Button variant="primary" @click="openFullModal">
        <Lucide icon="UserPlus" class="w-4 h-4 mr-2" />
        {{ t('enrollments.enrollStudent') }}
      </Button>
    </div>
  </div>

  <!-- Filters -->
  <div class="box box--stacked p-4 mt-5">
    <div class="flex flex-col md:flex-row gap-3 md:items-center">
      <TomSelect v-model="filters.track_ids" :options="{ placeholder: t('enrollments.filters.allTracks'), create: false, onDelete: () => true }" class="w-full md:flex-1" multiple @update:modelValue="onTracksChanged">
        <option v-for="track in uniqueTracks" :key="track.id" :value="track.id">{{ track.name }}</option>
      </TomSelect>
      <TomSelect v-model="filters.course_ids" :options="{ placeholder: t('enrollments.filters.allCourses'), create: false, onDelete: () => true }" class="w-full md:flex-1" multiple @update:modelValue="applyFilters">
        <option v-for="course in uniqueCourses" :key="course.id" :value="String(course.id)">{{ course.name }}</option>
      </TomSelect>
      <TomSelect v-model="filters.teacher_ids" :options="{ placeholder: t('enrollments.filters.allTeachers'), create: false, onDelete: () => true }" class="w-full md:flex-1" multiple @update:modelValue="applyFilters">
        <option v-for="teacher in uniqueTeachers" :key="teacher.id" :value="String(teacher.id)">{{ teacher.name }}</option>
      </TomSelect>
      <TomSelect v-model="filters.days_of_week" :options="{ placeholder: t('enrollments.filters.allDays'), create: false, onDelete: () => true }" class="w-full md:flex-1" multiple @update:modelValue="applyFilters">
        <option v-for="day in days" :key="day.value" :value="day.value">{{ day.label }}</option>
      </TomSelect>
      <Lucide v-if="loading" icon="Loader" class="w-4 h-4 animate-spin text-slate-400 flex-shrink-0" />
    </div>

    <!-- Student filter (from the quick search) -->
    <div v-if="studentId" class="flex flex-wrap items-center gap-2 mt-3">
      <div class="flex items-center gap-1.5 pl-3 pr-1 py-0.5 text-sm border rounded-full border-primary/30 bg-primary/5 text-primary">
        <Lucide icon="GraduationCap" class="w-4 h-4 stroke-[1.5]" />
        <span>{{ studentName ? t('enrollments.studentFilter.label', { name: studentName }) : t('enrollments.studentFilter.unnamed') }}</span>
        <button type="button" class="p-1 rounded-full hover:bg-primary/10" :aria-label="t('enrollments.studentFilter.remove')" :title="t('enrollments.studentFilter.remove')" @click="clearStudentFilter">
          <Lucide icon="X" class="w-3.5 h-3.5" />
        </button>
      </div>
      <span v-if="!loading && !schedules.length" class="text-sm text-slate-500">{{ t('enrollments.studentFilter.empty') }}</span>
    </div>
  </div>

  <!-- Calendar + Panel -->
  <div class="flex gap-4 mt-4 items-start">
    <div class="flex-1 min-w-0 box box--stacked overflow-hidden">
      <FullCalendar ref="calendarRef" :options="calendarOptions" />
    </div>

    <div class="hidden md:block w-80 flex-shrink-0 box box--stacked overflow-hidden">
      <!-- Empty state -->
      <div v-if="!selectedSchedule" class="flex flex-col items-center justify-center h-64 text-center px-6 text-slate-400">
        <Lucide icon="CalendarSearch" class="w-8 h-8 mb-2 text-slate-300" />
        <p class="text-sm">Seleccioná un horario del calendario para ver los detalles</p>
      </div>

      <!-- Schedule detail -->
      <ScheduleDetail
        v-if="selectedSchedule && !isMobile"
        :schedule="selectedSchedule"
        :group-days-label="selectedGroupDaysLabel"
        :track-color="getTrackColor(selectedSchedule.course.course_level.track.id)"
        :show-drag-hint="true"
        @enroll="openQuickModal"
        @drop="openDropConfirm"
        @schedule-change="openScheduleChange"
      />
    </div>
  </div>

  <!-- Mobile: course detail in a bottom sheet -->
  <Teleport to="body">
  <div v-if="isMobile && selectedSchedule" class="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
    <div class="absolute inset-0 bg-black/50" @click="closeDetail"></div>
    <div class="relative max-h-[85vh] overflow-y-auto bg-white rounded-t-2xl shadow-xl dark:bg-darkmode-600">
      <div class="sticky top-0 z-10 flex items-center justify-end px-3 py-2 bg-white rounded-t-2xl dark:bg-darkmode-600">
        <div class="absolute left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-slate-300"></div>
        <button type="button" class="p-1.5 rounded-full text-slate-500 hover:bg-slate-100" :title="t('enrollments.cancel')" @click="closeDetail">
          <Lucide icon="X" class="w-5 h-5" />
        </button>
      </div>
      <ScheduleDetail
        :schedule="selectedSchedule"
        :group-days-label="selectedGroupDaysLabel"
        :track-color="getTrackColor(selectedSchedule.course.course_level.track.id)"
        :show-drag-hint="false"
        @enroll="openQuickModal"
        @drop="openDropConfirm"
        @schedule-change="openScheduleChange"
      />
    </div>
  </div>
  </Teleport>

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
