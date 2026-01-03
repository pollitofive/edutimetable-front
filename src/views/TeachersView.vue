<script setup lang="ts">
import { gql } from '@apollo/client/core'
import { useQuery, useMutation } from '@vue/apollo-composable'
import { ref, watch, computed } from 'vue'
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import { Dialog } from '@/components/Base/Headless'
import { FormInput, FormLabel } from '@/components/Base/Form'
import Table from '@/components/Base/Table'
import Toastify from 'toastify-js'

interface Teacher {
  id: string
  name: string
  email: string
  courses?: Array<{
    id: string
    name: string
    level: string
    year: number
  }>
}

interface FormData {
  name: string
  email: string
}

// GraphQL Queries & Mutations
const GET_TEACHERS = gql`
  query GetTeachers {
    teachers(first: 50) {
      data {
        id
        name
        email
        courses {
          id
          name
          level
          year
        }
      }
      paginatorInfo {
        total
        hasMorePages
        currentPage
      }
    }
  }
`

const CREATE_TEACHER = gql`
  mutation CreateTeacher($input: CreateTeacherInput!) {
    createTeacher(input: $input) {
      id
      name
      email
    }
  }
`

const UPDATE_TEACHER = gql`
  mutation UpdateTeacher($id: ID!, $input: UpdateTeacherInput!) {
    updateTeacher(id: $id, input: $input) {
      id
      name
      email
    }
  }
`

const DELETE_TEACHER = gql`
  mutation DeleteTeacher($id: ID!) {
    deleteTeacher(id: $id) {
      id
    }
  }
`

// State
const teachers = ref<Teacher[]>([])
const showModal = ref(false)
const selectedTeacher = ref<Teacher | null>(null)
const formData = ref<FormData>({ name: '', email: '' })
const formErrors = ref<{ name?: string; email?: string }>({})
const deleteConfirmModal = ref(false)
const teacherToDelete = ref<Teacher | null>(null)

// Apollo Query
const { result, loading, error, refetch } = useQuery(GET_TEACHERS)

// Apollo Mutations
const { mutate: createTeacher, loading: creating } = useMutation(CREATE_TEACHER)
const { mutate: updateTeacher, loading: updating } = useMutation(UPDATE_TEACHER)
const { mutate: deleteTeacher, loading: deleting } = useMutation(DELETE_TEACHER)

// Computed
const isSubmitting = computed(() => creating.value || updating.value)
const modalTitle = computed(() => selectedTeacher.value ? 'Edit Teacher' : 'New Teacher')

// Watch for query results
watch(result, (newValue) => {
  if (newValue?.teachers?.data) {
    teachers.value = newValue.teachers.data
  }
})

// Notification helper
const notify = (message: string, type: 'success' | 'error' = 'success') => {
  Toastify({
    text: message,
    duration: 3000,
    gravity: 'top',
    position: 'right',
    backgroundColor: type === 'success' ? '#10b981' : '#ef4444',
  }).showToast()
}

// Form validation
const validateForm = (): boolean => {
  formErrors.value = {}

  if (!formData.value.name.trim()) {
    formErrors.value.name = 'Name is required'
  }

  if (!formData.value.email.trim()) {
    formErrors.value.email = 'Email is required'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) {
    formErrors.value.email = 'Invalid email format'
  }

  return Object.keys(formErrors.value).length === 0
}

// Methods
const openCreateModal = () => {
  selectedTeacher.value = null
  formData.value = { name: '', email: '' }
  formErrors.value = {}
  showModal.value = true
}

const openEditModal = (teacher: Teacher) => {
  selectedTeacher.value = teacher
  formData.value = { name: teacher.name, email: teacher.email }
  formErrors.value = {}
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedTeacher.value = null
  formData.value = { name: '', email: '' }
  formErrors.value = {}
}

const handleSave = async () => {
  if (!validateForm()) {
    return
  }

  try {
    if (selectedTeacher.value) {
      // Update
      await updateTeacher({
        id: selectedTeacher.value.id,
        input: formData.value
      })
      notify('Teacher updated successfully', 'success')
    } else {
      // Create
      await createTeacher({ input: formData.value })
      notify('Teacher created successfully', 'success')
    }

    closeModal()
    refetch()
  } catch (err: any) {
    const errorMessage = err.message || 'An error occurred'
    notify(errorMessage, 'error')
    console.error('Error saving teacher:', err)
  }
}

const openDeleteConfirm = (teacher: Teacher) => {
  teacherToDelete.value = teacher
  deleteConfirmModal.value = true
}

const handleDelete = async () => {
  if (!teacherToDelete.value) return

  try {
    await deleteTeacher({ id: teacherToDelete.value.id })
    notify('Teacher deleted successfully', 'success')
    deleteConfirmModal.value = false
    teacherToDelete.value = null
    refetch()
  } catch (err: any) {
    const errorMessage = err.message || 'Error deleting teacher'
    notify(errorMessage, 'error')
    console.error('Error deleting teacher:', err)
  }
}

const cancelDelete = () => {
  deleteConfirmModal.value = false
  teacherToDelete.value = null
}
</script>

