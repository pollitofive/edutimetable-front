<script setup lang="ts">
import { gql } from '@apollo/client/core'
import { useQuery, useMutation } from '@vue/apollo-composable'
import { ref, watch, computed } from 'vue'
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import { Dialog } from '@/components/Base/Headless'
import { FormInput, FormLabel } from '@/components/Base/Form'
import Table from '@/components/Base/Table'
import Pagination from '@/components/Base/Pagination'
import ToastNotification from '@/views/components/ToastNotification.vue'
import { useI18n } from '@/composables/useI18n'

// i18n setup
const { t } = useI18n()

interface Student {
  id: string
  name: string
  email: string
  code: string
}

interface FormData {
  name: string
  email: string
  code: string
}

// GraphQL Queries & Mutations
const GET_STUDENTS = gql`
  query GetStudents($first: Int!, $page: Int!, $name: String, $email: String, $code: String) {
    students(first: $first, page: $page, name: $name, email: $email, code: $code) {
      data {
        id
        name
        email
        code
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

const CREATE_STUDENT = gql`
  mutation CreateStudent($input: CreateStudentInput!) {
    createStudent(input: $input) {
      id
      name
      email
      code
    }
  }
`

const UPDATE_STUDENT = gql`
  mutation UpdateStudent($id: ID!, $input: UpdateStudentInput!) {
    updateStudent(id: $id, input: $input) {
      id
      name
      email
      code
    }
  }
`

const DELETE_STUDENT = gql`
  mutation DeleteStudent($id: ID!) {
    deleteStudent(id: $id) {
      id
    }
  }
