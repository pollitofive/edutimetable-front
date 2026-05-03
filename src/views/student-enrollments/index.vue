<script setup lang="ts">
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import { Dialog } from '@/components/Base/Headless'
import { FormLabel, FormSelect, FormTextarea } from '@/components/Base/Form'
import Table from '@/components/Base/Table'
import Pagination from '@/components/Base/Pagination'
import ToastNotification from '@/views/components/ToastNotification.vue'
import { useStudentEnrollments } from './useStudentEnrollments'

const {
  t, enrollments, allStudents, allSchedules, showModal, isEditMode,
  formData, formErrors, deleteConfirmModal, enrollmentToDelete,
  showToast, toastMessage, toastType, availabilitiesLoading,
  currentPage, perPage, totalItems, filterStudentId, filterScheduleId, filterStatus,
  loading, error, creating, deleting,
  isSubmitting, modalTitle, startItem, endItem, totalPages, hasActiveFilters,
  statusOptions, groupedSchedules,
  openCreateModal, openEditModal, closeModal, handleSave,
  openDeleteConfirm, handleDelete, cancelDelete,
  goToPage, changePerPage, clearFilters, retryFetch, handleToastClose,
  getDayName, getStatusBadgeClass, getStatusLabel, getScheduleDisplay,
} = useStudentEnrollments()
</script>

