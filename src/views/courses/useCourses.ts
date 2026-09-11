import { gql } from '@apollo/client/core'
import { useQuery, useMutation } from '@vue/apollo-composable'
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useLoading } from '@/composables/useLoading'
import { useTrackOptions } from '@/views/tracks/useTracks'

export interface Teacher { id: string; name: string; email: string }

export interface CourseLevel {
  id: string; track: { id: string; name: string }; name: string; slug: string; sort_order: number
}

export interface Course {
  id: string
  name: string
  level: string | null
  course_level_id: string
  courseLevel?: CourseLevel
  teachers?: Teacher[]
}

interface FormData { name: string; course_level_id: string }

const GET_COURSE_LEVELS = gql`
  query GetCourseLevels {
    courseLevels(first: 100, page: 1) {
      data { id track { id name } name slug sort_order }
    }
  }
`

const GET_COURSES = gql`
  query GetCourses($first: Int!, $page: Int!, $name: String, $course_level_id: ID, $track_id: ID) {
    courses(first: $first, page: $page, name: $name, course_level_id: $course_level_id, track_id: $track_id) {
      data {
        id name level course_level_id
        courseLevel { id track { id name } name slug sort_order }
        teachers { id name email }
      }
      paginatorInfo { total count currentPage lastPage hasMorePages perPage }
    }
  }
`

const CREATE_COURSE = gql`
  mutation CreateCourse($input: CreateCourseInput!) {
    createCourse(input: $input) { id name course_level_id courseLevel { id name track { id name } } }
  }
`

const UPDATE_COURSE = gql`
  mutation UpdateCourse($id: ID!, $input: UpdateCourseInput!) {
    updateCourse(id: $id, input: $input) { id name course_level_id courseLevel { id name track { id name } } }
  }
`

const DELETE_COURSE = gql`
  mutation DeleteCourse($id: ID!) { deleteCourse(id: $id) { id } }
`

