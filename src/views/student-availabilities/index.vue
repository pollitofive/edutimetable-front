<script setup lang="ts">
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import { Dialog } from '@/components/Base/Headless'
import { FormInput, FormLabel, FormSelect } from '@/components/Base/Form'
import Table from '@/components/Base/Table'
import Pagination from '@/components/Base/Pagination'
import TomSelect from '@/components/Base/TomSelect'
import ToastNotification from '@/views/components/ToastNotification.vue'
import { useStudentAvailabilities } from './useStudentAvailabilities'

const {
  t, availabilities, allStudents, showModal, isEditMode, isSingleEditMode,
  loadingEditAvailabilities, formData, formErrors, deleteConfirmModal, availabilityToDelete,
  showToast, toastMessage, toastType, currentPage, perPage, totalItems,
  filterStudentId, filterDayOfWeek, loading, error, creating, deleting,
  isSubmitting, modalTitle, startItem, endItem, totalPages, hasActiveFilters, dayOptions,
  openCreateModal, openSingleEditModal, openEditModal, closeModal,
  addSlot, removeSlot, handleSave, openDeleteConfirm, handleDelete, cancelDelete,
  goToPage, changePerPage, clearFilters, retryFetch, handleToastClose,
  getDayName, isFirstOccurrenceOfStudent, isDifferentStudentFromPrevious, getStudentGroupBackground,
} = useStudentAvailabilities()
</script>

