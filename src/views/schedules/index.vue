<script setup lang="ts">
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import { Dialog } from '@/components/Base/Headless'
import { FormInput, FormLabel, FormSelect } from '@/components/Base/Form'
import Table from '@/components/Base/Table'
import Pagination from '@/components/Base/Pagination'
import TomSelect from '@/components/Base/TomSelect'
import ToastNotification from '@/views/components/ToastNotification.vue'
import { useSchedules } from './useSchedules'

const {
  t, schedules, allCourses, allTeachers, showModal, isEditMode, isSingleEditMode,
  loadingGroupSchedules, formData, formErrors, deleteConfirmModal, scheduleToDelete,
  showToast, toastMessage, toastType, currentPage, perPage, totalItems,
  filterCourseId, filterDayOfWeek, filterTeacherId, filterDescription, filterStartTime, filterEndTime,
  loading, error, creating, deleting,
  isSubmitting, modalTitle, startItem, endItem, totalPages, hasActiveFilters, sortedSchedules, dayOptions,
  openCreateModal, openSingleEditModal, openEditModal, closeModal,
  addSlot, removeSlot, handleSave, openDeleteConfirm, handleDelete, cancelDelete,
  goToPage, changePerPage, clearFilters, handleToastClose, refetch,
  getDayName, isFirstOccurrenceOfGroup, isFirstInCourseGroup, isDifferentCourseFromPrevious, getCourseGroupBackground,
} = useSchedules()
</script>

