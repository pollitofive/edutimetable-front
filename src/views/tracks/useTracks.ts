import { gql } from '@apollo/client/core'
import { useQuery, useMutation } from '@vue/apollo-composable'
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useLoading } from '@/composables/useLoading'

export interface Track {
  id: string
  name: string
}

interface FormData {
  name: string
}

const GET_TRACKS = gql`
  query GetTracks($first: Int!, $page: Int!, $name: String) {
    tracks(first: $first, page: $page, name: $name) {
      data { id name }
      paginatorInfo { total count currentPage lastPage hasMorePages perPage }
    }
  }
`

const CREATE_TRACK = gql`
  mutation CreateTrack($input: CreateTrackInput!) {
    createTrack(input: $input) { id name }
  }
`

const UPDATE_TRACK = gql`
  mutation UpdateTrack($id: ID!, $input: UpdateTrackInput!) {
    updateTrack(id: $id, input: $input) { id name }
  }
`

const DELETE_TRACK = gql`
  mutation DeleteTrack($id: ID!) {
    deleteTrack(id: $id) { id }
  }
`

export function useTracks() {
  const { t } = useI18n()
  const { show: showLoading, hide: hideLoading } = useLoading()
  const route = useRoute()
  const router = useRouter()

  // ── State ──────────────────────────────────────────────────────────────────
  const tracks = ref<Track[]>([])
  const showModal = ref(false)
  const selectedTrack = ref<Track | null>(null)
  const formData = ref<FormData>({ name: '' })
  const formErrors = ref<{ name?: string }>({})
  const deleteConfirmModal = ref(false)
  const trackToDelete = ref<Track | null>(null)
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
  let filterTimeout: ReturnType<typeof setTimeout> | null = null

  // ── Apollo ─────────────────────────────────────────────────────────────────
  const queryVars = () => ({
    first: perPage.value,
    page: currentPage.value,
    name: filterName.value ? `%${filterName.value}%` : undefined,
  })

  const { result, loading, error, refetch } = useQuery(GET_TRACKS, queryVars, { fetchPolicy: 'cache-and-network' })
  const { mutate: createTrack, loading: creating } = useMutation(CREATE_TRACK)
  const { mutate: updateTrack, loading: updating } = useMutation(UPDATE_TRACK)
  const { mutate: deleteTrack, loading: deleting } = useMutation(DELETE_TRACK)

  // ── Computed ───────────────────────────────────────────────────────────────
  const isSubmitting = computed(() => creating.value || updating.value)
  const modalTitle = computed(() => selectedTrack.value ? t('tracks.editTrack') : t('tracks.newTrack'))
  const startItem = computed(() => totalItems.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1)
  const endItem = computed(() => Math.min(currentPage.value * perPage.value, totalItems.value))
  const totalPages = computed(() => lastPage.value)
  const hasActiveFilters = computed(() => filterName.value.trim() !== '')

  // ── Watchers ───────────────────────────────────────────────────────────────
  watch(
    () => loading.value || creating.value || updating.value || deleting.value,
    (isActive) => isActive ? showLoading() : hideLoading(),
    { immediate: true }
  )

  watch(
    () => ({ name: filterName.value, page: currentPage.value }),
    (v) => {
      const q: Record<string, string> = {}
      if (v.name) q.name = v.name
      if (v.page > 1) q.page = String(v.page)
      void router.replace({ query: q })
    }
  )

  watch(result, (val) => {
    if (val?.tracks?.data) tracks.value = val.tracks.data
    if (val?.tracks?.paginatorInfo) {
      const info = val.tracks.paginatorInfo
      totalItems.value = info.total
      lastPage.value = info.lastPage
      currentPage.value = info.currentPage
    }
  })

  watch(filterName, () => {
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
    if (!formData.value.name.trim()) formErrors.value.name = t('tracks.validation.nameRequired')
    return Object.keys(formErrors.value).length === 0
  }

  // ── Modal ──────────────────────────────────────────────────────────────────
  const resetForm = () => {
    formData.value = { name: '' }
    formErrors.value = {}
  }

  const openCreateModal = () => {
    selectedTrack.value = null
    resetForm()
    showModal.value = true
  }

  const openEditModal = (track: Track) => {
    selectedTrack.value = track
    formData.value = { name: track.name }
    formErrors.value = {}
    showModal.value = true
  }

  const closeModal = () => {
    showModal.value = false
    selectedTrack.value = null
    resetForm()
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validateForm()) return
    try {
      const input = { name: formData.value.name.trim() }
      if (selectedTrack.value) {
        await updateTrack({ id: selectedTrack.value.id, input })
        notify(t('tracks.messages.updateSuccess'))
      } else {
        await createTrack({ input })
        notify(t('tracks.messages.createSuccess'))
      }
      closeModal()
      applyFilters()
    } catch (err: any) {
      notify(err.message || t('tracks.messages.generalError'), 'error')
    }
  }

  const openDeleteConfirm = (track: Track) => {
    trackToDelete.value = track
    deleteConfirmModal.value = true
  }

  const handleDelete = async () => {
    if (!trackToDelete.value) return
    try {
      await deleteTrack({ id: trackToDelete.value.id })
      notify(t('tracks.messages.deleteSuccess'))
      deleteConfirmModal.value = false
      trackToDelete.value = null
      applyFilters()
    } catch (err: any) {
      notify(err.message || t('tracks.messages.deleteError'), 'error')
    }
  }

  const cancelDelete = () => {
    deleteConfirmModal.value = false
    trackToDelete.value = null
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
    applyFilters()
  }

  const retryFetch = () => refetch()

  return {
    t,
    tracks, showModal, selectedTrack, formData, formErrors,
    deleteConfirmModal, trackToDelete,
    showToast, toastMessage, toastType,
    currentPage, perPage, totalItems,
    filterName,
    loading, error, creating, deleting, refetch,
    isSubmitting, modalTitle, startItem, endItem, totalPages, hasActiveFilters,
    openCreateModal, openEditModal, closeModal,
    handleSave, openDeleteConfirm, handleDelete, cancelDelete,
    goToPage, changePerPage, clearFilters, retryFetch,
    handleToastClose,
  }
}

/**
 * Lightweight, standalone accessor for the full track catalog (all tracks, not just
 * a filtered/paginated page) — used by other screens to populate track dropdowns
 * (course levels, courses, students, enrollments) from a single source of truth.
 */
export function useTrackOptions() {
  const GET_ALL_TRACKS = gql`query GetAllTracks { tracks(first: 10000) { data { id name } } }`
  const { result, loading } = useQuery(GET_ALL_TRACKS, null, { fetchPolicy: 'cache-and-network' })
  const trackOptions = computed<Track[]>(() => result.value?.tracks?.data ?? [])

  return { trackOptions, loading }
}
