import { gql } from '@apollo/client/core'
import { useQuery, useMutation, useLazyQuery } from '@vue/apollo-composable'
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useLoading } from '@/composables/useLoading'
import { useDayNames } from '@/composables/useDayNames'

export interface Teacher { id: string; name: string }
export interface Course { id: string; name: string }
export interface Schedule { id: string; course_id: string; teacher_id: string; course: Course; teacher: Teacher; day_of_week: number; starts_at: string; ends_at: string; description: string; group_id?: string; capacity: number; active_enrollments_count: number }
// A course offering: every weekly slot sharing a group_id, listed as one unit
export interface ScheduleGroup { group_id: string; course: Course; description: string; capacity: number; active_enrollments_count: number; schedules: Schedule[] }
interface ScheduleSlot { id?: string; teacher_id: string; day_of_week: number | string; starts_at: string; ends_at: string }
interface SlotError { teacher_id?: string; day_of_week?: string; starts_at?: string; ends_at?: string }
interface FormData { course_id: string; description: string; capacity: number; schedules: ScheduleSlot[]; group_id?: string }

const GET_SCHEDULES = gql`
  query GetSchedules($first: Int!, $page: Int!, $course_id: ID, $day_of_week: Int, $teacher_id: ID, $description: String, $group_id: String, $starts_at_from: String, $starts_at_to: String) {
    schedules(first: $first, page: $page, course_id: $course_id, day_of_week: $day_of_week, teacher_id: $teacher_id, description: $description, group_id: $group_id, starts_at_from: $starts_at_from, starts_at_to: $starts_at_to) {
      data { id course_id teacher_id day_of_week starts_at ends_at description group_id capacity active_enrollments_count course { id name } teacher { id name } }
      paginatorInfo { total count currentPage lastPage hasMorePages perPage }
    }
  }
`
const GET_SCHEDULE_GROUPS = gql`
  query GetScheduleGroups($first: Int!, $page: Int!, $course_id: ID, $day_of_week: Int, $teacher_id: ID, $description: String, $starts_at_from: String, $starts_at_to: String) {
    scheduleGroups(first: $first, page: $page, course_id: $course_id, day_of_week: $day_of_week, teacher_id: $teacher_id, description: $description, starts_at_from: $starts_at_from, starts_at_to: $starts_at_to) {
      data { group_id description capacity active_enrollments_count course { id name } schedules { id day_of_week starts_at ends_at teacher { id name } } }
      paginatorInfo { total count currentPage lastPage hasMorePages perPage }
    }
  }
`
const GET_ALL_COURSES = gql`query GetAllCourses { courses(first: 10000) { data { id name } } }`
const GET_ALL_TEACHERS = gql`query GetAllTeachers { teachers(first: 10000) { data { id name } } }`
const BULK_CREATE_SCHEDULES = gql`
  mutation BulkCreateSchedules($input: BulkCreateSchedulesInput!) {
    bulkCreateSchedules(input: $input) { id course_id teacher_id day_of_week starts_at ends_at description group_id capacity course { id name } teacher { id name } }
  }
`
const BULK_UPDATE_SCHEDULES = gql`
  mutation BulkUpdateSchedules($input: BulkUpdateSchedulesInput!) {
    bulkUpdateSchedules(input: $input) { id course_id teacher_id day_of_week starts_at ends_at description group_id capacity course { id name } teacher { id name } }
  }
`
const DELETE_SCHEDULE_GROUP = gql`mutation DeleteScheduleGroup($group_id: String!) { deleteScheduleGroup(group_id: $group_id) { id } }`