<template>
  <div class="w-full">
    <div class="flex flex-col gap-y-3 md:h-10 md:flex-row md:items-center">
      <div class="text-base font-medium">{{ t('studentEnrollments.title') }}</div>
      <div class="flex flex-col gap-x-3 gap-y-2 sm:flex-row md:ml-auto">
        <Button variant="primary" @click="openCreateModal">
          <Lucide icon="Plus" class="w-4 h-4 mr-2" />{{ t('studentEnrollments.actions.new') }}
        </Button>
      </div>
    </div>

    <div class="box box--stacked flex flex-col mt-5 w-full">
      <!-- Filters -->
      <div class="p-5 border-b border-slate-200/60">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div class="flex-1">
            <FormSelect v-model="filterStudentId">
              <option value="">{{ t('studentEnrollments.filters.allStudents') }}</option>
              <option v-for="student in allStudents" :key="student.id" :value="student.id">{{ student.name }} ({{ student.code }})</option>
            </FormSelect>
          </div>
          <div class="flex-1">
            <FormSelect v-model="filterScheduleId">
              <option value="">{{ t('studentEnrollments.filters.allSchedules') }}</option>
              <option v-for="schedule in allSchedules" :key="schedule.id" :value="schedule.id">{{ getScheduleDisplay(schedule) }}</option>
            </FormSelect>
          </div>
          <div class="flex-1">
            <FormSelect v-model="filterStatus">
              <option value="">{{ t('studentEnrollments.filters.allStatuses') }}</option>
              <option value="ACTIVE">{{ t('studentEnrollments.status.active') }}</option>
              <option value="COMPLETED">{{ t('studentEnrollments.status.completed') }}</option>
              <option value="DROPPED">{{ t('studentEnrollments.status.dropped') }}</option>
              <option value="PENDING">{{ t('studentEnrollments.status.pending') }}</option>
            </FormSelect>
          </div>
          <div>
            <Button v-if="hasActiveFilters" variant="outline-secondary" @click="clearFilters" class="w-full sm:w-auto">
              <Lucide icon="X" class="w-4 h-4 mr-2" />{{ t('studentEnrollments.actions.clearFilters') }}
            </Button>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="error" class="flex items-center justify-center p-10">
        <div class="flex flex-col items-center gap-3">
          <Lucide icon="AlertCircle" class="w-8 h-8 text-danger" />
          <div class="text-sm text-slate-500">{{ t('studentEnrollments.messages.error') }}</div>
          <Button variant="outline-primary" @click="retryFetch">{{ t('studentEnrollments.actions.retry') }}</Button>
        </div>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <Table class="border-b border-slate-200/60">
          <Table.Thead>
            <Table.Tr>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('studentEnrollments.columns.student') }}</Table.Td>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('studentEnrollments.columns.course') }}</Table.Td>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('studentEnrollments.columns.teacher') }}</Table.Td>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('studentEnrollments.columns.schedule') }}</Table.Td>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('studentEnrollments.columns.status') }}</Table.Td>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('studentEnrollments.columns.notes') }}</Table.Td>
              <Table.Td class="py-4 font-medium text-center bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('studentEnrollments.columns.actions') }}</Table.Td>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr v-if="enrollments.length === 0">
              <Table.Td colspan="7" class="py-10 text-center text-slate-500">
                <div class="flex flex-col items-center gap-3">
                  <Lucide icon="Inbox" class="w-10 h-10 text-slate-300" />
                  <div>{{ t('studentEnrollments.messages.noEnrollments') }}</div>
                </div>
              </Table.Td>
            </Table.Tr>
            <Table.Tr v-for="enrollment in enrollments" :key="enrollment.id" class="[&_td]:last:border-b-0">
              <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
                <div class="font-medium">{{ enrollment.student.name }}</div>
                <div class="text-xs text-slate-500">{{ enrollment.student.code }}</div>
              </Table.Td>
              <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
                <div class="font-medium">{{ enrollment.schedule.course.name }}</div>
                <div v-if="enrollment.schedule.course.level" class="text-xs text-slate-500">{{ enrollment.schedule.course.level }}</div>
              </Table.Td>
              <Table.Td class="py-4 border-dashed dark:bg-darkmode-600"><div class="text-slate-600">{{ enrollment.schedule.teacher.name }}</div></Table.Td>
              <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
                <div class="text-xs">
                  <div class="px-2 py-1 rounded-md bg-primary/10 text-primary inline-block mb-1">{{ getDayName(enrollment.schedule.day_of_week) }}</div>
                  <div class="font-mono text-slate-600">{{ enrollment.schedule.starts_at }} - {{ enrollment.schedule.ends_at }}</div>
                </div>
              </Table.Td>
              <Table.Td class="py-4 border-dashed dark:bg-darkmode-600">
                <span class="px-2 py-1 text-xs font-medium rounded-md" :class="getStatusBadgeClass(enrollment.status)">{{ getStatusLabel(enrollment.status) }}</span>
              </Table.Td>
              <Table.Td class="py-4 border-dashed dark:bg-darkmode-600"><div class="text-xs text-slate-600 max-w-xs truncate">{{ enrollment.notes || '-' }}</div></Table.Td>
              <Table.Td class="relative py-4 border-dashed dark:bg-darkmode-600">
                <div class="flex items-center justify-center gap-2">
                  <Button variant="outline-primary" size="sm" @click="openEditModal(enrollment)" class="w-16">
                    <Lucide icon="Pencil" class="w-3.5 h-3.5 mr-1" />{{ t('studentEnrollments.actions.edit') }}
                  </Button>
                  <Button variant="outline-danger" size="sm" @click="openDeleteConfirm(enrollment)" class="w-20">
                    <Lucide icon="Trash2" class="w-3.5 h-3.5 mr-1" />{{ t('studentEnrollments.actions.delete') }}
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
          <span class="text-sm text-slate-600">{{ t('studentEnrollments.pagination.show') }}</span>
          <select v-model.number="perPage" @change="changePerPage(perPage)" class="px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-darkmode-400 dark:bg-darkmode-800 focus:ring-2 focus:ring-primary focus:border-primary">
            <option :value="10">10</option><option :value="25">25</option><option :value="50">50</option><option :value="100">100</option>
          </select>
          <span class="text-sm text-slate-600">{{ t('studentEnrollments.pagination.entries') }}</span>
        </div>
        <div class="text-sm text-slate-600 sm:ml-auto">{{ t('studentEnrollments.pagination.showingInfo', { start: startItem, end: endItem, total: totalItems }) }}</div>
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
      <Dialog.Panel class="max-w-2xl">
        <Dialog.Title><h2 class="mr-auto text-base font-medium">{{ modalTitle }}</h2></Dialog.Title>
        <Dialog.Description class="grid grid-cols-12 gap-4 gap-y-3">
          <div class="col-span-12">
            <FormLabel htmlFor="enrollment-student">{{ t('studentEnrollments.form.student') }} *</FormLabel>
            <FormSelect id="enrollment-student" v-model="formData.student_id" :disabled="isEditMode" :class="{ 'border-danger': formErrors.student_id }">
              <option value="">{{ t('studentEnrollments.form.selectStudent') }}</option>
              <option v-for="student in allStudents" :key="student.id" :value="student.id">{{ student.name }} ({{ student.code }})</option>
            </FormSelect>
            <div v-if="formErrors.student_id" class="mt-1 text-xs text-danger">{{ formErrors.student_id }}</div>
          </div>
          <div class="col-span-12">
            <FormLabel htmlFor="enrollment-group">{{ t('studentEnrollments.form.schedule') }} *</FormLabel>
            <div v-if="formData.student_id && availabilitiesLoading" class="p-3 mb-2 rounded-md bg-slate-100 text-slate-600 text-sm flex items-center gap-2">
              <Lucide icon="Loader" class="w-4 h-4 animate-spin" /><span>Loading student availabilities...</span>
            </div>
            <div v-if="!formData.student_id && !isEditMode" class="p-3 mb-2 rounded-md bg-blue-50 text-blue-700 text-sm flex items-center gap-2">
              <Lucide icon="Info" class="w-4 h-4" /><span>Please select a student first to see available course groups</span>
            </div>
            <div v-if="formData.student_id && !availabilitiesLoading && !isEditMode && groupedSchedules.length === 0" class="p-3 mb-2 rounded-md bg-yellow-50 text-yellow-700 text-sm flex items-center gap-2">
              <Lucide icon="AlertCircle" class="w-4 h-4" /><span>No course groups match this student's availability</span>
            </div>
            <FormSelect id="enrollment-group" v-model="formData.group_id" :disabled="isEditMode || !formData.student_id || availabilitiesLoading || groupedSchedules.length === 0" :class="{ 'border-danger': formErrors.group_id }">
              <option value="">{{ t('studentEnrollments.form.selectSchedule') }}</option>
              <option v-for="group in groupedSchedules" :key="group.group_id" :value="group.group_id">{{ group.displayText }}</option>
            </FormSelect>
            <div v-if="!isEditMode && formData.group_id" class="mt-2 p-2 rounded-md bg-blue-50 text-blue-700 text-xs flex items-start gap-2">
              <Lucide icon="Info" class="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Note: The student will be enrolled in ALL schedule slots in this group ({{ groupedSchedules.find(g => g.group_id === formData.group_id)?.schedules.length || 0 }} slots)</span>
            </div>
            <div v-if="formErrors.group_id" class="mt-1 text-xs text-danger">{{ formErrors.group_id }}</div>
          </div>
          <div class="col-span-12">
            <FormLabel htmlFor="enrollment-status">{{ t('studentEnrollments.form.status') }} *</FormLabel>
            <FormSelect id="enrollment-status" v-model="formData.status" :class="{ 'border-danger': formErrors.status }">
              <option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
            </FormSelect>
            <div v-if="formErrors.status" class="mt-1 text-xs text-danger">{{ formErrors.status }}</div>
          </div>
          <div class="col-span-12">
            <FormLabel htmlFor="enrollment-notes">{{ t('studentEnrollments.form.notes') }}</FormLabel>
            <FormTextarea id="enrollment-notes" v-model="formData.notes" rows="3" :placeholder="t('studentEnrollments.form.notesPlaceholder')" />
          </div>
        </Dialog.Description>
        <Dialog.Footer class="text-right">
          <Button type="button" variant="outline-secondary" @click="closeModal" :disabled="isSubmitting" class="w-20 mr-2">{{ t('studentEnrollments.actions.cancel') }}</Button>
          <Button type="button" variant="primary" @click="handleSave" :disabled="isSubmitting" class="w-32">
            <Lucide v-if="isSubmitting" icon="Loader" class="w-4 h-4 animate-spin" />
            <span v-else>{{ isEditMode ? t('studentEnrollments.actions.update') : t('studentEnrollments.actions.create') }}</span>
          </Button>
        </Dialog.Footer>
      </Dialog.Panel>
    </Dialog>

    <!-- Delete Modal -->
    <Dialog :open="deleteConfirmModal" @close="cancelDelete" :staticBackdrop="true">
      <Dialog.Panel>
        <div class="p-5 text-center">
          <Lucide icon="AlertTriangle" class="w-16 h-16 mx-auto mt-3 text-danger" />
          <div class="mt-5 text-3xl">{{ t('studentEnrollments.delete.title') }}</div>
          <div class="mt-2 text-slate-500">
            {{ t('studentEnrollments.delete.message', { student: enrollmentToDelete?.student?.name || '', course: enrollmentToDelete?.schedule?.course?.name || '' }) }}<br />
            {{ t('studentEnrollments.delete.cannotUndo') }}
          </div>
        </div>
        <div class="px-5 pb-8 text-center">
          <Button type="button" variant="outline-secondary" @click="cancelDelete" :disabled="deleting" class="w-24 mr-2">{{ t('studentEnrollments.delete.cancel') }}</Button>
          <Button type="button" variant="danger" @click="handleDelete" :disabled="deleting" class="w-24">
            <Lucide v-if="deleting" icon="Loader" class="w-4 h-4 animate-spin" />
            <span v-else>{{ t('studentEnrollments.delete.confirm') }}</span>
          </Button>
        </div>
      </Dialog.Panel>
    </Dialog>

    <ToastNotification :show="showToast" :message="toastMessage" :type="toastType" @close="handleToastClose" />
  </div>
</template>
