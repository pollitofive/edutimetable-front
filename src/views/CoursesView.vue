<script setup lang="ts">
import { gql } from '@apollo/client/core'
import { useQuery, useMutation } from '@vue/apollo-composable'
import { ref, watch, computed } from 'vue'
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import { Dialog } from '@/components/Base/Headless'
import { FormInput, FormLabel, FormSelect } from '@/components/Base/Form'
import Table from '@/components/Base/Table'
import Pagination from '@/components/Base/Pagination'
import ToastNotification from '@/views/components/ToastNotification.vue'
import { useI18n } from '@/composables/useI18n'

// i18n setup
const { t } = useI18n()

interface Teacher {
  id: string
  name: string
  email: string
}

interface CourseLevel {
  id: string
  track: string
  name: string
  slug: string
  sort_order: number
}

interface Course {
  id: string
  name: string
  level: string | null
  course_level_id: string
  courseLevel?: CourseLevel
  teachers?: Teacher[]
}

interface FormData {
  name: string
  course_level_id: string
}

interface FormState {
  selectedTrack: string
}

// GraphQL Queries & Mutations
const GET_COURSE_LEVELS = gql`
  query GetCourseLevels {
    courseLevels(first: 100, page: 1) {
      data {
        id
        track
        name
        slug
        sort_order
      }
    }
  }
`

const GET_COURSES = gql`
  query GetCourses($first: Int!, $page: Int!, $name: String, $course_level_id: ID, $track: String) {
    courses(first: $first, page: $page, name: $name, course_level_id: $course_level_id, track: $track) {
      data {
        id
        name
        level
        course_level_id
        courseLevel {
          id
          track
          name
          slug
          sort_order
        }
        teachers {
          id
          name
          email
        }
      }
      paginatorInfo {
        total
        count
        currentPage
        lastPage
        hasMorePages
        perPage
      }
    }
  }
`

const CREATE_COURSE = gql`
  mutation CreateCourse($input: CreateCourseInput!) {
    createCourse(input: $input) {
      id
      name
      course_level_id
      courseLevel {
        id
        name
        track
      }
    }
  }
`

const UPDATE_COURSE = gql`
  mutation UpdateCourse($id: ID!, $input: UpdateCourseInput!) {
    updateCourse(id: $id, input: $input) {
      id
      name
      course_level_id
      courseLevel {
        id
        name
        track
      }
    }
  }
`

const DELETE_COURSE = gql`
  mutation DeleteCourse($id: ID!) {
    deleteCourse(id: $id) {
      id
    }
  }
`

// State
const courses = ref<Course[]>([])
const courseLevels = ref<CourseLevel[]>([])
const showModal = ref(false)
const selectedCourse = ref<Course | null>(null)
const formData = ref<FormData>({ name: '', course_level_id: '' })
const formState = ref<FormState>({ selectedTrack: '' })
const formErrors = ref<{ name?: string; course_level_id?: string }>({})
const deleteConfirmModal = ref(false)
const courseToDelete = ref<Course | null>(null)

// Toast notification state
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info' | 'warning'>('success')

// Pagination state
const currentPage = ref(1)
const perPage = ref(10)
const totalItems = ref(0)
const lastPage = ref(1)

// Filter state
const filterName = ref('')
const filterTrack = ref('')
const filterCourseLevel = ref('')
let filterTimeout: ReturnType<typeof setTimeout> | null = null

// Apollo Query for Course Levels
const { result: courseLevelsResult, loading: courseLevelsLoading } = useQuery(
  GET_COURSE_LEVELS,
  {},
  {
    fetchPolicy: 'cache-and-network'
  }
)

// Apollo Query for Courses
const { result, loading, error, refetch } = useQuery(
  GET_COURSES,
  () => ({
    first: perPage.value,
    page: currentPage.value,
    name: filterName.value ? `%${filterName.value}%` : undefined,
    course_level_id: filterCourseLevel.value || undefined,
    track: filterTrack.value || undefined
  }),
  {
    fetchPolicy: 'cache-and-network'
  }
)

