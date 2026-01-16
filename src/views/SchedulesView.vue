<script setup lang="ts">
import { gql } from '@apollo/client/core'
import { useQuery, useMutation, useLazyQuery } from '@vue/apollo-composable'
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
}

interface Course {
  id: string
  name: string
}

interface Schedule {
  id: string
  course_id: string
  teacher_id: string
  course: Course
  teacher: Teacher
  day_of_week: number
  starts_at: string
  ends_at: string
  description: string
  group_id?: string
}

interface ScheduleSlot {
  teacher_id: string
  day_of_week: number | string
  starts_at: string
  ends_at: string
}

interface FormData {
  course_id: string
  description: string
  schedules: ScheduleSlot[]
  group_id?: string
}

interface SlotError {
  teacher_id?: string
  day_of_week?: string
  starts_at?: string
  ends_at?: string
}

// GraphQL Queries & Mutations
const GET_SCHEDULES = gql`
  query GetSchedules($first: Int!, $page: Int!, $course_id: ID, $day_of_week: Int, $teacher_id: ID, $description: String, $group_id: String) {
    schedules(first: $first, page: $page, course_id: $course_id, day_of_week: $day_of_week, teacher_id: $teacher_id, description: $description, group_id: $group_id) {
      data {
        id
        course_id
        teacher_id
        day_of_week
        starts_at
        ends_at
        description
        group_id
        course {
          id
          name
        }
        teacher {
          id
          name
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

const GET_ALL_COURSES = gql`
  query GetAllCourses {
    courses(first: 10000) {
      data {
        id
        name
      }
    }
  }
`

const GET_ALL_TEACHERS = gql`
  query GetAllTeachers {
    teachers(first: 10000) {
      data {
        id
        name
      }
    }
  }
`

const BULK_CREATE_SCHEDULES = gql`
  mutation BulkCreateSchedules($input: BulkCreateSchedulesInput!) {
    bulkCreateSchedules(input: $input) {
      id
      course_id
      teacher_id
      day_of_week
      starts_at
      ends_at
      description
      group_id
      course {
        id
        name
      }
      teacher {
        id
        name
      }
    }
  }
`

const BULK_UPDATE_SCHEDULES = gql`
  mutation BulkUpdateSchedules($input: BulkUpdateSchedulesInput!) {
    bulkUpdateSchedules(input: $input) {
      id
      course_id
      teacher_id
      day_of_week
      starts_at
      ends_at
      description
      group_id
      course {
        id
        name
      }
      teacher {
        id
        name
      }
    }
  }
`

const UPDATE_SCHEDULE = gql`
  mutation UpdateSchedule($id: ID!, $input: UpdateScheduleInput!) {
    updateSchedule(id: $id, input: $input) {
      id
      course_id
      teacher_id
      day_of_week
      starts_at
      ends_at
      description
      group_id
      course {
        id
        name
      }
      teacher {
        id
        name
      }
    }
  }
`

const DELETE_SCHEDULE = gql`
  mutation DeleteSchedule($id: ID!) {
    deleteSchedule(id: $id) {
      id
    }
  }