<template>
  <div class="flex flex-col gap-y-3 md:h-10 md:flex-row md:items-center">
    <div class="text-base font-medium">{{ t('studentAvailabilities.title') }}</div>
    <div class="flex flex-col gap-x-3 gap-y-2 sm:flex-row md:ml-auto">
      <Button variant="primary" @click="openCreateModal">
        <Lucide icon="Plus" class="w-4 h-4 mr-2" />
        {{ t('studentAvailabilities.newAvailability') }}
      </Button>
    </div>
  </div>

  <div class="box box--stacked flex flex-col mt-5">
    <!-- Filters -->
    <div class="p-5 border-b border-slate-200/60">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div class="flex-1">
          <TomSelect v-model="filterStudentId" :options="{ placeholder: t('studentAvailabilities.filters.allStudents'), maxOptions: null, maxItems: 1 }" class="w-full">
            <option value="">{{ t('studentAvailabilities.filters.allStudents') }}</option>
            <option v-for="student in allStudents" :key="student.id" :value="student.id">{{ student.name }}</option>
          </TomSelect>
        </div>
        <div class="flex-1">
          <FormSelect v-model="filterDayOfWeek">
            <option value="">{{ t('studentAvailabilities.filters.allDays') }}</option>
            <option value="0">{{ t('studentAvailabilities.days.sunday') }}</option>
            <option value="1">{{ t('studentAvailabilities.days.monday') }}</option>
            <option value="2">{{ t('studentAvailabilities.days.tuesday') }}</option>
            <option value="3">{{ t('studentAvailabilities.days.wednesday') }}</option>
            <option value="4">{{ t('studentAvailabilities.days.thursday') }}</option>
            <option value="5">{{ t('studentAvailabilities.days.friday') }}</option>
            <option value="6">{{ t('studentAvailabilities.days.saturday') }}</option>
          </FormSelect>
        </div>
        <div>
          <Button v-if="hasActiveFilters" variant="outline-secondary" @click="clearFilters" class="w-full sm:w-auto">
            <Lucide icon="X" class="w-4 h-4 mr-2" />{{ t('studentAvailabilities.actions.clearFilters') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-if="error" class="flex items-center justify-center p-10">
      <div class="flex flex-col items-center gap-3">
        <Lucide icon="AlertCircle" class="w-8 h-8 text-danger" />
        <div class="text-sm text-slate-500">{{ t('studentAvailabilities.messages.error') }}</div>
        <Button variant="outline-primary" @click="retryFetch">{{ t('studentAvailabilities.actions.retry') }}</Button>
      </div>
    </div>

    <!-- Table -->
    <div v-else class="overflow-x-auto">
      <Table class="border-b border-slate-200/60">
        <Table.Thead>
          <Table.Tr>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('studentAvailabilities.columns.student') }}</Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('studentAvailabilities.columns.dayOfWeek') }}</Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('studentAvailabilities.columns.startTime') }}</Table.Td>
            <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('studentAvailabilities.columns.endTime') }}</Table.Td>
            <Table.Td class="py-4 font-medium text-center bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('studentAvailabilities.columns.actions') }}</Table.Td>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          <Table.Tr v-if="availabilities.length === 0">
            <Table.Td colspan="5" class="py-10 text-center text-slate-500">
              <div class="flex flex-col items-center gap-3">
                <Lucide icon="Inbox" class="w-10 h-10 text-slate-300" />
                <div>{{ t('studentAvailabilities.messages.noAvailabilities') }}</div>
              </div>
            </Table.Td>
          </Table.Tr>
          <Table.Tr
            v-for="(availability, index) in availabilities"
            :key="availability.id"
            :class="['[&_td]:last:border-b-0', getStudentGroupBackground(availability.student_id), isDifferentStudentFromPrevious(availability.student_id, index) ? 'border-t-2 border-t-slate-300 dark:border-t-slate-600' : '']"
          >
            <Table.Td :class="['py-4 border-dashed transition-colors', getStudentGroupBackground(availability.student_id)]">
              <div v-if="isFirstOccurrenceOfStudent(availability.student_id, index)" class="font-medium text-slate-700 dark:text-slate-200">{{ availability.student.name }}</div>
              <div v-else class="text-slate-400 dark:text-slate-500 text-sm">&mdash;</div>
            </Table.Td>
            <Table.Td :class="['py-4 border-dashed transition-colors', getStudentGroupBackground(availability.student_id)]">
              <div class="px-2 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary inline-block">{{ getDayName(availability.day_of_week) }}</div>
            </Table.Td>
            <Table.Td :class="['py-4 border-dashed transition-colors', getStudentGroupBackground(availability.student_id)]">
              <div class="font-mono text-slate-600 dark:text-slate-300">{{ availability.start_time }}</div>
            </Table.Td>
            <Table.Td :class="['py-4 border-dashed transition-colors', getStudentGroupBackground(availability.student_id)]">
              <div class="font-mono text-slate-600 dark:text-slate-300">{{ availability.end_time }}</div>
            </Table.Td>
            <Table.Td :class="['relative py-4 border-dashed transition-colors', getStudentGroupBackground(availability.student_id)]">
              <div class="flex items-center justify-center gap-2">
                <Button variant="outline-primary" size="sm" @click="openSingleEditModal(availability)" class="w-16">
                  <Lucide icon="Pencil" class="w-3.5 h-3.5 mr-1" />{{ t('studentAvailabilities.actions.edit') }}
                </Button>
                <Button variant="outline-danger" size="sm" @click="openDeleteConfirm(availability)" class="w-20">
                  <Lucide icon="Trash2" class="w-3.5 h-3.5 mr-1" />{{ t('studentAvailabilities.actions.delete') }}
                </Button>
                <Button v-if="isFirstOccurrenceOfStudent(availability.student_id, index)" variant="outline-secondary" size="sm" @click="openEditModal(availability)" class="w-24">
                  <Lucide icon="List" class="w-3.5 h-3.5 mr-1" />{{ t('studentAvailabilities.actions.manage') }}
                </Button>
                <div v-else class="w-24"></div>
              </div>
            </Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && !error && totalItems > 0" class="flex flex-col items-center gap-4 p-5 border-t sm:flex-row border-slate-200/60">
      <div class="flex items-center gap-2">
        <span class="text-sm text-slate-600">{{ t('studentAvailabilities.pagination.show') }}</span>
        <select v-model.number="perPage" @change="changePerPage(perPage)" class="px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-darkmode-400 dark:bg-darkmode-800 focus:ring-2 focus:ring-primary focus:border-primary">
          <option :value="10">10</option><option :value="25">25</option><option :value="50">50</option><option :value="100">100</option>
        </select>
        <span class="text-sm text-slate-600">{{ t('studentAvailabilities.pagination.entries') }}</span>
      </div>
      <div class="text-sm text-slate-600 sm:ml-auto">{{ t('studentAvailabilities.pagination.showingInfo', { start: startItem, end: endItem, total: totalItems }) }}</div>
      <Pagination class="flex-1 sm:flex-initial">
        <Pagination.Link @click="goToPage(currentPage - 1)" :class="{ 'cursor-not-allowed opacity-50': currentPage === 1 }"><Lucide icon="ChevronLeft" class="w-4 h-4" /></Pagination.Link>
        <Pagination.Link v-if="totalPages > 0" :active="currentPage === 1" @click="goToPage(1)">1</Pagination.Link>
        <Pagination.Link v-if="currentPage > 3" disabled>...</Pagination.Link>
        <template v-for="page in totalPages" :key="page">
          <Pagination.Link v-if="page > 1 && page < totalPages && Math.abs(page - currentPage) <= 1" :active="currentPage === page" @click="goToPage(page)">{{ page }}</Pagination.Link>
        </template>
        <Pagination.Link v-if="currentPage < totalPages - 2" disabled>...</Pagination.Link>
        <Pagination.Link v-if="totalPages > 1" :active="currentPage === totalPages" @click="goToPage(totalPages)">{{ totalPages }}</Pagination.Link>
        <Pagination.Link @click="goToPage(currentPage + 1)" :class="{ 'cursor-not-allowed opacity-50': currentPage === totalPages }"><Lucide icon="ChevronRight" class="w-4 h-4" /></Pagination.Link>
      </Pagination>
    </div>
  </div>

  <!-- Create/Edit Modal -->
  <Dialog :open="showModal" @close="closeModal" :staticBackdrop="true">
    <Dialog.Panel class="max-w-3xl sm:w-[540px]">
      <Dialog.Title><h2 class="mr-auto text-base font-medium">{{ modalTitle }}</h2></Dialog.Title>
      <Dialog.Description class="grid grid-cols-12 gap-4 gap-y-3">
        <div class="col-span-12">
          <FormLabel htmlFor="availability-student">{{ t('studentAvailabilities.form.student') }} *</FormLabel>
          <TomSelect id="availability-student" v-model="formData.student_id" :disabled="isEditMode || isSingleEditMode || loadingEditAvailabilities" :options="{ placeholder: t('studentAvailabilities.form.selectStudent'), maxOptions: null, maxItems: 1 }" :class="{ 'border-danger': formErrors.student_id }" class="w-full">
            <option value="">{{ t('studentAvailabilities.form.selectStudent') }}</option>
            <option v-for="student in allStudents" :key="student.id" :value="student.id">{{ student.name }}</option>
          </TomSelect>
          <div v-if="formErrors.student_id" class="mt-1 text-xs text-danger">{{ formErrors.student_id }}</div>
        </div>
        <div v-if="loadingEditAvailabilities" class="col-span-12 flex items-center justify-center py-8">
          <div class="flex flex-col items-center gap-3">
            <Lucide icon="Loader" class="w-6 h-6 animate-spin text-primary" />
            <div class="text-sm text-slate-500">{{ t('studentAvailabilities.messages.loadingAvailabilities') }}</div>
          </div>
        </div>
        <div v-if="!loadingEditAvailabilities" class="col-span-12">
          <div class="flex items-center justify-between mb-3">
            <FormLabel class="mb-0">{{ t('studentAvailabilities.form.availabilitySlots') }}</FormLabel>
          </div>
          <div class="max-h-80 overflow-y-auto pr-2 space-y-3 scroll-smooth border border-slate-200/60 rounded-lg p-3 dark:border-darkmode-400">
            <div v-for="(slot, index) in formData.availabilities" :key="index" class="p-4 border-2 border-slate-200 rounded-lg dark:border-darkmode-400 bg-white dark:bg-darkmode-800 shadow-sm">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <div class="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-sm">{{ index + 1 }}</div>
                  <div class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('studentAvailabilities.form.slot', { number: index + 1 }) }}</div>
                </div>
                <Button v-if="!isSingleEditMode && formData.availabilities.length > 1" type="button" variant="soft-danger" size="sm" @click="removeSlot(index)" class="px-3">
                  <Lucide icon="Trash2" class="w-3.5 h-3.5 mr-1.5" />{{ t('studentAvailabilities.actions.removeSlot') }}
                </Button>
              </div>
              <div class="grid grid-cols-12 gap-3">
                <div class="col-span-12 sm:col-span-4">
                  <FormLabel :htmlFor="`slot-day-${index}`">{{ t('studentAvailabilities.form.dayOfWeek') }} *</FormLabel>
                  <FormSelect :id="`slot-day-${index}`" v-model="slot.day_of_week" :class="{ 'border-danger': formErrors.availabilities?.[index]?.day_of_week }">
                    <option value="">{{ t('studentAvailabilities.form.selectDay') }}</option>
                    <option v-for="day in dayOptions" :key="day.value" :value="day.value">{{ day.label }}</option>
                  </FormSelect>
                  <div v-if="formErrors.availabilities?.[index]?.day_of_week" class="mt-1 text-xs text-danger">{{ formErrors.availabilities[index].day_of_week }}</div>
                </div>
                <div class="col-span-12 sm:col-span-4">
                  <FormLabel :htmlFor="`slot-start-${index}`">{{ t('studentAvailabilities.form.startTime') }} *</FormLabel>
                  <FormInput :id="`slot-start-${index}`" v-model="slot.start_time" type="time" :class="{ 'border-danger': formErrors.availabilities?.[index]?.start_time }" />
                  <div v-if="formErrors.availabilities?.[index]?.start_time" class="mt-1 text-xs text-danger">{{ formErrors.availabilities[index].start_time }}</div>
                </div>
                <div class="col-span-12 sm:col-span-4">
                  <FormLabel :htmlFor="`slot-end-${index}`">{{ t('studentAvailabilities.form.endTime') }} *</FormLabel>
                  <FormInput :id="`slot-end-${index}`" v-model="slot.end_time" type="time" :class="{ 'border-danger': formErrors.availabilities?.[index]?.end_time }" />
                  <div v-if="formErrors.availabilities?.[index]?.end_time" class="mt-1 text-xs text-danger">{{ formErrors.availabilities[index].end_time }}</div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="!isSingleEditMode" class="mt-3">
            <Button type="button" variant="outline-primary" size="sm" @click="addSlot" class="w-full">
              <Lucide icon="Plus" class="w-4 h-4 mr-2" />{{ t('studentAvailabilities.actions.addSlot') }}
            </Button>
          </div>
        </div>
      </Dialog.Description>
      <Dialog.Footer class="text-right">
        <Button type="button" variant="outline-secondary" @click="closeModal" :disabled="isSubmitting || loadingEditAvailabilities" class="min-w-28 mr-2">{{ t('studentAvailabilities.actions.cancel') }}</Button>
        <Button type="button" variant="primary" @click="handleSave" :disabled="isSubmitting || loadingEditAvailabilities" class="min-w-44">
          <Lucide v-if="isSubmitting" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else-if="isSingleEditMode">{{ t('studentAvailabilities.actions.update') }}</span>
          <span v-else-if="isEditMode">{{ t('studentAvailabilities.actions.updateAll') }}</span>
          <span v-else>{{ t('studentAvailabilities.actions.createAll') }}</span>
        </Button>
      </Dialog.Footer>
    </Dialog.Panel>
  </Dialog>

  <!-- Delete Modal -->
  <Dialog :open="deleteConfirmModal" @close="cancelDelete" :staticBackdrop="true">
    <Dialog.Panel>
      <div class="p-5 text-center">
        <Lucide icon="AlertTriangle" class="w-16 h-16 mx-auto mt-3 text-danger" />
        <div class="mt-5 text-3xl">{{ t('studentAvailabilities.delete.confirmTitle') }}</div>
        <div class="mt-2 text-slate-500">
          {{ t('studentAvailabilities.delete.confirmMessage', { student: availabilityToDelete?.student?.name || '', day: availabilityToDelete ? getDayName(availabilityToDelete.day_of_week) : '' }) }}<br />
          {{ t('studentAvailabilities.delete.cannotUndo') }}
        </div>
      </div>
      <div class="px-5 pb-8 text-center">
        <Button type="button" variant="outline-secondary" @click="cancelDelete" :disabled="deleting" class="w-24 mr-2">{{ t('studentAvailabilities.actions.cancel') }}</Button>
        <Button type="button" variant="danger" @click="handleDelete" :disabled="deleting" class="w-24">
          <Lucide v-if="deleting" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else>{{ t('studentAvailabilities.actions.delete') }}</span>
        </Button>
      </div>
    </Dialog.Panel>
  </Dialog>

  <ToastNotification :show="showToast" :message="toastMessage" :type="toastType" @close="handleToastClose" />
</template>
