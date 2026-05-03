import { gql } from '@apollo/client/core'
import { useQuery, useMutation } from '@vue/apollo-composable'
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useLoading } from '@/composables/useLoading'

export interface Student { id: string; name: string }
export interface StudentAvailability { id: string; student_id: string; student: Student; day_of_week: number; start_time: string; end_time: string }
interface AvailabilitySlot { day_of_week: number | string; start_time: string; end_time: string }
interface SlotError { day_of_week?: string; start_time?: string; end_time?: string }
interface FormData { student_id: string; availabilities: AvailabilitySlot[] }

const GET_STUDENT_AVAILABILITIES = gql`
  query GetStudentAvailabilities($first: Int!, $page: Int!, $student_id: ID, $day_of_week: Int) {
    studentAvailabilities(first: $first, page: $page, student_id: $student_id, day_of_week: $day_of_week) {
      data { id student_id student { id name } day_of_week start_time end_time }
      paginatorInfo { total count currentPage lastPage hasMorePages perPage }
    }
  }
`
const GET_ALL_STUDENTS = gql`query GetAllStudents { students(first: 10000) { data { id name } } }`
const BULK_CREATE_STUDENT_AVAILABILITIES = gql`
  mutation BulkCreateStudentAvailabilities($input: BulkCreateStudentAvailabilitiesInput!) {
    bulkCreateStudentAvailabilities(input: $input) { id student_id day_of_week start_time end_time student { id name } }
  }
`
const BULK_UPDATE_STUDENT_AVAILABILITIES = gql`
  mutation BulkUpdateStudentAvailabilities($input: BulkUpdateStudentAvailabilitiesInput!) {
    bulkUpdateStudentAvailabilities(input: $input) { id student_id day_of_week start_time end_time student { id name } }
  }
`
const UPDATE_STUDENT_AVAILABILITY = gql`
  mutation UpdateStudentAvailability($id: ID!, $input: UpdateStudentAvailabilityInput!) {
    updateStudentAvailability(id: $id, input: $input) { id student_id day_of_week start_time end_time student { id name } }
  }
`
const DELETE_STUDENT_AVAILABILITY = gql`mutation DeleteStudentAvailability($id: ID!) { deleteStudentAvailability(id: $id) { id } }`

