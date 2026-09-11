import { gql } from '@apollo/client/core'
import { useQuery, useMutation } from '@vue/apollo-composable'
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useLoading } from '@/composables/useLoading'

export interface Teacher {
  id: string
  name: string
  email: string
  phone?: string
  courses?: Array<{
    id: string
    name: string
    courseLevel?: {
      name: string
      track: { name: string }
    }
  }>
}

interface FormData {
  name: string
  email: string
  phone: string
}

const GET_TEACHERS = gql`
  query GetTeachers($first: Int!, $page: Int!, $name: String, $email: String) {
    teachers(first: $first, page: $page, name: $name, email: $email) {
      data {
        id
        name
        email
        phone
        courses {
          id
          name
          courseLevel {
            name
            track { name }
          }
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

const CREATE_TEACHER = gql`
  mutation CreateTeacher($input: CreateTeacherInput!) {
    createTeacher(input: $input) {
      id
      name
      email
      phone
    }
  }
`

const UPDATE_TEACHER = gql`
  mutation UpdateTeacher($id: ID!, $input: UpdateTeacherInput!) {
    updateTeacher(id: $id, input: $input) {
      id
      name
      email
      phone
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

export function useTeachers() {
  const { t } = useI18n()
  const { show: showLoading, hide: hideLoading } = useLoading()
  const route = useRoute()
  const router = useRouter()

  // ── State ──────────────────────────────────────────────────────────────────
  const teachers = ref<Teacher[]>([])
  const showModal = ref(false)
  const selectedTeacher = ref<Teacher | null>(null)
  const formData = ref<FormData>({ name: '', email: '', phone: '' })
  const formErrors = ref<{ name?: string; email?: string }>({})
  const deleteConfirmModal = ref(false)
  const teacherToDelete = ref<Teacher | null>(null)
  const showToast = ref(false)
  const toastMessage = ref('')
  const toastType = ref<'success' | 'error' | 'info' | 'warning'>('success')

  // ── Pagination ─────────────────────────────────────────────────────────────
  const currentPage = ref(Number(route.query.page) || 1)
  const perPage = ref(10)
  const totalItems = ref(0)
  const lastPage = ref(1)

  // ── Filters ────────────────────────────────────────────────────────────────
  const filterName = ref((route.query.name as string) || '')
  const filterEmail = ref((route.query.email as string) || '')
  let filterTimeout: ReturnType<typeof setTimeout> | null = null

  // ── Apollo ─────────────────────────────────────────────────────────────────
  const { result, loading, error, refetch } = useQuery(GET_TEACHERS, () => ({
    first: perPage.value,
    page: currentPage.value,
    name: filterName.value ? `%${filterName.value}%` : undefined,
    email: filterEmail.value ? `%${filterEmail.value}%` : undefined,
  }), { fetchPolicy: 'cache-and-network' })

  const { mutate: createTeacher, loading: creating } = useMutation(CREATE_TEACHER)
  const { mutate: updateTeacher, loading: updating } = useMutation(UPDATE_TEACHER)
  const { mutate: deleteTeacher, loading: deleting } = useMutation(DELETE_TEACHER)

  // ── Computed ───────────────────────────────────────────────────────────────
  const isSubmitting = computed(() => creating.value || updating.value)
  const modalTitle = computed(() => selectedTeacher.value ? t('teachers.editTeacher') : t('teachers.newTeacher'))
  const startItem = computed(() => totalItems.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1)
  const endItem = computed(() => Math.min(currentPage.value * perPage.value, totalItems.value))
  const totalPages = computed(() => lastPage.value)
  const hasActiveFilters = computed(() => filterName.value.trim() !== '' || filterEmail.value.trim() !== '')

  // ── Watchers ───────────────────────────────────────────────────────────────
  watch(
    () => loading.value || creating.value || updating.value || deleting.value,
    (isActive) => isActive ? showLoading() : hideLoading(),
    { immediate: true }
  )

  watch(
    () => ({ name: filterName.value, email: filterEmail.value, page: currentPage.value }),
    (v) => {
      const q: Record<string, string> = {}
      if (v.name) q.name = v.name
      if (v.email) q.email = v.email
      if (v.page > 1) q.page = String(v.page)
      void router.replace({ query: q })
    }
  )

  watch(result, (newValue) => {
    if (newValue?.teachers?.data) teachers.value = newValue.teachers.data
    if (newValue?.teachers?.paginatorInfo) {
      const info = newValue.teachers.paginatorInfo
      totalItems.value = info.total
      lastPage.value = info.lastPage
      currentPage.value = info.currentPage
    }
  })

  watch([filterName, filterEmail], () => {
    if (filterTimeout) clearTimeout(filterTimeout)
    filterTimeout = setTimeout(applyFilters, 500)
  })

  // ── Notification ───────────────────────────────────────────────────────────
  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    toastMessage.value = message
    toastType.value = type
    showToast.value = true
  }

  const handleToastClose = () => { showToast.value = false }

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    formErrors.value = {}
    if (!formData.value.name.trim())
      formErrors.value.name = t('teachers.validation.nameRequired')
    if (!formData.value.email.trim())
      formErrors.value.email = t('teachers.validation.emailRequired')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email))
      formErrors.value.email = t('teachers.validation.emailInvalid')
    return Object.keys(formErrors.value).length === 0
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  const openCreateModal = () => {
    selectedTeacher.value = null
    formData.value = { name: '', email: '', phone: '' }
    formErrors.value = {}
    showModal.value = true
  }

  const openEditModal = (teacher: Teacher) => {
    selectedTeacher.value = teacher
    formData.value = { name: teacher.name, email: teacher.email, phone: teacher.phone || '' }
    formErrors.value = {}
    showModal.value = true
  }

  const closeModal = () => {
    showModal.value = false
    selectedTeacher.value = null
    formData.value = { name: '', email: '', phone: '' }
    formErrors.value = {}
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validateForm()) return
    try {
      const input = {
        name: formData.value.name,
        email: formData.value.email,
        phone: formData.value.phone || null,
      }
      if (selectedTeacher.value) {
        await updateTeacher({ id: selectedTeacher.value.id, input })
        notify(t('teachers.messages.updateSuccess'))
      } else {
        await createTeacher({ input })
        notify(t('teachers.messages.createSuccess'))
      }
      closeModal()
      refetch()
    } catch (err: any) {
      notify(err.message || t('teachers.messages.generalError'), 'error')
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
      notify(t('teachers.messages.deleteSuccess'))
      deleteConfirmModal.value = false
      teacherToDelete.value = null
      refetch()
    } catch (err: any) {
      notify(err.message || t('teachers.messages.deleteError'), 'error')
    }
  }

  const cancelDelete = () => {
    deleteConfirmModal.value = false
    teacherToDelete.value = null
  }

  // ── Pagination ─────────────────────────────────────────────────────────────
  const goToPage = (page: number) => {
    if (page >= 1 && page <= lastPage.value) {
      currentPage.value = page
      refetch()
    }
  }

  const changePerPage = (newPerPage: number) => {
    perPage.value = newPerPage
    currentPage.value = 1
    refetch()
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  const applyFilters = () => {
    currentPage.value = 1
    refetch()
  }

  const clearFilters = () => {
    filterName.value = ''
    filterEmail.value = ''
    applyFilters()
  }

  return {
    // state
    t, teachers, showModal, selectedTeacher, formData, formErrors,
    deleteConfirmModal, teacherToDelete, showToast, toastMessage, toastType,
    // pagination
    currentPage, perPage, totalItems,
    // filters
    filterName, filterEmail,
    // apollo
    loading, error, creating, deleting, refetch,
    // computed
    isSubmitting, modalTitle, startItem, endItem, totalPages, hasActiveFilters,
    // methods
    openCreateModal, openEditModal, closeModal, handleSave,
    openDeleteConfirm, handleDelete, cancelDelete,
    goToPage, changePerPage, clearFilters, handleToastClose,
  }
}
