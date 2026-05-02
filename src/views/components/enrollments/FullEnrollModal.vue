<script setup lang="ts">
import { ref, watch } from 'vue'
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import { Dialog } from '@/components/Base/Headless'
import {
  enrollmentService,
  type StudentData,
  type ScheduleGroup,
  type CompatibleSchedulesResponse,
} from '@/services/enrollmentService'
import { useI18n } from '@/composables/useI18n'
import { useLoading } from '@/composables/useLoading'

const { t } = useI18n()
const { show: showLoading, hide: hideLoading } = useLoading()

defineProps<{ visible: boolean }>()
const emit = defineEmits<{
  close: []
  enrolled: []
}>()

const search = ref('')
const searchResults = ref<StudentData[]>([])
const selectedStudent = ref<CompatibleSchedulesResponse | null>(null)
const selectedGroupId = ref<string | null>(null)
const searchLoading = ref(false)
const schedulesLoading = ref(false)
const saving = ref(false)
const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function onSearchInput() {
  if (searchTimeout.value) clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(searchStudents, 350)
}

async function searchStudents() {
  searchLoading.value = true
  showLoading()
  try {
    searchResults.value = await enrollmentService.searchStudents(search.value)
  } finally {
    searchLoading.value = false
    hideLoading()
  }
}

async function selectStudent(student: StudentData) {
  schedulesLoading.value = true
  selectedStudent.value = null
  selectedGroupId.value = null
  showLoading()
  try {
    selectedStudent.value = await enrollmentService.getCompatibleSchedules(student.id)
  } finally {
    schedulesLoading.value = false
    hideLoading()
  }
}

function changeStudent() {
  selectedStudent.value = null
  selectedGroupId.value = null
}

function selectGroup(group: ScheduleGroup) {
  if (!group.is_compatible) return
  selectedGroupId.value = group.group_id ?? group.schedule_ids[0].toString()
}

function getSelectedGroup(): ScheduleGroup | undefined {
  return selectedStudent.value?.schedule_groups.find(
    g => (g.group_id ?? g.schedule_ids[0].toString()) === selectedGroupId.value
  )
}

async function confirm() {
  const group = getSelectedGroup()
  if (!group || !selectedStudent.value) return
  saving.value = true
  showLoading()
  try {
    await enrollmentService.createEnrollment(selectedStudent.value.student.id, group.schedule_ids)
    emit('enrolled')
  } finally {
    saving.value = false
    hideLoading()
  }
}

function close() {
  search.value = ''
  searchResults.value = []
  selectedStudent.value = null
  selectedGroupId.value = null
  emit('close')
}

watch(() => selectedStudent.value, () => { selectedGroupId.value = null })
</script>