export function useSchedules() {
  const { t } = useI18n()
  const { show: showLoading, hide: hideLoading } = useLoading()
  const { getDayName } = useDayNames('schedules')
  const route = useRoute()
  const router = useRouter()

  const scheduleGroups = ref<ScheduleGroup[]>([])
  const allCourses = ref<Course[]>([])
  const allTeachers = ref<Teacher[]>([])
  const showModal = ref(false)
  const isEditMode = ref(false)
  const groupSchedulesLoaded = ref(false)
  // Active students of the schedule/group being edited: with any, day/time and slots are locked (moving them goes through the simulator)
  const enrolledCount = ref(0)
  const isTimeLocked = computed(() => isEditMode.value && enrolledCount.value > 0)
  const formData = ref<FormData>({ course_id: '', description: '', capacity: 5, schedules: [{ teacher_id: '', day_of_week: '', starts_at: '', ends_at: '' }] })
  const formErrors = ref<{ course_id?: string; description?: string; schedules?: SlotError[] }>({})
  const deleteConfirmModal = ref(false)
  const groupToDelete = ref<ScheduleGroup | null>(null)
  const showToast = ref(false)
  const toastMessage = ref('')
  const toastType = ref<'success' | 'error' | 'info' | 'warning'>('success')

  const currentPage = ref(Number(route.query.page) || 1)
  const perPage = ref(10)
  const totalItems = ref(0)
  const lastPage = ref(1)

  const filterCourseId = ref((route.query.course as string) || '')
  const filterDayOfWeek = ref<string>((route.query.day as string) || '')
  const filterTeacherId = ref((route.query.teacher as string) || '')
  const filterDescription = ref((route.query.description as string) || '')
  const filterStartTime = ref((route.query.from as string) || '')
  const filterEndTime = ref((route.query.to as string) || '')

  const queryVariables = computed(() => ({
    first: perPage.value, page: currentPage.value,
    course_id: filterCourseId.value || undefined,
    day_of_week: filterDayOfWeek.value ? Number(filterDayOfWeek.value) : undefined,
    teacher_id: filterTeacherId.value || undefined,
    description: filterDescription.value ? `%${filterDescription.value}%` : undefined,
    starts_at_from: filterStartTime.value || undefined,
    starts_at_to: filterEndTime.value || undefined,
  }))

  const { result, loading, error, refetch } = useQuery(GET_SCHEDULE_GROUPS, queryVariables, { fetchPolicy: 'cache-and-network' })
  const { result: coursesResult } = useQuery(GET_ALL_COURSES)
  const { result: teachersResult } = useQuery(GET_ALL_TEACHERS)
  const { load: loadGroupSchedules, refetch: refetchGroupSchedules, loading: loadingGroupSchedules } = useLazyQuery(GET_SCHEDULES, { fetchPolicy: 'network-only' })
  const { mutate: bulkCreateSchedules, loading: creating } = useMutation(BULK_CREATE_SCHEDULES)
  const { mutate: bulkUpdateSchedules, loading: updating } = useMutation(BULK_UPDATE_SCHEDULES)
  const { mutate: deleteScheduleGroup, loading: deleting } = useMutation(DELETE_SCHEDULE_GROUP)

  const isSubmitting = computed(() => creating.value || updating.value)
  const modalTitle = computed(() => {
    if (isEditMode.value) return t('schedules.form.editTitle', { course: allCourses.value.find(c => c.id === formData.value.course_id)?.name || '' })
    return t('schedules.form.addTitle')
  })
  const startItem = computed(() => totalItems.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1)
  const endItem = computed(() => Math.min(currentPage.value * perPage.value, totalItems.value))
  const totalPages = computed(() => lastPage.value)
  const hasActiveFilters = computed(() =>
    filterCourseId.value !== '' || filterDayOfWeek.value !== '' || filterTeacherId.value !== '' ||
    filterDescription.value !== '' || filterStartTime.value !== '' || filterEndTime.value !== ''
  )
  const dayOptions = computed(() => [
    { value: 0, label: t('schedules.days.sunday') }, { value: 1, label: t('schedules.days.monday') },
    { value: 2, label: t('schedules.days.tuesday') }, { value: 3, label: t('schedules.days.wednesday') },
    { value: 4, label: t('schedules.days.thursday') }, { value: 5, label: t('schedules.days.friday') },
    { value: 6, label: t('schedules.days.saturday') },
  ])

  watch(
    () => loading.value || creating.value || updating.value || deleting.value || loadingGroupSchedules.value,
    (isActive) => isActive ? showLoading() : hideLoading(),
    { immediate: true }
  )
  watch(
    () => ({ course: filterCourseId.value, day: filterDayOfWeek.value, teacher: filterTeacherId.value, description: filterDescription.value, from: filterStartTime.value, to: filterEndTime.value, page: currentPage.value }),
    (v) => {
      const q: Record<string, string> = {}
      if (v.course) q.course = v.course; if (v.day) q.day = v.day; if (v.teacher) q.teacher = v.teacher
      if (v.description) q.description = v.description; if (v.from) q.from = v.from; if (v.to) q.to = v.to
      if (v.page > 1) q.page = String(v.page)
      void router.replace({ query: q })
    }
  )
  watch(result, (val) => {
    if (val?.scheduleGroups?.data) scheduleGroups.value = val.scheduleGroups.data
    if (val?.scheduleGroups?.paginatorInfo) {
      const info = val.scheduleGroups.paginatorInfo
      totalItems.value = info.total; lastPage.value = info.lastPage; currentPage.value = info.currentPage
    }
  })
  watch(coursesResult, (val) => { if (val?.courses?.data) allCourses.value = [...val.courses.data].sort((a, b) => a.name.localeCompare(b.name)) }, { immediate: true })
  watch(teachersResult, (val) => { if (val?.teachers?.data) allTeachers.value = [...val.teachers.data].sort((a, b) => a.name.localeCompare(b.name)) }, { immediate: true })
  watch([filterCourseId, filterDayOfWeek, filterTeacherId, filterDescription, filterStartTime, filterEndTime], () => { currentPage.value = 1 })

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    toastMessage.value = message; toastType.value = type; showToast.value = true
  }
  const handleToastClose = () => { showToast.value = false }

  const normalizeTime = (time: string): string => {
    if (!time) return time
    const parts = time.split(':')
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : time
  }

  const addSlot = () => {
    const last = formData.value.schedules.at(-1)
    formData.value.schedules.push({ teacher_id: last?.teacher_id || '', day_of_week: last?.day_of_week || '', starts_at: last?.starts_at || '', ends_at: last?.ends_at || '' })
  }
  const removeSlot = (index: number) => {
    if (formData.value.schedules.length > 1) { formData.value.schedules.splice(index, 1); formErrors.value.schedules?.splice(index, 1) }
  }

  const validateForm = (): boolean => {
    formErrors.value = { schedules: [] }
    if (!formData.value.course_id) formErrors.value.course_id = t('schedules.validation.courseRequired')
    if (!formData.value.description?.trim()) formErrors.value.description = t('schedules.validation.descriptionRequired')
    if (!formData.value.schedules.length) { notify(t('schedules.validation.atLeastOneSlot'), 'error'); return false }
    let hasErrors = false
    formData.value.schedules.forEach((slot, index) => {
      const slotErrors: SlotError = {}
      if (!slot.teacher_id?.trim()) { slotErrors.teacher_id = t('schedules.validation.teacherRequired'); hasErrors = true }
      if (slot.day_of_week === '') { slotErrors.day_of_week = t('schedules.validation.dayRequired'); hasErrors = true }
      if (!slot.starts_at?.trim()) { slotErrors.starts_at = t('schedules.validation.startTimeRequired'); hasErrors = true }
      if (!slot.ends_at?.trim()) { slotErrors.ends_at = t('schedules.validation.endTimeRequired'); hasErrors = true }
      if (slot.starts_at && slot.ends_at && slot.ends_at <= slot.starts_at) { slotErrors.ends_at = t('schedules.validation.endTimeAfterStart'); hasErrors = true }
      if (Object.keys(slotErrors).length > 0) { if (!formErrors.value.schedules) formErrors.value.schedules = []; formErrors.value.schedules[index] = slotErrors }
    })
    return !hasErrors && !formErrors.value.course_id && !formErrors.value.description
  }

  const resetForm = () => {
    formData.value = { course_id: '', description: '', capacity: 5, schedules: [{ teacher_id: '', day_of_week: '', starts_at: '', ends_at: '' }], group_id: undefined }
    formErrors.value = {}
    enrolledCount.value = 0
  }

  const openCreateModal = () => { isEditMode.value = false; resetForm(); showModal.value = true }

  const openEditModal = async (group: ScheduleGroup) => {
    isEditMode.value = true
    formData.value = { course_id: group.course.id, description: '', capacity: 5, schedules: [], group_id: undefined }
    formErrors.value = {}; enrolledCount.value = 0; showModal.value = true
    try {
      const vars: any = { first: 1000, page: 1, group_id: group.group_id }
      let res: any
      if (!groupSchedulesLoaded.value) { res = await loadGroupSchedules(null, vars); groupSchedulesLoaded.value = true }
      else res = await refetchGroupSchedules(vars)
      const data = res?.data?.schedules?.data || res?.schedules?.data
      if (data?.length) {
        formData.value.description = data[0].description || ''
        formData.value.capacity = data[0].capacity ?? 5
        formData.value.group_id = data[0].group_id
        formData.value.schedules = data.map((s: any) => ({ id: s.id, teacher_id: s.teacher_id, day_of_week: s.day_of_week, starts_at: s.starts_at, ends_at: s.ends_at }))
        // Each student is enrolled in every slot of the group, so the busiest slot is the group's count
        enrolledCount.value = Math.max(...data.map((s: any) => s.active_enrollments_count ?? 0))
      } else {
        formData.value.schedules = [{ teacher_id: '', day_of_week: '', starts_at: '', ends_at: '' }]
      }
    } catch {
      notify(t('schedules.messages.loadError') || 'Error loading schedules', 'error')
      formData.value.schedules = [{ teacher_id: '', day_of_week: '', starts_at: '', ends_at: '' }]
    }
  }

  const closeModal = () => {
    showModal.value = false; isEditMode.value = false; resetForm()
  }

  const handleSave = async () => {
    if (!validateForm()) return
    try {
      if (isEditMode.value) {
        await bulkUpdateSchedules({ input: { course_id: formData.value.course_id, description: formData.value.description, capacity: Number(formData.value.capacity), group_id: formData.value.group_id, schedules: formData.value.schedules.map(s => ({ id: s.id, teacher_id: Number(s.teacher_id), day_of_week: Number(s.day_of_week), starts_at: normalizeTime(s.starts_at), ends_at: normalizeTime(s.ends_at) })) } })
        notify(t('schedules.messages.updateSuccess'))
      } else {
        await bulkCreateSchedules({ input: { course_id: formData.value.course_id, description: formData.value.description, capacity: Number(formData.value.capacity), schedules: formData.value.schedules.map(s => ({ teacher_id: Number(s.teacher_id), day_of_week: Number(s.day_of_week), starts_at: normalizeTime(s.starts_at), ends_at: normalizeTime(s.ends_at) })) } })
        notify(t('schedules.messages.createSuccess'))
      }
      closeModal(); applyFilters()
    } catch (err: any) {
      if (err.graphQLErrors?.[0]?.extensions?.category === 'validation') { notify(`Validation Error: ${Object.values(err.graphQLErrors[0].extensions.validation).flat().join(', ')}`, 'error'); return }
      if (err.graphQLErrors?.[0]?.message) { notify(err.graphQLErrors[0].message, 'error'); return }
      notify(err.message || t('schedules.messages.generalError'), 'error')
    }
  }

  const openDeleteConfirm = (group: ScheduleGroup) => { groupToDelete.value = group; deleteConfirmModal.value = true }
  const handleDelete = async () => {
    if (!groupToDelete.value) return
    try {
      await deleteScheduleGroup({ group_id: groupToDelete.value.group_id })
      notify(t('schedules.messages.deleteSuccess'))
      deleteConfirmModal.value = false; groupToDelete.value = null; applyFilters()
    } catch (err: any) {
      const validation = err.graphQLErrors?.[0]?.extensions?.validation
      notify(validation ? Object.values(validation).flat().join(', ') : err.message || t('schedules.messages.deleteError'), 'error')
    }
  }
  const cancelDelete = () => { deleteConfirmModal.value = false; groupToDelete.value = null }

  const goToPage = (page: number) => { if (page >= 1 && page <= lastPage.value) currentPage.value = page }
  const changePerPage = (newPerPage: number) => { perPage.value = newPerPage; currentPage.value = 1 }
  const applyFilters = () => { currentPage.value = 1 }
  const clearFilters = () => { filterCourseId.value = ''; filterDayOfWeek.value = ''; filterTeacherId.value = ''; filterDescription.value = ''; filterStartTime.value = ''; filterEndTime.value = ''; applyFilters() }

  // Groups come sorted by course: a course with several groups shows its name only on the first one
  const isFirstGroupOfCourse = (index: number): boolean => index === 0 || scheduleGroups.value[index - 1]?.course.id !== scheduleGroups.value[index].course.id
  const getCourseBackground = (courseId: string): string => {
    const unique = [...new Set(scheduleGroups.value.map(g => g.course.id))]
    return unique.indexOf(courseId) % 2 === 0 ? 'bg-white dark:bg-darkmode-600' : 'bg-slate-50/50 dark:bg-darkmode-700'
  }

  return {
    t, scheduleGroups, allCourses, allTeachers, showModal, isEditMode, enrolledCount, isTimeLocked,
    loadingGroupSchedules, formData, formErrors, deleteConfirmModal, groupToDelete,
    showToast, toastMessage, toastType, currentPage, perPage, totalItems,
    filterCourseId, filterDayOfWeek, filterTeacherId, filterDescription, filterStartTime, filterEndTime,
    loading, error, creating, deleting,
    isSubmitting, modalTitle, startItem, endItem, totalPages, hasActiveFilters, dayOptions,
    openCreateModal, openEditModal, closeModal,
    addSlot, removeSlot, handleSave, openDeleteConfirm, handleDelete, cancelDelete,
    goToPage, changePerPage, clearFilters, handleToastClose, refetch,
    getDayName, isFirstGroupOfCourse, getCourseBackground,
  }
}
