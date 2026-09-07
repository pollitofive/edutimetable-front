<script setup lang="ts">
import { ref, watch } from 'vue'
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import { Dialog } from '@/components/Base/Headless'
import { enrollmentService, type EligibleStudent, type ScheduleData } from '@/services/enrollmentService'
import { useI18n } from '@/composables/useI18n'
import { useLoading } from '@/composables/useLoading'

const { t } = useI18n()
const { show: showLoading, hide: hideLoading } = useLoading()

interface Props {
  visible: boolean
  schedule: ScheduleData | null
  scheduleIds: number[]
  groupDaysLabel: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  enrolled: []
}>()

const search = ref('')
const students = ref<EligibleStudent[]>([])
const selectedStudentId = ref<number | null>(null)
const loading = ref(false)
const saving = ref(false)
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

async function fetchStudents() {
  if (!props.schedule) return
  loading.value = true
  showLoading()
  try {
    students.value = await enrollmentService.getEligibleStudents(props.schedule.id, search.value)
  } finally {
    loading.value = false
    hideLoading()
  }
}

function onSearchInput() {
  if (searchTimeout.value) clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(fetchStudents, 350)
}

function selectStudent(id: number) {
  selectedStudentId.value = selectedStudentId.value === id ? null : id
}

async function confirm() {
  if (!selectedStudentId.value || !props.schedule) return
  saving.value = true
  showLoading()
  try {
    await enrollmentService.createEnrollment(selectedStudentId.value, props.scheduleIds)
    emit('enrolled')
  } finally {
    saving.value = false
    hideLoading()
  }
}

function close() {
  search.value = ''
  students.value = []
  selectedStudentId.value = null
  emit('close')
}

watch(() => props.visible, (val) => {
  if (val) fetchStudents()
})
</script>

<template>
  <Dialog :open="visible" @close="close">
    <Dialog.Panel class="w-full max-w-lg p-0 overflow-hidden">
      <!-- Header -->
      <div class="px-6 pt-6 pb-4 border-b border-slate-100">
        <h2 class="text-lg font-semibold text-slate-800">{{ t('enrollments.enrollStudent') }}</h2>
        <p v-if="schedule" class="mt-1 text-sm text-slate-500">
          {{ schedule.course.course_level.track.name }} - {{ schedule.course.course_level.name }}
          · {{ groupDaysLabel }} {{ schedule.starts_at }} - {{ schedule.ends_at }}
          · Prof. {{ schedule.teacher.name }}
        </p>
        <div v-if="schedule" class="flex items-center gap-1.5 mt-2 text-sm text-slate-500">
          <Lucide icon="Users" class="w-4 h-4" />
          <span>
            {{ schedule.available_spots }} {{ t('enrollments.availableSpots', { n: '' }).replace('{n} ', '') }}
            {{ t('enrollments.of') }} {{ schedule.capacity }}
          </span>
        </div>
      </div>

      <!-- Search -->
      <div class="px-6 py-4">
        <div class="relative">
          <Lucide
            :icon="loading ? 'Loader' : 'Search'"
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            :class="{ 'animate-spin': loading }"
          />
          <input
            v-model="search"
            type="text"
            :placeholder="t('enrollments.searchStudentPlaceholder')"
            class="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            @input="onSearchInput"
          />
        </div>

        <!-- Results count -->
        <p v-if="!loading && students.length" class="mt-2 text-xs text-slate-400">
          {{ t('enrollments.resultsCount', { n: students.length }) }}
        </p>

        <!-- Student list -->
        <div class="mt-2 max-h-64 overflow-y-auto space-y-1">
          <div v-if="loading" class="py-4 text-center text-sm text-slate-400">
            <Lucide icon="Loader" class="w-4 h-4 animate-spin inline mr-1" />
          </div>

          <template v-else>
            <button
              v-for="student in students"
              :key="student.id"
              class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
              :class="selectedStudentId === student.id
                ? 'bg-orange-50 ring-1 ring-orange-400'
                : 'hover:bg-slate-50'"
              :disabled="student.already_enrolled"
              @click="selectStudent(student.id)"
            >
              <!-- Avatar -->
              <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
                {{ getInitials(student.name) }}
              </div>

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-800 truncate">{{ student.name }}</p>
                <p class="text-xs text-slate-400 truncate">{{ student.email }}</p>
              </div>

              <!-- Badges -->
              <div class="flex flex-col items-end gap-1 flex-shrink-0">
                <span v-if="student.course_level" class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {{ student.course_level.name }}
                </span>
                <span
                  v-if="student.already_enrolled"
                  class="text-xs text-slate-400"
                >{{ t('enrollments.alreadyEnrolled') }}</span>
                <span v-else-if="student.is_available" class="text-xs text-emerald-600 flex items-center gap-0.5">
                  <Lucide icon="Check" class="w-3 h-3" /> {{ t('enrollments.available') }}
                </span>
                <span v-else class="text-xs text-amber-500 flex items-center gap-0.5">
                  <Lucide icon="AlertCircle" class="w-3 h-3" /> {{ t('enrollments.noAvailability') }}
                </span>
              </div>
            </button>

            <p v-if="!students.length" class="py-4 text-center text-sm text-slate-400">
              {{ t('enrollments.noResults') }}
            </p>
          </template>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
        <Button variant="outline-secondary" @click="close">{{ t('enrollments.cancel') }}</Button>
        <Button
          variant="primary"
          :disabled="!selectedStudentId || saving"
          @click="confirm"
        >
          <Lucide v-if="saving" icon="Loader" class="w-4 h-4 mr-2 animate-spin" />
          <Lucide v-else icon="UserPlus" class="w-4 h-4 mr-2" />
          {{ t('enrollments.confirmEnrollment') }}
        </Button>
      </div>
    </Dialog.Panel>
  </Dialog>
</template>