`

// State
const students = ref<Student[]>([])
const showModal = ref(false)
const selectedStudent = ref<Student | null>(null)
const formData = ref<FormData>({ name: '', email: '', code: '' })
const formErrors = ref<{ name?: string; email?: string; code?: string }>({})
const deleteConfirmModal = ref(false)
const studentToDelete = ref<Student | null>(null)

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
const filterEmail = ref('')
const filterCode = ref('')
let filterTimeout: ReturnType<typeof setTimeout> | null = null

// Apollo Query
const { result, loading, error, refetch } = useQuery(GET_STUDENTS, () => ({
  first: perPage.value,
  page: currentPage.value,
  name: filterName.value ? `%${filterName.value}%` : undefined,
  email: filterEmail.value ? `%${filterEmail.value}%` : undefined,
  code: filterCode.value ? `%${filterCode.value}%` : undefined
}), {
  fetchPolicy: 'cache-and-network'
})

// Apollo Mutations
const { mutate: createStudent, loading: creating } = useMutation(CREATE_STUDENT)
const { mutate: updateStudent, loading: updating } = useMutation(UPDATE_STUDENT)
const { mutate: deleteStudent, loading: deleting } = useMutation(DELETE_STUDENT)

// Computed
const isSubmitting = computed(() => creating.value || updating.value)
const modalTitle = computed(() => selectedStudent.value ? t('students.editStudent') : t('students.newStudent'))

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
watch(result, (newValue) => {
  if (newValue?.students?.data) {
    students.value = newValue.students.data
  }
  if (newValue?.students?.paginatorInfo) {
    const info = newValue.students.paginatorInfo
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
    formErrors.value.name = t('students.validation.nameRequired')
  }

  if (!formData.value.email.trim()) {
    formErrors.value.email = t('students.validation.emailRequired')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
    formErrors.value.email = t('students.validation.emailInvalid')
  }

  if (!formData.value.code.trim()) {
    formErrors.value.code = t('students.validation.codeRequired')
  }

  return Object.keys(formErrors.value).length === 0
}

// Methods
const openCreateModal = () => {
  selectedStudent.value = null
  formData.value = { name: '', email: '', code: '' }
  formErrors.value = {}
  showModal.value = true
}

const openEditModal = (student: Student) => {
  selectedStudent.value = student
  formData.value = { name: student.name, email: student.email, code: student.code }
  formErrors.value = {}
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedStudent.value = null
  formData.value = { name: '', email: '', code: '' }
  formErrors.value = {}
}

const handleSave = async () => {
  if (!validateForm()) {
    return
  }

  try {
    if (selectedStudent.value) {
      // Update
      await updateStudent({
        id: selectedStudent.value.id,
        input: formData.value
      })
      notify(t('students.messages.updateSuccess'), 'success')
    } else {
      // Create
      await createStudent({ input: formData.value })
      notify(t('students.messages.createSuccess'), 'success')
    }

    closeModal()
    applyFilters()
  } catch (err: any) {
    const errorMessage = err.message || t('students.messages.generalError')
    notify(errorMessage, 'error')
    console.error('Error saving student:', err)
  }
}

const openDeleteConfirm = (student: Student) => {
  studentToDelete.value = student
  deleteConfirmModal.value = true
}

const handleDelete = async () => {
  if (!studentToDelete.value) return

  try {
    await deleteStudent({ id: studentToDelete.value.id })
    notify(t('students.messages.deleteSuccess'), 'success')
    deleteConfirmModal.value = false
    studentToDelete.value = null
    applyFilters()
  } catch (err: any) {
    const errorMessage = err.message || t('students.messages.deleteError')
    notify(errorMessage, 'error')
    console.error('Error deleting student:', err)
  }
}

const cancelDelete = () => {
  deleteConfirmModal.value = false
  studentToDelete.value = null
}

// Pagination methods
const goToPage = (page: number) => {
  if (page >= 1 && page <= lastPage.value) {
    currentPage.value = page
    refetch({
      first: perPage.value,
      page,
      name: filterName.value.trim() ? `%${filterName.value.trim()}%` : undefined,
      email: filterEmail.value.trim() ? `%${filterEmail.value.trim()}%` : undefined,
      code: filterCode.value.trim() ? `%${filterCode.value.trim()}%` : undefined
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
    email: filterEmail.value.trim() ? `%${filterEmail.value.trim()}%` : undefined,
    code: filterCode.value.trim() ? `%${filterCode.value.trim()}%` : undefined
  })
}

// Filter methods
const applyFilters = () => {
  currentPage.value = 1
  refetch({
    first: perPage.value,
    page: 1,
    name: filterName.value.trim() ? `%${filterName.value.trim()}%` : undefined,
    email: filterEmail.value.trim() ? `%${filterEmail.value.trim()}%` : undefined,
    code: filterCode.value.trim() ? `%${filterCode.value.trim()}%` : undefined
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
  filterEmail.value = ''
  filterCode.value = ''
  applyFilters()
}

const hasActiveFilters = computed(() => {
  return filterName.value.trim() !== '' || filterEmail.value.trim() !== '' || filterCode.value.trim() !== ''
})

// Watch for filter changes
watch([filterName, filterEmail, filterCode], () => {
  debouncedFilter()
})
</script>

<template>
  <div class="flex flex-col gap-y-3 md:h-10 md:flex-row md:items-center">
    <div class="text-base font-medium">{{ t('students.title') }}</div>
    <div class="flex flex-col gap-x-3 gap-y-2 sm:flex-row md:ml-auto">
      <Button variant="primary" @click="openCreateModal">
        <Lucide icon="Plus" class="w-4 h-4 mr-2" />
        {{ t('students.newStudent') }}
      </Button>
    </div>
  </div>

  <div class="box box--stacked flex flex-col mt-5">
    <!-- Filter Section -->
    <div class="p-5 border-b border-slate-200/60">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
        <!-- Search by Name -->
        <div class="flex-1">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Lucide icon="Search" class="w-4 h-4 text-slate-400" />
            </div>
            <FormInput
              v-model="filterName"
              type="text"
              :placeholder="t('students.filters.searchByName')"
              class="pl-10"
            />
          </div>
        </div>

        <!-- Search by Email -->
        <div class="flex-1">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Lucide icon="Mail" class="w-4 h-4 text-slate-400" />
            </div>
            <FormInput
              v-model="filterEmail"
              type="text"
              :placeholder="t('students.filters.searchByEmail')"
              class="pl-10"
            />
          </div>
        </div>

        <!-- Search by Code -->
        <div class="flex-1">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Lucide icon="Hash" class="w-4 h-4 text-slate-400" />
            </div>
            <FormInput
              v-model="filterCode"
              type="text"
              :placeholder="t('students.filters.searchByCode')"
              class="pl-10"
            />
          </div>
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
            {{ t('students.actions.clearFilters') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center p-10">
      <div class="flex flex-col items-center gap-3">
        <Lucide icon="Loader" class="w-8 h-8 animate-spin text-primary" />
        <div class="text-sm text-slate-500">{{ t('students.messages.loading') }}</div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center p-10">
      <div class="flex flex-col items-center gap-3">
        <Lucide icon="AlertCircle" class="w-8 h-8 text-danger" />
        <div class="text-sm text-slate-500">{{ t('students.messages.error') }}</div>
        <Button variant="outline-primary" @click="() => refetch({
          first: perPage.value,
          page: currentPage.value,
          name: filterName.value.trim() ? `%${filterName.value.trim()}%` : undefined,
          email: filterEmail.value.trim() ? `%${filterEmail.value.trim()}%` : undefined,
          code: filterCode.value.trim() ? `%${filterCode.value.trim()}%` : undefined
        })">{{ t('students.actions.retry') }}</Button>
      </div>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <Table class="border-b border-slate-200/60">
        <Table.Thead>
          <Table.Tr>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('students.columns.id') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('students.columns.name') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('students.columns.email') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('students.columns.code') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium text-center bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('students.columns.actions') }}
            </Table.Td>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr v-if="students.length === 0">
            <Table.Td colspan="5" class="py-10 text-center text-slate-500">
              <div class="flex flex-col items-center gap-3">
                <Lucide icon="Inbox" class="w-10 h-10 text-slate-300" />
                <div>{{ t('students.messages.noStudents') }}</div>
              </div>
            </Table.Td>
          </Table.Tr>
          <Table.Tr v-for="student in students" :key="student.id" class="[&_td]:last:border-b-0">
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              {{ student.id }}
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="font-medium">{{ student.name }}</div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="text-slate-500">{{ student.email }}</div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="px-2 py-1 text-xs font-mono rounded-md bg-slate-100 text-slate-600 inline-block">
                {{ student.code }}
              </div>
            </Table.Td>
            <Table.Td class="relative py-4 border-dashed dark:bg-darkmode-600">
              <div class="flex items-center justify-center gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  @click="openEditModal(student)"
                  class="w-20"
                >
                  <Lucide icon="Edit" class="w-3.5 h-3.5 mr-1" />
                  {{ t('students.actions.edit') }}
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  @click="openDeleteConfirm(student)"
                  class="w-20"
                >
                  <Lucide icon="Trash2" class="w-3.5 h-3.5 mr-1" />
                  {{ t('students.actions.delete') }}
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
        Showing {{ startItem }} to {{ endItem }} of {{ totalItems }} students
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
          <FormLabel htmlFor="student-name">{{ t('students.form.nameLabel') }} {{ t('students.form.required') }}</FormLabel>
          <FormInput
            id="student-name"
            v-model="formData.name"
            type="text"
            :placeholder="t('students.form.namePlaceholder')"
            :class="{ 'border-danger': formErrors.name }"
          />
          <div v-if="formErrors.name" class="mt-1 text-xs text-danger">
            {{ formErrors.name }}
          </div>
        </div>
        <div class="col-span-12">
          <FormLabel htmlFor="student-email">{{ t('students.form.emailLabel') }} {{ t('students.form.required') }}</FormLabel>
          <FormInput
            id="student-email"
            v-model="formData.email"
            type="email"
            :placeholder="t('students.form.emailPlaceholder')"
            :class="{ 'border-danger': formErrors.email }"
          />
          <div v-if="formErrors.email" class="mt-1 text-xs text-danger">
            {{ formErrors.email }}
          </div>
        </div>
        <div class="col-span-12">
          <FormLabel htmlFor="student-code">{{ t('students.form.codeLabel') }} {{ t('students.form.required') }}</FormLabel>
          <FormInput
            id="student-code"
            v-model="formData.code"
            type="text"
            :placeholder="t('students.form.codePlaceholder')"
            :class="{ 'border-danger': formErrors.code }"
          />
          <div v-if="formErrors.code" class="mt-1 text-xs text-danger">
            {{ formErrors.code }}
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
          {{ t('students.actions.cancel') }}
        </Button>
        <Button
          type="button"
          variant="primary"
          @click="handleSave"
          :disabled="isSubmitting"
          class="w-20"
        >
          <Lucide v-if="isSubmitting" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else>{{ t('students.actions.save') }}</span>
        </Button>
      </Dialog.Footer>
    </Dialog.Panel>
  </Dialog>

  <!-- Delete Confirmation Modal -->
  <Dialog :open="deleteConfirmModal" @close="cancelDelete">
    <Dialog.Panel>
      <div class="p-5 text-center">
        <Lucide icon="AlertTriangle" class="w-16 h-16 mx-auto mt-3 text-danger" />
        <div class="mt-5 text-3xl">{{ t('students.delete.confirmTitle') }}</div>
        <div class="mt-2 text-slate-500">
          {{ t('students.delete.confirmMessage') }}
          <br />
          <span class="font-medium">{{ studentToDelete?.name }}</span>
          <br />
          {{ t('students.delete.cannotUndo') }}
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
          {{ t('students.actions.cancel') }}
        </Button>
        <Button
          type="button"
          variant="danger"
          @click="handleDelete"
          :disabled="deleting"
          class="w-24"
        >
          <Lucide v-if="deleting" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else>{{ t('students.actions.delete') }}</span>
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