`

// State
const schedules = ref<Schedule[]>([])
const allCourses = ref<Course[]>([])
const allTeachers = ref<Teacher[]>([])
const showModal = ref(false)
const isEditMode = ref(false)
const isSingleEditMode = ref(false)
const editingScheduleId = ref<string | null>(null)
const formData = ref<FormData>({
  course_id: '',
  description: '',
  schedules: [
    { teacher_id: '', day_of_week: '', starts_at: '', ends_at: '' }
  ]
})
const formErrors = ref<{ course_id?: string; description?: string; schedules?: SlotError[] }>({})
const deleteConfirmModal = ref(false)
const scheduleToDelete = ref<Schedule | null>(null)

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
const filterCourseId = ref('')
const filterDayOfWeek = ref<string>('')
const filterTeacherId = ref('')

// Apollo Query for schedules
const { result, loading, error, refetch } = useQuery(GET_SCHEDULES, () => ({
  first: perPage.value,
  page: currentPage.value,
  course_id: filterCourseId.value || undefined,
  day_of_week: filterDayOfWeek.value ? Number(filterDayOfWeek.value) : undefined,
  teacher_id: filterTeacherId.value || undefined,
  group_id: undefined // Explicitly set to undefined for main query
}), {
  fetchPolicy: 'cache-and-network'
})

// Apollo Query for courses
const { result: coursesResult, loading: coursesLoading } = useQuery(GET_ALL_COURSES)

// Apollo Query for teachers
const { result: teachersResult, loading: teachersLoading } = useQuery(GET_ALL_TEACHERS)

// Apollo Lazy Query for fetching group schedules
const { load: loadGroupSchedules, refetch: refetchGroupSchedules, result: groupSchedulesResult, loading: loadingGroupSchedules } = useLazyQuery(GET_SCHEDULES, {
  fetchPolicy: 'network-only' // Always fetch fresh data from server
})

// Track whether the lazy query has been loaded at least once
const groupSchedulesLoaded = ref(false)

// Apollo Mutations
const { mutate: bulkCreateSchedules, loading: creating } = useMutation(BULK_CREATE_SCHEDULES)
const { mutate: bulkUpdateSchedules, loading: updating } = useMutation(BULK_UPDATE_SCHEDULES)
const { mutate: updateSingleSchedule, loading: updatingSingle } = useMutation(UPDATE_SCHEDULE)
const { mutate: deleteSchedule, loading: deleting } = useMutation(DELETE_SCHEDULE)

// Computed
const isSubmitting = computed(() => creating.value || updating.value || updatingSingle.value)
const modalTitle = computed(() => {
  if (isSingleEditMode.value) {
    return t('schedules.form.editSingleTitle')
  }
  if (isEditMode.value) {
    const courseName = allCourses.value.find(c => c.id === formData.value.course_id)?.name || ''
    return t('schedules.form.editTitle', { course: courseName })
  }
  return t('schedules.form.addTitle')
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

// Day of week helper (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
const getDayName = (day: number): string => {
  const days = [
    t('schedules.days.sunday'),    // 0
    t('schedules.days.monday'),    // 1
    t('schedules.days.tuesday'),   // 2
    t('schedules.days.wednesday'), // 3
    t('schedules.days.thursday'),  // 4
    t('schedules.days.friday'),    // 5
    t('schedules.days.saturday')   // 6
  ]
  return days[day] || ''
}

// Day options for form (0 = Sunday)
const dayOptions = computed(() => [
  { value: 0, label: t('schedules.days.sunday') },
  { value: 1, label: t('schedules.days.monday') },
  { value: 2, label: t('schedules.days.tuesday') },
  { value: 3, label: t('schedules.days.wednesday') },
  { value: 4, label: t('schedules.days.thursday') },
  { value: 5, label: t('schedules.days.friday') },
  { value: 6, label: t('schedules.days.saturday') }
])

// Sorted schedules computed property
const sortedSchedules = computed(() => {
  if (!schedules.value || schedules.value.length === 0) return []

  return [...schedules.value].sort((a, b) => {
    // 1. Sort by teacher name
    const teacherCompare = (a.teacher?.name || '').localeCompare(b.teacher?.name || '')
    if (teacherCompare !== 0) return teacherCompare

    // 2. Sort by group_id (to group related schedules together)
    const groupCompare = (a.group_id || '').localeCompare(b.group_id || '')
    if (groupCompare !== 0) return groupCompare

    // 3. Sort by day_of_week (0-6, Sunday to Saturday)
    const dayCompare = (a.day_of_week || 0) - (b.day_of_week || 0)
    if (dayCompare !== 0) return dayCompare

    // 4. Sort by starts_at (time order)
    return (a.starts_at || '').localeCompare(b.starts_at || '')
  })
})

// Watch for query results
watch(result, (newValue) => {
  if (newValue?.schedules?.data) {
    schedules.value = newValue.schedules.data
  }
  if (newValue?.schedules?.paginatorInfo) {
    const info = newValue.schedules.paginatorInfo
    totalItems.value = info.total
    lastPage.value = info.lastPage
    currentPage.value = info.currentPage
  }
})

// Watch for courses results
watch(coursesResult, (newValue) => {
  if (newValue?.courses?.data) {
    // Sort courses alphabetically by name using spread operator
    allCourses.value = [...newValue.courses.data].sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }
}, { immediate: true })

// Watch for teachers results
watch(teachersResult, (newValue) => {
  if (newValue?.teachers?.data) {
    // Sort teachers alphabetically by name
    allTeachers.value = [...newValue.teachers.data].sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }
}, { immediate: true })

// Notification helper
const notify = (message: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
}

// Time normalization helper
// Converts time to "H:i" format (e.g., "10:00") by removing seconds if present
const normalizeTime = (time: string): string => {
  if (!time) return time
  // Remove seconds if present (10:00:00 -> 10:00)
  const parts = time.split(':')
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`
  }
  return time
}

// Handle toast close
const handleToastClose = () => {
  showToast.value = false
}

// Slot management functions
const addSlot = () => {
  // Get the last slot to copy its values
  const lastSlot = formData.value.schedules[formData.value.schedules.length - 1]

  formData.value.schedules.push({
    teacher_id: lastSlot?.teacher_id || '',
    day_of_week: lastSlot?.day_of_week || '',
    starts_at: lastSlot?.starts_at || '',
    ends_at: lastSlot?.ends_at || ''
  })
}

