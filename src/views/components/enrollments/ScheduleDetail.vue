<script setup lang="ts">
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import { type ScheduleData } from '@/services/enrollmentService'
import { groupKey } from '@/views/print/usePrintSchedules'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

// Detail of the selected course: shared by the side panel (desktop) and the
// bottom sheet (mobile)
interface Props {
  schedule: ScheduleData
  groupDaysLabel: string
  trackColor: string
  showDragHint: boolean
}

defineProps<Props>()
const emit = defineEmits<{
  enroll: []
  drop: [enrollment: ScheduleData['active_enrollments'][number]]
  scheduleChange: []
}>()
</script>

<template>
  <div class="px-5 py-4 text-white" :style="{ backgroundColor: trackColor }">
    <div class="flex items-center justify-between gap-2">
      <h3 class="font-semibold text-sm leading-tight">{{ schedule.course.course_level.track.name }} - {{ schedule.course.course_level.name }}</h3>
      <span class="text-xs bg-white/20 rounded-full px-2 py-0.5 font-medium flex-shrink-0">{{ schedule.enrolled_count }}/{{ schedule.capacity }}</span>
    </div>
  </div>
  <div class="px-5 py-4 space-y-2 border-b border-slate-100 text-sm text-slate-600">
    <div class="flex items-center gap-2"><Lucide icon="User" class="w-4 h-4 text-slate-400 flex-shrink-0" />Prof. {{ schedule.teacher.name }}</div>
    <div class="flex items-center gap-2"><Lucide icon="Clock" class="w-4 h-4 text-slate-400 flex-shrink-0" />{{ groupDaysLabel }} {{ schedule.starts_at }} - {{ schedule.ends_at }}</div>
    <div class="flex items-center gap-2"><Lucide icon="BookOpen" class="w-4 h-4 text-slate-400 flex-shrink-0" />{{ schedule.course.name }}</div>
  </div>
  <div class="px-5 py-4">
    <div class="flex items-center justify-between mb-3">
      <span class="text-sm font-medium text-slate-700">{{ t('enrollments.enrolledStudents') }} ({{ schedule.active_enrollments.length }})</span>
      <button class="text-xs text-orange-500 font-medium hover:underline" @click="emit('enroll')">{{ t('enrollments.add') }}</button>
    </div>
    <div v-if="!schedule.active_enrollments.length" class="text-xs text-slate-400 py-2">{{ t('enrollments.noStudentsEnrolled') }}</div>
    <ul class="space-y-2">
      <li v-for="enrollment in schedule.active_enrollments" :key="enrollment.id" class="flex items-center gap-2.5">
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
          @click="emit('drop', enrollment)"
        >
          <Lucide icon="UserMinus" class="w-4 h-4" />
        </button>
      </li>
    </ul>
  </div>
  <div class="px-5 pb-5 pt-2 border-t border-slate-100">
    <div class="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
      <Lucide icon="Users" class="w-3.5 h-3.5" />
      {{ schedule.available_spots }} {{ t('enrollments.availableSpots', { n: '' }).replace('{n} ', '') }}
    </div>
    <Button variant="primary" class="w-full" @click="emit('enroll')">
      <Lucide icon="UserPlus" class="w-4 h-4 mr-2" />{{ t('enrollments.enrollStudentInSchedule') }}
    </Button>
    <Button variant="outline-secondary" class="w-full mt-2" @click="emit('scheduleChange')">
      <Lucide icon="CalendarClock" class="w-4 h-4 mr-2" />{{ t('enrollments.scheduleChange.open') }}
    </Button>
    <Button as="router-link" variant="outline-secondary" class="w-full mt-2" :to="{ name: 'print-course', params: { groupId: groupKey(schedule) } }">
      <Lucide icon="Printer" class="w-4 h-4 mr-2" />{{ t('print.actions.printSheet') }}
    </Button>
    <p v-if="showDragHint && schedule.group_slots.length === 1" class="mt-2 text-xs text-slate-400 text-center">{{ t('enrollments.scheduleChange.dragHint') }}</p>
  </div>
</template>
