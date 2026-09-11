import { gql } from '@apollo/client/core'
import { useQuery, useMutation } from '@vue/apollo-composable'
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useLoading } from '@/composables/useLoading'
import { useTrackOptions } from '@/views/tracks/useTracks'

export interface CourseLevel { id: string; track: { id: string; name: string }; name: string; slug: string; sort_order: number }
export interface Student { id: string; name: string; email: string; phone?: string; course_level_id: string; courseLevel?: CourseLevel }
interface FormData { name: string; email: string; phone: string; course_level_id: string }

const GET_COURSE_LEVELS = gql`
  query GetCourseLevels { courseLevels(first: 100, page: 1) { data { id track { id name } name slug sort_order } } }
`
const GET_STUDENTS = gql`
  query GetStudents($first: Int!, $page: Int!, $search: String, $course_level_id: ID, $track_id: ID) {
    students(first: $first, page: $page, search: $search, course_level_id: $course_level_id, track_id: $track_id) {
      data { id name email phone course_level_id courseLevel { id track { id name } name slug sort_order } }
      paginatorInfo { total count currentPage lastPage hasMorePages perPage }
    }
  }
`
const CREATE_STUDENT = gql`
  mutation CreateStudent($input: CreateStudentInput!) {
    createStudent(input: $input) { id name email phone course_level_id courseLevel { id name track { id name } } }
  }
`
const UPDATE_STUDENT = gql`
  mutation UpdateStudent($id: ID!, $input: UpdateStudentInput!) {
    updateStudent(id: $id, input: $input) { id name email phone course_level_id courseLevel { id name track { id name } } }
  }
`
const DELETE_STUDENT = gql`mutation DeleteStudent($id: ID!) { deleteStudent(id: $id) { id } }`

