<script setup lang="ts">
import { gql } from '@apollo/client/core'
import { useQuery, useMutation, useLazyQuery } from '@vue/apollo-composable'
import { ref, watch, computed } from 'vue'
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import { Dialog } from '@/components/Base/Headless'
import { FormInput, FormLabel, FormSelect, FormTextarea } from '@/components/Base/Form'
import Table from '@/components/Base/Table'
import Pagination from '@/components/Base/Pagination'
import ToastNotification from '@/views/components/ToastNotification.vue'
import { useI18n } from '@/composables/useI18n'

// i18n setup
const { t } = useI18n()

interface Student {
  id: string
  name: string
  code: string
}

interface Course {
  id: string
  name: string
  level?: string
  year?: number
}

interface Teacher {
  id: string
  name: string
}

interface Schedule {
  id: string
  course: Course
  teacher: Teacher
  day_of_week: number
  starts_at: string
  ends_at: string
  description: string
  group_id?: string
}

interface StudentAvailability {
  id: string
  student_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

interface ScheduleGroup {
  group_id: string
  course: Course
  teacher: Teacher
  description: string
  schedules: Schedule[]
  displayText: string
}

interface StudentEnrollment {
  id: string
  student_id: string
  schedule_id: string
  student: Student
  schedule: Schedule
  enrolled_at: string
  status: 'active' | 'completed' | 'dropped' | 'pending'
  notes?: string
  created_at: string
}

// GraphQL Queries & Mutations
const GET_STUDENT_ENROLLMENTS = gql`
  query GetStudentEnrollments($first: Int!, $page: Int!, $student_id: ID, $schedule_id: ID, $status: StudentEnrollmentStatus) {
    studentEnrollments(first: $first, page: $page, student_id: $student_id, schedule_id: $schedule_id, status: $status) {
      data {
        id
        student_id
        schedule_id
        student {
          id
          name
          code
        }
        schedule {
          id
          course {
            id
            name
            level
            year
          }
          teacher {
            id
            name
          }
          day_of_week
          starts_at
          ends_at
          description
          group_id
        }
        enrolled_at
        status
        notes
        created_at
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

const GET_ALL_STUDENTS = gql`
  query GetAllStudents {
    students(first: 10000) {
      data {
        id
        name
        code
      }
    }
  }
`

const GET_ALL_SCHEDULES = gql`
  query GetAllSchedules {
    schedules(first: 10000) {
      data {
        id
        course {
          id
          name
          level
          year
        }
        teacher {
          id
          name
        }
        day_of_week
        starts_at
        ends_at
        description
        group_id
      }
    }
  }
`

const GET_STUDENT_AVAILABILITIES = gql`
  query GetStudentAvailabilities($student_id: ID!) {
    studentAvailabilities(student_id: $student_id) {
      data {
        id
        student_id
        day_of_week
        start_time
        end_time
      }
    }
  }
`

const CREATE_STUDENT_ENROLLMENT = gql`
  mutation CreateStudentEnrollment($input: CreateStudentEnrollmentInput!) {
    createStudentEnrollment(input: $input) {
      id
      student_id
      schedule_id
      student {
        id
        name
        code
      }
      schedule {
        id
        course {
          id
          name
        }
        teacher {
          id
          name
        }
        day_of_week
        starts_at
        ends_at
        description
      }
      enrolled_at
      status
      notes
    }
  }
`

const UPDATE_STUDENT_ENROLLMENT = gql`
  mutation UpdateStudentEnrollment($id: ID!, $input: UpdateStudentEnrollmentInput!) {
    updateStudentEnrollment(id: $id, input: $input) {
      id
      student_id
      schedule_id
      status
      notes
    }
  }
`

const DELETE_STUDENT_ENROLLMENT = gql`
  mutation DeleteStudentEnrollment($id: ID!) {
    deleteStudentEnrollment(id: $id) {
      id
    }
  }
`

// State
const enrollments = ref<StudentEnrollment[]>([])
const allStudents = ref<Student[]>([])
const allSchedules = ref<Schedule[]>([])
const studentAvailabilities = ref<StudentAvailability[]>([])
const showModal = ref(false)
const isEditMode = ref(false)
const editingEnrollmentId = ref<string | null>(null)
const formData = ref({
  student_id: '',
  group_id: '',  // Changed from schedule_id to group_id
  status: 'active' as 'active' | 'completed' | 'dropped' | 'pending',
  notes: ''
})
const formErrors = ref<{
  student_id?: string
  group_id?: string  // Changed from schedule_id to group_id
  status?: string
  notes?: string
}>({})
const deleteConfirmModal = ref(false)
const enrollmentToDelete = ref<StudentEnrollment | null>(null)

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
const filterStudentId = ref('')
const filterScheduleId = ref('')
const filterStatus = ref<string>('')

// Apollo Query for enrollments
const { result, loading, error, refetch } = useQuery(GET_STUDENT_ENROLLMENTS, () => ({
  first: perPage.value,
  page: currentPage.value,
  student_id: filterStudentId.value || undefined,
  schedule_id: filterScheduleId.value || undefined,
  status: filterStatus.value || undefined
}), {
  fetchPolicy: 'cache-and-network'
})

// Apollo Query for students
const { result: studentsResult, loading: studentsLoading } = useQuery(GET_ALL_STUDENTS)

// Apollo Query for schedules
const { result: schedulesResult, loading: schedulesLoading } = useQuery(GET_ALL_SCHEDULES)

// Apollo Lazy Query for student availabilities
const {
  result: availabilitiesResult,
  loading: availabilitiesLoading,
  load: loadAvailabilities,
  refetch: refetchAvailabilities,
  onResult: onAvailabilitiesResult
} = useLazyQuery(GET_STUDENT_AVAILABILITIES, null, {
  fetchPolicy: 'cache-and-network'
})

// Apollo Mutations
const { mutate: createEnrollment, loading: creating } = useMutation(CREATE_STUDENT_ENROLLMENT)
const { mutate: updateEnrollment, loading: updating } = useMutation(UPDATE_STUDENT_ENROLLMENT)
const { mutate: deleteEnrollment, loading: deleting } = useMutation(DELETE_STUDENT_ENROLLMENT)

// Computed
const isSubmitting = computed(() => creating.value || updating.value)
const modalTitle = computed(() => {
  return isEditMode.value ? t('studentEnrollments.form.editTitle') : t('studentEnrollments.form.addTitle')
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

// Day of week helper (0 = Sunday)
const getDayName = (day: number): string => {
  const days = [
    t('studentEnrollments.days.sunday'),    // 0
    t('studentEnrollments.days.monday'),    // 1
    t('studentEnrollments.days.tuesday'),   // 2
    t('studentEnrollments.days.wednesday'), // 3
    t('studentEnrollments.days.thursday'),  // 4
    t('studentEnrollments.days.friday'),    // 5
    t('studentEnrollments.days.saturday')   // 6
  ]
  return days[day] || ''
}

// Status helper
const getStatusBadgeClass = (status: string): string => {
  const classes = {
    active: 'bg-success/10 text-success',
    completed: 'bg-primary/10 text-primary',
    dropped: 'bg-danger/10 text-danger',
    pending: 'bg-warning/10 text-warning'
  }
  return classes[status as keyof typeof classes] || 'bg-slate-100 text-slate-600'
}

const getStatusLabel = (status: string): string => {
  return t(`studentEnrollments.status.${status.toLowerCase()}`)
}

// Status options
const statusOptions = computed(() => [
  { value: 'active', label: t('studentEnrollments.status.active') },
  { value: 'completed', label: t('studentEnrollments.status.completed') },
  { value: 'dropped', label: t('studentEnrollments.status.dropped') },
  { value: 'pending', label: t('studentEnrollments.status.pending') }
])

// Watch for query results
watch(result, (newValue) => {
  if (newValue?.studentEnrollments?.data) {
    enrollments.value = newValue.studentEnrollments.data
  }
  if (newValue?.studentEnrollments?.paginatorInfo) {
    const info = newValue.studentEnrollments.paginatorInfo
    totalItems.value = info.total
    lastPage.value = info.lastPage
    currentPage.value = info.currentPage
  }
})

// Watch for students results
watch(studentsResult, (newValue) => {
  if (newValue?.students?.data) {
    allStudents.value = [...newValue.students.data].sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }
}, { immediate: true })

// Watch for schedules results
watch(schedulesResult, (newValue) => {
  if (newValue?.schedules?.data) {
    allSchedules.value = [...newValue.schedules.data].sort((a, b) =>
      a.course.name.localeCompare(b.course.name)
    )
  }
}, { immediate: true })

// Watch for availabilities results
watch(availabilitiesResult, (newValue) => {
  if (newValue?.studentAvailabilities?.data) {
    studentAvailabilities.value = newValue.studentAvailabilities.data
  }
}, { immediate: true })

// Watch for student selection changes
watch(() => formData.value.student_id, (newStudentId) => {
  // Only clear group selection when student changes in CREATE mode
  // In EDIT mode, keep the existing schedule
  if (!isEditMode.value) {
    formData.value.group_id = ''
  }

  // Load student availabilities if a student is selected (only in create mode)
  if (newStudentId && !isEditMode.value) {
    studentAvailabilities.value = []

    // Use load() for first call, refetch() for subsequent calls
    const fetchPromise = availabilitiesResult.value
      ? refetchAvailabilities({ student_id: newStudentId })
      : loadAvailabilities(GET_STUDENT_AVAILABILITIES, { student_id: newStudentId })

    fetchPromise.catch(err => {
      console.error('Error fetching availabilities:', err)
    })
  } else if (!isEditMode.value) {
    studentAvailabilities.value = []
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

  if (!formData.value.student_id) {
    formErrors.value.student_id = t('studentEnrollments.validation.studentRequired')
  }

  if (!formData.value.group_id) {
    formErrors.value.group_id = t('studentEnrollments.validation.scheduleRequired')
  }

  if (!formData.value.status) {
    formErrors.value.status = t('studentEnrollments.validation.statusRequired')
  }

  return Object.keys(formErrors.value).length === 0
}

// Methods
const openCreateModal = () => {
  isEditMode.value = false
  editingEnrollmentId.value = null
  formData.value = {
    student_id: '',
    group_id: '',
    status: 'active',
    notes: ''
  }
  formErrors.value = {}
  showModal.value = true
}

const openEditModal = (enrollment: StudentEnrollment) => {
  isEditMode.value = true
  editingEnrollmentId.value = enrollment.id

  // Ensure status is lowercase to match options
  const normalizedStatus = enrollment.status.toLowerCase() as 'active' | 'completed' | 'dropped' | 'pending'

  // In edit mode, we use the schedule's group_id
  formData.value = {
    student_id: enrollment.student_id,
    group_id: enrollment.schedule.group_id || enrollment.schedule_id,
    status: normalizedStatus,
    notes: enrollment.notes || ''
  }

  formErrors.value = {}
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  isEditMode.value = false
  editingEnrollmentId.value = null
  formData.value = {
    student_id: '',
    group_id: '',
    status: 'active',
    notes: ''
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
    if (isEditMode.value) {
      // In edit mode, only update status and notes (cannot change group)
      await updateEnrollment({
        id: editingEnrollmentId.value,
        input: {
          status: formData.value.status.toUpperCase(),
          notes: formData.value.notes || undefined
        }
      })
      notify(t('studentEnrollments.messages.updateSuccess'), 'success')
    } else {
      // In create mode, enroll student in ALL schedules within the selected group
      const selectedGroup = groupedSchedules.value.find(g => g.group_id === formData.value.group_id)

      if (!selectedGroup || selectedGroup.schedules.length === 0) {
        notify('Invalid group selection', 'error')
        return
      }

      // Create enrollments for all schedules in the group
      const enrollmentPromises = selectedGroup.schedules.map(schedule => {
        const input = {
          student_id: formData.value.student_id,
          schedule_id: schedule.id,
          status: formData.value.status.toUpperCase(),
          notes: formData.value.notes || undefined
        }
        return createEnrollment({ input })
      })

      // Wait for all enrollments to be created
      await Promise.all(enrollmentPromises)

      const scheduleCount = selectedGroup.schedules.length
      notify(`Successfully enrolled in ${scheduleCount} schedule${scheduleCount > 1 ? 's' : ''}`, 'success')
    }

    closeModal()
    applyFilters()
  } catch (err: any) {
    if (err.graphQLErrors && err.graphQLErrors.length > 0) {
      const firstError = err.graphQLErrors[0]

      if (firstError.extensions?.category === 'validation') {
        const validationErrors = firstError.extensions?.validation
        const messages = Object.values(validationErrors).flat().join(', ')
        notify(`Validation Error: ${messages}`, 'error')
        return
      }

      if (firstError.message) {
        notify(firstError.message, 'error')
        return
      }
    }

    const errorMessage = err.message || t('studentEnrollments.messages.generalError')
    notify(errorMessage, 'error')
  }
}

const openDeleteConfirm = (enrollment: StudentEnrollment) => {
  enrollmentToDelete.value = enrollment
  deleteConfirmModal.value = true
}

const handleDelete = async () => {
  if (!enrollmentToDelete.value) return

  try {
    await deleteEnrollment({ id: enrollmentToDelete.value.id })
    notify(t('studentEnrollments.messages.deleteSuccess'), 'success')
    deleteConfirmModal.value = false
    enrollmentToDelete.value = null
    applyFilters()
  } catch (err: any) {
    const errorMessage = err.message || t('studentEnrollments.messages.deleteError')
    notify(errorMessage, 'error')
  }
}

const cancelDelete = () => {
  deleteConfirmModal.value = false
  enrollmentToDelete.value = null
}

// Pagination methods
const goToPage = (page: number) => {
  if (page >= 1 && page <= lastPage.value) {
    currentPage.value = page
    refetch({
      first: perPage.value,
      page,
      student_id: filterStudentId.value || undefined,
      schedule_id: filterScheduleId.value || undefined,
      status: filterStatus.value || undefined
    })
  }
}

const changePerPage = (newPerPage: number) => {
  perPage.value = newPerPage
  currentPage.value = 1
  refetch({
    first: newPerPage,
    page: 1,
    student_id: filterStudentId.value || undefined,
    schedule_id: filterScheduleId.value || undefined,
    status: filterStatus.value || undefined
  })
}

// Filter methods
const applyFilters = () => {
  currentPage.value = 1
  refetch({
    first: perPage.value,
    page: 1,
    student_id: filterStudentId.value || undefined,
    schedule_id: filterScheduleId.value || undefined,
    status: filterStatus.value || undefined
  })
}

const clearFilters = () => {
  filterStudentId.value = ''
  filterScheduleId.value = ''
  filterStatus.value = ''
  applyFilters()
}

const hasActiveFilters = computed(() => {
  return filterStudentId.value !== '' || filterScheduleId.value !== '' || filterStatus.value !== ''
})

// Watch for filter changes
watch(filterStudentId, () => {
  applyFilters()
})

watch(filterScheduleId, () => {
  applyFilters()
})

watch(filterStatus, () => {
  applyFilters()
})


// Helper to check if schedule fits within student availability
const scheduleFitsInAvailability = (schedule: Schedule, availabilities: StudentAvailability[]): boolean => {
  if (availabilities.length === 0) return false

  return availabilities.some(avail => {
    // Check if the day matches
    if (avail.day_of_week !== schedule.day_of_week) return false

    // Convert times to comparable format (HH:MM or HH:MM:SS)
    const scheduleStart = schedule.starts_at.substring(0, 5) // Get HH:MM
    const scheduleEnd = schedule.ends_at.substring(0, 5)
    const availStart = avail.start_time.length === 5 ? avail.start_time : avail.start_time.substring(0, 5)
    const availEnd = avail.end_time.length === 5 ? avail.end_time : avail.end_time.substring(0, 5)

    // Check if schedule time fits within availability window
    return scheduleStart >= availStart && scheduleEnd <= availEnd
  })
}

// Computed: Filter schedules based on student availability
const filteredSchedules = computed(() => {
  // If no student selected, return empty array
  if (!formData.value.student_id) {
    return []
  }

  // If student selected but no availabilities loaded yet, return empty array
  if (studentAvailabilities.value.length === 0) {
    return []
  }

  // Filter schedules that fit within student's availability
  return allSchedules.value.filter(schedule =>
    scheduleFitsInAvailability(schedule, studentAvailabilities.value)
  )
})

// Computed: Group schedules by group_id
const groupedSchedules = computed((): ScheduleGroup[] => {
  const schedulesToGroup = filteredSchedules.value

  // Group schedules by group_id
  const groups = new Map<string, Schedule[]>()

  schedulesToGroup.forEach(schedule => {
    const groupId = schedule.group_id || schedule.id
    if (!groups.has(groupId)) {
      groups.set(groupId, [])
    }
    groups.get(groupId)!.push(schedule)
  })

  // Convert groups to ScheduleGroup objects
  const result: ScheduleGroup[] = []

  groups.forEach((schedules, groupId) => {
    // Sort schedules within group by day and time
    const sortedSchedules = [...schedules].sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) {
        return a.day_of_week - b.day_of_week
      }
      return a.starts_at.localeCompare(b.starts_at)
    })

    // Use the first schedule for common properties
    const firstSchedule = sortedSchedules[0]

    // Build display text with all days and times
    const dayTimeParts = sortedSchedules.map(s => {
      const dayName = getDayName(s.day_of_week).substring(0, 3) // Get 3-letter abbreviation
      return `${dayName} ${s.starts_at.substring(0, 5)}-${s.ends_at.substring(0, 5)}`
    })

    const displayText = `${firstSchedule.course.name} - ${firstSchedule.description} (${firstSchedule.teacher.name}) - ${dayTimeParts.join(', ')}`

    result.push({
      group_id: groupId,
      course: firstSchedule.course,
      teacher: firstSchedule.teacher,
      description: firstSchedule.description,
      schedules: sortedSchedules,
      displayText
    })
  })

  // Sort groups by course name
  return result.sort((a, b) => a.course.name.localeCompare(b.course.name))
})

// Helper to format schedule display (for table view)
const getScheduleDisplay = (schedule: Schedule): string => {
  const dayName = getDayName(schedule.day_of_week)
  return `${schedule.course.name} - ${schedule.teacher.name} (${dayName} ${schedule.starts_at}-${schedule.ends_at})`
}
</script>

<template>
  <div class="w-full">
    <div class="flex flex-col gap-y-3 md:h-10 md:flex-row md:items-center">
      <div class="text-base font-medium">{{ t('studentEnrollments.title') }}</div>
      <div class="flex flex-col gap-x-3 gap-y-2 sm:flex-row md:ml-auto">
        <Button variant="primary" @click="openCreateModal">
          <Lucide icon="Plus" class="w-4 h-4 mr-2" />
          {{ t('studentEnrollments.actions.new') }}
        </Button>
      </div>
    </div>

    <div class="box box--stacked flex flex-col mt-5 w-full">
      <!-- Filter Section -->
      <div class="p-5 border-b border-slate-200/60">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <!-- Filter by Student -->
          <div class="flex-1">
            <FormSelect v-model="filterStudentId">
              <option value="">{{ t('studentEnrollments.filters.allStudents') }}</option>
              <option v-for="student in allStudents" :key="student.id" :value="student.id">
                {{ student.name }} ({{ student.code }})
              </option>
            </FormSelect>
          </div>

          <!-- Filter by Schedule/Course -->
          <div class="flex-1">
            <FormSelect v-model="filterScheduleId">
              <option value="">{{ t('studentEnrollments.filters.allSchedules') }}</option>
              <option v-for="schedule in allSchedules" :key="schedule.id" :value="schedule.id">
                {{ getScheduleDisplay(schedule) }}
              </option>
            </FormSelect>
          </div>

          <!-- Filter by Status -->
          <div class="flex-1">
            <FormSelect v-model="filterStatus">
              <option value="">{{ t('studentEnrollments.filters.allStatuses') }}</option>
              <option value="ACTIVE">{{ t('studentEnrollments.status.active') }}</option>
              <option value="COMPLETED">{{ t('studentEnrollments.status.completed') }}</option>
              <option value="DROPPED">{{ t('studentEnrollments.status.dropped') }}</option>
              <option value="PENDING">{{ t('studentEnrollments.status.pending') }}</option>
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
              {{ t('studentEnrollments.actions.clearFilters') }}
            </Button>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center p-10">
        <div class="flex flex-col items-center gap-3">
          <Lucide icon="Loader" class="w-8 h-8 animate-spin text-primary" />
          <div class="text-sm text-slate-500">{{ t('studentEnrollments.messages.loading') }}</div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex items-center justify-center p-10">
        <div class="flex flex-col items-center gap-3">
          <Lucide icon="AlertCircle" class="w-8 h-8 text-danger" />
          <div class="text-sm text-slate-500">{{ t('studentEnrollments.messages.error') }}</div>
          <Button variant="outline-primary" @click="() => refetch({
            first: perPage,
            page: currentPage,
            student_id: filterStudentId || undefined,
            schedule_id: filterScheduleId || undefined,
            status: filterStatus || undefined
          })">{{ t('studentEnrollments.actions.retry') }}</Button>
        </div>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <Table class="border-b border-slate-200/60">
          <Table.Thead>
            <Table.Tr>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
                {{ t('studentEnrollments.columns.id') }}
              </Table.Td>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
                {{ t('studentEnrollments.columns.student') }}
              </Table.Td>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
                {{ t('studentEnrollments.columns.course') }}
              </Table.Td>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
                {{ t('studentEnrollments.columns.teacher') }}
              </Table.Td>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
                {{ t('studentEnrollments.columns.schedule') }}
              </Table.Td>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
                {{ t('studentEnrollments.columns.status') }}
              </Table.Td>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
                {{ t('studentEnrollments.columns.notes') }}
              </Table.Td>
              <Table.Td class="py-4 font-medium text-center bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
                {{ t('studentEnrollments.columns.actions') }}
              </Table.Td>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr v-if="enrollments.length === 0">
              <Table.Td colspan="8" class="py-10 text-center text-slate-500">
                <div class="flex flex-col items-center gap-3">
                  <Lucide icon="Inbox" class="w-10 h-10 text-slate-300" />
                  <div>{{ t('studentEnrollments.messages.noEnrollments') }}</div>
                </div>
              </Table.Td>
            </Table.Tr>
            <Table.Tr v-for="enrollment in enrollments" :key="enrollment.id" class="[&_td]:last:border-b-0">
              <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
                <div class="text-xs text-slate-500">#{{ enrollment.id }}</div>
              </Table.Td>
              <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
                <div class="font-medium">{{ enrollment.student.name }}</div>
                <div class="text-xs text-slate-500">{{ enrollment.student.code }}</div>
              </Table.Td>
              <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
                <div class="font-medium">{{ enrollment.schedule.course.name }}</div>
                <div v-if="enrollment.schedule.course.level" class="text-xs text-slate-500">
                  {{ enrollment.schedule.course.level }}
                </div>
              </Table.Td>
              <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
                <div class="text-slate-600">{{ enrollment.schedule.teacher.name }}</div>
              </Table.Td>
              <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
                <div class="text-xs">
                  <div class="px-2 py-1 rounded-md bg-primary/10 text-primary inline-block mb-1">
                    {{ getDayName(enrollment.schedule.day_of_week) }}
                  </div>
                  <div class="font-mono text-slate-600">
                    {{ enrollment.schedule.starts_at }} - {{ enrollment.schedule.ends_at }}
                  </div>
                </div>
              </Table.Td>
              <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
                <span class="px-2 py-1 text-xs font-medium rounded-md" :class="getStatusBadgeClass(enrollment.status)">
                  {{ getStatusLabel(enrollment.status) }}
                </span>
              </Table.Td>
              <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
                <div class="text-xs text-slate-600 max-w-xs truncate">
                  {{ enrollment.notes || '-' }}
                </div>
              </Table.Td>
              <Table.Td class="relative py-4 border-dashed dark:bg-darkmode-600">
                <div class="flex items-center justify-center gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    @click="openEditModal(enrollment)"
                    class="w-16"
                  >
                    <Lucide icon="Pencil" class="w-3.5 h-3.5 mr-1" />
                    {{ t('studentEnrollments.actions.edit') }}
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    @click="openDeleteConfirm(enrollment)"
                    class="w-20"
                  >
                    <Lucide icon="Trash2" class="w-3.5 h-3.5 mr-1" />
                    {{ t('studentEnrollments.actions.delete') }}
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
          Showing {{ startItem }} to {{ endItem }} of {{ totalItems }} enrollments
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
      <Dialog.Panel class="max-w-2xl">
        <Dialog.Title>
          <h2 class="mr-auto text-base font-medium">
            {{ modalTitle }}
          </h2>
        </Dialog.Title>
        <Dialog.Description class="grid grid-cols-12 gap-4 gap-y-3">
          <!-- Student Selection -->
          <div class="col-span-12">
            <FormLabel htmlFor="enrollment-student">{{ t('studentEnrollments.form.student') }} *</FormLabel>
            <FormSelect
              id="enrollment-student"
              v-model="formData.student_id"
              :disabled="isEditMode"
              :class="{ 'border-danger': formErrors.student_id }"
            >
              <option value="">{{ t('studentEnrollments.form.selectStudent') }}</option>
              <option v-for="student in allStudents" :key="student.id" :value="student.id">
                {{ student.name }} ({{ student.code }})
              </option>
            </FormSelect>
            <div v-if="formErrors.student_id" class="mt-1 text-xs text-danger">
              {{ formErrors.student_id }}
            </div>
          </div>

          <!-- Schedule/Group Selection -->
          <div class="col-span-12">
            <FormLabel htmlFor="enrollment-group">{{ t('studentEnrollments.form.schedule') }} *</FormLabel>

            <!-- Loading availabilities message -->
            <div v-if="formData.student_id && availabilitiesLoading" class="p-3 mb-2 rounded-md bg-slate-100 text-slate-600 text-sm">
              <div class="flex items-center gap-2">
                <Lucide icon="Loader" class="w-4 h-4 animate-spin" />
                <span>Loading student availabilities...</span>
              </div>
            </div>

            <!-- No student selected message -->
            <div v-if="!formData.student_id && !isEditMode" class="p-3 mb-2 rounded-md bg-blue-50 text-blue-700 text-sm">
              <div class="flex items-center gap-2">
                <Lucide icon="Info" class="w-4 h-4" />
                <span>Please select a student first to see available course groups</span>
              </div>
            </div>

            <!-- Student has no availabilities -->
            <div v-if="formData.student_id && !availabilitiesLoading && studentAvailabilities.length === 0 && !isEditMode" class="p-3 mb-2 rounded-md bg-yellow-50 text-yellow-700 text-sm">
              <div class="flex items-center gap-2">
                <Lucide icon="AlertCircle" class="w-4 h-4" />
                <span>This student has no availability configured. No course groups available.</span>
              </div>
            </div>

            <!-- No matching schedules -->
            <div v-if="formData.student_id && !availabilitiesLoading && studentAvailabilities.length > 0 && groupedSchedules.length === 0 && !isEditMode" class="p-3 mb-2 rounded-md bg-yellow-50 text-yellow-700 text-sm">
              <div class="flex items-center gap-2">
                <Lucide icon="AlertCircle" class="w-4 h-4" />
                <span>No course groups match this student's availability</span>
              </div>
            </div>

            <!-- Group dropdown for create mode -->
            <FormSelect
              v-if="!isEditMode"
              id="enrollment-group"
              v-model="formData.group_id"
              :disabled="!formData.student_id || availabilitiesLoading || groupedSchedules.length === 0"
              :class="{ 'border-danger': formErrors.group_id }"
            >
              <option value="">{{ t('studentEnrollments.form.selectSchedule') }}</option>
              <option v-for="group in groupedSchedules" :key="group.group_id" :value="group.group_id">
                {{ group.displayText }}
              </option>
            </FormSelect>

            <!-- Group dropdown for edit mode (disabled, shows current group) -->
            <FormSelect
              v-else
              id="enrollment-group"
              v-model="formData.group_id"
              :disabled="true"
              :class="{ 'border-danger': formErrors.group_id }"
            >
              <option value="">{{ t('studentEnrollments.form.selectSchedule') }}</option>
              <option v-for="group in groupedSchedules" :key="group.group_id" :value="group.group_id">
                {{ group.displayText }}
              </option>
            </FormSelect>

            <!-- Info message for create mode -->
            <div v-if="!isEditMode && formData.group_id" class="mt-2 p-2 rounded-md bg-blue-50 text-blue-700 text-xs">
              <div class="flex items-start gap-2">
                <Lucide icon="Info" class="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Note: The student will be enrolled in ALL schedule slots in this group ({{ groupedSchedules.find(g => g.group_id === formData.group_id)?.schedules.length || 0 }} slots)</span>
              </div>
            </div>

            <div v-if="formErrors.group_id" class="mt-1 text-xs text-danger">
              {{ formErrors.group_id }}
            </div>
          </div>

          <!-- Status Selection -->
          <div class="col-span-12">
            <FormLabel htmlFor="enrollment-status">{{ t('studentEnrollments.form.status') }} *</FormLabel>
            <FormSelect
              id="enrollment-status"
              v-model="formData.status"
              :class="{ 'border-danger': formErrors.status }"
            >
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </FormSelect>
            <div v-if="formErrors.status" class="mt-1 text-xs text-danger">
              {{ formErrors.status }}
            </div>
          </div>

          <!-- Notes -->
          <div class="col-span-12">
            <FormLabel htmlFor="enrollment-notes">{{ t('studentEnrollments.form.notes') }}</FormLabel>
            <FormTextarea
              id="enrollment-notes"
              v-model="formData.notes"
              rows="3"
              :placeholder="t('studentEnrollments.form.notesPlaceholder')"
            />
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
            {{ t('studentEnrollments.actions.cancel') }}
          </Button>
          <Button
            type="button"
            variant="primary"
            @click="handleSave"
            :disabled="isSubmitting"
            class="w-32"
          >
            <Lucide v-if="isSubmitting" icon="Loader" class="w-4 h-4 animate-spin" />
            <span v-else>{{ isEditMode ? t('studentEnrollments.actions.update') : t('studentEnrollments.actions.create') }}</span>
          </Button>
        </Dialog.Footer>
      </Dialog.Panel>
    </Dialog>

    <!-- Delete Confirmation Modal -->
    <Dialog :open="deleteConfirmModal" @close="cancelDelete" :staticBackdrop="true">
      <Dialog.Panel>
        <div class="p-5 text-center">
          <Lucide icon="AlertTriangle" class="w-16 h-16 mx-auto mt-3 text-danger" />
          <div class="mt-5 text-3xl">{{ t('studentEnrollments.delete.title') }}</div>
          <div class="mt-2 text-slate-500">
            {{ t('studentEnrollments.delete.message', {
              student: enrollmentToDelete?.student?.name || '',
              course: enrollmentToDelete?.schedule?.course?.name || ''
            }) }}
            <br />
            {{ t('studentEnrollments.delete.cannotUndo') }}
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
            {{ t('studentEnrollments.delete.cancel') }}
          </Button>
          <Button
            type="button"
            variant="danger"
            @click="handleDelete"
            :disabled="deleting"
            class="w-24"
          >
            <Lucide v-if="deleting" icon="Loader" class="w-4 h-4 animate-spin" />
            <span v-else>{{ t('studentEnrollments.delete.confirm') }}</span>
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