export function useStudentAvailabilities() {
  const { t } = useI18n()
  const { show: showLoading, hide: hideLoading } = useLoading()
  const route = useRoute()
  const router = useRouter()

  const availabilities = ref<StudentAvailability[]>([])
  const allStudents = ref<Student[]>([])
  const showModal = ref(false)
  const isEditMode = ref(false)
  const isSingleEditMode = ref(false)
  const editingAvailabilityId = ref<string | null>(null)
  const loadingEditAvailabilities = ref(false)
  const formData = ref<FormData>({ student_id: '', availabilities: [{ day_of_week: '', start_time: '', end_time: '' }] })
  const formErrors = ref<{ student_id?: string; availabilities?: SlotError[] }>({})
  const deleteConfirmModal = ref(false)
  const availabilityToDelete = ref<StudentAvailability | null>(null)
  const showToast = ref(false)
  const toastMessage = ref('')
  const toastType = ref<'success' | 'error' | 'info' | 'warning'>('success')

  const currentPage = ref(Number(route.query.page) || 1)
  const perPage = ref(10)
  const totalItems = ref(0)
  const lastPage = ref(1)

  const filterStudentId = ref((route.query.student as string) || '')
  const filterDayOfWeek = ref<string>((route.query.day as string) || '')

  const queryVars = () => ({
    first: perPage.value, page: currentPage.value,
    student_id: filterStudentId.value || undefined,
    day_of_week: filterDayOfWeek.value ? Number(filterDayOfWeek.value) : undefined,
  })

  const { result, loading, error, refetch } = useQuery(GET_STUDENT_AVAILABILITIES, queryVars, { fetchPolicy: 'cache-and-network' })
  const { result: studentsResult } = useQuery(GET_ALL_STUDENTS)
  const { mutate: bulkCreateAvailabilities, loading: creating } = useMutation(BULK_CREATE_STUDENT_AVAILABILITIES)
  const { mutate: bulkUpdateAvailabilities, loading: updating } = useMutation(BULK_UPDATE_STUDENT_AVAILABILITIES)
  const { mutate: updateSingleAvailability, loading: updatingSingle } = useMutation(UPDATE_STUDENT_AVAILABILITY)
  const { mutate: deleteAvailability, loading: deleting } = useMutation(DELETE_STUDENT_AVAILABILITY)

  const isSubmitting = computed(() => creating.value || updating.value || updatingSingle.value)
  const modalTitle = computed(() => {
    if (isSingleEditMode.value) return t('studentAvailabilities.form.editSingleTitle')
    if (isEditMode.value) {
      const name = allStudents.value.find(s => s.id === formData.value.student_id)?.name || ''
      return t('studentAvailabilities.form.editTitle', { student: name })
    }
    return t('studentAvailabilities.form.addTitle')
  })
  const startItem = computed(() => totalItems.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1)
  const endItem = computed(() => Math.min(currentPage.value * perPage.value, totalItems.value))
  const totalPages = computed(() => lastPage.value)
  const hasActiveFilters = computed(() => filterStudentId.value !== '' || filterDayOfWeek.value !== '')
  const dayOptions = computed(() => [
    { value: 0, label: t('studentAvailabilities.days.sunday') },
    { value: 1, label: t('studentAvailabilities.days.monday') },
    { value: 2, label: t('studentAvailabilities.days.tuesday') },
    { value: 3, label: t('studentAvailabilities.days.wednesday') },
    { value: 4, label: t('studentAvailabilities.days.thursday') },
    { value: 5, label: t('studentAvailabilities.days.friday') },
    { value: 6, label: t('studentAvailabilities.days.saturday') },
  ])

  watch(
    () => loading.value || creating.value || updating.value || updatingSingle.value || deleting.value || loadingEditAvailabilities.value,
    (isActive) => isActive ? showLoading() : hideLoading(),
    { immediate: true }
  )
  watch(
    () => ({ student: filterStudentId.value, day: filterDayOfWeek.value, page: currentPage.value }),
    (v) => {
      const q: Record<string, string> = {}
      if (v.student) q.student = v.student
      if (v.day) q.day = v.day
      if (v.page > 1) q.page = String(v.page)
      void router.replace({ query: q })
    }
  )
  watch(result, (val) => {
    if (val?.studentAvailabilities?.data) availabilities.value = val.studentAvailabilities.data
    if (val?.studentAvailabilities?.paginatorInfo) {
      const info = val.studentAvailabilities.paginatorInfo
      totalItems.value = info.total; lastPage.value = info.lastPage; currentPage.value = info.currentPage
    }
  })
  watch(studentsResult, (val) => {
    if (val?.students?.data) allStudents.value = [...val.students.data].sort((a, b) => a.name.localeCompare(b.name))
  }, { immediate: true })
  watch(filterStudentId, () => applyFilters())
  watch(filterDayOfWeek, () => applyFilters())

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    toastMessage.value = message; toastType.value = type; showToast.value = true
  }
  const handleToastClose = () => { showToast.value = false }

  const getDayName = (day: number): string => {
    const days = [
      t('studentAvailabilities.days.sunday'), t('studentAvailabilities.days.monday'),
      t('studentAvailabilities.days.tuesday'), t('studentAvailabilities.days.wednesday'),
      t('studentAvailabilities.days.thursday'), t('studentAvailabilities.days.friday'),
      t('studentAvailabilities.days.saturday'),
    ]
    return days[day] || ''
  }

  const addSlot = () => {
    const last = formData.value.availabilities.at(-1)
    formData.value.availabilities.push(last
      ? { day_of_week: last.day_of_week, start_time: last.start_time, end_time: last.end_time }
      : { day_of_week: '', start_time: '', end_time: '' }
    )
  }

  const removeSlot = (index: number) => {
    if (formData.value.availabilities.length > 1) {
      formData.value.availabilities.splice(index, 1)
      formErrors.value.availabilities?.splice(index, 1)
    }
  }

  const validateForm = (): boolean => {
    formErrors.value = { availabilities: [] }
    if (!formData.value.student_id) formErrors.value.student_id = t('studentAvailabilities.validation.studentRequired')
    if (formData.value.availabilities.length === 0) { notify(t('studentAvailabilities.validation.atLeastOneSlot'), 'error'); return false }
    let hasErrors = false
    formData.value.availabilities.forEach((slot, index) => {
      const slotErrors: SlotError = {}
      if (slot.day_of_week === '') { slotErrors.day_of_week = t('studentAvailabilities.validation.dayRequired'); hasErrors = true }
      if (!slot.start_time?.trim()) { slotErrors.start_time = t('studentAvailabilities.validation.startTimeRequired'); hasErrors = true }
      if (!slot.end_time?.trim()) { slotErrors.end_time = t('studentAvailabilities.validation.endTimeRequired'); hasErrors = true }
      if (slot.start_time && slot.end_time && slot.end_time <= slot.start_time) { slotErrors.end_time = t('studentAvailabilities.validation.endTimeAfterStart'); hasErrors = true }
      if (Object.keys(slotErrors).length > 0) {
        if (!formErrors.value.availabilities) formErrors.value.availabilities = []
        formErrors.value.availabilities[index] = slotErrors
      }
    })
    return !hasErrors && !formErrors.value.student_id
  }

  const openCreateModal = () => {
    isEditMode.value = false; isSingleEditMode.value = false
    formData.value = { student_id: '', availabilities: [{ day_of_week: '', start_time: '', end_time: '' }] }
    formErrors.value = {}; showModal.value = true
  }

  const openSingleEditModal = (availability: StudentAvailability) => {
    isEditMode.value = false; isSingleEditMode.value = true
    editingAvailabilityId.value = availability.id
    formData.value = { student_id: availability.student_id, availabilities: [{ day_of_week: availability.day_of_week, start_time: availability.start_time, end_time: availability.end_time }] }
    formErrors.value = {}; showModal.value = true
  }

  const openEditModal = async (availability: StudentAvailability) => {
    isEditMode.value = true; isSingleEditMode.value = false
    const studentId = availability.student_id
    filterStudentId.value = studentId
    formData.value = { student_id: studentId, availabilities: [] }
    formErrors.value = {}; showModal.value = true; loadingEditAvailabilities.value = true
    try {
      const res = await refetch({ first: 1000, page: 1, student_id: studentId })
      const data = res?.data?.studentAvailabilities?.data
      formData.value.availabilities = data?.length
        ? data.map((a: any) => ({ day_of_week: a.day_of_week, start_time: a.start_time, end_time: a.end_time }))
        : [{ day_of_week: '', start_time: '', end_time: '' }]
    } catch {
      notify(t('studentAvailabilities.messages.loadError') || 'Error loading availabilities', 'error')
      formData.value.availabilities = [{ day_of_week: '', start_time: '', end_time: '' }]
    } finally { loadingEditAvailabilities.value = false }
  }

  const closeModal = () => {
    showModal.value = false; isEditMode.value = false; isSingleEditMode.value = false
    editingAvailabilityId.value = null
    formData.value = { student_id: '', availabilities: [{ day_of_week: '', start_time: '', end_time: '' }] }
    formErrors.value = {}
  }

  const handleSave = async () => {
    if (!validateForm()) return
    try {
      if (isSingleEditMode.value) {
        const slot = formData.value.availabilities[0]
        await updateSingleAvailability({ id: editingAvailabilityId.value, input: { student_id: formData.value.student_id, day_of_week: Number(slot.day_of_week), start_time: slot.start_time, end_time: slot.end_time } })
        notify(t('studentAvailabilities.messages.updateSingleSuccess'))
      } else if (isEditMode.value) {
        await bulkUpdateAvailabilities({ input: { student_id: formData.value.student_id, availabilities: formData.value.availabilities.map(s => ({ day_of_week: Number(s.day_of_week), start_time: s.start_time, end_time: s.end_time })) } })
        notify(t('studentAvailabilities.messages.updateSuccess'))
      } else {
        await bulkCreateAvailabilities({ input: { student_id: formData.value.student_id, availabilities: formData.value.availabilities.map(s => ({ day_of_week: Number(s.day_of_week), start_time: s.start_time, end_time: s.end_time })) } })
        notify(t('studentAvailabilities.messages.createSuccess'))
      }
      closeModal(); applyFilters()
    } catch (err: any) {
      if (err.graphQLErrors?.[0]?.extensions?.category === 'validation') {
        const messages = Object.values(err.graphQLErrors[0].extensions.validation).flat().join(', ')
        notify(`Validation Error: ${messages}`, 'error'); return
      }
      notify(err.message || t('studentAvailabilities.messages.generalError'), 'error')
    }
  }

  const openDeleteConfirm = (a: StudentAvailability) => { availabilityToDelete.value = a; deleteConfirmModal.value = true }
  const handleDelete = async () => {
    if (!availabilityToDelete.value) return
    try {
      await deleteAvailability({ id: availabilityToDelete.value.id })
      notify(t('studentAvailabilities.messages.deleteSuccess'))
      deleteConfirmModal.value = false; availabilityToDelete.value = null; applyFilters()
    } catch (err: any) { notify(err.message || t('studentAvailabilities.messages.deleteError'), 'error') }
  }
  const cancelDelete = () => { deleteConfirmModal.value = false; availabilityToDelete.value = null }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= lastPage.value) { currentPage.value = page; refetch() }
  }
  const changePerPage = (newPerPage: number) => { perPage.value = newPerPage; currentPage.value = 1; refetch() }
  const applyFilters = () => { currentPage.value = 1; refetch() }
  const clearFilters = () => { filterStudentId.value = ''; filterDayOfWeek.value = ''; applyFilters() }
  const retryFetch = () => refetch()

  const isFirstOccurrenceOfStudent = (studentId: string, index: number): boolean => {
    const data = result.value?.studentAvailabilities?.data || []
    return index === data.findIndex((a: StudentAvailability) => a.student_id === studentId)
  }
  const isDifferentStudentFromPrevious = (studentId: string, index: number): boolean => {
    if (index === 0) return true
    return (result.value?.studentAvailabilities?.data || [])[index - 1]?.student_id !== studentId
  }
  const getStudentGroupBackground = (studentId: string): string => {
    const data = result.value?.studentAvailabilities?.data || []
    const unique = [...new Set(data.map((a: StudentAvailability) => a.student_id))]
    return unique.indexOf(studentId) % 2 === 0 ? 'bg-white dark:bg-darkmode-600' : 'bg-slate-50/50 dark:bg-darkmode-700'
  }

  return {
    t, availabilities, allStudents, showModal, isEditMode, isSingleEditMode,
    loadingEditAvailabilities, formData, formErrors, deleteConfirmModal, availabilityToDelete,
    showToast, toastMessage, toastType, currentPage, perPage, totalItems,
    filterStudentId, filterDayOfWeek, loading, error, creating, deleting,
    isSubmitting, modalTitle, startItem, endItem, totalPages, hasActiveFilters, dayOptions,
    openCreateModal, openSingleEditModal, openEditModal, closeModal,
    addSlot, removeSlot, handleSave, openDeleteConfirm, handleDelete, cancelDelete,
    goToPage, changePerPage, clearFilters, retryFetch, handleToastClose,
    getDayName, isFirstOccurrenceOfStudent, isDifferentStudentFromPrevious, getStudentGroupBackground,
  }
}
