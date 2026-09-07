<script setup lang="ts">
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import { Dialog } from '@/components/Base/Headless'
import { FormInput, FormLabel, FormSelect, FormTextarea } from '@/components/Base/Form'
import Table from '@/components/Base/Table'
import Pagination from '@/components/Base/Pagination'
import ToastNotification from '@/views/components/ToastNotification.vue'
import { useCourseLevels } from './useCourseLevels'

const {
  t,
  courseLevels, showModal, selectedCourseLevel, formData, formErrors,
  deleteConfirmModal, levelToDelete, slugEditState, trackState,
  showToast, toastMessage, toastType,
  currentPage, perPage, totalItems,
  filterTrackId, filterName, filterSortOrder,
  loading, error, creating, deleting,
  isSubmitting, modalTitle, startItem, endItem, totalPages, hasActiveFilters,
  availableNextLevels, trackOptions, uniqueSortOrders, selectedTrackValue,
  openCreateModal, openEditModal, closeModal,
  handleTrackChange, handleCustomTrackInput,
  handleSave, openDeleteConfirm, handleDelete, cancelDelete,
  goToPage, changePerPage, clearFilters, retryFetch,
  handleToastClose,
} = useCourseLevels()
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
        <div class="flex-1">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
              <Lucide icon="Tag" class="w-4 h-4 text-slate-400" />
            </div>
            <FormSelect v-model="filterTrackId" class="pl-10">
              <option value="">{{ t('courseLevels.filters.searchByTrack') }}</option>
              <option v-for="track in trackOptions" :key="track.id" :value="track.id">{{ track.name }}</option>
            </FormSelect>
          </div>
        </div>
        <div class="flex-1">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Lucide icon="Search" class="w-4 h-4 text-slate-400" />
            </div>
            <FormInput v-model="filterName" type="text" :placeholder="t('courseLevels.filters.searchByName')" class="pl-10" />
          </div>
        </div>
        <div class="flex-1">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none z-10">
              <Lucide icon="ArrowUpDown" class="w-4 h-4 text-slate-400" />
            </div>
            <FormSelect v-model="filterSortOrder" class="pl-10">
              <option value="">{{ t('courseLevels.filters.searchBySortOrder', 'Filter by Order') }}</option>
              <option v-for="order in uniqueSortOrders" :key="order" :value="order.toString()">{{ order }}</option>
            </FormSelect>
          </div>
        </div>
        <div>
          <Button v-if="hasActiveFilters" variant="outline-secondary" @click="clearFilters" class="w-full sm:w-auto">
            <Lucide icon="X" class="w-4 h-4 mr-2" />
            {{ t('courseLevels.actions.clearFilters') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="flex items-center justify-center p-10">
      <div class="flex flex-col items-center gap-3">
        <Lucide icon="AlertCircle" class="w-8 h-8 text-danger" />
        <div class="text-sm text-slate-500">{{ t('courseLevels.messages.error') }}</div>
        <Button variant="outline-primary" @click="retryFetch">{{ t('courseLevels.actions.retry') }}</Button>
      </div>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <Table class="border-b border-slate-200/60">
        <Table.Thead>
          <Table.Tr>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('courseLevels.columns.track') }}</Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('courseLevels.columns.name') }}</Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('courseLevels.columns.slug') }}</Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('courseLevels.columns.sortOrder') }}</Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('courseLevels.columns.nextLevel') }}</Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('courseLevels.columns.texts') }}</Table.Td>
            <Table.Td class="py-4 font-medium text-center bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('courseLevels.columns.actions') }}</Table.Td>
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
              <div class="px-2 py-1 text-xs font-semibold rounded-md bg-primary/10 text-primary inline-block">{{ level.track.name }}</div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="font-medium">{{ level.name }}</div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="text-slate-500 font-mono text-sm">{{ level.slug }}</div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="px-2 py-1 text-xs rounded-md bg-slate-100 text-slate-600 inline-block">{{ level.sort_order }}</div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div v-if="level.nextLevel" class="text-slate-600">{{ level.nextLevel.name }}</div>
              <div v-else class="text-xs text-slate-400">-</div>
            </Table.Td>
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600 max-w-xs">
              <div v-if="level.texts" class="text-sm text-slate-600 truncate max-w-[200px]" :title="level.texts">{{ level.texts }}</div>
              <div v-else class="text-xs text-slate-400">-</div>
            </Table.Td>
            <Table.Td class="relative py-4 border-dashed dark:bg-darkmode-600">
              <div class="flex items-center justify-center gap-2">
                <Button variant="outline-secondary" size="sm" @click="openEditModal(level)" class="w-20">
                  <Lucide icon="Edit" class="w-3.5 h-3.5 mr-1" />
                  {{ t('courseLevels.actions.edit') }}
                </Button>
                <Button variant="outline-danger" size="sm" @click="openDeleteConfirm(level)" class="w-20">
                  <Lucide icon="Trash2" class="w-3.5 h-3.5 mr-1" />
                  {{ t('courseLevels.actions.delete') }}
                </Button>
              </div>
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && !error && totalItems > 0" class="flex flex-col items-center gap-4 p-5 border-t sm:flex-row border-slate-200/60">
      <div class="flex items-center gap-2">
        <span class="text-sm text-slate-600">{{ t('courseLevels.pagination.show') }}</span>
        <select v-model.number="perPage" @change="changePerPage(perPage)" class="px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-darkmode-400 dark:bg-darkmode-800 focus:ring-2 focus:ring-primary focus:border-primary">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <span class="text-sm text-slate-600">{{ t('courseLevels.pagination.entries') }}</span>
      </div>
      <div class="text-sm text-slate-600 sm:ml-auto">
        {{ t('courseLevels.pagination.showingInfo', { start: startItem, end: endItem, total: totalItems }) }}
      </div>
      <Pagination class="flex-1 sm:flex-initial">
        <Pagination.Link @click="goToPage(currentPage - 1)" :class="{ 'cursor-not-allowed opacity-50': currentPage === 1 }">
          <Lucide icon="ChevronLeft" class="w-4 h-4" />
        </Pagination.Link>
        <Pagination.Link v-if="totalPages > 0" :active="currentPage === 1" @click="goToPage(1)">1</Pagination.Link>
        <Pagination.Link v-if="currentPage > 3" disabled>...</Pagination.Link>
        <template v-for="page in totalPages" :key="page">
          <Pagination.Link v-if="page > 1 && page < totalPages && Math.abs(page - currentPage) <= 1" :active="currentPage === page" @click="goToPage(page)">{{ page }}</Pagination.Link>
        </template>
        <Pagination.Link v-if="currentPage < totalPages - 2" disabled>...</Pagination.Link>
        <Pagination.Link v-if="totalPages > 1" :active="currentPage === totalPages" @click="goToPage(totalPages)">{{ totalPages }}</Pagination.Link>
        <Pagination.Link @click="goToPage(currentPage + 1)" :class="{ 'cursor-not-allowed opacity-50': currentPage === totalPages }">
          <Lucide icon="ChevronRight" class="w-4 h-4" />
        </Pagination.Link>
      </Pagination>
    </div>
  </div>

  <!-- Create/Edit Modal -->
  <Dialog :open="showModal" @close="closeModal" size="xl">
    <Dialog.Panel>
      <Dialog.Title>
        <h2 class="mr-auto text-base font-medium">{{ modalTitle }}</h2>
      </Dialog.Title>
      <Dialog.Description class="grid grid-cols-12 gap-4 gap-y-3">
        <div class="col-span-12">
          <FormLabel htmlFor="level-track">{{ t('courseLevels.form.trackLabel') }} {{ t('courseLevels.form.required') }}</FormLabel>
          <FormSelect id="level-track" :value="selectedTrackValue" @change="handleTrackChange" :class="{ 'border-danger': formErrors.track }">
            <option value="">{{ t('courseLevels.form.trackPlaceholder') }}</option>
            <option v-for="track in trackOptions" :key="track.id" :value="track.id">{{ track.name }}</option>
            <option value="__custom__">{{ t('courseLevels.form.customTrack', 'Otro...') }}</option>
          </FormSelect>
          <FormInput v-if="trackState.isCustom" :value="trackState.customValue" @input="handleCustomTrackInput" type="text" :placeholder="t('courseLevels.form.customTrackPlaceholder', 'Escriba el nuevo track')" :class="{ 'border-danger': formErrors.track }" class="mt-2" />
          <div v-if="formErrors.track" class="mt-1 text-xs text-danger">{{ formErrors.track }}</div>
        </div>
        <div class="col-span-12 sm:col-span-6">
          <FormLabel htmlFor="level-name">{{ t('courseLevels.form.nameLabel') }} {{ t('courseLevels.form.required') }}</FormLabel>
          <FormInput id="level-name" v-model="formData.name" type="text" :placeholder="t('courseLevels.form.namePlaceholder')" :class="{ 'border-danger': formErrors.name }" />
          <div v-if="formErrors.name" class="mt-1 text-xs text-danger">{{ formErrors.name }}</div>
        </div>
        <div class="col-span-12 sm:col-span-6">
          <FormLabel htmlFor="level-slug">{{ t('courseLevels.form.slugLabel') }} {{ t('courseLevels.form.required') }}</FormLabel>
          <div class="flex items-center gap-2">
            <FormInput id="level-slug" v-model="formData.slug" type="text" :placeholder="t('courseLevels.form.slugPlaceholder')" :readonly="!slugEditState.isEditable" :class="{ 'border-danger': formErrors.slug, 'bg-slate-50 cursor-not-allowed': !slugEditState.isEditable }" class="flex-1" />
            <label class="flex items-center gap-2 text-xs text-slate-600 cursor-pointer hover:text-primary whitespace-nowrap">
              <input type="checkbox" v-model="slugEditState.isEditable" class="w-4 h-4 rounded border-slate-300 text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0" />
              <span>{{ t('courseLevels.form.editSlug') }}</span>
            </label>
          </div>
          <div v-if="formErrors.slug" class="mt-1 text-xs text-danger">{{ formErrors.slug }}</div>
          <div v-if="!slugEditState.isEditable" class="mt-1 text-xs text-slate-500">{{ t('courseLevels.form.slugAutoGenerated') }}</div>
        </div>
        <div class="col-span-12 sm:col-span-6">
          <FormLabel htmlFor="level-sort-order">{{ t('courseLevels.form.sortOrderLabel') }} {{ t('courseLevels.form.required') }}</FormLabel>
          <FormInput id="level-sort-order" v-model.number="formData.sort_order" type="number" :placeholder="t('courseLevels.form.sortOrderPlaceholder')" :class="{ 'border-danger': formErrors.sort_order }" />
          <div v-if="formErrors.sort_order" class="mt-1 text-xs text-danger">{{ formErrors.sort_order }}</div>
        </div>
        <div class="col-span-12 sm:col-span-6">
          <FormLabel htmlFor="level-next">{{ t('courseLevels.form.nextLevelLabel') }}</FormLabel>
          <FormSelect id="level-next" v-model="formData.next_level_id">
            <option :value="null">{{ t('courseLevels.form.noNextLevel') }}</option>
            <option v-for="level in availableNextLevels" :key="level.id" :value="level.id">{{ level.name }} ({{ level.track.name }})</option>
          </FormSelect>
        </div>
        <div class="col-span-12">
          <FormLabel htmlFor="level-texts">{{ t('courseLevels.form.textsLabel') }}</FormLabel>
          <FormTextarea id="level-texts" v-model="formData.texts" :placeholder="t('courseLevels.form.textsPlaceholder')" rows="4" />
          <div class="mt-1 text-xs text-slate-500">{{ t('courseLevels.form.textsHint') }}</div>
        </div>
      </Dialog.Description>
      <Dialog.Footer class="text-right">
        <Button type="button" variant="outline-secondary" @click="closeModal" :disabled="isSubmitting" class="w-20 mr-2">{{ t('courseLevels.actions.cancel') }}</Button>
        <Button type="button" variant="primary" @click="handleSave" :disabled="isSubmitting" class="w-20">
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
          {{ t('courseLevels.delete.confirmMessage') }}<br />
          <span class="font-medium">{{ levelToDelete?.name }} ({{ levelToDelete?.track.name }})</span><br />
          {{ t('courseLevels.delete.cannotUndo') }}
        </div>
      </div>
      <div class="px-5 pb-8 text-center">
        <Button type="button" variant="outline-secondary" @click="cancelDelete" :disabled="deleting" class="w-24 mr-2">{{ t('courseLevels.actions.cancel') }}</Button>
        <Button type="button" variant="danger" @click="handleDelete" :disabled="deleting" class="w-24">
          <Lucide v-if="deleting" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else>{{ t('courseLevels.actions.delete') }}</span>
        </Button>
      </div>
    </Dialog.Panel>
  </Dialog>

  <!-- Toast -->
  <ToastNotification :show="showToast" :message="toastMessage" :type="toastType" @close="handleToastClose" />
</template>