<template>
  <Dialog :open="visible" @close="close">
    <Dialog.Panel class="w-full max-w-3xl p-0 overflow-hidden">
      <div class="flex min-h-[480px]">

        <!-- LEFT: Student search / details -->
        <div class="w-72 flex-shrink-0 border-r border-slate-100 flex flex-col">

          <!-- Student selected -->
          <template v-if="selectedStudent">
            <div class="px-5 pt-5 pb-4 border-b border-slate-100">
              <p class="text-xs font-medium text-orange-500 uppercase tracking-wide mb-3">
                {{ t('enrollments.step1Title') }}
              </p>
              <!-- Avatar + name -->
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600 flex-shrink-0">
                  {{ getInitials(selectedStudent.student.name) }}
                </div>
                <div class="min-w-0">
                  <p class="font-semibold text-slate-800 truncate">{{ selectedStudent.student.name }}</p>
                  <p class="text-xs text-slate-400 truncate">{{ selectedStudent.student.email }}</p>
                </div>
              </div>

              <!-- Level & phone -->
              <div class="mt-3 space-y-1.5 text-sm text-slate-600">
                <div v-if="selectedStudent.student.course_level" class="flex items-center gap-2">
                  <Lucide icon="GraduationCap" class="w-4 h-4 text-slate-400 flex-shrink-0" />
                  {{ selectedStudent.student.course_level.track }} - {{ selectedStudent.student.course_level.name }}
                </div>
                <div v-if="selectedStudent.student.phone" class="flex items-center gap-2">
                  <Lucide icon="Phone" class="w-4 h-4 text-slate-400 flex-shrink-0" />
                  {{ selectedStudent.student.phone }}
                </div>
              </div>

              <!-- Availabilities -->
              <div v-if="selectedStudent.student.availabilities.length" class="mt-4">
                <p class="text-xs text-slate-500 mb-2">{{ t('enrollments.declaredAvailability') }}</p>
                <ul class="space-y-1">
                  <li
                    v-for="(av, i) in selectedStudent.student.availabilities"
                    :key="i"
                    class="flex items-center gap-1.5 text-xs text-slate-600"
                  >
                    <span class="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0"></span>
                    {{ av.day_name }} {{ av.start_time }} - {{ av.end_time }}
                  </li>
                </ul>
              </div>
            </div>

            <div class="px-5 py-3">
              <button class="text-xs text-orange-500 hover:underline" @click="changeStudent">
                {{ t('enrollments.changeStudent') }}
              </button>
            </div>
          </template>

          <!-- Student search -->
          <template v-else>
            <div class="px-5 pt-5 pb-4">
              <h2 class="text-base font-semibold text-slate-800 mb-4">
                {{ t('enrollments.enrollStudent') }}
              </h2>
              <div class="relative">
                <Lucide
                  :icon="searchLoading ? 'Loader' : 'Search'"
                  class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  :class="{ 'animate-spin': searchLoading }"
                />
                <input
                  v-model="search"
                  type="text"
                  :placeholder="t('enrollments.searchStudentPlaceholder')"
                  class="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  @input="onSearchInput"
                />
              </div>
            </div>

            <div class="flex-1 overflow-y-auto px-3 pb-3">
              <div v-if="searchLoading" class="py-6 text-center">
                <Lucide icon="Loader" class="w-4 h-4 animate-spin inline text-slate-400" />
              </div>

              <template v-else>
                <button
                  v-for="student in searchResults"
                  :key="student.id"
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors"
                  @click="selectStudent(student)"
                >
                  <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
                    {{ getInitials(student.name) }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-slate-800 truncate">{{ student.name }}</p>
                    <p class="text-xs text-slate-400 truncate">{{ student.email }}</p>
                  </div>
                </button>

                <p v-if="!searchResults.length && search" class="py-4 text-center text-sm text-slate-400">
                  {{ t('enrollments.noResults') }}
                </p>
              </template>
            </div>
          </template>
        </div>

        <!-- RIGHT: Compatible schedules -->
        <div class="flex-1 flex flex-col">
          <div class="px-6 pt-5 pb-4 border-b border-slate-100">
            <p class="text-xs font-medium text-orange-500 uppercase tracking-wide mb-1">
              {{ t('enrollments.step2Title') }}
            </p>
            <h3 class="text-base font-semibold text-slate-800">{{ t('enrollments.compatibleSchedules') }}</h3>
            <p v-if="selectedStudent" class="text-xs text-slate-400 mt-0.5">
              {{ t('enrollments.compatibleSchedulesSubtitle') }}
            </p>
          </div>

          <div class="flex-1 overflow-y-auto px-6 py-4">
            <!-- No student selected yet -->
            <div v-if="!selectedStudent && !schedulesLoading" class="flex flex-col items-center justify-center h-full text-center text-sm text-slate-400 gap-2">
              <Lucide icon="CalendarSearch" class="w-8 h-8 text-slate-300" />
              <p>{{ t('enrollments.selectScheduleFirst') }}</p>
            </div>

            <div v-if="schedulesLoading" class="flex justify-center py-8">
              <Lucide icon="Loader" class="w-5 h-5 animate-spin text-slate-400" />
            </div>

            <div v-else-if="selectedStudent" class="space-y-2">
              <label
                v-for="group in selectedStudent.schedule_groups"
                :key="group.schedule_ids[0]"
                class="flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer"
                :class="[
                  !group.is_compatible ? 'opacity-50 cursor-not-allowed border-slate-100 bg-slate-50' :
                  (group.group_id ?? group.schedule_ids[0].toString()) === selectedGroupId
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-slate-200 hover:border-orange-200 hover:bg-orange-50/50'
                ]"
                @click="selectGroup(group)"
              >
                <input
                  type="radio"
                  :value="group.group_id ?? group.schedule_ids[0].toString()"
                  v-model="selectedGroupId"
                  :disabled="!group.is_compatible"
                  class="accent-orange-500"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-slate-800">{{ group.course_name }}</p>
                  <p class="text-xs text-slate-500">
                    {{ group.days_label }} {{ group.starts_at }} - {{ group.ends_at }} · Prof. {{ group.teacher_name }}
                  </p>
                  <p class="text-xs text-slate-400 mt-0.5">
                    {{ group.enrolled_count }}/{{ group.capacity }} alumnos inscriptos
                  </p>
                </div>
                <span
                  class="text-xs flex-shrink-0 font-medium"
                  :class="group.is_compatible ? 'text-emerald-600' : 'text-amber-500'"
                >
                  {{ group.is_compatible ? t('enrollments.compatible') : t('enrollments.notAvailable') }}
                </span>
              </label>
            </div>
          </div>

          <!-- Footer -->
          <div class="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
            <Button variant="outline-secondary" @click="close">{{ t('enrollments.cancel') }}</Button>
            <Button
              variant="primary"
              :disabled="!selectedGroupId || saving"
              @click="confirm"
            >
              <Lucide v-if="saving" icon="Loader" class="w-4 h-4 mr-2 animate-spin" />
              <Lucide v-else icon="UserPlus" class="w-4 h-4 mr-2" />
              {{ t('enrollments.confirmEnrollment') }}
            </Button>
          </div>
        </div>

      </div>
    </Dialog.Panel>
  </Dialog>
</template>