export function useCourses() {
  const { t } = useI18n()
  const { show: showLoading, hide: hideLoading } = useLoading()
  const route = useRoute()
  const router = useRouter()
  const { trackOptions } = useTrackOptions()

  // ── State ──────────────────────────────────────────────────────────────────
  const courses = ref<Course[]>([])
  const courseLevels = ref<CourseLevel[]>([])
  const showModal = ref(false)
  const selectedCourse = ref<Course | null>(null)
  const formData = ref<FormData>({ name: '', course_level_id: '' })
  const formState = ref({ selectedTrackId: '' })
  const formErrors = ref<{ name?: string; course_level_id?: string }>({})
  const deleteConfirmModal = ref(false)
  const courseToDelete = ref<Course | null>(null)
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
  const filterTrackId = ref((route.query.track_id as string) || '')
  const filterCourseLevel = ref((route.query.level as string) || '')
  let filterTimeout: ReturnType<typeof setTimeout> | null = null

  // ── Apollo ─────────────────────────────────────────────────────────────────
  const queryVars = () => ({
    first: perPage.value,
    page: currentPage.value,
    name: filterName.value ? `%${filterName.value}%` : undefined,
    course_level_id: filterCourseLevel.value || undefined,
    track_id: filterTrackId.value || undefined,
  })

  const { result: courseLevelsResult } = useQuery(GET_COURSE_LEVELS, {}, { fetchPolicy: 'cache-and-network' })
  const { result, loading, error, refetch } = useQuery(GET_COURSES, queryVars(), { fetchPolicy: 'cache-and-network' })
  const { mutate: createCourse, loading: creating } = useMutation(CREATE_COURSE)
  const { mutate: updateCourse, loading: updating } = useMutation(UPDATE_COURSE)
  const { mutate: deleteCourse, loading: deleting } = useMutation(DELETE_COURSE)

  // ── Computed ───────────────────────────────────────────────────────────────
  const isSubmitting = computed(() => creating.value || updating.value)
  const modalTitle = computed(() => selectedCourse.value ? t('courses.editCourse') : t('courses.newCourse'))
  const startItem = computed(() => totalItems.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1)
  const endItem = computed(() => Math.min(currentPage.value * perPage.value, totalItems.value))
  const totalPages = computed(() => lastPage.value)
  const hasActiveFilters = computed(() =>
    filterName.value.trim() !== '' || filterTrackId.value.trim() !== '' || filterCourseLevel.value.trim() !== ''
  )
  const filteredCourseLevels = computed(() =>
    formState.value.selectedTrackId
      ? courseLevels.value.filter(l => l.track.id === formState.value.selectedTrackId).sort((a, b) => a.sort_order - b.sort_order)
      : []
  )
  const filteredCourseLevelsForFilter = computed(() =>
    filterTrackId.value
      ? courseLevels.value.filter(l => l.track.id === filterTrackId.value).sort((a, b) => a.sort_order - b.sort_order)
      : []
  )

  // ── Watchers ───────────────────────────────────────────────────────────────
  watch(
    () => loading.value || creating.value || updating.value || deleting.value,
    (isActive) => isActive ? showLoading() : hideLoading(),
    { immediate: true }
  )

  watch(
    () => ({ name: filterName.value, track_id: filterTrackId.value, level: filterCourseLevel.value, page: currentPage.value }),
    (v) => {
      const q: Record<string, string> = {}
      if (v.name) q.name = v.name
      if (v.track_id) q.track_id = v.track_id
      if (v.level) q.level = v.level
      if (v.page > 1) q.page = String(v.page)
      void router.replace({ query: q })
    }
  )

  watch(courseLevelsResult, (val) => {
    if (val?.courseLevels?.data) courseLevels.value = val.courseLevels.data
  })

  watch(result, (val) => {
    if (val?.courses?.data) courses.value = val.courses.data
    if (val?.courses?.paginatorInfo) {
      const info = val.courses.paginatorInfo
      totalItems.value = info.total
      lastPage.value = info.lastPage
      currentPage.value = info.currentPage
    }
  })

  watch([filterName, filterTrackId, filterCourseLevel], () => {
    if (filterTimeout) clearTimeout(filterTimeout)
    filterTimeout = setTimeout(applyFilters, 500)
  })

  // ── Notification ───────────────────────────────────────────────────────────
  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    toastMessage.value = message; toastType.value = type; showToast.value = true
  }
  const handleToastClose = () => { showToast.value = false }

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    formErrors.value = {}
    if (!formData.value.name.trim()) formErrors.value.name = t('courses.validation.nameRequired')
    if (!formData.value.course_level_id) formErrors.value.course_level_id = t('courses.validation.courseLevelRequired')
    return Object.keys(formErrors.value).length === 0
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  const openCreateModal = () => {
    selectedCourse.value = null
    formData.value = { name: '', course_level_id: '' }
    formState.value = { selectedTrackId: '' }
    formErrors.value = {}
    showModal.value = true
  }

  const openEditModal = (course: Course) => {
    selectedCourse.value = course
    formData.value = { name: course.name, course_level_id: course.course_level_id || '' }
    formState.value = { selectedTrackId: course.courseLevel?.track.id || '' }
    formErrors.value = {}
    showModal.value = true
  }

  const closeModal = () => {
    showModal.value = false
    selectedCourse.value = null
    formData.value = { name: '', course_level_id: '' }
    formState.value = { selectedTrackId: '' }
    formErrors.value = {}
  }

  const handleTrackChange = () => { formData.value.course_level_id = '' }
  const handleFilterTrackChange = () => { filterCourseLevel.value = '' }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validateForm()) return
    try {
      const input = { name: formData.value.name, course_level_id: formData.value.course_level_id }
      if (selectedCourse.value) {
        await updateCourse({ id: selectedCourse.value.id, input })
        notify(t('courses.messages.updateSuccess'))
      } else {
        await createCourse({ input })
        notify(t('courses.messages.createSuccess'))
      }
      closeModal()
      applyFilters()
    } catch (err: any) {
      notify(err.message || t('courses.messages.generalError'), 'error')
    }
  }

  const openDeleteConfirm = (course: Course) => {
    courseToDelete.value = course; deleteConfirmModal.value = true
  }

  const handleDelete = async () => {
    if (!courseToDelete.value) return
    try {
      await deleteCourse({ id: courseToDelete.value.id })
      notify(t('courses.messages.deleteSuccess'))
      deleteConfirmModal.value = false
      courseToDelete.value = null
      applyFilters()
    } catch (err: any) {
      notify(err.message || t('courses.messages.deleteError'), 'error')
    }
  }

  const cancelDelete = () => { deleteConfirmModal.value = false; courseToDelete.value = null }

  // ── Pagination ─────────────────────────────────────────────────────────────
  const goToPage = (page: number) => {
    if (page >= 1 && page <= lastPage.value) {
      currentPage.value = page
      refetch(queryVars())
    }
  }

  const changePerPage = (newPerPage: number) => {
    perPage.value = newPerPage
    currentPage.value = 1
    refetch(queryVars())
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  const applyFilters = () => { currentPage.value = 1; refetch(queryVars()) }

  const clearFilters = () => {
    filterName.value = ''; filterTrackId.value = ''; filterCourseLevel.value = ''
    applyFilters()
  }

  const retryFetch = () => refetch()

  return {
    t, courses, showModal, selectedCourse, formData, formState, formErrors,
    deleteConfirmModal, courseToDelete, showToast, toastMessage, toastType,
    currentPage, perPage, totalItems,
    filterName, filterTrackId, filterCourseLevel,
    loading, error, creating, deleting,
    isSubmitting, modalTitle, startItem, endItem, totalPages, hasActiveFilters,
    trackOptions, filteredCourseLevels, filteredCourseLevelsForFilter,
    openCreateModal, openEditModal, closeModal,
    handleTrackChange, handleFilterTrackChange,
    handleSave, openDeleteConfirm, handleDelete, cancelDelete,
    goToPage, changePerPage, clearFilters, retryFetch, handleToastClose,
  }
}