<template>
  <div class="flex flex-col gap-y-3 md:h-10 md:flex-row md:items-center">
    <div class="text-base font-medium">Teacher Management</div>
    <div class="flex flex-col gap-x-3 gap-y-2 sm:flex-row md:ml-auto">
      <Button variant="primary" @click="openCreateModal">
        <Lucide icon="Plus" class="w-4 h-4 mr-2" />
        New Teacher
      </Button>
    </div>
  </div>

  <div class="box box--stacked flex flex-col mt-5">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center p-10">
      <div class="flex flex-col items-center gap-3">
        <Lucide icon="Loader" class="w-8 h-8 animate-spin text-primary" />
        <div class="text-sm text-slate-500">Loading teachers...</div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center p-10">
      <div class="flex flex-col items-center gap-3">
        <Lucide icon="AlertCircle" class="w-8 h-8 text-danger" />
        <div class="text-sm text-slate-500">Error loading teachers</div>
        <Button variant="outline-primary" @click="() => refetch()">Retry</Button>
      </div>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <Table class="border-b border-slate-200/60">
        <Table.Thead>
          <Table.Tr>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              ID
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              Name
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              Email
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              Courses
            </Table.Td>
            <Table.Td class="py-4 font-medium text-center bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              Actions
            </Table.Td>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr v-if="teachers.length === 0">
            <Table.Td colspan="5" class="py-10 text-center text-slate-500">
              <div class="flex flex-col items-center gap-3">
                <Lucide icon="Inbox" class="w-10 h-10 text-slate-300" />
                <div>No teachers found. Create your first teacher!</div>
              </div>
            </Table.Td>
          </Table.Tr>
          <Table.Tr v-for="teacher in teachers" :key="teacher.id" class="[&_td]:last:border-b-0">
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              {{ teacher.id }}
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="font-medium">{{ teacher.name }}</div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="text-slate-500">{{ teacher.email }}</div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div v-if="teacher.courses && teacher.courses.length > 0" class="flex flex-wrap gap-1">
                <span
                  v-for="course in teacher.courses.slice(0, 3)"
                  :key="course.id"
                  class="px-2 py-0.5 text-xs rounded-md bg-primary/10 text-primary"
                >
                  {{ course.name }}
                </span>
                <span
                  v-if="teacher.courses.length > 3"
                  class="px-2 py-0.5 text-xs rounded-md bg-slate-100 text-slate-500"
                >
                  +{{ teacher.courses.length - 3 }} more
                </span>
              </div>
              <div v-else class="text-xs text-slate-400">No courses</div>
            </Table.Td>
            <Table.Td class="relative py-4 border-dashed dark:bg-darkmode-600">
              <div class="flex items-center justify-center gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  @click="openEditModal(teacher)"
                  class="w-20"
                >
                  <Lucide icon="Edit" class="w-3.5 h-3.5 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  @click="openDeleteConfirm(teacher)"
                  class="w-20"
                >
                  <Lucide icon="Trash2" class="w-3.5 h-3.5 mr-1" />
                  Delete
                </Button>
              </div>
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
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
          <FormLabel htmlFor="teacher-name">Name *</FormLabel>
          <FormInput
            id="teacher-name"
            v-model="formData.name"
            type="text"
            placeholder="Enter teacher name"
            :class="{ 'border-danger': formErrors.name }"
          />
          <div v-if="formErrors.name" class="mt-1 text-xs text-danger">
            {{ formErrors.name }}
          </div>
        </div>
        <div class="col-span-12">
          <FormLabel htmlFor="teacher-email">Email *</FormLabel>
          <FormInput
            id="teacher-email"
            v-model="formData.email"
            type="email"
            placeholder="Enter teacher email"
            :class="{ 'border-danger': formErrors.email }"
          />
          <div v-if="formErrors.email" class="mt-1 text-xs text-danger">
            {{ formErrors.email }}
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
          Cancel
        </Button>
        <Button
          type="button"
          variant="primary"
          @click="handleSave"
          :disabled="isSubmitting"
          class="w-20"
        >
          <Lucide v-if="isSubmitting" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else>Save</span>
        </Button>
      </Dialog.Footer>
    </Dialog.Panel>
  </Dialog>

  <!-- Delete Confirmation Modal -->
  <Dialog :open="deleteConfirmModal" @close="cancelDelete">
    <Dialog.Panel>
      <div class="p-5 text-center">
        <Lucide icon="AlertTriangle" class="w-16 h-16 mx-auto mt-3 text-danger" />
        <div class="mt-5 text-3xl">Are you sure?</div>
        <div class="mt-2 text-slate-500">
          Do you really want to delete this teacher?
          <br />
          <span class="font-medium">{{ teacherToDelete?.name }}</span>
          <br />
          This process cannot be undone.
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
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          @click="handleDelete"
          :disabled="deleting"
          class="w-24"
        >
          <Lucide v-if="deleting" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else>Delete</span>
        </Button>
      </div>
    </Dialog.Panel>
  </Dialog>
</template>

<style scoped>
/* Add any custom styles here if needed */
</style>