const removeSlot = (index: number) => {
  if (formData.value.schedules.length > 1) {
    formData.value.schedules.splice(index, 1)
    // Also remove error for this slot if exists
    if (formErrors.value.schedules && formErrors.value.schedules[index]) {
      formErrors.value.schedules.splice(index, 1)
    }
  }
}

// Form validation
const validateForm = (): boolean => {
  formErrors.value = { schedules: [] }

  if (!formData.value.course_id) {
    formErrors.value.course_id = t('schedules.validation.courseRequired')
  }

  if (!formData.value.description || !formData.value.description.trim()) {
    formErrors.value.description = t('schedules.validation.descriptionRequired')
  }

  if (formData.value.schedules.length === 0) {
    notify(t('schedules.validation.atLeastOneSlot'), 'error')
    return false
  }

  let hasErrors = false

  formData.value.schedules.forEach((slot, index) => {
    const slotErrors: SlotError = {}

    if (!slot.teacher_id || !slot.teacher_id.trim()) {
      slotErrors.teacher_id = t('schedules.validation.teacherRequired')
      hasErrors = true
    }

    if (slot.day_of_week === '') {
      slotErrors.day_of_week = t('schedules.validation.dayRequired')
      hasErrors = true
    }

    if (!slot.starts_at || !slot.starts_at.trim()) {
      slotErrors.starts_at = t('schedules.validation.startTimeRequired')
      hasErrors = true
    }

    if (!slot.ends_at || !slot.ends_at.trim()) {
      slotErrors.ends_at = t('schedules.validation.endTimeRequired')
      hasErrors = true
    }

    // Validate end time is after start time
    if (slot.starts_at && slot.ends_at) {
      if (slot.ends_at <= slot.starts_at) {
        slotErrors.ends_at = t('schedules.validation.endTimeAfterStart')
        hasErrors = true
      }
    }

    if (Object.keys(slotErrors).length > 0) {
      if (!formErrors.value.schedules) {
        formErrors.value.schedules = []
      }
      formErrors.value.schedules[index] = slotErrors
    }
  })

  return !hasErrors && !formErrors.value.course_id && !formErrors.value.description
}

// Methods
const openCreateModal = () => {
  isEditMode.value = false
  isSingleEditMode.value = false
  formData.value = {
    course_id: '',
    description: '',
    schedules: [
      { teacher_id: '', day_of_week: '', starts_at: '', ends_at: '' }
    ],
    group_id: undefined // Empty for CREATE
  }
  formErrors.value = {}
  showModal.value = true
}

const openSingleEditModal = (schedule: Schedule) => {
  // Reset modes
  isEditMode.value = false
  isSingleEditMode.value = true
  editingScheduleId.value = schedule.id

  // Set form data with single slot - load teacher_id per slot
  formData.value = {
    course_id: schedule.course_id,
    description: schedule.description || '', // Load description from schedule
    schedules: [
      {
        teacher_id: schedule.teacher_id,
        day_of_week: schedule.day_of_week,
        starts_at: schedule.starts_at,
        ends_at: schedule.ends_at
      }
    ],
    group_id: schedule.group_id // Preserve group_id for UPDATE
  }

  formErrors.value = {}
  showModal.value = true
}