export function useStudents() {
  const { t } = useI18n()
  const { show: showLoading, hide: hideLoading } = useLoading()
  const route = useRoute()
  const router = useRouter()
  const { trackOptions } = useTrackOptions()

  const students = ref<Student[]>([])
  const courseLevels = ref<CourseLevel[]>([])
  const showModal = ref(false)
  const selectedStudent = ref<Student | null>(null)
  const formData = ref<FormData>({ name: '', email: '', phone: '', course_level_id: '' })
  const formState = ref({ selectedTrackId: '' })
  const formErrors = ref<{ name?: string; email?: string; course_level_id?: string }>({})
  const deleteConfirmModal = ref(false)
  const studentToDelete = ref<Student | null>(null)
  const showToast = ref(false)
  const toastMessage = ref('')
  const toastType = ref<'success' | 'error' | 'info' | 'warning'>('success')

  const currentPage = ref(Number(route.query.page) || 1)
  const perPage = ref(10)
  const totalItems = ref(0)
  const lastPage = ref(1)

  const filterSearch = ref((route.query.search as string) || '')
  const filterTrackId = ref((route.query.track_id as string) || '')
  const filterCourseLevel = ref((route.query.level as string) || '')
  let filterTimeout: ReturnType<typeof setTimeout> | null = null

  const queryVars = () => ({
    first: perPage.value, page: currentPage.value,
    search: filterSearch.value ? `%${filterSearch.value}%` : undefined,
    course_level_id: filterCourseLevel.value || undefined,
    track_id: filterTrackId.value || undefined,
  })

  const { result: courseLevelsResult } = useQuery(GET_COURSE_LEVELS, {}, { fetchPolicy: 'cache-and-network' })
  const { result, loading, error, refetch } = useQuery(GET_STUDENTS, queryVars(), { fetchPolicy: 'cache-and-network' })
  const { mutate: createStudent, loading: creating } = useMutation(CREATE_STUDENT)
  const { mutate: updateStudent, loading: updating } = useMutation(UPDATE_STUDENT)
  const { mutate: deleteStudent, loading: deleting } = useMutation(DELETE_STUDENT)

  const isSubmitting = computed(() => creating.value || updating.value)
  const modalTitle = computed(() => selectedStudent.value ? t('students.editStudent') : t('students.newStudent'))
  const startItem = computed(() => totalItems.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1)
  const endItem = computed(() => Math.min(currentPage.value * perPage.value, totalItems.value))
  const totalPages = computed(() => lastPage.value)
  const hasActiveFilters = computed(() => filterSearch.value.trim() !== '' || filterTrackId.value.trim() !== '' || filterCourseLevel.value.trim() !== '')
  const filteredCourseLevels = computed(() =>
    formState.value.selectedTrackId ? courseLevels.value.filter(l => l.track.id === formState.value.selectedTrackId).sort((a, b) => a.sort_order - b.sort_order) : []
  )
  const filteredCourseLevelsForFilter = computed(() =>
    filterTrackId.value ? courseLevels.value.filter(l => l.track.id === filterTrackId.value).sort((a, b) => a.sort_order - b.sort_order) : []
  )

  watch(
    () => loading.value || creating.value || updating.value || deleting.value,
    (isActive) => isActive ? showLoading() : hideLoading(),
    { immediate: true }
  )
  watch(
    () => ({ search: filterSearch.value, track_id: filterTrackId.value, level: filterCourseLevel.value, page: currentPage.value }),
    (v) => {
      const q: Record<string, string> = {}
      if (v.search) q.search = v.search
      if (v.track_id) q.track_id = v.track_id
      if (v.level) q.level = v.level
      if (v.page > 1) q.page = String(v.page)
      void router.replace({ query: q })
    }
  )
  watch(courseLevelsResult, (val) => { if (val?.courseLevels?.data) courseLevels.value = val.courseLevels.data })
  watch(result, (val) => {
    if (val?.students?.data) students.value = val.students.data
    if (val?.students?.paginatorInfo) {
      const info = val.students.paginatorInfo
      totalItems.value = info.total; lastPage.value = info.lastPage; currentPage.value = info.currentPage
    }
  })
  watch([filterSearch, filterTrackId, filterCourseLevel], () => {
    if (filterTimeout) clearTimeout(filterTimeout)
    filterTimeout = setTimeout(applyFilters, 500)
  })

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    toastMessage.value = message; toastType.value = type; showToast.value = true
  }
  const handleToastClose = () => { showToast.value = false }

  const validateForm = (): boolean => {
    formErrors.value = {}
    if (!formData.value.name.trim()) formErrors.value.name = t('students.validation.nameRequired')
    if (!formData.value.email.trim()) formErrors.value.email = t('students.validation.emailRequired')
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.value.email)) formErrors.value.email = t('students.validation.emailInvalid')
    if (!formData.value.course_level_id) formErrors.value.course_level_id = t('students.validation.courseLevelRequired')
    return Object.keys(formErrors.value).length === 0
  }

  const openCreateModal = () => {
    selectedStudent.value = null
    formData.value = { name: '', email: '', phone: '', course_level_id: '' }
    formState.value = { selectedTrackId: '' }
    formErrors.value = {}
    showModal.value = true
  }

  const openEditModal = (student: Student) => {
    selectedStudent.value = student
    formData.value = { name: student.name, email: student.email, phone: student.phone || '', course_level_id: student.course_level_id || '' }
    formState.value = { selectedTrackId: student.courseLevel?.track.id || '' }
    formErrors.value = {}
    showModal.value = true
  }

  const closeModal = () => {
    showModal.value = false; selectedStudent.value = null
    formData.value = { name: '', email: '', phone: '', course_level_id: '' }
    formState.value = { selectedTrackId: '' }; formErrors.value = {}
  }

  const handleTrackChange = () => { formData.value.course_level_id = '' }
  const handleFilterTrackChange = () => { filterCourseLevel.value = '' }

  const handleSave = async () => {
    if (!validateForm()) return
    try {
      const input = { name: formData.value.name, email: formData.value.email, phone: formData.value.phone || null, course_level_id: formData.value.course_level_id }
      if (selectedStudent.value) {
        await updateStudent({ id: selectedStudent.value.id, input })
        notify(t('students.messages.updateSuccess'))
      } else {
        await createStudent({ input })
        notify(t('students.messages.createSuccess'))
      }
      closeModal(); applyFilters()
    } catch (err: any) { notify(err.message || t('students.messages.generalError'), 'error') }
  }

  const openDeleteConfirm = (student: Student) => { studentToDelete.value = student; deleteConfirmModal.value = true }
  const handleDelete = async () => {
    if (!studentToDelete.value) return
    try {
      await deleteStudent({ id: studentToDelete.value.id })
      notify(t('students.messages.deleteSuccess'))
      deleteConfirmModal.value = false; studentToDelete.value = null; applyFilters()
    } catch (err: any) { notify(err.message || t('students.messages.deleteError'), 'error') }
  }
  const cancelDelete = () => { deleteConfirmModal.value = false; studentToDelete.value = null }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= lastPage.value) { currentPage.value = page; refetch(queryVars()) }
  }
  const changePerPage = (newPerPage: number) => {
    perPage.value = newPerPage; currentPage.value = 1; refetch(queryVars())
  }
  const applyFilters = () => { currentPage.value = 1; refetch(queryVars()) }
  const clearFilters = () => { filterSearch.value = ''; filterTrackId.value = ''; filterCourseLevel.value = ''; applyFilters() }
  const retryFetch = () => refetch()

  return {
    t, students, showModal, selectedStudent, formData, formState, formErrors,
    deleteConfirmModal, studentToDelete, showToast, toastMessage, toastType,
    currentPage, perPage, totalItems, filterSearch, filterTrackId, filterCourseLevel,
    loading, error, creating, deleting,
    isSubmitting, modalTitle, startItem, endItem, totalPages, hasActiveFilters,
    trackOptions, filteredCourseLevels, filteredCourseLevelsForFilter,
    openCreateModal, openEditModal, closeModal, handleTrackChange, handleFilterTrackChange,
    handleSave, openDeleteConfirm, handleDelete, cancelDelete,
    goToPage, changePerPage, clearFilters, retryFetch, handleToastClose,
  }
}
