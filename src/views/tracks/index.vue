<script setup lang="ts">
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import { Dialog } from '@/components/Base/Headless'
import { FormInput, FormLabel } from '@/components/Base/Form'
import Table from '@/components/Base/Table'
import Pagination from '@/components/Base/Pagination'
import ToastNotification from '@/views/components/ToastNotification.vue'
import { useTracks } from './useTracks'

const {
  t,
  tracks, showModal, selectedTrack, formData, formErrors,
  deleteConfirmModal, trackToDelete,
  showToast, toastMessage, toastType,
  currentPage, perPage, totalItems,
  filterName,
  loading, error, creating, deleting,
  isSubmitting, modalTitle, startItem, endItem, totalPages, hasActiveFilters,
  openCreateModal, openEditModal, closeModal,
  handleSave, openDeleteConfirm, handleDelete, cancelDelete,
  goToPage, changePerPage, clearFilters, retryFetch,
  handleToastClose,
} = useTracks()
</script>

<template>
  <div class="flex flex-col gap-y-3 md:h-10 md:flex-row md:items-center">
    <div class="text-base font-medium">{{ t('tracks.title') }}</div>
    <div class="flex flex-col gap-x-3 gap-y-2 sm:flex-row md:ml-auto">
      <Button variant="primary" @click="openCreateModal">
        <Lucide icon="Plus" class="w-4 h-4 mr-2" />
        {{ t('tracks.newTrack') }}
      </Button>
    </div>
  </div>

  <div class="box box--stacked flex flex-col mt-5">
    <!-- Filter Section -->
    <div class="p-5 border-b border-slate-200/60">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div class="flex-1">
          <div class="relative">
            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Lucide icon="Search" class="w-4 h-4 text-slate-400" />
            </div>
            <FormInput v-model="filterName" type="text" :placeholder="t('tracks.filters.searchByName')" class="pl-10" />
          </div>
        </div>
        <div>
          <Button v-if="hasActiveFilters" variant="outline-secondary" @click="clearFilters" class="w-full sm:w-auto">
            <Lucide icon="X" class="w-4 h-4 mr-2" />
            {{ t('tracks.actions.clearFilters') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="flex items-center justify-center p-10">
      <div class="flex flex-col items-center gap-3">
        <Lucide icon="AlertCircle" class="w-8 h-8 text-danger" />
        <div class="text-sm text-slate-500">{{ t('tracks.messages.error') }}</div>
        <Button variant="outline-primary" @click="retryFetch">{{ t('tracks.actions.retry') }}</Button>
      </div>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <Table class="border-b border-slate-200/60">
        <Table.Thead>
          <Table.Tr>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('tracks.columns.name') }}</Table.Td>
            <Table.Td class="py-4 font-medium text-center bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('tracks.columns.actions') }}</Table.Td>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr v-if="tracks.length === 0">
            <Table.Td colspan="2" class="py-10 text-center text-slate-500">
              <div class="flex flex-col items-center gap-3">
                <Lucide icon="Inbox" class="w-10 h-10 text-slate-300" />
                <div>{{ t('tracks.messages.noTracks') }}</div>
              </div>
            </Table.Td>
          </Table.Tr>
          <Table.Tr v-for="track in tracks" :key="track.id" class="[&_td]:last:border-b-0">
            <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
              <div class="px-2 py-1 text-xs font-semibold rounded-md bg-primary/10 text-primary inline-block">{{ track.name }}</div>
            </Table.Td>
            <Table.Td class="relative py-4 border-dashed dark:bg-darkmode-600">
              <div class="flex items-center justify-center gap-2">
                <Button variant="outline-secondary" size="sm" @click="openEditModal(track)" class="w-20">
                  <Lucide icon="Edit" class="w-3.5 h-3.5 mr-1" />
                  {{ t('tracks.actions.edit') }}
                </Button>
                <Button variant="outline-danger" size="sm" @click="openDeleteConfirm(track)" class="w-20">
                  <Lucide icon="Trash2" class="w-3.5 h-3.5 mr-1" />
                  {{ t('tracks.actions.delete') }}
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
        <span class="text-sm text-slate-600">{{ t('tracks.pagination.show') }}</span>
        <select v-model.number="perPage" @change="changePerPage(perPage)" class="px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-darkmode-400 dark:bg-darkmode-800 focus:ring-2 focus:ring-primary focus:border-primary">
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <span class="text-sm text-slate-600">{{ t('tracks.pagination.entries') }}</span>
      </div>
      <div class="text-sm text-slate-600 sm:ml-auto">
        {{ t('tracks.pagination.showingInfo', { start: startItem, end: endItem, total: totalItems }) }}
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
  <Dialog :open="showModal" @close="closeModal">
    <Dialog.Panel>
      <Dialog.Title>
        <h2 class="mr-auto text-base font-medium">{{ modalTitle }}</h2>
      </Dialog.Title>
      <Dialog.Description class="grid grid-cols-12 gap-4 gap-y-3">
        <div class="col-span-12">
          <FormLabel htmlFor="track-name">{{ t('tracks.form.nameLabel') }} {{ t('tracks.form.required') }}</FormLabel>
          <FormInput id="track-name" v-model="formData.name" type="text" :placeholder="t('tracks.form.namePlaceholder')" :class="{ 'border-danger': formErrors.name }" />
          <div v-if="formErrors.name" class="mt-1 text-xs text-danger">{{ formErrors.name }}</div>
        </div>
      </Dialog.Description>
      <Dialog.Footer class="text-right">
        <Button type="button" variant="outline-secondary" @click="closeModal" :disabled="isSubmitting" class="w-20 mr-2">{{ t('tracks.actions.cancel') }}</Button>
        <Button type="button" variant="primary" @click="handleSave" :disabled="isSubmitting" class="w-20">
          <Lucide v-if="isSubmitting" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else>{{ t('tracks.actions.save') }}</span>
        </Button>
      </Dialog.Footer>
    </Dialog.Panel>
  </Dialog>

  <!-- Delete Confirmation Modal -->
  <Dialog :open="deleteConfirmModal" @close="cancelDelete">
    <Dialog.Panel>
      <div class="p-5 text-center">
        <Lucide icon="AlertTriangle" class="w-16 h-16 mx-auto mt-3 text-danger" />
        <div class="mt-5 text-3xl">{{ t('tracks.delete.confirmTitle') }}</div>
        <div class="mt-2 text-slate-500">
          {{ t('tracks.delete.confirmMessage') }}<br />
          <span class="font-medium">{{ trackToDelete?.name }}</span><br />
          {{ t('tracks.delete.cannotUndo') }}
        </div>
      </div>
      <div class="px-5 pb-8 text-center">
        <Button type="button" variant="outline-secondary" @click="cancelDelete" :disabled="deleting" class="w-24 mr-2">{{ t('tracks.actions.cancel') }}</Button>
        <Button type="button" variant="danger" @click="handleDelete" :disabled="deleting" class="w-24">
          <Lucide v-if="deleting" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else>{{ t('tracks.actions.delete') }}</span>
        </Button>
      </div>
    </Dialog.Panel>
  </Dialog>

  <!-- Toast -->
  <ToastNotification :show="showToast" :message="toastMessage" :type="toastType" @close="handleToastClose" />
</template>