// Apollo Mutations
const { mutate: createCourse, loading: creating } = useMutation(CREATE_COURSE)
const { mutate: updateCourse, loading: updating } = useMutation(UPDATE_COURSE)
const { mutate: deleteCourse, loading: deleting } = useMutation(DELETE_COURSE)

// Computed
const isSubmitting = computed(() => creating.value || updating.value)
const modalTitle = computed(() => selectedCourse.value ? t('courses.editCourse') : t('courses.newCourse'))

// Computed for available tracks (unique values from courseLevels)
const availableTracks = computed(() => {
  if (!courseLevels.value || courseLevels.value.length === 0) return []

  const tracks = [...new Set(courseLevels.value.map(level => level.track))]
  return tracks.sort()
})

// Computed for filtered levels based on selected track (for form)
const filteredCourseLevels = computed(() => {
  if (!formState.value.selectedTrack) return []

  return courseLevels.value
    .filter(level => level.track === formState.value.selectedTrack)
    .sort((a, b) => a.sort_order - b.sort_order)
})

// Computed for filtered levels based on selected track (for filters)
const filteredCourseLevelsForFilter = computed(() => {
  if (!filterTrack.value) return []

  return courseLevels.value
    .filter(level => level.track === filterTrack.value)
    .sort((a, b) => a.sort_order - b.sort_order)
})

// Pagination computed
const startItem = computed(() => {
  return totalItems.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1
})

const endItem = computed(() => {
  const end = currentPage.value * perPage.value
  return end > totalItems.value ? totalItems.value : end
})

const totalPages = computed(() => lastPage.value)

// Watch for query results
watch(courseLevelsResult, (newValue) => {
  if (newValue?.courseLevels?.data) {
    courseLevels.value = newValue.courseLevels.data
  }
})

watch(result, (newValue) => {
  if (newValue?.courses?.data) {
    courses.value = newValue.courses.data
  }
  if (newValue?.courses?.paginatorInfo) {
    const info = newValue.courses.paginatorInfo
    totalItems.value = info.total
    lastPage.value = info.lastPage
    currentPage.value = info.currentPage
  }
})

// Notification helper
const notify = (message: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
}

// Handle toast close
const handleToastClose = () => {
  showToast.value = false
}

// Form validation
const validateForm = (): boolean => {
  formErrors.value = {}

  if (!formData.value.name.trim()) {
    formErrors.value.name = t('courses.validation.nameRequired')
  }

  if (!formData.value.course_level_id) {
    formErrors.value.course_level_id = t('courses.validation.courseLevelRequired')
  }

  return Object.keys(formErrors.value).length === 0
}

// Methods
const openCreateModal = () => {
  selectedCourse.value = null
  formData.value = { name: '', course_level_id: '' }
  formState.value = { selectedTrack: '' }
  formErrors.value = {}
  showModal.value = true
}

const openEditModal = (course: Course) => {
  selectedCourse.value = course

  formData.value = {
    name: course.name,
    course_level_id: course.course_level_id || ''
  }

  // Pre-select the track based on the current course level
  if (course.courseLevel) {
    formState.value = { selectedTrack: course.courseLevel.track }
  } else {
    formState.value = { selectedTrack: '' }
  }

  formErrors.value = {}
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedCourse.value = null
  formData.value = { name: '', course_level_id: '' }
  formState.value = { selectedTrack: '' }
  formErrors.value = {}
}

// Handle track change - reset level selection
const handleTrackChange = () => {
  formData.value.course_level_id = ''
}

const handleSave = async () => {
  if (!validateForm()) {
    return
  }

  try {
    const input = {
      name: formData.value.name,
      course_level_id: formData.value.course_level_id
    }

    if (selectedCourse.value) {
      // Update
      await updateCourse({
        id: selectedCourse.value.id,
        input
      })
      notify(t('courses.messages.updateSuccess'), 'success')
    } else {
      // Create
      await createCourse({ input })
      notify(t('courses.messages.createSuccess'), 'success')
    }

    closeModal()
    applyFilters()
  } catch (err: any) {
    const errorMessage = err.message || t('courses.messages.generalError')
    notify(errorMessage, 'error')
    console.error('Error saving course:', err)
  }
}

