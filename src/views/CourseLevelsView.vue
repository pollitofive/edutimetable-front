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
import ToastNotification from '@/views/components/ToastNotification.vue'
import { useI18n } from '@/composables/useI18n'

// i18n setup
const { t } = useI18n()

interface CourseLevel {
  id: string
  track: string
  name: string
  slug: string
  sort_order: number
  next_level_id: string | null
  nextLevel?: {
    id: string
    name: string
  } | null
}

interface FormData {
  track: string
  name: string
  slug: string
  sort_order: number | null
  next_level_id: string | null
}

interface SlugEditState {
  isEditable: boolean
}

interface TrackState {
  isCustom: boolean
  customValue: string
}

// GraphQL Queries & Mutations
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
        nextLevel {
          id
          name
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

const CREATE_COURSE_LEVEL = gql`
  mutation CreateCourseLevel($input: CreateCourseLevelInput!) {
    createCourseLevel(input: $input) {
      id
      track
      name
      slug
      sort_order
      next_level_id
    }
  }
`

const UPDATE_COURSE_LEVEL = gql`
  mutation UpdateCourseLevel($id: ID!, $input: UpdateCourseLevelInput!) {
    updateCourseLevel(id: $id, input: $input) {
      id
      track
      name
      slug
      sort_order
      next_level_id
    }
  }
`

const DELETE_COURSE_LEVEL = gql`
  mutation DeleteCourseLevel($id: ID!) {
    deleteCourseLevel(id: $id) {
      id
    }
  }
`

// State
const courseLevels = ref<CourseLevel[]>([])
const showModal = ref(false)
const selectedCourseLevel = ref<CourseLevel | null>(null)
const formData = ref<FormData>({ track: '', name: '', slug: '', sort_order: null, next_level_id: null })
const formErrors = ref<{ track?: string; name?: string; slug?: string; sort_order?: string }>({})
const deleteConfirmModal = ref(false)
const levelToDelete = ref<CourseLevel | null>(null)
const slugEditState = ref<SlugEditState>({ isEditable: false })
const trackState = ref<TrackState>({ isCustom: false, customValue: '' })

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
const filterTrack = ref('')
const filterName = ref('')
const filterSortOrder = ref('')
let filterTimeout: ReturnType<typeof setTimeout> | null = null

// Apollo Query
const { result, loading, error, refetch } = useQuery(GET_COURSE_LEVELS, () => ({
  first: perPage.value,
  page: currentPage.value,
  track: filterTrack.value ? filterTrack.value : undefined,
  name: filterName.value ? `%${filterName.value}%` : undefined,
  sort_order: filterSortOrder.value ? parseInt(filterSortOrder.value) : undefined
}), {
  fetchPolicy: 'cache-and-network'
})

// Apollo Mutations
const { mutate: createCourseLevel, loading: creating } = useMutation(CREATE_COURSE_LEVEL)
const { mutate: updateCourseLevel, loading: updating } = useMutation(UPDATE_COURSE_LEVEL)
const { mutate: deleteCourseLevel, loading: deleting } = useMutation(DELETE_COURSE_LEVEL)

// Computed
const isSubmitting = computed(() => creating.value || updating.value)
const modalTitle = computed(() => selectedCourseLevel.value ? t('courseLevels.editLevel') : t('courseLevels.newLevel'))

// Pagination computed
const startItem = computed(() => {
  return totalItems.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1
})

const endItem = computed(() => {
  const end = currentPage.value * perPage.value
  return end > totalItems.value ? totalItems.value : end
})

const totalPages = computed(() => lastPage.value)

// Available levels for next_level_id dropdown
const availableNextLevels = computed(() => {
  // Filter out the current level being edited
  if (selectedCourseLevel.value) {
    return courseLevels.value.filter(level => level.id !== selectedCourseLevel.value?.id)
  }
  return courseLevels.value
})

// Unique tracks from all courseLevels
const uniqueTracks = computed(() => {
  const tracks = courseLevels.value.map(level => level.track)
  return [...new Set(tracks)].sort()
})

// Unique sort orders from all courseLevels
const uniqueSortOrders = computed(() => {
  const orders = courseLevels.value.map(level => level.sort_order)
  return [...new Set(orders)].sort((a, b) => a - b)
})

// The value shown in the select
const selectedTrackValue = computed(() => {
  if (trackState.value.isCustom) {
    return '__custom__'
  }
  return formData.value.track
})

// Watch for query results
watch(result, (newValue) => {
  if (newValue?.courseLevels?.data) {
    courseLevels.value = newValue.courseLevels.data
  }
  if (newValue?.courseLevels?.paginatorInfo) {
    const info = newValue.courseLevels.paginatorInfo
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

  if (!formData.value.track.trim()) {
    formErrors.value.track = t('courseLevels.validation.trackRequired')
  }

  if (!formData.value.name.trim()) {
    formErrors.value.name = t('courseLevels.validation.nameRequired')
  }

  if (!formData.value.slug.trim()) {
    formErrors.value.slug = t('courseLevels.validation.slugRequired')
  }

  if (formData.value.sort_order === null || formData.value.sort_order === undefined) {
    formErrors.value.sort_order = t('courseLevels.validation.sortOrderRequired')
  } else if (isNaN(Number(formData.value.sort_order))) {
    formErrors.value.sort_order = t('courseLevels.validation.sortOrderNumeric')
  }

  return Object.keys(formErrors.value).length === 0
}

// Auto-generate slug from name
watch(() => formData.value.name, (newName) => {
  // Only auto-generate if not in edit mode and slug editing is disabled
  if (!slugEditState.value.isEditable) {
    formData.value.slug = newName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }
})

// Methods
const openCreateModal = () => {
  selectedCourseLevel.value = null
  formData.value = { track: '', name: '', slug: '', sort_order: null, next_level_id: null }
  formErrors.value = {}
  slugEditState.value.isEditable = false // Reset slug edit state
  trackState.value = { isCustom: false, customValue: '' } // Reset track state
  showModal.value = true
}

const openEditModal = (level: CourseLevel) => {
  selectedCourseLevel.value = level
  formData.value = {
    track: level.track,
    name: level.name,
    slug: level.slug,
    sort_order: level.sort_order,
    next_level_id: level.next_level_id
  }
  formErrors.value = {}
  slugEditState.value.isEditable = false // Reset slug edit state

  // Check if the track exists in the list of unique tracks
  if (uniqueTracks.value.includes(level.track)) {
    trackState.value = { isCustom: false, customValue: '' }
  } else {
    // If it's a custom track, show it in the custom input
    trackState.value = { isCustom: true, customValue: level.track }
  }

  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedCourseLevel.value = null
  formData.value = { track: '', name: '', slug: '', sort_order: null, next_level_id: null }
  formErrors.value = {}
  slugEditState.value.isEditable = false // Reset slug edit state
  trackState.value = { isCustom: false, customValue: '' } // Reset track state
}

const toggleSlugEdit = () => {
  slugEditState.value.isEditable = !slugEditState.value.isEditable
}

const handleTrackChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const value = target.value

  if (value === '__custom__') {
    trackState.value.isCustom = true
    formData.value.track = trackState.value.customValue
  } else {
    trackState.value.isCustom = false
    trackState.value.customValue = ''
    formData.value.track = value
  }
}

const handleCustomTrackInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  trackState.value.customValue = target.value
  formData.value.track = target.value
}

const handleSave = async () => {
  if (!validateForm()) {
    return
  }

  try {
    const input = {
      track: formData.value.track.trim(),
      name: formData.value.name.trim(),
      slug: formData.value.slug.trim(),
      sort_order: Number(formData.value.sort_order),
      next_level_id: formData.value.next_level_id || null
    }

    if (selectedCourseLevel.value) {
      // Update
      await updateCourseLevel({
        id: selectedCourseLevel.value.id,
        input
      })
      notify(t('courseLevels.messages.updateSuccess'), 'success')
    } else {
      // Create
      await createCourseLevel({ input })
      notify(t('courseLevels.messages.createSuccess'), 'success')
    }

    closeModal()
    applyFilters()
  } catch (err: any) {
    const errorMessage = err.message || t('courseLevels.messages.generalError')
    notify(errorMessage, 'error')
    console.error('Error saving course level:', err)
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
    notify(t('courseLevels.messages.deleteSuccess'), 'success')
    deleteConfirmModal.value = false
    levelToDelete.value = null
    applyFilters()
  } catch (err: any) {
    const errorMessage = err.message || t('courseLevels.messages.deleteError')
    notify(errorMessage, 'error')
    console.error('Error deleting course level:', err)
  }
}

const cancelDelete = () => {
  deleteConfirmModal.value = false
  levelToDelete.value = null
}

// Pagination methods
const goToPage = (page: number) => {
  if (page >= 1 && page <= lastPage.value) {
    currentPage.value = page
    refetch({
      first: perPage.value,
      page,
      track: filterTrack.value.trim() ? filterTrack.value.trim() : undefined,
      name: filterName.value.trim() ? `%${filterName.value.trim()}%` : undefined,
      sort_order: filterSortOrder.value ? parseInt(filterSortOrder.value) : undefined
    })
  }
}

const changePerPage = (newPerPage: number) => {
  perPage.value = newPerPage
  currentPage.value = 1
  refetch({
    first: newPerPage,
    page: 1,
    track: filterTrack.value.trim() ? filterTrack.value.trim() : undefined,
    name: filterName.value.trim() ? `%${filterName.value.trim()}%` : undefined,
    sort_order: filterSortOrder.value ? parseInt(filterSortOrder.value) : undefined
  })
}

// Filter methods
const applyFilters = () => {
  currentPage.value = 1
  refetch({
    first: perPage.value,
    page: 1,
    track: filterTrack.value.trim() ? filterTrack.value.trim() : undefined,
    name: filterName.value.trim() ? `%${filterName.value.trim()}%` : undefined,
    sort_order: filterSortOrder.value ? parseInt(filterSortOrder.value) : undefined
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
  filterTrack.value = ''
  filterName.value = ''
  filterSortOrder.value = ''
  applyFilters()
}

const hasActiveFilters = computed(() => {
  return filterTrack.value.trim() !== '' || filterName.value.trim() !== '' || filterSortOrder.value.trim() !== ''
})

// Watch for filter changes
watch([filterTrack, filterName, filterSortOrder], () => {
  debouncedFilter()
})
</script>

<template>
  <div class="flex flex-col gap-y-3 md:h-10 md:flex-row md:items-center">
    <div class="text-base font-medium">{{ t('courseLevels.title') }}</div>
    <div class="flex flex-col gap-x-3 gap-y-2 sm:flex-row md:ml-auto">
      <Button variant="primary" @click="openCreateModal">
        <Lucide icon="Plus" class="w-4 h-4 mr-2" />
        {{ t('courseLevels.newLevel') }}
      </Button>
    </div>
  </div>

  <div class="box box--stacked flex flex-col mt-5">
    <!-- Filter Section -->
    <div class="p-5 border-b border-slate-200/60">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
        <!-- Filter by Track -->
        <div class="flex-1">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
              <Lucide icon="Tag" class="w-4 h-4 text-slate-400" />
            </div>
            <FormSelect
              v-model="filterTrack"
              class="pl-10"
            >
              <option value="">{{ t('courseLevels.filters.searchByTrack') }}</option>
              <option v-for="track in uniqueTracks" :key="track" :value="track">
                {{ track }}
              </option>
            </FormSelect>
          </div>
        </div>

        <!-- Search by Name -->
        <div class="flex-1">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Lucide icon="Search" class="w-4 h-4 text-slate-400" />
            </div>
            <FormInput
              v-model="filterName"
              type="text"
              :placeholder="t('courseLevels.filters.searchByName')"
              class="pl-10"
            />
          </div>
        </div>

        <!-- Filter by Sort Order -->
        <div class="flex-1">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
              <Lucide icon="ArrowUpDown" class="w-4 h-4 text-slate-400" />
            </div>
            <FormSelect
              v-model="filterSortOrder"
              class="pl-10"
            >
              <option value="">{{ t('courseLevels.filters.searchBySortOrder', 'Filter by Order') }}</option>
              <option v-for="order in uniqueSortOrders" :key="order" :value="order.toString()">
                {{ order }}
              </option>
            </FormSelect>
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
            {{ t('courseLevels.actions.clearFilters') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center p-10">
      <div class="flex flex-col items-center gap-3">
        <Lucide icon="Loader" class="w-8 h-8 animate-spin text-primary" />
        <div class="text-sm text-slate-500">{{ t('courseLevels.messages.loading') }}</div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="flex items-center justify-center p-10">
      <div class="flex flex-col items-center gap-3">
        <Lucide icon="AlertCircle" class="w-8 h-8 text-danger" />
        <div class="text-sm text-slate-500">{{ t('courseLevels.messages.error') }}</div>
        <Button variant="outline-primary" @click="() => refetch({
          first: perPage.value,
          page: currentPage.value,
          track: filterTrack.value.trim() ? filterTrack.value.trim() : undefined,
          name: filterName.value.trim() ? `%${filterName.value.trim()}%` : undefined,
          sort_order: filterSortOrder.value ? parseInt(filterSortOrder.value) : undefined
        })">{{ t('courseLevels.actions.retry') }}</Button>
      </div>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <Table class="border-b border-slate-200/60">
        <Table.Thead>
          <Table.Tr>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('courseLevels.columns.id') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('courseLevels.columns.track') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('courseLevels.columns.name') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('courseLevels.columns.slug') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('courseLevels.columns.sortOrder') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('courseLevels.columns.nextLevel') }}
            </Table.Td>
            <Table.Td class="py-4 font-medium text-center bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">
              {{ t('courseLevels.columns.actions') }}
            </Table.Td>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr v-if="courseLevels.length === 0">
            <Table.Td colspan="7" class="py-10 text-center text-slate-500">
              <div class="flex flex-col items-center gap-3">
                <Lucide icon="Inbox" class="w-10 h-10 text-slate-300" />
                <div>{{ t('courseLevels.messages.noLevels') }}</div>
              </div>
            </Table.Td>
          </Table.Tr>
          <Table.Tr v-for="level in courseLevels" :key="level.id" class="[&_td]:last:border-b-0">
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              {{ level.id }}
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="px-2 py-1 text-xs font-semibold rounded-md bg-primary/10 text-primary inline-block">
                {{ level.track }}
              </div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="font-medium">{{ level.name }}</div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="text-slate-500 font-mono text-sm">{{ level.slug }}</div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="px-2 py-1 text-xs rounded-md bg-slate-100 text-slate-600 inline-block">
                {{ level.sort_order }}
              </div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div v-if="level.nextLevel" class="text-slate-600">{{ level.nextLevel.name }}</div>
              <div v-else class="text-xs text-slate-400">-</div>
            </Table.Td>
            <Table.Td class="relative py-4 border-dashed dark:bg-darkmode-600">
              <div class="flex items-center justify-center gap-2">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  @click="openEditModal(level)"
                  class="w-20"
                >
                  <Lucide icon="Edit" class="w-3.5 h-3.5 mr-1" />
                  {{ t('courseLevels.actions.edit') }}
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  @click="openDeleteConfirm(level)"
                  class="w-20"
                >
                  <Lucide icon="Trash2" class="w-3.5 h-3.5 mr-1" />
                  {{ t('courseLevels.actions.delete') }}
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
        <span class="text-sm text-slate-600">{{ t('courseLevels.pagination.show') }}</span>
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
        <span class="text-sm text-slate-600">{{ t('courseLevels.pagination.entries') }}</span>
      </div>

      <!-- Showing info -->
      <div class="text-sm text-slate-600 sm:ml-auto">
        {{ t('courseLevels.pagination.showingInfo', { start: startItem, end: endItem, total: totalItems }) }}
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
  <Dialog :open="showModal" @close="closeModal" size="lg">
    <Dialog.Panel>
      <Dialog.Title>
        <h2 class="mr-auto text-base font-medium">{{ modalTitle }}</h2>
      </Dialog.Title>
      <Dialog.Description class="grid grid-cols-12 gap-4 gap-y-3">
        <div class="col-span-12">
          <FormLabel htmlFor="level-track">{{ t('courseLevels.form.trackLabel') }} {{ t('courseLevels.form.required') }}</FormLabel>

          <!-- Track Select -->
          <FormSelect
            id="level-track"
            :value="selectedTrackValue"
            @change="handleTrackChange"
            :class="{ 'border-danger': formErrors.track }"
          >
            <option value="">{{ t('courseLevels.form.trackPlaceholder') }}</option>
            <option v-for="track in uniqueTracks" :key="track" :value="track">
              {{ track }}
            </option>
            <option value="__custom__">{{ t('courseLevels.form.customTrack', 'Otro...') }}</option>
          </FormSelect>

          <!-- Custom Track Input (shown when "Otro..." is selected) -->
          <FormInput
            v-if="trackState.isCustom"
            :value="trackState.customValue"
            @input="handleCustomTrackInput"
            type="text"
            :placeholder="t('courseLevels.form.customTrackPlaceholder', 'Escriba el nuevo track')"
            :class="{ 'border-danger': formErrors.track }"
            class="mt-2"
          />

          <div v-if="formErrors.track" class="mt-1 text-xs text-danger">
            {{ formErrors.track }}
          </div>
        </div>
        <div class="col-span-12 sm:col-span-6">
          <FormLabel htmlFor="level-name">{{ t('courseLevels.form.nameLabel') }} {{ t('courseLevels.form.required') }}</FormLabel>
          <FormInput
            id="level-name"
            v-model="formData.name"
            type="text"
            :placeholder="t('courseLevels.form.namePlaceholder')"
            :class="{ 'border-danger': formErrors.name }"
          />
          <div v-if="formErrors.name" class="mt-1 text-xs text-danger">
            {{ formErrors.name }}
          </div>
        </div>
        <div class="col-span-12 sm:col-span-6">
          <FormLabel htmlFor="level-slug">{{ t('courseLevels.form.slugLabel') }} {{ t('courseLevels.form.required') }}</FormLabel>
          <div class="flex items-center gap-2">
            <FormInput
              id="level-slug"
              v-model="formData.slug"
              type="text"
              :placeholder="t('courseLevels.form.slugPlaceholder')"
              :readonly="!slugEditState.isEditable"
              :class="{
                'border-danger': formErrors.slug,
                'bg-slate-50 cursor-not-allowed': !slugEditState.isEditable
              }"
              class="flex-1"
            />
            <label class="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-primary whitespace-nowrap">
              <input
                type="checkbox"
                v-model="slugEditState.isEditable"
                class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
              />
              <span>{{ t('courseLevels.form.editSlug') }}</span>
            </label>
          </div>
          <div v-if="formErrors.slug" class="mt-1 text-xs text-danger">
            {{ formErrors.slug }}
          </div>
          <div v-if="!slugEditState.isEditable" class="mt-1 text-xs text-slate-500">
            {{ t('courseLevels.form.slugAutoGenerated') }}
          </div>
        </div>
        <div class="col-span-12 sm:col-span-6">
          <FormLabel htmlFor="level-sort-order">{{ t('courseLevels.form.sortOrderLabel') }} {{ t('courseLevels.form.required') }}</FormLabel>
          <FormInput
            id="level-sort-order"
            v-model.number="formData.sort_order"
            type="number"
            :placeholder="t('courseLevels.form.sortOrderPlaceholder')"
            :class="{ 'border-danger': formErrors.sort_order }"
          />
          <div v-if="formErrors.sort_order" class="mt-1 text-xs text-danger">
            {{ formErrors.sort_order }}
          </div>
        </div>
        <div class="col-span-12 sm:col-span-6">
          <FormLabel htmlFor="level-next">{{ t('courseLevels.form.nextLevelLabel') }}</FormLabel>
          <FormSelect
            id="level-next"
            v-model="formData.next_level_id"
          >
            <option :value="null">{{ t('courseLevels.form.noNextLevel') }}</option>
            <option v-for="level in availableNextLevels" :key="level.id" :value="level.id">
              {{ level.name }} ({{ level.track }})
            </option>
          </FormSelect>
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
          {{ t('courseLevels.actions.cancel') }}
        </Button>
        <Button
          type="button"
          variant="primary"
          @click="handleSave"
          :disabled="isSubmitting"
          class="w-20"
        >
          <Lucide v-if="isSubmitting" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else>{{ t('courseLevels.actions.save') }}</span>
        </Button>
      </Dialog.Footer>
    </Dialog.Panel>
  </Dialog>

  <!-- Delete Confirmation Modal -->
  <Dialog :open="deleteConfirmModal" @close="cancelDelete">
    <Dialog.Panel>
      <div class="p-5 text-center">
        <Lucide icon="AlertTriangle" class="w-16 h-16 mx-auto mt-3 text-danger" />
        <div class="mt-5 text-3xl">{{ t('courseLevels.delete.confirmTitle') }}</div>
        <div class="mt-2 text-slate-500">
          {{ t('courseLevels.delete.confirmMessage') }}
          <br />
          <span class="font-medium">{{ levelToDelete?.name }} ({{ levelToDelete?.track }})</span>
          <br />
          {{ t('courseLevels.delete.cannotUndo') }}
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
          {{ t('courseLevels.actions.cancel') }}
        </Button>
        <Button
          type="button"
          variant="danger"
          @click="handleDelete"
          :disabled="deleting"
          class="w-24"
        >
          <Lucide v-if="deleting" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else>{{ t('courseLevels.actions.delete') }}</span>
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