const openEditModal = async (schedule: Schedule) => {
  isEditMode.value = true
  isSingleEditMode.value = false
  const courseId = schedule.course_id
  const groupId = schedule.group_id

  formData.value = {
    course_id: courseId,
    description: '',
    schedules: [],
    group_id: undefined
  }
  formErrors.value = {}
  showModal.value = true

  try {
    // Build query variables - only filter by group_id if it exists
    const queryVariables: any = {
      first: 1000,
      page: 1
    }

    // If schedule has group_id, filter by it (more specific)
    if (groupId) {
      queryVariables.group_id = groupId
    } else {
      // Fallback for legacy schedules without group_id
      // Filter by course_id and description to find related schedules
      queryVariables.course_id = courseId
      if (schedule.description) {
        queryVariables.description = schedule.description
      }
    }

    console.log('Fetching schedules with variables:', queryVariables)

    // Load group schedules using lazy query
    // Use load() for first call, refetch() for subsequent calls
    let queryResult
    if (!groupSchedulesLoaded.value) {
      queryResult = await loadGroupSchedules(null, queryVariables)
      groupSchedulesLoaded.value = true
    } else {
      queryResult = await refetchGroupSchedules(queryVariables)
    }

    console.log('Query result:', queryResult)
    console.log('Full query result structure:', JSON.stringify(queryResult, null, 2))

    // Extract schedules from query result
    // The data structure differs between load() and refetch()
    // load() returns: { data: { schedules: { data: [...] } } }
    // refetch() returns: ApolloQueryResult with nested data
    const schedulesData = queryResult?.data?.schedules?.data || queryResult?.schedules?.data

    console.log('Extracted schedulesData:', schedulesData)

    if (schedulesData && Array.isArray(schedulesData)) {
      const groupSchedules = schedulesData

      console.log(`Found ${groupSchedules.length} schedules in group`)

      if (groupSchedules.length > 0) {
        // Load description and group_id from first schedule
        formData.value.description = groupSchedules[0].description || ''
        formData.value.group_id = groupSchedules[0].group_id // Store group_id for UPDATE

        formData.value.schedules = groupSchedules.map((sched: any) => ({
          teacher_id: sched.teacher_id,
          day_of_week: sched.day_of_week,
          starts_at: sched.starts_at,
          ends_at: sched.ends_at
        }))
      } else {
        console.warn('No schedules found for this group')
        // If no schedules exist, start with one empty slot
        formData.value.schedules = [{ teacher_id: '', day_of_week: '', starts_at: '', ends_at: '' }]
      }
    } else {
      console.warn('No data returned from query or data is not an array')
      console.warn('queryResult?.data?.schedules:', queryResult?.data?.schedules)
      console.warn('queryResult?.schedules:', queryResult?.schedules)
      formData.value.schedules = [{ teacher_id: '', day_of_week: '', starts_at: '', ends_at: '' }]
    }
  } catch (err: any) {
    console.error('Error loading group schedules:', err)
    notify(t('schedules.messages.loadError') || 'Error loading schedules', 'error')
    // Even on error, provide one empty slot
    formData.value.schedules = [{ teacher_id: '', day_of_week: '', starts_at: '', ends_at: '' }]
  }
}

const closeModal = () => {
  showModal.value = false
  isEditMode.value = false
  isSingleEditMode.value = false
  editingScheduleId.value = null
  formData.value = {
    course_id: '',
    description: '',
    schedules: [
      { teacher_id: '', day_of_week: '', starts_at: '', ends_at: '' }
    ],
    group_id: undefined
  }
  formErrors.value = {}
}

const handleSave = async () => {
  if (!validateForm()) {
    return
  }

  const token = localStorage.getItem('token')

  if (!token) {
    notify('You are not logged in. Please login first.', 'error')
    return
  }

  try {
    if (isSingleEditMode.value) {
      // Single update - update only this one schedule
      const slot = formData.value.schedules[0]
      const input = {
        course_id: formData.value.course_id,
        teacher_id: Number(slot.teacher_id),
        day_of_week: Number(slot.day_of_week),
        starts_at: normalizeTime(slot.starts_at),
        ends_at: normalizeTime(slot.ends_at),
        description: formData.value.description,
        group_id: formData.value.group_id // Preserve group_id for single UPDATE
      }

      await updateSingleSchedule({
        id: editingScheduleId.value,
        input
      })
      notify(t('schedules.messages.updateSingleSuccess'), 'success')
    } else if (isEditMode.value) {
      // Bulk update - replaces all schedules for the group
      const input = {
        course_id: formData.value.course_id,
        description: formData.value.description,
        group_id: formData.value.group_id, // Send group_id for bulk UPDATE
        schedules: formData.value.schedules.map(slot => ({
          teacher_id: Number(slot.teacher_id), // Teacher from each slot
          day_of_week: Number(slot.day_of_week),
          starts_at: normalizeTime(slot.starts_at),
          ends_at: normalizeTime(slot.ends_at)
        }))
      }

      await bulkUpdateSchedules({ input })
      notify(t('schedules.messages.updateSuccess'), 'success')
    } else {
      // Bulk create - adds new schedules (NO group_id, backend generates it)
      const input = {
        course_id: formData.value.course_id,
        description: formData.value.description,
        schedules: formData.value.schedules.map(slot => ({
          teacher_id: Number(slot.teacher_id), // Teacher from each slot
          day_of_week: Number(slot.day_of_week),
          starts_at: normalizeTime(slot.starts_at),
          ends_at: normalizeTime(slot.ends_at)
        }))
      }

      await bulkCreateSchedules({ input })
      notify(t('schedules.messages.createSuccess'), 'success')
    }

    closeModal()
    applyFilters()
  } catch (err: any) {
    // Check if it's a validation error
    if (err.graphQLErrors && err.graphQLErrors.length > 0) {
      const firstError = err.graphQLErrors[0]

      // If it's a validation error, show the validation messages
      if (firstError.extensions?.category === 'validation') {
        const validationErrors = firstError.extensions?.validation

        // Show validation errors to user
        const messages = Object.values(validationErrors).flat().join(', ')
        notify(`Validation Error: ${messages}`, 'error')
        return
      }

      // If it's an overlap error from backend
      if (firstError.message) {
        notify(firstError.message, 'error')
        return
      }
    }

    const errorMessage = err.message || t('schedules.messages.generalError')
    notify(errorMessage, 'error')
  }
}