const openDeleteConfirm = (course: Course) => {
  courseToDelete.value = course
  deleteConfirmModal.value = true
}

const handleDelete = async () => {
  if (!courseToDelete.value) return

  try {
    await deleteCourse({ id: courseToDelete.value.id })
    notify(t('courses.messages.deleteSuccess'), 'success')
    deleteConfirmModal.value = false
    courseToDelete.value = null
    applyFilters()
  } catch (err: any) {
    const errorMessage = err.message || t('courses.messages.deleteError')
    notify(errorMessage, 'error')
    console.error('Error deleting course:', err)
  }
}

const cancelDelete = () => {
  deleteConfirmModal.value = false
  courseToDelete.value = null
}

// Pagination methods
const goToPage = (page: number) => {
  if (page >= 1 && page <= lastPage.value) {
    currentPage.value = page
    refetch({
      first: perPage.value,
      page,
      name: filterName.value.trim() ? `%${filterName.value.trim()}%` : undefined,
      course_level_id: filterCourseLevel.value || undefined,
      track: filterTrack.value || undefined
    })
  }
}

const changePerPage = (newPerPage: number) => {
  perPage.value = newPerPage
  currentPage.value = 1
  refetch({
    first: newPerPage,
    page: 1,
    name: filterName.value.trim() ? `%${filterName.value.trim()}%` : undefined,
    course_level_id: filterCourseLevel.value || undefined,
    track: filterTrack.value || undefined
  })
}

// Filter methods
const applyFilters = () => {
  currentPage.value = 1
  refetch({
    first: perPage.value,
    page: 1,
    name: filterName.value.trim() ? `%${filterName.value.trim()}%` : undefined,
    course_level_id: filterCourseLevel.value || undefined,
    track: filterTrack.value || undefined
  })
}

const debouncedFilter = () => {
  if (filterTimeout) {
    clearTimeout(filterTimeout)
  }

  filterTimeout = setTimeout(() => {
    applyFilters()
  }, 500)
}

const clearFilters = () => {
  filterName.value = ''
  filterTrack.value = ''
  filterCourseLevel.value = ''
  applyFilters()
}

const hasActiveFilters = computed(() => {
  return filterName.value.trim() !== '' ||
         filterTrack.value.trim() !== '' ||
         filterCourseLevel.value.trim() !== ''
})

// Handle filter track change - reset level selection
const handleFilterTrackChange = () => {
  filterCourseLevel.value = ''
}

// Watch for filter changes
watch([filterName, filterTrack, filterCourseLevel], () => {
  debouncedFilter()
})
</script>