<template>
  <div class="w-full">
    <div class="flex flex-col gap-y-3 md:h-10 md:flex-row md:items-center">
      <div class="text-base font-medium">{{ t('schedules.title') }}</div>
      <div class="flex flex-col gap-x-3 gap-y-2 sm:flex-row md:ml-auto">
        <Button variant="primary" @click="openCreateModal">
          <Lucide icon="Plus" class="w-4 h-4 mr-2" />{{ t('schedules.actions.new') }}
        </Button>
      </div>
    </div>

    <div class="box box--stacked flex flex-col mt-5 w-full">
      <!-- Filters -->
      <div class="p-5 border-b border-slate-200/60">
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div class="flex-1">
              <TomSelect v-model="filterCourseId" :options="{ placeholder: t('schedules.filters.allCourses'), allowEmptyOption: true, create: false }" class="w-full">
                <option value="">{{ t('schedules.filters.allCourses') }}</option>
                <option v-for="course in allCourses" :key="course.id" :value="course.id">{{ course.name }}</option>
              </TomSelect>
            </div>
            <div class="flex-1">
              <TomSelect v-model="filterTeacherId" :options="{ placeholder: t('schedules.filters.allTeachers'), allowEmptyOption: true, create: false }" class="w-full">
                <option value="">{{ t('schedules.filters.allTeachers') }}</option>
                <option v-for="teacher in allTeachers" :key="teacher.id" :value="teacher.id">{{ teacher.name }}</option>
              </TomSelect>
            </div>
            <div class="flex-1">
              <FormSelect v-model="filterDayOfWeek">
                <option value="">{{ t('schedules.filters.allDays') }}</option>
                <option value="0">{{ t('schedules.days.sunday') }}</option>
                <option value="1">{{ t('schedules.days.monday') }}</option>
                <option value="2">{{ t('schedules.days.tuesday') }}</option>
                <option value="3">{{ t('schedules.days.wednesday') }}</option>
                <option value="4">{{ t('schedules.days.thursday') }}</option>
                <option value="5">{{ t('schedules.days.friday') }}</option>
                <option value="6">{{ t('schedules.days.saturday') }}</option>
              </FormSelect>
            </div>
          </div>
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div class="flex-1">
              <FormInput v-model="filterDescription" type="text" :placeholder="t('schedules.filters.searchDescription')" />
            </div>
            <div class="flex-1 sm:flex-[0.5]">
              <FormInput v-model="filterStartTime" type="time" :placeholder="t('schedules.filters.startTime')" />
            </div>
            <div class="flex-1 sm:flex-[0.5]">
              <FormInput v-model="filterEndTime" type="time" :placeholder="t('schedules.filters.endTime')" />
            </div>
            <div>
              <Button v-if="hasActiveFilters" variant="outline-secondary" @click="clearFilters" class="w-full sm:w-auto">
                <Lucide icon="X" class="w-4 h-4 mr-2" />{{ t('schedules.actions.clearFilters') }}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <!-- Error State -->
      <div v-if="error" class="flex items-center justify-center p-10">
        <div class="flex flex-col items-center gap-3">
          <Lucide icon="AlertCircle" class="w-8 h-8 text-danger" />
          <div class="text-sm text-slate-500">{{ t('schedules.messages.error') }}</div>
          <Button variant="outline-primary" @click="() => refetch()">{{ t('schedules.actions.retry') }}</Button>
        </div>
      </div>

      <!-- Table -->
      <div v-else class="overflow-x-auto">
        <Table class="border-b border-slate-200/60">
          <Table.Thead>
            <Table.Tr>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('schedules.columns.course') }}</Table.Td>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('schedules.columns.teacher') }}</Table.Td>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('schedules.columns.dayOfWeek') }}</Table.Td>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('schedules.columns.startsAt') }}</Table.Td>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('schedules.columns.endsAt') }}</Table.Td>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('schedules.columns.description') }}</Table.Td>
              <Table.Td class="py-4 font-medium bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('schedules.columns.capacity') }}</Table.Td>
              <Table.Td class="py-4 font-medium text-center bg-slate-50 dark:bg-darkmode-800 text-slate-500 border-slate-200/60 whitespace-nowrap">{{ t('schedules.columns.actions') }}</Table.Td>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            <Table.Tr v-if="sortedSchedules.length === 0">
              <Table.Td colspan="8" class="py-10 text-center text-slate-500">
                <div class="flex flex-col items-center gap-3">
                  <Lucide icon="Inbox" class="w-10 h-10 text-slate-300" />
                  <div>{{ t('schedules.empty') }}</div>
                </div>
              </Table.Td>
            </Table.Tr>
            <Table.Tr
              v-for="(schedule, index) in sortedSchedules"
              :key="schedule.id"
              :class="['[&_td]:last:border-b-0', getCourseGroupBackground(schedule.course_id), isDifferentCourseFromPrevious(schedule.course_id, index) ? 'border-t-2 border-t-slate-300 dark:border-t-slate-600' : '']"
            >
              <Table.Td :class="['py-4 border-dashed transition-colors', getCourseGroupBackground(schedule.course_id)]">
                <div v-if="isFirstInCourseGroup(schedule.course_id, index)" class="font-medium text-slate-700 dark:text-slate-200">{{ schedule.course.name }}</div>
                <div v-else class="text-slate-400 dark:text-slate-500 text-sm">&mdash;</div>
              </Table.Td>
              <Table.Td :class="['py-4 border-dashed transition-colors', getCourseGroupBackground(schedule.course_id)]">
                <div class="text-slate-600 dark:text-slate-300">{{ schedule.teacher.name }}</div>
              </Table.Td>
              <Table.Td :class="['py-4 border-dashed transition-colors', getCourseGroupBackground(schedule.course_id)]">
                <div class="px-2 py-1 text-xs font-medium rounded-md bg-primary/10 text-primary inline-block">{{ getDayName(schedule.day_of_week) }}</div>
              </Table.Td>
              <Table.Td :class="['py-4 border-dashed transition-colors', getCourseGroupBackground(schedule.course_id)]">
                <div class="font-mono text-slate-600 dark:text-slate-300">{{ schedule.starts_at }}</div>
              </Table.Td>
              <Table.Td :class="['py-4 border-dashed transition-colors', getCourseGroupBackground(schedule.course_id)]">
                <div class="font-mono text-slate-600 dark:text-slate-300">{{ schedule.ends_at }}</div>
              </Table.Td>
              <Table.Td :class="['py-4 border-dashed transition-colors', getCourseGroupBackground(schedule.course_id)]">
                <div class="font-mono text-slate-600 dark:text-slate-300">{{ schedule.description }}</div>
              </Table.Td>
              <Table.Td :class="['py-4 border-dashed transition-colors', getCourseGroupBackground(schedule.course_id)]">
                <div class="text-slate-600 dark:text-slate-300">{{ schedule.capacity }}</div>
              </Table.Td>
              <Table.Td :class="['relative py-4 border-dashed transition-colors', getCourseGroupBackground(schedule.course_id)]">
                <div class="flex items-center justify-center gap-2">
                  <Button variant="outline-primary" size="sm" @click="openSingleEditModal(schedule)" class="w-16">
                    <Lucide icon="Pencil" class="w-3.5 h-3.5 mr-1" />{{ t('schedules.actions.edit') }}
                  </Button>
                  <Button variant="outline-danger" size="sm" @click="openDeleteConfirm(schedule)" class="w-20">
                    <Lucide icon="Trash2" class="w-3.5 h-3.5 mr-1" />{{ t('schedules.actions.delete') }}
                  </Button>
                  <Button v-if="isFirstOccurrenceOfGroup(schedule, index)" variant="outline-secondary" size="sm" @click="openEditModal(schedule)" class="w-24">
                    <Lucide icon="List" class="w-3.5 h-3.5 mr-1" />{{ t('schedules.actions.manage') }}
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
          <span class="text-sm text-slate-600">{{ t('schedules.pagination.show') }}</span>
          <select v-model.number="perPage" @change="changePerPage(perPage)" class="px-3 py-2 text-sm border rounded-md border-slate-300 dark:border-darkmode-400 dark:bg-darkmode-800 focus:ring-2 focus:ring-primary focus:border-primary">
            <option :value="10">10</option><option :value="25">25</option><option :value="50">50</option><option :value="100">100</option>
          </select>
          <span class="text-sm text-slate-600">{{ t('schedules.pagination.entries') }}</span>
        </div>
        <div class="text-sm text-slate-600 sm:ml-auto">{{ t('schedules.pagination.showingInfo', { start: startItem, end: endItem, total: totalItems }) }}</div>
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
            <FormLabel htmlFor="schedule-course">{{ t('schedules.form.course') }} *</FormLabel>
            <FormSelect id="schedule-course" v-model="formData.course_id" :disabled="isEditMode || isSingleEditMode || loadingGroupSchedules" :class="{ 'border-danger': formErrors.course_id }">
              <option value="">{{ t('schedules.form.selectCourse') }}</option>
              <option v-for="course in allCourses" :key="course.id" :value="course.id">{{ course.name }}</option>
            </FormSelect>
            <div v-if="formErrors.course_id" class="mt-1 text-xs text-danger">{{ formErrors.course_id }}</div>
          </div>
          <div class="col-span-12">
            <FormLabel htmlFor="schedule-description">{{ t('schedules.form.description') }} *</FormLabel>
            <FormInput id="schedule-description" v-model="formData.description" type="text" :placeholder="t('schedules.form.descriptionPlaceholder')" :disabled="loadingGroupSchedules" :class="{ 'border-danger': formErrors.description }" />
            <div v-if="formErrors.description" class="mt-1 text-xs text-danger">{{ formErrors.description }}</div>
          </div>
          <div class="col-span-12">
            <FormLabel htmlFor="schedule-capacity">{{ t('schedules.form.capacity') }} *</FormLabel>
            <FormInput id="schedule-capacity" v-model.number="formData.capacity" type="number" min="1" :placeholder="t('schedules.form.capacityPlaceholder')" :disabled="loadingGroupSchedules" />
          </div>
          <div v-if="loadingGroupSchedules" class="col-span-12 flex items-center justify-center py-8">
            <div class="flex flex-col items-center gap-3">
              <Lucide icon="Loader" class="w-6 h-6 animate-spin text-primary" />
              <div class="text-sm text-slate-500">{{ t('schedules.messages.loadingSchedules') }}</div>
            </div>
          </div>
          <div v-if="!loadingGroupSchedules" class="col-span-12">
            <div class="flex items-center justify-between mb-3">
              <FormLabel class="mb-0">{{ t('schedules.form.scheduleSlots') }}</FormLabel>
            </div>
            <div class="max-h-80 overflow-y-auto pr-2 space-y-3 scroll-smooth border border-slate-200/60 rounded-lg p-3 dark:border-darkmode-400">
              <div v-for="(slot, index) in formData.schedules" :key="index" class="p-4 border-2 border-slate-200 rounded-lg dark:border-darkmode-400 bg-white dark:bg-darkmode-800 shadow-sm">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-2">
                    <div class="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-semibold text-sm">{{ index + 1 }}</div>
                    <div class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ t('schedules.form.slot', { number: index + 1 }) }}</div>
                  </div>
                  <Button v-if="!isSingleEditMode && formData.schedules.length > 1" type="button" variant="soft-danger" size="sm" @click="removeSlot(index)" class="px-3">
                    <Lucide icon="Trash2" class="w-3.5 h-3.5 mr-1.5" />{{ t('schedules.actions.removeSlot') }}
                  </Button>
                </div>
                <div class="grid grid-cols-12 gap-3">
                  <div class="col-span-12">
                    <FormLabel :htmlFor="`slot-teacher-${index}`">{{ t('schedules.form.teacher') }} *</FormLabel>
                    <FormSelect :id="`slot-teacher-${index}`" v-model="slot.teacher_id" :class="{ 'border-danger': formErrors.schedules?.[index]?.teacher_id }">
                      <option value="">{{ t('schedules.form.selectTeacher') }}</option>
                      <option v-for="teacher in allTeachers" :key="teacher.id" :value="teacher.id">{{ teacher.name }}</option>
                    </FormSelect>
                    <div v-if="formErrors.schedules?.[index]?.teacher_id" class="mt-1 text-xs text-danger">{{ formErrors.schedules[index].teacher_id }}</div>
                  </div>
                  <div class="col-span-12 sm:col-span-4">
                    <FormLabel :htmlFor="`slot-day-${index}`">{{ t('schedules.form.dayOfWeek') }} *</FormLabel>
                    <FormSelect :id="`slot-day-${index}`" v-model="slot.day_of_week" :class="{ 'border-danger': formErrors.schedules?.[index]?.day_of_week }">
                      <option value="">{{ t('schedules.form.selectDay') }}</option>
                      <option v-for="day in dayOptions" :key="day.value" :value="day.value">{{ day.label }}</option>
                    </FormSelect>
                    <div v-if="formErrors.schedules?.[index]?.day_of_week" class="mt-1 text-xs text-danger">{{ formErrors.schedules[index].day_of_week }}</div>
                  </div>
                  <div class="col-span-12 sm:col-span-4">
                    <FormLabel :htmlFor="`slot-start-${index}`">{{ t('schedules.form.startsAt') }} *</FormLabel>
                    <FormInput :id="`slot-start-${index}`" v-model="slot.starts_at" type="time" :class="{ 'border-danger': formErrors.schedules?.[index]?.starts_at }" />
                    <div v-if="formErrors.schedules?.[index]?.starts_at" class="mt-1 text-xs text-danger">{{ formErrors.schedules[index].starts_at }}</div>
                  </div>
                  <div class="col-span-12 sm:col-span-4">
                    <FormLabel :htmlFor="`slot-end-${index}`">{{ t('schedules.form.endsAt') }} *</FormLabel>
                    <FormInput :id="`slot-end-${index}`" v-model="slot.ends_at" type="time" :class="{ 'border-danger': formErrors.schedules?.[index]?.ends_at }" />
                    <div v-if="formErrors.schedules?.[index]?.ends_at" class="mt-1 text-xs text-danger">{{ formErrors.schedules[index].ends_at }}</div>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="!isSingleEditMode" class="mt-3">
              <Button type="button" variant="outline-primary" size="sm" @click="addSlot" class="w-full">
                <Lucide icon="Plus" class="w-4 h-4 mr-2" />{{ t('schedules.actions.addSlot') }}
              </Button>
            </div>
          </div>
        </Dialog.Description>
        <Dialog.Footer class="text-right">
          <Button type="button" variant="outline-secondary" @click="closeModal" :disabled="isSubmitting || loadingGroupSchedules" class="min-w-28 mr-2">{{ t('schedules.actions.cancel') }}</Button>
          <Button type="button" variant="primary" @click="handleSave" :disabled="isSubmitting || loadingGroupSchedules" class="min-w-44">
            <Lucide v-if="isSubmitting" icon="Loader" class="w-4 h-4 animate-spin" />
            <span v-else-if="isSingleEditMode">{{ t('schedules.actions.update') }}</span>
            <span v-else-if="isEditMode">{{ t('schedules.actions.updateAll') }}</span>
            <span v-else>{{ t('schedules.actions.createAll') }}</span>
          </Button>
        </Dialog.Footer>
      </Dialog.Panel>
    </Dialog>

    <!-- Delete Modal -->
    <Dialog :open="deleteConfirmModal" @close="cancelDelete" :staticBackdrop="true">
      <Dialog.Panel>
        <div class="p-5 text-center">
          <Lucide icon="AlertTriangle" class="w-16 h-16 mx-auto mt-3 text-danger" />
          <div class="mt-5 text-3xl">{{ t('schedules.delete.title') }}</div>
          <div class="mt-2 text-slate-500">
            {{ t('schedules.delete.message', { course: scheduleToDelete?.course?.name || '' }) }}<br />
            {{ t('schedules.delete.cannotUndo') }}
          </div>
        </div>
        <div class="px-5 pb-8 text-center">
          <Button type="button" variant="outline-secondary" @click="cancelDelete" :disabled="deleting" class="w-24 mr-2">{{ t('schedules.delete.cancel') }}</Button>
          <Button type="button" variant="danger" @click="handleDelete" :disabled="deleting" class="w-24">
            <Lucide v-if="deleting" icon="Loader" class="w-4 h-4 animate-spin" />
            <span v-else>{{ t('schedules.delete.confirm') }}</span>
          </Button>
        </div>
      </Dialog.Panel>
    </Dialog>

    <ToastNotification :show="showToast" :message="toastMessage" :type="toastType" @close="handleToastClose" />
  </div>
</template>
