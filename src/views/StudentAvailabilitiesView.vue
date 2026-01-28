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
import TomSelect from '@/components/Base/TomSelect'
import ToastNotification from '@/views/components/ToastNotification.vue'
import { useI18n } from '@/composables/useI18n'

// i18n setup
const { t } = useI18n()

interface Student {
  id: string
  name: string
}

interface StudentAvailability {
  id: string
  student_id: string
  student: Student
  day_of_week: number
  start_time: string
  end_time: string
}

interface AvailabilitySlot {
  day_of_week: number | string
  start_time: string
  end_time: string
}

interface FormData {
  student_id: string
  availabilities: AvailabilitySlot[]
}

interface SlotError {
  day_of_week?: string
  start_time?: string
  end_time?: string
}

// GraphQL Queries & Mutations
const GET_STUDENT_AVAILABILITIES = gql`
  query GetStudentAvailabilities($first: Int!, $page: Int!, $student_id: ID, $day_of_week: Int) {
    studentAvailabilities(first: $first, page: $page, student_id: $student_id, day_of_week: $day_of_week) {
      data {
        id
        student_id
        student {
          id
          name
        }
        day_of_week
        start_time
        end_time
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
      }
    }
  }
`

const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      email
    }
  }
`

const BULK_CREATE_STUDENT_AVAILABILITIES = gql`
  mutation BulkCreateStudentAvailabilities($input: BulkCreateStudentAvailabilitiesInput!) {
    bulkCreateStudentAvailabilities(input: $input) {
      id
      student_id
      day_of_week
      start_time
      end_time
      student {
        id
        name
      }
    }
  }
`

const BULK_UPDATE_STUDENT_AVAILABILITIES = gql`
  mutation BulkUpdateStudentAvailabilities($input: BulkUpdateStudentAvailabilitiesInput!) {
    bulkUpdateStudentAvailabilities(input: $input) {
      id
      student_id
      day_of_week
      start_time
      end_time
      student {
        id
        name
      }
    }
  }
`

const UPDATE_STUDENT_AVAILABILITY = gql`
  mutation UpdateStudentAvailability($id: ID!, $input: UpdateStudentAvailabilityInput!) {
    updateStudentAvailability(id: $id, input: $input) {
      id
      student_id
      day_of_week
      start_time
      end_time
      student {
        id
        name
      }
    }
  }
`

const DELETE_STUDENT_AVAILABILITY = gql`
  mutation DeleteStudentAvailability($id: ID!) {
    deleteStudentAvailability(id: $id) {
      id
    }
  }