<template>
  <div class="flex flex-col gap-y-3 md:h-10 md:flex-row md:items-center">
    <div class="text-base font-medium">{{ t('courses.title') }}</div>
    <div class="flex flex-col gap-x-3 gap-y-2 sm:flex-row md:ml-auto">
      <Button variant="primary" @click="openCreateModal">
        <Lucide icon="Plus" class="w-4 h-4 mr-2" />
        {{ t('courses.newCourse') }}
      </Button>
    </div>
  </div>

  <div class="box box--stacked flex flex-col mt-5">
    <!-- Filter Section -->
    <div class="p-5 border-b border-slate-200/60">
      <div class="flex flex-col gap-4">
        <!-- First row of filters -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <!-- Filter by Name -->
          <div class="flex-1">
            <div class="relative">
              <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Lucide icon="Search" class="w-4 h-4 text-slate-400" />
              </div>
              <FormInput
                v-model="filterName"
                type="text"
                :placeholder="t('courses.filters.searchByName')"
                class="pl-10"
              />
            </div>
          </div>

          <!-- Filter by Track -->
          <div class="flex-1">
            <div class="relative">
              <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
                <Lucide icon="Layers" class="w-4 h-4 text-slate-400" />
              </div>
              <FormSelect
                v-model="filterTrack"
                @change="handleFilterTrackChange"
                class="pl-10"
              >
                <option value="">{{ t('courses.filters.searchByTrack') }}</option>
                <option v-for="track in availableTracks" :key="track" :value="track">
                  {{ track }}
                </option>
              </FormSelect>
            </div>
          </div>

          <!-- Filter by Course Level (filtered by track) -->
          <div class="flex-1">
            <div class="relative">
              <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
                <Lucide icon="Award" class="w-4 h-4 text-slate-400" />
              </div>
              <FormSelect
                v-model="filterCourseLevel"
                class="pl-10"
                :disabled="!filterTrack"
                :class="{
                  'opacity-50 cursor-not-allowed': !filterTrack
                }"
              >
                <option value="">
                  {{ filterTrack ? t('courses.filters.searchByLevel') : t('courses.filters.selectTrackFirst') }}
                </option>
                <option v-for="level in filteredCourseLevelsForFilter" :key="level.id" :value="level.id">
                  {{ level.name }}
                </option>
              </FormSelect>
            </div>
          </div>
        </div>

        <!-- Clear Filters Button Row -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
          <Button
            v-if="hasActiveFilters"
            variant="outline-secondary"
            @click="clearFilters"
            class="w-full sm:w-auto"
          >
            <Lucide icon="X" class="w-4 h-4 mr-2" />
            {{ t('courses.actions.clearFilters') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center p-10">
      <div class="flex flex-col items-center gap-3">
        <Lucide icon="Loader" class="w-8 h-8 animate-spin text-primary" />
        <div class="text-sm text-slate-500">{{ t('courses.messages.loading') }}</div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center p-10">
      <div class="flex flex-col items-center gap-3">
        <Lucide icon="AlertCircle" class="w-8 h-8 text-danger" />
        <div class="text-sm text-slate-500">{{ t('courses.messages.error') }}</div>
        <Button variant="outline-primary" @click="() => refetch({
          first: perPage.value,
          page: currentPage.value,
          name: filterName.value.trim() ? `%${filterName.value.trim()}%` : undefined,
          course_level_id: filterCourseLevel.value || undefined,
          track: filterTrack.value || undefined
        })">{{ t('courses.actions.retry') }}</Button>
      </div>
    </div>
    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <Table class="border-b border-slate-200/60">
        <Table.Thead>
          <Table.Tr>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('courses.columns.id') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('courses.columns.name') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('courses.columns.level') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('courses.columns.teacher') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium text-center bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('courses.columns.actions') }}
            </Table.Td>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr v-if="courses.length === 0">
            <Table.Td colspan="5" class="py-10 text-center text-slate-500">
              <div class="flex flex-col items-center gap-3">
                <Lucide icon="Inbox" class="w-10 h-10 text-slate-300" />
                <div>{{ t('courses.messages.noCourses') }}</div>
              </div>
            </Table.Td>
          </Table.Tr>
          <Table.Tr v-for="course in courses" :key="course.id" class="[&_td]:last:border-b-0">
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              {{ course.id }}
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="font-medium">{{ course.name }}</div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div v-if="course.courseLevel" class="flex flex-col gap-1">
                <div class="font-medium text-slate-700">{{ course.courseLevel.name }}</div>
                <div class="px-2 py-0.5 text-xs font-semibold rounded-md bg-primary/10 text-primary inline-block w-fit">
                  {{ course.courseLevel.track }}
                </div>
              </div>
              <div v-else class="text-xs text-slate-400">-</div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div v-if="course.teachers && course.teachers.length > 0" class="flex flex-col gap-1">
                <div v-for="teacher in course.teachers.slice(0, 2)" :key="teacher.id" class="flex flex-col">
                  <span class="font-medium text-slate-700 text-sm">{{ teacher.name }}</span>
                  <span class="text-xs text-slate-500">{{ teacher.email }}</span>
                </div>
                <span v-if="course.teachers.length > 2" class="text-xs text-slate-400 italic">
                  +{{ course.teachers.length - 2 }} more
                </span>
              </div>
              <div v-else class="text-xs text-slate-400">{{ t('courses.messages.noTeachers') }}</div>
            </Table.Td>
            <Table.Td class="relative py-4 border-dashed dark:bg-darkmode-600">
              <div class="flex items-center justify-center gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  @click="openEditModal(course)"
                  class="w-20"
                >
                  <Lucide icon="Edit" class="w-3.5 h-3.5 mr-1" />
                  {{ t('courses.actions.edit') }}
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  @click="openDeleteConfirm(course)"
                  class="w-20"
                >
                  <Lucide icon="Trash2" class="w-3.5 h-3.5 mr-1" />
                  {{ t('courses.actions.delete') }}
                </Button>
              </div>
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </div>

    <!-- Pagination Controls -->
    <div v-if="!loading && !error && totalItems > 0" class="flex flex-col items-center gap-4 p-5 border-t sm:flex-row border-slate-200/60">
      <!-- Items per page selector -->
      <div class="flex items-center gap-2">
        <span class="text-sm text-slate-600">{{ t('courses.pagination.show') }}</span>
        <select
          v-model.number="perPage"
          @change="changePerPage(perPage)"
          class="px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-darkmode-400 dark:bg-darkmode-800 focus:ring-2 focus:ring-primary focus:border-primary"
        >
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <span class="text-sm text-slate-600">{{ t('courses.pagination.entries') }}</span>
      </div>

      <!-- Showing info -->
      <div class="text-sm text-slate-600 sm:ml-auto">
        {{ t('courses.pagination.showingInfo', { start: startItem, end: endItem, total: totalItems }) }}
      </div>

      <!-- Page navigation -->
      <Pagination class="flex-1 sm:flex-initial">
        <!-- Previous button -->
        <Pagination.Link
          @click="goToPage(currentPage - 1)"
          :class="{ 'cursor-not-allowed opacity-50': currentPage === 1 }"
        >
          <Lucide icon="ChevronLeft" class="w-4 h-4" />
        </Pagination.Link>

        <!-- First page -->
        <Pagination.Link
          v-if="totalPages > 0"
          :active="currentPage === 1"
          @click="goToPage(1)"
        >
          1
        </Pagination.Link>

        <!-- Ellipsis before current page -->
        <Pagination.Link v-if="currentPage > 3" disabled>
          ...
        </Pagination.Link>

        <!-- Pages around current page -->
        <template v-for="page in totalPages" :key="page">
          <Pagination.Link
            v-if="page > 1 && page < totalPages && Math.abs(page - currentPage) <= 1"
            :active="currentPage === page"
            @click="goToPage(page)"
          >
            {{ page }}
          </Pagination.Link>
        </template>

        <!-- Ellipsis after current page -->
        <Pagination.Link v-if="currentPage < totalPages - 2" disabled>
          ...
        </Pagination.Link>

        <!-- Last page -->
        <Pagination.Link
          v-if="totalPages > 1"
          :active="currentPage === totalPages"
          @click="goToPage(totalPages)"
        >
          {{ totalPages }}
        </Pagination.Link>

        <!-- Next button -->
        <Pagination.Link
          @click="goToPage(currentPage + 1)"
          :class="{ 'cursor-not-allowed opacity-50': currentPage === totalPages }"
        >
          <Lucide icon="ChevronRight" class="w-4 h-4" />
        </Pagination.Link>
      </Pagination>
    </div>
  </div>

  <!-- Create/Edit Modal -->
  <Dialog :open="showModal" @close="closeModal">
    <Dialog.Panel>
      <Dialog.Title>
        <h2 class="mr-auto text-base font-medium">{{ modalTitle }}</h2>
      </Dialog.Title>
      <Dialog.Description class="grid grid-cols-12 gap-4 gap-y-3">
        <div class="col-span-12">
          <FormLabel htmlFor="course-name">{{ t('courses.form.nameLabel') }} {{ t('courses.form.required') }}</FormLabel>
          <FormInput
            id="course-name"
            v-model="formData.name"
            type="text"
            :placeholder="t('courses.form.namePlaceholder')"
            :class="{ 'border-danger': formErrors.name }"
          />
          <div v-if="formErrors.name" class="mt-1 text-xs text-danger">
            {{ formErrors.name }}
          </div>
        </div>
        <!-- Track Selection -->
        <div class="col-span-12 sm:col-span-6">
          <FormLabel htmlFor="course-track">
            {{ t('courses.form.trackLabel') }} {{ t('courses.form.required') }}
          </FormLabel>
          <FormSelect
            id="course-track"
            v-model="formState.selectedTrack"
            @change="handleTrackChange"
            :class="{ 'border-danger': formErrors.course_level_id && !formState.selectedTrack }"
          >
            <option value="">{{ t('courses.form.trackPlaceholder') }}</option>
            <option v-for="track in availableTracks" :key="track" :value="track">
              {{ track }}
            </option>
          </FormSelect>
          <div v-if="formErrors.course_level_id && !formState.selectedTrack" class="mt-1 text-xs text-danger">
            {{ t('courses.validation.trackRequired') }}
          </div>
        </div>

        <!-- Level Selection (filtered by track) -->
        <div class="col-span-12 sm:col-span-6">
          <FormLabel htmlFor="course-level">
            {{ t('courses.form.levelLabel') }} {{ t('courses.form.required') }}
          </FormLabel>
          <FormSelect
            id="course-level"
            v-model="formData.course_level_id"
            :disabled="!formState.selectedTrack"
            :class="{
              'border-danger': formErrors.course_level_id,
              'opacity-50 cursor-not-allowed': !formState.selectedTrack
            }"
          >
            <option value="">
              {{ formState.selectedTrack ? t('courses.form.levelPlaceholder') : t('courses.form.selectTrackFirst') }}
            </option>
            <option v-for="level in filteredCourseLevels" :key="level.id" :value="level.id">
              {{ level.name }}
            </option>
          </FormSelect>
          <div v-if="formErrors.course_level_id" class="mt-1 text-xs text-danger">
            {{ formErrors.course_level_id }}
          </div>
        </div>
        <div class="col-span-12">
          <div class="p-3 bg-slate-50 dark:bg-darkmode-700 rounded-lg border border-slate-200 dark:border-darkmode-400">
            <p class="text-sm text-slate-600 dark:text-slate-400">
              <strong>{{ t('courses.form.noteLabel') }}</strong> {{ t('courses.form.noteText') }}
            </p>
          </div>
        </div>
      </Dialog.Description>
      <Dialog.Footer class="text-right">
        <Button
          type="button"
          variant="outline-secondary"
          @click="closeModal"
          :disabled="isSubmitting"
          class="w-20 mr-2"
        >
          {{ t('courses.actions.cancel') }}
        </Button>
        <Button
          type="button"
          variant="primary"
          @click="handleSave"
          :disabled="isSubmitting"
          class="w-20"
        >
          <Lucide v-if="isSubmitting" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else>{{ t('courses.actions.save') }}</span>
        </Button>
      </Dialog.Footer>
    </Dialog.Panel>
  </Dialog>

  <!-- Delete Confirmation Modal -->
  <Dialog :open="deleteConfirmModal" @close="cancelDelete">
    <Dialog.Panel>
      <div class="p-5 text-center">
        <Lucide icon="AlertTriangle" class="w-16 h-16 mx-auto mt-3 text-danger" />
        <div class="mt-5 text-3xl">{{ t('courses.delete.confirmTitle') }}</div>
        <div class="mt-2 text-slate-500">
          {{ t('courses.delete.confirmMessage') }}
          <br />
          <span class="font-medium">{{ courseToDelete?.name }}</span>
          <br />
          {{ t('courses.delete.cannotUndo') }}
        </div>
      </div>
      <div class="px-5 pb-8 text-center">
        <Button
          type="button"
          variant="outline-secondary"
          @click="cancelDelete"
          :disabled="deleting"
          class="w-24 mr-2"
        >
          {{ t('courses.actions.cancel') }}
        </Button>
        <Button
          type="button"
          variant="danger"
          @click="handleDelete"
          :disabled="deleting"
          class="w-24"
        >
          <Lucide v-if="deleting" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else>{{ t('courses.actions.delete') }}</span>
        </Button>
      </div>
    </Dialog.Panel>
  </Dialog>

  <!-- Toast Notification -->
  <ToastNotification
    :show="showToast"
    :message="toastMessage"
    :type="toastType"
    @close="handleToastClose"
  />
</template>

<style scoped>
/* Add any custom styles here if needed */
</style>