const openDeleteConfirm = (schedule: Schedule) => {
  scheduleToDelete.value = schedule
  deleteConfirmModal.value = true
}

const handleDelete = async () => {
  if (!scheduleToDelete.value) return

  try {
    await deleteSchedule({ id: scheduleToDelete.value.id })
    notify(t('schedules.messages.deleteSuccess'), 'success')
    deleteConfirmModal.value = false
    scheduleToDelete.value = null
    applyFilters()
  } catch (err: any) {
    const errorMessage = err.message || t('schedules.messages.deleteError')
    notify(errorMessage, 'error')
  }
}

const cancelDelete = () => {
  deleteConfirmModal.value = false
  scheduleToDelete.value = null
}

// Pagination methods
const goToPage = (page: number) => {
  if (page >= 1 && page <= lastPage.value) {
    currentPage.value = page
    refetch({
      first: perPage.value,
      page,
      course_id: filterCourseId.value || undefined,
      day_of_week: filterDayOfWeek.value ? Number(filterDayOfWeek.value) : undefined,
      teacher_id: filterTeacherId.value || undefined
    })
  }
}

const changePerPage = (newPerPage: number) => {
  perPage.value = newPerPage
  currentPage.value = 1
  refetch({
    first: newPerPage,
    page: 1,
    course_id: filterCourseId.value || undefined,
    day_of_week: filterDayOfWeek.value ? Number(filterDayOfWeek.value) : undefined,
    teacher_id: filterTeacherId.value || undefined
  })
}

// Filter methods
const applyFilters = () => {
  currentPage.value = 1
  refetch({
    first: perPage.value,
    page: 1,
    course_id: filterCourseId.value || undefined,
    day_of_week: filterDayOfWeek.value ? Number(filterDayOfWeek.value) : undefined,
    teacher_id: filterTeacherId.value || undefined
  })
}

const clearFilters = () => {
  filterCourseId.value = ''
  filterDayOfWeek.value = ''
  filterTeacherId.value = ''
  applyFilters()
}

const hasActiveFilters = computed(() => {
  return filterCourseId.value !== '' || filterDayOfWeek.value !== '' || filterTeacherId.value !== ''
})

// Watch for filter changes
watch(filterCourseId, () => {
  applyFilters()
})

watch(filterDayOfWeek, () => {
  applyFilters()
})

watch(filterTeacherId, () => {
  applyFilters()
})

// Get course display name (without teacher since courses are independent)
const getCourseDisplayName = (course: Course): string => {
  return course.name
}

/**
 * Check if this is the first occurrence of a schedule group (by group_id) in the list
 * Used to show the "Manage" button only once per group
 * Falls back to description-based grouping for legacy schedules without group_id
 */
const isFirstOccurrenceOfGroup = (schedule: Schedule, index: number): boolean => {
  // If schedule has a group_id, use it for grouping
  if (schedule.group_id) {
    const firstIndex = sortedSchedules.value.findIndex((s: Schedule) =>
      s.group_id === schedule.group_id
    )
    return index === firstIndex
  }

  // Fallback to legacy grouping by course_id + description for schedules without group_id
  const firstIndex = sortedSchedules.value.findIndex((s: Schedule) =>
    s.course_id === schedule.course_id && s.description === schedule.description
  )
  return index === firstIndex
}
</script>