`

// State
const availabilities = ref<StudentAvailability[]>([])
const allStudents = ref<Student[]>([])
const showModal = ref(false)
const isEditMode = ref(false)
const isSingleEditMode = ref(false)
const editingAvailabilityId = ref<string | null>(null)
const formData = ref<FormData>({
  student_id: '',
  availabilities: [
    { day_of_week: '', start_time: '', end_time: '' }
  ]
})
const formErrors = ref<{ student_id?: string; availabilities?: SlotError[] }>({})
const deleteConfirmModal = ref(false)
const availabilityToDelete = ref<StudentAvailability | null>(null)

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
const filterDayOfWeek = ref<string>('')

// Apollo Query for availabilities
const { result, loading, error, refetch } = useQuery(GET_STUDENT_AVAILABILITIES, () => ({
  first: perPage.value,
  page: currentPage.value,
  student_id: filterStudentId.value || undefined
}), {
  fetchPolicy: 'cache-and-network'
})

// Apollo Query for students
const { result: studentsResult, loading: studentsLoading, error: studentsError } = useQuery(GET_ALL_STUDENTS)

// Test authentication with ME query
const { result: meResult, error: meError } = useQuery(ME_QUERY)

// Apollo Mutations
const { mutate: bulkCreateAvailabilities, loading: creating } = useMutation(BULK_CREATE_STUDENT_AVAILABILITIES)
const { mutate: bulkUpdateAvailabilities, loading: updating } = useMutation(BULK_UPDATE_STUDENT_AVAILABILITIES)
const { mutate: updateSingleAvailability, loading: updatingSingle } = useMutation(UPDATE_STUDENT_AVAILABILITY)
const { mutate: deleteAvailability, loading: deleting } = useMutation(DELETE_STUDENT_AVAILABILITY)

// Computed
const isSubmitting = computed(() => creating.value || updating.value || updatingSingle.value)
const modalTitle = computed(() => {
  if (isSingleEditMode.value) {
    return t('studentAvailabilities.form.editSingleTitle')
  }
  if (isEditMode.value) {
    const studentName = allStudents.value.find(s => s.id === formData.value.student_id)?.name || ''
    return t('studentAvailabilities.form.editTitle', { student: studentName })
  }
  return t('studentAvailabilities.form.addTitle')
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

// Day of week helper
const getDayName = (day: number): string => {
  const days = [
    t('studentAvailabilities.days.sunday'),    // 0
    t('studentAvailabilities.days.monday'),    // 1
    t('studentAvailabilities.days.tuesday'),   // 2
    t('studentAvailabilities.days.wednesday'), // 3
    t('studentAvailabilities.days.thursday'),  // 4
    t('studentAvailabilities.days.friday'),    // 5
    t('studentAvailabilities.days.saturday')   // 6
  ]
  return days[day] || ''
}

// Day options for form
const dayOptions = computed(() => [
  { value: 0, label: t('studentAvailabilities.days.sunday') },
  { value: 1, label: t('studentAvailabilities.days.monday') },
  { value: 2, label: t('studentAvailabilities.days.tuesday') },
  { value: 3, label: t('studentAvailabilities.days.wednesday') },
  { value: 4, label: t('studentAvailabilities.days.thursday') },
  { value: 5, label: t('studentAvailabilities.days.friday') },
  { value: 6, label: t('studentAvailabilities.days.saturday') }
])

// Watch for query results
watch(result, (newValue) => {
  if (newValue?.studentAvailabilities?.data) {
    availabilities.value = newValue.studentAvailabilities.data
  }
  if (newValue?.studentAvailabilities?.paginatorInfo) {
    const info = newValue.studentAvailabilities.paginatorInfo
    totalItems.value = info.total
    lastPage.value = info.lastPage
    currentPage.value = info.currentPage
  }
})

// Watch for students results
watch(studentsResult, (newValue) => {
  if (newValue?.students?.data) {
    // Sort students alphabetically by name using spread operator
    allStudents.value = [...newValue.students.data].sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  }
}, { immediate: true })

// Loading state for edit mode
const loadingEditAvailabilities = ref(false)

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

// Slot management functions
const addSlot = () => {
  // Si hay al menos un horario existente, copiar del último
  const lastSlot = formData.value.availabilities.length > 0
    ? formData.value.availabilities[formData.value.availabilities.length - 1]
    : null

  if (lastSlot) {
    // Copiar valores del último horario
    formData.value.availabilities.push({
      day_of_week: lastSlot.day_of_week,
      start_time: lastSlot.start_time,
      end_time: lastSlot.end_time
    })
  } else {
    // Si no hay horarios previos, usar valores por defecto
    formData.value.availabilities.push({
      day_of_week: '',
      start_time: '',
      end_time: ''
    })
  }
}

const removeSlot = (index: number) => {
  if (formData.value.availabilities.length > 1) {
    formData.value.availabilities.splice(index, 1)
    // Also remove error for this slot if exists
    if (formErrors.value.availabilities && formErrors.value.availabilities[index]) {
      formErrors.value.availabilities.splice(index, 1)
    }
  }
}

// Form validation
const validateForm = (): boolean => {
  formErrors.value = { availabilities: [] }

  if (!formData.value.student_id) {
    formErrors.value.student_id = t('studentAvailabilities.validation.studentRequired')
  }

  if (formData.value.availabilities.length === 0) {
    notify(t('studentAvailabilities.validation.atLeastOneSlot'), 'error')
    return false
  }

  let hasErrors = false

  formData.value.availabilities.forEach((slot, index) => {
    const slotErrors: SlotError = {}

    if (slot.day_of_week === '') {
      slotErrors.day_of_week = t('studentAvailabilities.validation.dayRequired')
      hasErrors = true
    }

    if (!slot.start_time || !slot.start_time.trim()) {
      slotErrors.start_time = t('studentAvailabilities.validation.startTimeRequired')
      hasErrors = true
    }

    if (!slot.end_time || !slot.end_time.trim()) {
      slotErrors.end_time = t('studentAvailabilities.validation.endTimeRequired')
      hasErrors = true
    }

    // Validate end time is after start time
    if (slot.start_time && slot.end_time) {
      if (slot.end_time <= slot.start_time) {
        slotErrors.end_time = t('studentAvailabilities.validation.endTimeAfterStart')
        hasErrors = true
      }
    }

    if (Object.keys(slotErrors).length > 0) {
      if (!formErrors.value.availabilities) {
        formErrors.value.availabilities = []
      }
      formErrors.value.availabilities[index] = slotErrors
    }
  })

  return !hasErrors && !formErrors.value.student_id
}

// Methods
const openCreateModal = () => {
  isEditMode.value = false
  formData.value = {
    student_id: '',
    availabilities: [
      { day_of_week: '', start_time: '', end_time: '' }
    ]
  }
  formErrors.value = {}
  showModal.value = true
}

const openSingleEditModal = (availability: StudentAvailability) => {
  // Reset modes
  isEditMode.value = false
  isSingleEditMode.value = true
  editingAvailabilityId.value = availability.id

  // Set form data with single slot
  formData.value = {
    student_id: availability.student_id,
    availabilities: [
      {
        day_of_week: availability.day_of_week,
        start_time: availability.start_time,
        end_time: availability.end_time
      }
    ]
  }

  formErrors.value = {}
  showModal.value = true
}

const openEditModal = async (availability: StudentAvailability) => {
  isEditMode.value = true
  isSingleEditMode.value = false
  const studentId = availability.student_id
    filterStudentId.value = studentId

  formData.value = {
    student_id: studentId,
    availabilities: []
  }
  formErrors.value = {}
  showModal.value = true
  loadingEditAvailabilities.value = true

  try {
    // Refetch with student filter and high limit to get all student's availabilities
    const refetchResult = await refetch({
      first: 1000,
      page: 1,
      student_id: studentId
    })

    // Extract availabilities from refetch result
    if (refetchResult?.data?.studentAvailabilities?.data) {
      const studentAvails = refetchResult.data.studentAvailabilities.data

      if (studentAvails.length > 0) {
        formData.value.availabilities = studentAvails.map((avail: any) => ({
          day_of_week: avail.day_of_week,
          start_time: avail.start_time,
          end_time: avail.end_time
        }))
      } else {
        // If no availabilities exist, start with one empty slot
        formData.value.availabilities = [{ day_of_week: '', start_time: '', end_time: '' }]
      }
    }
  } catch (err: any) {
    console.error('Error loading student availabilities:', err)
    notify(t('studentAvailabilities.messages.loadError') || 'Error loading availabilities', 'error')
    // Even on error, provide one empty slot
    formData.value.availabilities = [{ day_of_week: '', start_time: '', end_time: '' }]
  } finally {
    loadingEditAvailabilities.value = false
  }
}

const closeModal = () => {
  showModal.value = false
  isEditMode.value = false
  isSingleEditMode.value = false
  editingAvailabilityId.value = null
  formData.value = {
    student_id: '',
    availabilities: [
      { day_of_week: '', start_time: '', end_time: '' }
    ]
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
      // Single update - update only this one availability
      const slot = formData.value.availabilities[0]
      const input = {
        student_id: formData.value.student_id,
        day_of_week: Number(slot.day_of_week),
        start_time: slot.start_time,
        end_time: slot.end_time
      }

      await updateSingleAvailability({
        id: editingAvailabilityId.value,
        input
      })
      notify(t('studentAvailabilities.messages.updateSingleSuccess'), 'success')
    } else if (isEditMode.value) {
      // Bulk update - replaces all availabilities for the student
      const input = {
        student_id: formData.value.student_id,
        availabilities: formData.value.availabilities.map(slot => ({
          day_of_week: Number(slot.day_of_week),
          start_time: slot.start_time,
          end_time: slot.end_time
        }))
      }

      await bulkUpdateAvailabilities({ input })
      notify(t('studentAvailabilities.messages.updateSuccess'), 'success')
    } else {
      // Bulk create - adds new availabilities
      const input = {
        student_id: formData.value.student_id,
        availabilities: formData.value.availabilities.map(slot => ({
          day_of_week: Number(slot.day_of_week),
          start_time: slot.start_time,
          end_time: slot.end_time
        }))
      }

      await bulkCreateAvailabilities({ input })
      notify(t('studentAvailabilities.messages.createSuccess'), 'success')
    }

    closeModal()
    applyFilters()
  } catch (err: any) {
    // Check if it's actually an authentication error or a validation error
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
    }

    const errorMessage = err.message || t('studentAvailabilities.messages.generalError')
    notify(errorMessage, 'error')
  }
}

const openDeleteConfirm = (availability: StudentAvailability) => {
  availabilityToDelete.value = availability
  deleteConfirmModal.value = true
}

const handleDelete = async () => {
  if (!availabilityToDelete.value) return

  try {
    await deleteAvailability({ id: availabilityToDelete.value.id })
    notify(t('studentAvailabilities.messages.deleteSuccess'), 'success')
    deleteConfirmModal.value = false
    availabilityToDelete.value = null
    applyFilters()
  } catch (err: any) {
    const errorMessage = err.message || t('studentAvailabilities.messages.deleteError')
    notify(errorMessage, 'error')
  }
}

const cancelDelete = () => {
  deleteConfirmModal.value = false
  availabilityToDelete.value = null
}

// Pagination methods
const goToPage = (page: number) => {
  if (page >= 1 && page <= lastPage.value) {
    currentPage.value = page
    refetch({
      first: perPage.value,
      page,
      student_id: filterStudentId.value || undefined,
      day_of_week: filterDayOfWeek.value ? Number(filterDayOfWeek.value) : undefined
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
    day_of_week: filterDayOfWeek.value ? Number(filterDayOfWeek.value) : undefined
  })
}

// Filter methods
const applyFilters = () => {
  currentPage.value = 1
  refetch({
    first: perPage.value,
    page: 1,
    student_id: filterStudentId.value || undefined,
    day_of_week: filterDayOfWeek.value ? Number(filterDayOfWeek.value) : undefined
  })
}

const clearFilters = () => {
  filterStudentId.value = ''
  filterDayOfWeek.value = ''
  applyFilters()
}

const hasActiveFilters = computed(() => {
  return filterStudentId.value !== '' || filterDayOfWeek.value !== ''
})

// Watch for filter changes
watch(filterStudentId, () => {
  applyFilters()
})

watch(filterDayOfWeek, () => {
  applyFilters()
})

// Get selected student name
const getSelectedStudentName = computed(() => {
  return allStudents.value.find(s => s.id === formData.value.student_id)?.name || ''
})

/**
 * Check if this is the first occurrence of a student in the list
 * Used to show the "Manage" button only once per student
 */
const isFirstOccurrenceOfStudent = (studentId: string, index: number): boolean => {
  const availabilitiesData = result.value?.studentAvailabilities?.data || []
  const firstIndex = availabilitiesData.findIndex((a: StudentAvailability) => a.student_id === studentId)
  return index === firstIndex
}

/**
 * Check if the previous row belongs to a different student
 * Used to add visual separator between student groups
 */
const isDifferentStudentFromPrevious = (studentId: string, index: number): boolean => {
  if (index === 0) return true
  const availabilitiesData = result.value?.studentAvailabilities?.data || []
  const previousStudentId = availabilitiesData[index - 1]?.student_id
  return previousStudentId !== studentId
}

/**
 * Get the student group background class for alternating colors
 */
const getStudentGroupBackground = (studentId: string): string => {
  const availabilitiesData = result.value?.studentAvailabilities?.data || []
  const uniqueStudents = [...new Set(availabilitiesData.map((a: StudentAvailability) => a.student_id))]
  const studentIndex = uniqueStudents.indexOf(studentId)
  return studentIndex % 2 === 0 ? 'bg-white dark:bg-darkmode-600' : 'bg-slate-50/50 dark:bg-darkmode-700'
}
</script>

<template>
  <div class="flex flex-col gap-y-3 md:h-10 md:flex-row md:items-center">
    <div class="text-base font-medium">{{ t('studentAvailabilities.title') }}</div>
    <div class="flex flex-col gap-x-3 gap-y-2 sm:flex-row md:ml-auto">
      <Button variant="primary" @click="openCreateModal">
        <Lucide icon="Plus" class="w-4 h-4 mr-2" />
        {{ t('studentAvailabilities.newAvailability') }}
      </Button>
    </div>
  </div>

  <div class="box box--stacked flex flex-col mt-5">
    <!-- Filter Section -->
    <div class="p-5 border-b border-slate-200/60">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
        <!-- Filter by Student -->
        <div class="flex-1">
          <TomSelect
            v-model="filterStudentId"
            :options="{
              placeholder: t('studentAvailabilities.filters.allStudents'),
              maxOptions: null,
              maxItems: 1
            }"
            class="w-full"
          >
            <option value="">{{ t('studentAvailabilities.filters.allStudents') }}</option>
            <option v-for="student in allStudents" :key="student.id" :value="student.id">
              {{ student.name }}
            </option>
          </TomSelect>
        </div>

        <!-- Filter by Day of Week -->
        <div class="flex-1">
          <FormSelect v-model="filterDayOfWeek">
            <option value="">{{ t('studentAvailabilities.filters.allDays') }}</option>
            <option value="0">{{ t('studentAvailabilities.days.sunday') }}</option>
            <option value="1">{{ t('studentAvailabilities.days.monday') }}</option>
            <option value="2">{{ t('studentAvailabilities.days.tuesday') }}</option>
            <option value="3">{{ t('studentAvailabilities.days.wednesday') }}</option>
            <option value="4">{{ t('studentAvailabilities.days.thursday') }}</option>
            <option value="5">{{ t('studentAvailabilities.days.friday') }}</option>
            <option value="6">{{ t('studentAvailabilities.days.saturday') }}</option>
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
            {{ t('studentAvailabilities.actions.clearFilters') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center p-10">
      <div class="flex flex-col items-center gap-3">
        <Lucide icon="Loader" class="w-8 h-8 animate-spin text-primary" />
        <div class="text-sm text-slate-500">{{ t('studentAvailabilities.messages.loading') }}</div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center p-10">
      <div class="flex flex-col items-center gap-3">
        <Lucide icon="AlertCircle" class="w-8 h-8 text-danger" />
        <div class="text-sm text-slate-500">{{ t('studentAvailabilities.messages.error') }}</div>
        <Button variant="outline-primary" @click="() => refetch({
          first: perPage,
          page: currentPage,
          student_id: filterStudentId || undefined,
          day_of_week: filterDayOfWeek ? Number(filterDayOfWeek) : undefined
        })">{{ t('studentAvailabilities.actions.retry') }}</Button>
      </div>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <Table class="border-b border-slate-200/60">
        <Table.Thead>
          <Table.Tr>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('studentAvailabilities.columns.student') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('studentAvailabilities.columns.dayOfWeek') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('studentAvailabilities.columns.startTime') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('studentAvailabilities.columns.endTime') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium text-center bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('studentAvailabilities.columns.actions') }}
            </Table.Td>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr v-if="availabilities.length === 0">
            <Table.Td colspan="6" class="py-10 text-center text-slate-500">
              <div class="flex flex-col items-center gap-3">
                <Lucide icon="Inbox" class="w-10 h-10 text-slate-300" />
                <div>{{ t('studentAvailabilities.messages.noAvailabilities') }}</div>
              </div>
            </Table.Td>
          </Table.Tr>
          <Table.Tr
            v-for="(availability, index) in availabilities"
            :key="availability.id"
            :class="[
              '[&_td]:last:border-b-0',
              getStudentGroupBackground(availability.student_id),
              isDifferentStudentFromPrevious(availability.student_id, index) ? 'border-t-2 border-t-slate-300 dark:border-t-slate-600' : ''
            ]"
          >
            <Table.Td
              :class="[
                'py-4 border-dashed transition-colors',
                getStudentGroupBackground(availability.student_id)
              ]"
            >
              <div
                v-if="isFirstOccurrenceOfStudent(availability.student_id, index)"
                class="font-medium text-slate-700 dark:text-slate-200"
              >
                {{ availability.student.name }}
              </div>
              <div v-else class="text-slate-400 dark:text-slate-500 text-sm">
                &mdash;
              </div>
            </Table.Td>
            <Table.Td
              :class="[
                'py-4 border-dashed transition-colors',
                getStudentGroupBackground(availability.student_id)
              ]"
            >
              <div class="px-2 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary inline-block">
                {{ getDayName(availability.day_of_week) }}
              </div>
            </Table.Td>
            <Table.Td
              :class="[
                'py-4 border-dashed transition-colors',
                getStudentGroupBackground(availability.student_id)
              ]"
            >
              <div class="font-mono text-slate-600 dark:text-slate-300">{{ availability.start_time }}</div>
            </Table.Td>
            <Table.Td
              :class="[
                'py-4 border-dashed transition-colors',
                getStudentGroupBackground(availability.student_id)
              ]"
            >
              <div class="font-mono text-slate-600 dark:text-slate-300">{{ availability.end_time }}</div>
            </Table.Td>
            <Table.Td
              :class="[
                'relative py-4 border-dashed transition-colors',
                getStudentGroupBackground(availability.student_id)
              ]"
            >
              <div class="flex items-center justify-center gap-2">
                <Button
                  variant="outline-primary"
                  size="sm"
                  @click="openSingleEditModal(availability)"
                  class="w-16"
                >
                  <Lucide icon="Pencil" class="w-3.5 h-3.5 mr-1" />
                  {{ t('studentAvailabilities.actions.edit') }}
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  @click="openDeleteConfirm(availability)"
                  class="w-20"
                >
                  <Lucide icon="Trash2" class="w-3.5 h-3.5 mr-1" />
                  {{ t('studentAvailabilities.actions.delete') }}
                </Button>
                <Button
                  v-if="isFirstOccurrenceOfStudent(availability.student_id, index)"
                  variant="outline-secondary"
                  size="sm"
                  @click="openEditModal(availability)"
                  class="w-24"
                >
                  <Lucide icon="List" class="w-3.5 h-3.5 mr-1" />
                  {{ t('studentAvailabilities.actions.manage') }}
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
        <span class="text-sm text-slate-600">{{ t('studentAvailabilities.pagination.show') }}</span>
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
        <span class="text-sm text-slate-600">{{ t('studentAvailabilities.pagination.entries') }}</span>
      </div>

      <!-- Showing info -->
      <div class="text-sm text-slate-600 sm:ml-auto">
        {{ t('studentAvailabilities.pagination.showingInfo', { start: startItem, end: endItem, total: totalItems }) }}
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
        <!-- Student Selection -->
        <div class="col-span-12">
          <FormLabel htmlFor="availability-student">{{ t('studentAvailabilities.form.student') }} *</FormLabel>
          <TomSelect
            id="availability-student"
            v-model="formData.student_id"
            :disabled="isEditMode || isSingleEditMode || loadingEditAvailabilities"
            :options="{
              placeholder: t('studentAvailabilities.form.selectStudent'),
              maxOptions: null,
              maxItems: 1
            }"
            :class="{ 'border-danger': formErrors.student_id }"
            class="w-full"
          >
            <option value="">{{ t('studentAvailabilities.form.selectStudent') }}</option>
            <option v-for="student in allStudents" :key="student.id" :value="student.id">
              {{ student.name }}
            </option>
          </TomSelect>
          <div v-if="formErrors.student_id" class="mt-1 text-xs text-danger">
            {{ formErrors.student_id }}
          </div>
        </div>

        <!-- Loading state for edit mode -->
        <div v-if="loadingEditAvailabilities" class="col-span-12 flex items-center justify-center py-8">
          <div class="flex flex-col items-center gap-3">
            <Lucide icon="Loader" class="w-6 h-6 animate-spin text-primary" />
            <div class="text-sm text-slate-500">{{ t('studentAvailabilities.messages.loadingAvailabilities') }}</div>
          </div>
        </div>

        <!-- Availability Slots -->
        <div v-if="!loadingEditAvailabilities" class="col-span-12">
          <div class="flex items-center justify-between mb-3">
            <FormLabel class="mb-0">{{ t('studentAvailabilities.form.availabilitySlots') }}</FormLabel>
            <Button
              v-if="!isSingleEditMode"
              type="button"
              variant="outline-primary"
              size="sm"
              @click="addSlot"
            >
              <Lucide icon="Plus" class="w-4 h-4 mr-1" />
              {{ t('studentAvailabilities.actions.addSlot') }}
            </Button>
          </div>

          <!-- Scrollable container for slots -->
          <div class="max-h-[32rem] overflow-y-auto pr-2 space-y-4 scroll-smooth">
            <div
              v-for="(slot, index) in formData.availabilities"
              :key="index"
              class="p-4 border border-slate-200 rounded-lg dark:border-darkmode-400"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="text-sm font-medium text-slate-600">
                  {{ t('studentAvailabilities.form.slot', { number: index + 1 }) }}
                </div>
                <Button
                  v-if="!isSingleEditMode && formData.availabilities.length > 1"
                  type="button"
                  variant="outline-danger"
                  size="sm"
                  @click="removeSlot(index)"
                >
                  <Lucide icon="X" class="w-4 h-4 mr-1" />
                  {{ t('studentAvailabilities.actions.removeSlot') }}
                </Button>
              </div>

              <div class="grid grid-cols-12 gap-3">
                <!-- Day of Week -->
                <div class="col-span-12 sm:col-span-4">
                  <FormLabel :htmlFor="`slot-day-${index}`">{{ t('studentAvailabilities.form.dayOfWeek') }} *</FormLabel>
                  <FormSelect
                    :id="`slot-day-${index}`"
                    v-model="slot.day_of_week"
                    :class="{ 'border-danger': formErrors.availabilities?.[index]?.day_of_week }"
                  >
                    <option value="">{{ t('studentAvailabilities.form.selectDay') }}</option>
                    <option v-for="day in dayOptions" :key="day.value" :value="day.value">
                      {{ day.label }}
                    </option>
                  </FormSelect>
                  <div v-if="formErrors.availabilities?.[index]?.day_of_week" class="mt-1 text-xs text-danger">
                    {{ formErrors.availabilities[index].day_of_week }}
                  </div>
                </div>

                <!-- Start Time -->
                <div class="col-span-12 sm:col-span-4">
                  <FormLabel :htmlFor="`slot-start-${index}`">{{ t('studentAvailabilities.form.startTime') }} *</FormLabel>
                  <FormInput
                    :id="`slot-start-${index}`"
                    v-model="slot.start_time"
                    type="time"
                    :class="{ 'border-danger': formErrors.availabilities?.[index]?.start_time }"
                  />
                  <div v-if="formErrors.availabilities?.[index]?.start_time" class="mt-1 text-xs text-danger">
                    {{ formErrors.availabilities[index].start_time }}
                  </div>
                </div>

                <!-- End Time -->
                <div class="col-span-12 sm:col-span-4">
                  <FormLabel :htmlFor="`slot-end-${index}`">{{ t('studentAvailabilities.form.endTime') }} *</FormLabel>
                  <FormInput
                    :id="`slot-end-${index}`"
                    v-model="slot.end_time"
                    type="time"
                    :class="{ 'border-danger': formErrors.availabilities?.[index]?.end_time }"
                  />
                  <div v-if="formErrors.availabilities?.[index]?.end_time" class="mt-1 text-xs text-danger">
                    {{ formErrors.availabilities[index].end_time }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Dialog.Description>
      <Dialog.Footer class="text-right">
        <Button
          type="button"
          variant="outline-secondary"
          @click="closeModal"
          :disabled="isSubmitting || loadingEditAvailabilities"
          class="min-w-28 mr-2"
        >
          {{ t('studentAvailabilities.actions.cancel') }}
        </Button>
        <Button
          type="button"
          variant="primary"
          @click="handleSave"
          :disabled="isSubmitting || loadingEditAvailabilities"
          class="min-w-44"
        >
          <Lucide v-if="isSubmitting" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else-if="isSingleEditMode">{{ t('studentAvailabilities.actions.update') }}</span>
          <span v-else-if="isEditMode">{{ t('studentAvailabilities.actions.updateAll') }}</span>
          <span v-else>{{ t('studentAvailabilities.actions.createAll') }}</span>
        </Button>
      </Dialog.Footer>
    </Dialog.Panel>
  </Dialog>

  <!-- Delete Confirmation Modal -->
  <Dialog :open="deleteConfirmModal" @close="cancelDelete" :staticBackdrop="true">
    <Dialog.Panel>
      <div class="p-5 text-center">
        <Lucide icon="AlertTriangle" class="w-16 h-16 mx-auto mt-3 text-danger" />
        <div class="mt-5 text-3xl">{{ t('studentAvailabilities.delete.confirmTitle') }}</div>
        <div class="mt-2 text-slate-500">
          {{ t('studentAvailabilities.delete.confirmMessage', {
            student: availabilityToDelete?.student?.name || '',
            day: availabilityToDelete ? getDayName(availabilityToDelete.day_of_week) : ''
          }) }}
          <br />
          {{ t('studentAvailabilities.delete.cannotUndo') }}
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
          {{ t('studentAvailabilities.actions.cancel') }}
        </Button>
        <Button
          type="button"
          variant="danger"
          @click="handleDelete"
          :disabled="deleting"
          class="w-24"
        >
          <Lucide v-if="deleting" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else>{{ t('studentAvailabilities.actions.delete') }}</span>
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
