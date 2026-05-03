import { gql } from '@apollo/client/core'
import { useQuery, useMutation } from '@vue/apollo-composable'
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useLoading } from '@/composables/useLoading'

export interface CourseLevel {
  id: string
  track: string
  name: string
  slug: string
  sort_order: number
  next_level_id: string | null
  texts: string | null
  nextLevel?: { id: string; name: string } | null
}

interface FormData {
  track: string
  name: string
  slug: string
  sort_order: number | null
  next_level_id: string | null
  texts: string | null
}

const GET_COURSE_LEVELS = gql`
  query GetCourseLevels($first: Int!, $page: Int!, $track: String, $name: String, $sort_order: Int) {
    courseLevels(first: $first, page: $page, track: $track, name: $name, sort_order: $sort_order) {
      data {
        id
        track
        name
        slug
        sort_order
        next_level_id
        texts
        nextLevel { id name }
      }
      paginatorInfo { total count currentPage lastPage hasMorePages perPage }
    }
  }
`

const CREATE_COURSE_LEVEL = gql`
  mutation CreateCourseLevel($input: CreateCourseLevelInput!) {
    createCourseLevel(input: $input) { id track name slug sort_order next_level_id texts }
  }
`

const UPDATE_COURSE_LEVEL = gql`
  mutation UpdateCourseLevel($id: ID!, $input: UpdateCourseLevelInput!) {
    updateCourseLevel(id: $id, input: $input) { id track name slug sort_order next_level_id texts }
  }
`

const DELETE_COURSE_LEVEL = gql`
  mutation DeleteCourseLevel($id: ID!) {
    deleteCourseLevel(id: $id) { id }
  }
`