<template>
  <div class="w-full">
    <div class="flex flex-col gap-y-3 md:h-10 md:flex-row md:items-center">
      <div class="text-base font-medium">{{ t('schedules.title') }}</div>
      <div class="flex flex-col gap-x-3 gap-y-2 sm:flex-row md:ml-auto">
        <Button variant="primary" @click="openCreateModal">
          <Lucide icon="Plus" class="w-4 h-4 mr-2" />
          {{ t('schedules.actions.new') }}
        </Button>
      </div>
    </div>

    <div class="box box--stacked flex flex-col mt-5 w-full">
    <!-- Filter Section -->
    <div class="p-5 border-b border-slate-200/60">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <!-- Filter by Course -->
          <div class="flex-1">
              <FormSelect v-model="filterCourseId">
                  <option value="">{{ t('schedules.filters.allCourses') }}</option>
                  <option v-for="course in allCourses" :key="course.id" :value="course.id">
                      {{ course.name }}
                  </option>
              </FormSelect>
          </div>

          <!-- Filter by Teacher -->
        <div class="flex-1">
          <FormSelect v-model="filterTeacherId">
            <option value="">{{ t('schedules.filters.allTeachers') }}</option>
            <option v-for="teacher in allTeachers" :key="teacher.id" :value="teacher.id">
              {{ teacher.name }}
            </option>
          </FormSelect>
        </div>

        <!-- Filter by Day of Week -->
        <div class="flex-1">
          <FormSelect v-model="filterDayOfWeek">
            <option value="">{{ t('schedules.filters.allDays') }}</option>
            <option value="0">{{ t('schedules.days.sunday') }}</option>
            <option value="1">{{ t('schedules.days.monday') }}</option>
            <option value="2">{{ t('schedules.days.tuesday') }}</option>
            <option value="3">{{ t('schedules.days.wednesday') }}</option>
            <option value="4">{{ t('schedules.days.thursday') }}</option>
            <option value="5">{{ t('schedules.days.friday') }}</option>
            <option value="6">{{ t('schedules.days.saturday') }}</option>
          </FormSelect>
        </div>

        <!-- Clear Filters Button -->
        <div>
          <Button
            v-if="hasActiveFilters"
            variant="outline-secondary"
            @click="clearFilters"
            class="w-full sm:w-auto"
          >
            <Lucide icon="X" class="w-4 h-4 mr-2" />
            {{ t('schedules.actions.clearFilters') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center p-10">
      <div class="flex flex-col items-center gap-3">
        <Lucide icon="Loader" class="w-8 h-8 animate-spin text-primary" />
        <div class="text-sm text-slate-500">{{ t('schedules.loading') }}</div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center p-10">
      <div class="flex flex-col items-center gap-3">
        <Lucide icon="AlertCircle" class="w-8 h-8 text-danger" />
        <div class="text-sm text-slate-500">{{ t('schedules.messages.error') }}</div>
        <Button variant="outline-primary" @click="() => refetch({
          first: perPage,
          page: currentPage,
          course_id: filterCourseId || undefined,
          day_of_week: filterDayOfWeek ? Number(filterDayOfWeek) : undefined,
          teacher_id: filterTeacherId || undefined
        })">{{ t('schedules.actions.retry') }}</Button>
      </div>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <Table class="border-b border-slate-200/60">
        <Table.Thead>
          <Table.Tr>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('schedules.columns.id') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('schedules.columns.course') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('schedules.columns.teacher') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('schedules.columns.dayOfWeek') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('schedules.columns.startsAt') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('schedules.columns.endsAt') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('schedules.columns.description') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium text-center bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('schedules.columns.actions') }}
            </Table.Td>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr v-if="sortedSchedules.length === 0">
            <Table.Td colspan="7" class="py-10 text-center text-slate-500">
              <div class="flex flex-col items-center gap-3">
                <Lucide icon="Inbox" class="w-10 h-10 text-slate-300" />
                <div>{{ t('schedules.empty') }}</div>
              </div>
            </Table.Td>
          </Table.Tr>
          <Table.Tr v-for="(schedule, index) in sortedSchedules" :key="schedule.id" class="[&_td]:last:border-b-0">
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="text-xs text-slate-500">#{{ schedule.id }}</div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="font-medium">{{ schedule.course.name }}</div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="text-slate-600">{{ schedule.teacher.name }}</div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="px-2 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary inline-block">
                {{ getDayName(schedule.day_of_week) }}
              </div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="font-mono text-slate-600">{{ schedule.starts_at }}</div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="font-mono text-slate-600">{{ schedule.ends_at }}</div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="font-mono text-slate-600">{{ schedule.description }}</div>
            </Table.Td>
            <Table.Td class="relative py-4 border-dashed dark:bg-darkmode-600">
              <div class="flex items-center justify-center gap-2">
                <Button
                  variant="outline-primary"
                  size="sm"
                  @click="openSingleEditModal(schedule)"
                  class="w-16"
                >
                  <Lucide icon="Pencil" class="w-3.5 h-3.5 mr-1" />
                  {{ t('schedules.actions.edit') }}
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  @click="openDeleteConfirm(schedule)"
                  class="w-20"
                >
                  <Lucide icon="Trash2" class="w-3.5 h-3.5 mr-1" />
                  {{ t('schedules.actions.delete') }}
                </Button>
                <Button
                  v-if="isFirstOccurrenceOfGroup(schedule, index)"
                  variant="outline-secondary"
                  size="sm"
                  @click="openEditModal(schedule)"
                  class="w-24"
                >
                  <Lucide icon="List" class="w-3.5 h-3.5 mr-1" />
                  {{ t('schedules.actions.manage') }}
                </Button>
                <div v-else class="w-24"></div>
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
        <span class="text-sm text-slate-600">Show</span>
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
        <span class="text-sm text-slate-600">entries</span>
      </div>

      <!-- Showing info -->
      <div class="text-sm text-slate-600 sm:ml-auto">
        Showing {{ startItem }} to {{ endItem }} of {{ totalItems }} schedules
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
  <Dialog :open="showModal" @close="closeModal" :staticBackdrop="true">
    <Dialog.Panel class="max-w-3xl sm:w-[540px]">
      <Dialog.Title>
        <h2 class="mr-auto text-base font-medium">
          {{ modalTitle }}
        </h2>
      </Dialog.Title>
      <Dialog.Description class="grid grid-cols-12 gap-4 gap-y-3">
        <!-- Course Selection -->
        <div class="col-span-12">
          <FormLabel htmlFor="schedule-course">{{ t('schedules.form.course') }} *</FormLabel>
          <FormSelect
            id="schedule-course"
            v-model="formData.course_id"
            :disabled="isEditMode || isSingleEditMode || loadingGroupSchedules"
            :class="{ 'border-danger': formErrors.course_id }"
          >
            <option value="">{{ t('schedules.form.selectCourse') }}</option>
            <option v-for="course in allCourses" :key="course.id" :value="course.id">
              {{ course.name }}
            </option>
          </FormSelect>
          <div v-if="formErrors.course_id" class="mt-1 text-xs text-danger">
            {{ formErrors.course_id }}
          </div>
        </div>

        <!-- Description -->
        <div class="col-span-12">
          <FormLabel htmlFor="schedule-description">{{ t('schedules.form.description') }} *</FormLabel>
          <FormInput
            id="schedule-description"
            v-model="formData.description"
            type="text"
            :placeholder="t('schedules.form.descriptionPlaceholder')"
            :disabled="loadingGroupSchedules"
            :class="{ 'border-danger': formErrors.description }"
          />
          <div v-if="formErrors.description" class="mt-1 text-xs text-danger">
            {{ formErrors.description }}
          </div>
        </div>

        <!-- Loading state for edit mode -->
        <div v-if="loadingGroupSchedules" class="col-span-12 flex items-center justify-center py-8">
          <div class="flex flex-col items-center gap-3">
            <Lucide icon="Loader" class="w-6 h-6 animate-spin text-primary" />
            <div class="text-sm text-slate-500">{{ t('schedules.messages.loadingSchedules') }}</div>
          </div>
        </div>

        <!-- Schedule Slots -->
        <div v-if="!loadingGroupSchedules" class="col-span-12">
          <!-- Header with label only -->
          <div class="flex items-center justify-between mb-3">
            <FormLabel class="mb-0">{{ t('schedules.form.scheduleSlots') }}</FormLabel>
          </div>

          <!-- Scrollable container for slots -->
          <div class="max-h-80 overflow-y-auto pr-2 space-y-3 scroll-smooth border border-slate-200/60 rounded-lg p-3 dark:border-darkmode-400">
            <div
              v-for="(slot, index) in formData.schedules"
              :key="index"
              class="p-4 border-2 border-slate-200 rounded-lg dark:border-darkmode-400 bg-white dark:bg-darkmode-800 shadow-sm"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div class="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {{ index + 1 }}
                  </div>
                  <div class="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {{ t('schedules.form.slot', { number: index + 1 }) }}
                  </div>
                </div>
                <Button
                  v-if="!isSingleEditMode && formData.schedules.length > 1"
                  type="button"
                  variant="soft-danger"
                  size="sm"
                  @click="removeSlot(index)"
                  class="px-3"
                >
                  <Lucide icon="Trash2" class="w-3.5 h-3.5 mr-1.5" />
                  {{ t('schedules.actions.removeSlot') }}
                </Button>
              </div>

              <div class="grid grid-cols-12 gap-3">
                <!-- Teacher Selector -->
                <div class="col-span-12">
                  <FormLabel :htmlFor="`slot-teacher-${index}`">
                    {{ t('schedules.form.teacher') }} *
                  </FormLabel>
                  <FormSelect
                    :id="`slot-teacher-${index}`"
                    v-model="slot.teacher_id"
                    :class="{ 'border-danger': formErrors.schedules?.[index]?.teacher_id }"
                  >
                    <option value="">{{ t('schedules.form.selectTeacher') }}</option>
                    <option v-for="teacher in allTeachers" :key="teacher.id" :value="teacher.id">
                      {{ teacher.name }}
                    </option>
                  </FormSelect>
                  <div v-if="formErrors.schedules?.[index]?.teacher_id" class="mt-1 text-xs text-danger">
                    {{ formErrors.schedules[index].teacher_id }}
                  </div>
                </div>

                <!-- Day of Week -->
                <div class="col-span-12 sm:col-span-4">
                  <FormLabel :htmlFor="`slot-day-${index}`">{{ t('schedules.form.dayOfWeek') }} *</FormLabel>
                  <FormSelect
                    :id="`slot-day-${index}`"
                    v-model="slot.day_of_week"
                    :class="{ 'border-danger': formErrors.schedules?.[index]?.day_of_week }"
                  >
                    <option value="">{{ t('schedules.form.selectDay') }}</option>
                    <option v-for="day in dayOptions" :key="day.value" :value="day.value">
                      {{ day.label }}
                    </option>
                  </FormSelect>
                  <div v-if="formErrors.schedules?.[index]?.day_of_week" class="mt-1 text-xs text-danger">
                    {{ formErrors.schedules[index].day_of_week }}
                  </div>
                </div>

                <!-- Start Time -->
                <div class="col-span-12 sm:col-span-4">
                  <FormLabel :htmlFor="`slot-start-${index}`">{{ t('schedules.form.startsAt') }} *</FormLabel>
                  <FormInput
                    :id="`slot-start-${index}`"
                    v-model="slot.starts_at"
                    type="time"
                    :class="{ 'border-danger': formErrors.schedules?.[index]?.starts_at }"
                  />
                  <div v-if="formErrors.schedules?.[index]?.starts_at" class="mt-1 text-xs text-danger">
                    {{ formErrors.schedules[index].starts_at }}
                  </div>
                </div>

                <!-- End Time -->
                <div class="col-span-12 sm:col-span-4">
                  <FormLabel :htmlFor="`slot-end-${index}`">{{ t('schedules.form.endsAt') }} *</FormLabel>
                  <FormInput
                    :id="`slot-end-${index}`"
                    v-model="slot.ends_at"
                    type="time"
                    :class="{ 'border-danger': formErrors.schedules?.[index]?.ends_at }"
                  />
                  <div v-if="formErrors.schedules?.[index]?.ends_at" class="mt-1 text-xs text-danger">
                    {{ formErrors.schedules[index].ends_at }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Add Slot button at the bottom -->
          <div v-if="!isSingleEditMode" class="mt-3">
            <Button
              type="button"
              variant="outline-primary"
              size="sm"
              @click="addSlot"
              class="w-full"
            >
              <Lucide icon="Plus" class="w-4 h-4 mr-2" />
              {{ t('schedules.actions.addSlot') }}
            </Button>
          </div>
        </div>
      </Dialog.Description>
      <Dialog.Footer class="text-right">
        <Button
          type="button"
          variant="outline-secondary"
          @click="closeModal"
          :disabled="isSubmitting || loadingGroupSchedules"
          class="min-w-28 mr-2"
        >
          {{ t('schedules.actions.cancel') }}
        </Button>
        <Button
          type="button"
          variant="primary"
          @click="handleSave"
          :disabled="isSubmitting || loadingGroupSchedules"
          class="min-w-44"
        >
          <Lucide v-if="isSubmitting" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else-if="isSingleEditMode">{{ t('schedules.actions.update') }}</span>
          <span v-else-if="isEditMode">{{ t('schedules.actions.updateAll') }}</span>
          <span v-else>{{ t('schedules.actions.createAll') }}</span>
        </Button>
      </Dialog.Footer>
    </Dialog.Panel>
  </Dialog>

  <!-- Delete Confirmation Modal -->
  <Dialog :open="deleteConfirmModal" @close="cancelDelete" :staticBackdrop="true">
    <Dialog.Panel>
      <div class="p-5 text-center">
        <Lucide icon="AlertTriangle" class="w-16 h-16 mx-auto mt-3 text-danger" />
        <div class="mt-5 text-3xl">{{ t('schedules.delete.title') }}</div>
        <div class="mt-2 text-slate-500">
          {{ t('schedules.delete.message', {
            course: scheduleToDelete?.course?.name || ''
          }) }}
          <br />
          {{ t('schedules.delete.cannotUndo') }}
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
          {{ t('schedules.delete.cancel') }}
        </Button>
        <Button
          type="button"
          variant="danger"
          @click="handleDelete"
          :disabled="deleting"
          class="w-24"
        >
          <Lucide v-if="deleting" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else>{{ t('schedules.delete.confirm') }}</span>
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
  </div>
</template>

<style scoped>
/* Add any custom styles here if needed */
</style>