export function useCourseLevels() {
  const { t } = useI18n()
  const { show: showLoading, hide: hideLoading } = useLoading()
  const route = useRoute()
  const router = useRouter()

  // ── State ──────────────────────────────────────────────────────────────────
  const courseLevels = ref<CourseLevel[]>([])
  const showModal = ref(false)
  const selectedCourseLevel = ref<CourseLevel | null>(null)
  const formData = ref<FormData>({ track: '', name: '', slug: '', sort_order: null, next_level_id: null, texts: null })
  const formErrors = ref<{ track?: string; name?: string; slug?: string; sort_order?: string }>({})
  const deleteConfirmModal = ref(false)
  const levelToDelete = ref<CourseLevel | null>(null)
  const slugEditState = ref({ isEditable: false })
  const trackState = ref({ isCustom: false, customValue: '' })
  const showToast = ref(false)
  const toastMessage = ref('')
  const toastType = ref<'success' | 'error' | 'info' | 'warning'>('success')

  // ── Pagination ─────────────────────────────────────────────────────────────
  const currentPage = ref(Number(route.query.page) || 1)
  const perPage = ref(10)
  const totalItems = ref(0)
  const lastPage = ref(1)

  // ── Filters ────────────────────────────────────────────────────────────────
  const filterTrack = ref((route.query.track as string) || '')
  const filterName = ref((route.query.name as string) || '')
  const filterSortOrder = ref((route.query.sort_order as string) || '')
  let filterTimeout: ReturnType<typeof setTimeout> | null = null

  // ── Apollo ─────────────────────────────────────────────────────────────────
  const queryVars = () => ({
    first: perPage.value,
    page: currentPage.value,
    track: filterTrack.value || undefined,
    name: filterName.value ? `%${filterName.value}%` : undefined,
    sort_order: filterSortOrder.value ? parseInt(filterSortOrder.value) : undefined,
  })

  const { result, loading, error, refetch } = useQuery(GET_COURSE_LEVELS, queryVars, { fetchPolicy: 'cache-and-network' })
  const { mutate: createCourseLevel, loading: creating } = useMutation(CREATE_COURSE_LEVEL)
  const { mutate: updateCourseLevel, loading: updating } = useMutation(UPDATE_COURSE_LEVEL)
  const { mutate: deleteCourseLevel, loading: deleting } = useMutation(DELETE_COURSE_LEVEL)

  // ── Computed ───────────────────────────────────────────────────────────────
  const isSubmitting = computed(() => creating.value || updating.value)
  const modalTitle = computed(() => selectedCourseLevel.value ? t('courseLevels.editLevel') : t('courseLevels.newLevel'))
  const startItem = computed(() => totalItems.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1)
  const endItem = computed(() => Math.min(currentPage.value * perPage.value, totalItems.value))
  const totalPages = computed(() => lastPage.value)
  const hasActiveFilters = computed(() =>
    filterTrack.value.trim() !== '' || filterName.value.trim() !== '' || filterSortOrder.value.trim() !== ''
  )
  const availableNextLevels = computed(() =>
    selectedCourseLevel.value
      ? courseLevels.value.filter(l => l.id !== selectedCourseLevel.value?.id)
      : courseLevels.value
  )
  const uniqueTracks = computed(() => [...new Set(courseLevels.value.map(l => l.track))].sort())
  const uniqueSortOrders = computed(() => [...new Set(courseLevels.value.map(l => l.sort_order))].sort((a, b) => a - b))
  const selectedTrackValue = computed(() => trackState.value.isCustom ? '__custom__' : formData.value.track)

  // ── Watchers ───────────────────────────────────────────────────────────────
  watch(
    () => loading.value || creating.value || updating.value || deleting.value,
    (isActive) => isActive ? showLoading() : hideLoading(),
    { immediate: true }
  )

  watch(
    () => ({ track: filterTrack.value, name: filterName.value, sort_order: filterSortOrder.value, page: currentPage.value }),
    (v) => {
      const q: Record<string, string> = {}
      if (v.track) q.track = v.track
      if (v.name) q.name = v.name
      if (v.sort_order) q.sort_order = v.sort_order
      if (v.page > 1) q.page = String(v.page)
      void router.replace({ query: q })
    }
  )

  watch(result, (val) => {
    if (val?.courseLevels?.data) courseLevels.value = val.courseLevels.data
    if (val?.courseLevels?.paginatorInfo) {
      const info = val.courseLevels.paginatorInfo
      totalItems.value = info.total
      lastPage.value = info.lastPage
      currentPage.value = info.currentPage
    }
  })

  watch(() => formData.value.name, (newName) => {
    if (!slugEditState.value.isEditable)
      formData.value.slug = newName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  })

  watch([filterTrack, filterName, filterSortOrder], () => {
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
    if (!formData.value.track.trim()) formErrors.value.track = t('courseLevels.validation.trackRequired')
    if (!formData.value.name.trim()) formErrors.value.name = t('courseLevels.validation.nameRequired')
    if (!formData.value.slug.trim()) formErrors.value.slug = t('courseLevels.validation.slugRequired')
    if (formData.value.sort_order === null || formData.value.sort_order === undefined)
      formErrors.value.sort_order = t('courseLevels.validation.sortOrderRequired')
    else if (isNaN(Number(formData.value.sort_order)))
      formErrors.value.sort_order = t('courseLevels.validation.sortOrderNumeric')
    return Object.keys(formErrors.value).length === 0
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  const resetForm = () => {
    formData.value = { track: '', name: '', slug: '', sort_order: null, next_level_id: null, texts: null }
    formErrors.value = {}
    slugEditState.value.isEditable = false
    trackState.value = { isCustom: false, customValue: '' }
  }

  const openCreateModal = () => {
    selectedCourseLevel.value = null
    resetForm()
    showModal.value = true
  }

  const openEditModal = (level: CourseLevel) => {
    selectedCourseLevel.value = level
    formData.value = { track: level.track, name: level.name, slug: level.slug, sort_order: level.sort_order, next_level_id: level.next_level_id, texts: level.texts ?? null }
    formErrors.value = {}
    slugEditState.value.isEditable = false
    trackState.value = uniqueTracks.value.includes(level.track)
      ? { isCustom: false, customValue: '' }
      : { isCustom: true, customValue: level.track }
    showModal.value = true
  }

  const closeModal = () => {
    showModal.value = false
    selectedCourseLevel.value = null
    resetForm()
  }

  // ── Track helpers ──────────────────────────────────────────────────────────
  const handleTrackChange = (event: Event) => {
    const value = (event.target as HTMLSelectElement).value
    if (value === '__custom__') {
      trackState.value.isCustom = true
      formData.value.track = trackState.value.customValue
    } else {
      trackState.value = { isCustom: false, customValue: '' }
      formData.value.track = value
    }
  }

  const handleCustomTrackInput = (event: Event) => {
    const value = (event.target as HTMLInputElement).value
    trackState.value.customValue = value
    formData.value.track = value
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validateForm()) return
    try {
      const input = {
        track: formData.value.track.trim(),
        name: formData.value.name.trim(),
        slug: formData.value.slug.trim(),
        sort_order: Number(formData.value.sort_order),
        next_level_id: formData.value.next_level_id || null,
        texts: formData.value.texts?.trim() || null,
      }
      if (selectedCourseLevel.value) {
        await updateCourseLevel({ id: selectedCourseLevel.value.id, input })
        notify(t('courseLevels.messages.updateSuccess'))
      } else {
        await createCourseLevel({ input })
        notify(t('courseLevels.messages.createSuccess'))
      }
      closeModal()
      applyFilters()
    } catch (err: any) {
      notify(err.message || t('courseLevels.messages.generalError'), 'error')
    }
  }

  const openDeleteConfirm = (level: CourseLevel) => {
    levelToDelete.value = level
    deleteConfirmModal.value = true
  }

  const handleDelete = async () => {
    if (!levelToDelete.value) return
    try {
      await deleteCourseLevel({ id: levelToDelete.value.id })
      notify(t('courseLevels.messages.deleteSuccess'))
      deleteConfirmModal.value = false
      levelToDelete.value = null
      applyFilters()
    } catch (err: any) {
      notify(err.message || t('courseLevels.messages.deleteError'), 'error')
    }
  }

  const cancelDelete = () => {
    deleteConfirmModal.value = false
    levelToDelete.value = null
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
    filterTrack.value = ''
    filterName.value = ''
    filterSortOrder.value = ''
    applyFilters()
  }

  const retryFetch = () => refetch()

  return {
    t,
    courseLevels, showModal, selectedCourseLevel, formData, formErrors,
    deleteConfirmModal, levelToDelete, slugEditState, trackState,
    showToast, toastMessage, toastType,
    currentPage, perPage, totalItems,
    filterTrack, filterName, filterSortOrder,
    loading, error, creating, deleting, refetch,
    isSubmitting, modalTitle, startItem, endItem, totalPages, hasActiveFilters,
    availableNextLevels, uniqueTracks, uniqueSortOrders, selectedTrackValue,
    openCreateModal, openEditModal, closeModal,
    handleTrackChange, handleCustomTrackInput,
    handleSave, openDeleteConfirm, handleDelete, cancelDelete,
    goToPage, changePerPage, clearFilters, retryFetch,
    handleToastClose,
  }
}
