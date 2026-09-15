import { gql } from '@apollo/client/core'
import { useQuery, useLazyQuery } from '@vue/apollo-composable'
import { ref, watch, computed, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useLoading } from '@/composables/useLoading'
import { useDayNames } from '@/composables/useDayNames'
import { useRoute, useRouter } from 'vue-router'
import { enrollmentService, type EnrollmentData } from '@/services/enrollmentService'

export interface Student { id: string; name: string; code: string }
export interface Course { id: string; name: string; level?: string; year?: number }
export interface Teacher { id: string; name: string }
export interface Schedule { id: string; course: Course; teacher: Teacher; day_of_week: number; starts_at: string; ends_at: string; description: string; group_id?: string }
interface StudentAvailability { id: string; student_id: string; day_of_week: number; start_time: string; end_time: string }
interface ScheduleGroup { group_id: string; course: Course; teacher: Teacher; description: string; schedules: Schedule[]; displayText: string }
export interface StudentEnrollment { id: string; student_id: string; schedule_id: string; student: Student; schedule: Schedule; enrolled_at: string; status: 'active' | 'completed' | 'dropped' | 'pending'; notes?: string; created_at: string }

// These three stay on GraphQL: they're catalog/shared queries also consumed
// by other screens (student-availabilities, etc.), out of scope for this migration.
const GET_ALL_STUDENTS = gql`query GetAllStudents { students(first: 10000) { data { id name code } } }`
const GET_ALL_SCHEDULES = gql`
  query GetAllSchedules {
    schedules(first: 10000) {
      data { id course { id name level year } teacher { id name } day_of_week starts_at ends_at description group_id }
    }
  }
`
const GET_STUDENT_AVAILABILITIES = gql`
  query GetStudentAvailabilities($student_id: ID!) {
    studentAvailabilities(student_id: $student_id) { data { id student_id day_of_week start_time end_time } }
  }
`

function mapEnrollment(e: EnrollmentData): StudentEnrollment {
  return {
    id: String(e.id),
    student_id: String(e.student_id),
    schedule_id: String(e.schedule_id),
    student: { id: String(e.student.id), name: e.student.name, code: '' },
    schedule: {
      id: String(e.schedule.id),
      course: { id: String(e.schedule.course.id), name: e.schedule.course.name, level: e.schedule.course.level ?? undefined },
      teacher: { id: String(e.schedule.teacher.id), name: e.schedule.teacher.name },
      day_of_week: e.schedule.day_of_week,
      starts_at: e.schedule.starts_at,
      ends_at: e.schedule.ends_at,
      description: e.schedule.description ?? '',
      group_id: e.schedule.group_id ?? undefined,
    },
    enrolled_at: e.enrolled_at,
    status: e.status,
    notes: e.notes ?? undefined,
    created_at: e.created_at,
  }
}

export function useStudentEnrollments() {
  const { t } = useI18n()
  const { show: showLoading, hide: hideLoading } = useLoading()
  const { getDayName } = useDayNames('studentEnrollments')
  const route = useRoute()
  const router = useRouter()

  const enrollments = ref<StudentEnrollment[]>([])
  const allStudents = ref<Student[]>([])
  const allSchedules = ref<Schedule[]>([])
  const studentAvailabilities = ref<StudentAvailability[]>([])
  const showModal = ref(false)
  const isEditMode = ref(false)
  const editingEnrollmentId = ref<string | null>(null)
  const formData = ref({ student_id: '', group_id: '', status: 'active' as 'active' | 'completed' | 'dropped' | 'pending', notes: '' })
  const formErrors = ref<{ student_id?: string; group_id?: string; status?: string }>({})
  const deleteConfirmModal = ref(false)
  const enrollmentToDelete = ref<StudentEnrollment | null>(null)
  const showToast = ref(false)
  const toastMessage = ref('')
  const toastType = ref<'success' | 'error' | 'info' | 'warning'>('success')

  const loading = ref(false)
  const error = ref<string | null>(null)
  const creating = ref(false)
  const updating = ref(false)
  const deleting = ref(false)

  const currentPage = ref(Number(route.query.page) || 1)
  const perPage = ref(10)
  const totalItems = ref(0)
  const lastPage = ref(1)

  const filterStudentId = ref((route.query.student as string) || '')
  const filterScheduleId = ref((route.query.schedule as string) || '')
  const filterStatus = ref<string>((route.query.status as string) || '')

  const { result: studentsResult } = useQuery(GET_ALL_STUDENTS)
  const { result: schedulesResult } = useQuery(GET_ALL_SCHEDULES)
  const { result: availabilitiesResult, loading: availabilitiesLoading, load: loadAvailabilities, refetch: refetchAvailabilities } = useLazyQuery(GET_STUDENT_AVAILABILITIES, null, { fetchPolicy: 'cache-and-network' })

  const isSubmitting = computed(() => creating.value || updating.value)
  const modalTitle = computed(() => isEditMode.value ? t('studentEnrollments.form.editTitle') : t('studentEnrollments.form.addTitle'))
  const startItem = computed(() => totalItems.value === 0 ? 0 : (currentPage.value - 1) * perPage.value + 1)
  const endItem = computed(() => Math.min(currentPage.value * perPage.value, totalItems.value))
  const totalPages = computed(() => lastPage.value)
  const hasActiveFilters = computed(() => filterStudentId.value !== '' || filterScheduleId.value !== '' || filterStatus.value !== '')
  const statusOptions = computed(() => [
    { value: 'active', label: t('studentEnrollments.status.active') },
    { value: 'completed', label: t('studentEnrollments.status.completed') },
    { value: 'dropped', label: t('studentEnrollments.status.dropped') },
    { value: 'pending', label: t('studentEnrollments.status.pending') },
  ])

  watch(
    () => loading.value || creating.value || updating.value || deleting.value,
    (isActive) => isActive ? showLoading() : hideLoading(),
    { immediate: true }
  )

  watch(
    () => ({ student: filterStudentId.value, schedule: filterScheduleId.value, status: filterStatus.value, page: currentPage.value }),
    (v) => {
      const q: Record<string, string> = {}
      if (v.student) q.student = v.student
      if (v.schedule) q.schedule = v.schedule
      if (v.status) q.status = v.status
      if (v.page > 1) q.page = String(v.page)
      void router.replace({ query: q })
    }
  )

  watch(studentsResult, (val) => { if (val?.students?.data) allStudents.value = [...val.students.data].sort((a, b) => a.name.localeCompare(b.name)) }, { immediate: true })
  watch(schedulesResult, (val) => { if (val?.schedules?.data) allSchedules.value = [...val.schedules.data].sort((a, b) => a.course.name.localeCompare(b.course.name)) }, { immediate: true })
  watch(availabilitiesResult, (val) => { if (val?.studentAvailabilities?.data) studentAvailabilities.value = val.studentAvailabilities.data }, { immediate: true })
  watch(filterStudentId, applyFilters)
  watch(filterScheduleId, applyFilters)
  watch(filterStatus, applyFilters)

  watch(() => formData.value.student_id, (newId) => {
    if (!isEditMode.value) {
      formData.value.group_id = ''
      studentAvailabilities.value = []
      if (newId) {
        const fetch = availabilitiesResult.value
          ? refetchAvailabilities({ student_id: newId })
          : loadAvailabilities(GET_STUDENT_AVAILABILITIES, { student_id: newId })
        fetch?.catch(() => {})
      }
    }
  })

  async function fetchEnrollments() {
    loading.value = true
    error.value = null
    try {
      const res = await enrollmentService.getEnrollments({
        student_id: filterStudentId.value || undefined,
        schedule_id: filterScheduleId.value || undefined,
        status: filterStatus.value || undefined,
        page: currentPage.value,
        per_page: perPage.value,
      })
      enrollments.value = res.data.map(mapEnrollment)
      totalItems.value = res.total
      lastPage.value = res.last_page
      currentPage.value = res.current_page
    } catch (err: any) {
      error.value = err.response?.data?.message || err.message || t('studentEnrollments.messages.error')
    } finally {
      loading.value = false
    }
  }

  const getStatusBadgeClass = (status: string): string => {
    const classes: Record<string, string> = { active: 'bg-success/10 text-success', completed: 'bg-primary/10 text-primary', dropped: 'bg-danger/10 text-danger', pending: 'bg-warning/10 text-warning' }
    return classes[status] || 'bg-slate-100 text-slate-600'
  }

  const getStatusLabel = (status: string) => t(`studentEnrollments.status.${status.toLowerCase()}`)

  const scheduleFitsInAvailability = (schedule: Schedule, availabilities: StudentAvailability[]): boolean => {
    if (!availabilities.length) return false
    return availabilities.some(avail => {
      if (avail.day_of_week !== schedule.day_of_week) return false
      const ss = schedule.starts_at.substring(0, 5), se = schedule.ends_at.substring(0, 5)
      const as = avail.start_time.length === 5 ? avail.start_time : avail.start_time.substring(0, 5)
      const ae = avail.end_time.length === 5 ? avail.end_time : avail.end_time.substring(0, 5)
      return ss >= as && se <= ae
    })
  }

  const filteredSchedules = computed(() => {
    if (!formData.value.student_id || !studentAvailabilities.value.length) return []
    return allSchedules.value.filter(s => scheduleFitsInAvailability(s, studentAvailabilities.value))
  })

  const groupedSchedules = computed((): ScheduleGroup[] => {
    const groups = new Map<string, Schedule[]>()
    filteredSchedules.value.forEach(s => {
      const id = s.group_id || s.id
      if (!groups.has(id)) groups.set(id, [])
      groups.get(id)!.push(s)
    })
    const result: ScheduleGroup[] = []
    groups.forEach((scheds, groupId) => {
      const sorted = [...scheds].sort((a, b) => a.day_of_week !== b.day_of_week ? a.day_of_week - b.day_of_week : a.starts_at.localeCompare(b.starts_at))
      const first = sorted[0]
      const dayTimeParts = sorted.map(s => `${getDayName(s.day_of_week).substring(0, 3)} ${s.starts_at.substring(0, 5)}-${s.ends_at.substring(0, 5)}`)
      result.push({ group_id: groupId, course: first.course, teacher: first.teacher, description: first.description, schedules: sorted, displayText: `${first.course.name} - ${first.description} (${first.teacher.name}) - ${dayTimeParts.join(', ')}` })
    })
    return result.sort((a, b) => a.course.name.localeCompare(b.course.name))
  })

  const getScheduleDisplay = (schedule: Schedule) => `${schedule.course.name} - ${schedule.teacher.name} (${getDayName(schedule.day_of_week)} ${schedule.starts_at}-${schedule.ends_at})`

  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    toastMessage.value = message; toastType.value = type; showToast.value = true
  }
  const handleToastClose = () => { showToast.value = false }

  const validateForm = (): boolean => {
    formErrors.value = {}
    if (!formData.value.student_id) formErrors.value.student_id = t('studentEnrollments.validation.studentRequired')
    if (!formData.value.group_id) formErrors.value.group_id = t('studentEnrollments.validation.scheduleRequired')
    if (!formData.value.status) formErrors.value.status = t('studentEnrollments.validation.statusRequired')
    return Object.keys(formErrors.value).length === 0
  }

  const openCreateModal = () => {
    isEditMode.value = false; editingEnrollmentId.value = null
    formData.value = { student_id: '', group_id: '', status: 'active', notes: '' }
    formErrors.value = {}; showModal.value = true
  }

  const openEditModal = (enrollment: StudentEnrollment) => {
    isEditMode.value = true; editingEnrollmentId.value = enrollment.id
    formData.value = { student_id: enrollment.student_id, group_id: enrollment.schedule.group_id || enrollment.schedule_id, status: enrollment.status.toLowerCase() as any, notes: enrollment.notes || '' }
    formErrors.value = {}; showModal.value = true
  }

  const closeModal = () => {
    showModal.value = false; isEditMode.value = false; editingEnrollmentId.value = null
    formData.value = { student_id: '', group_id: '', status: 'active', notes: '' }
    formErrors.value = {}
  }

  const handleSave = async () => {
    if (!validateForm()) return
    try {
      if (isEditMode.value) {
        updating.value = true
        await enrollmentService.updateEnrollment(Number(editingEnrollmentId.value), {
          status: formData.value.status,
          notes: formData.value.notes || undefined,
        })
        notify(t('studentEnrollments.messages.updateSuccess'))
      } else {
        creating.value = true
        const group = groupedSchedules.value.find(g => g.group_id === formData.value.group_id)
        if (!group?.schedules.length) { notify('Invalid group selection', 'error'); return }
        await enrollmentService.createEnrollment(Number(formData.value.student_id), group.schedules.map(s => Number(s.id)))
        notify(`Successfully enrolled in ${group.schedules.length} schedule${group.schedules.length > 1 ? 's' : ''}`, 'success')
      }
      closeModal(); applyFilters()
    } catch (err: any) {
      notify(err.response?.data?.message || err.message || t('studentEnrollments.messages.generalError'), 'error')
    } finally {
      creating.value = false
      updating.value = false
    }
  }

  const openDeleteConfirm = (e: StudentEnrollment) => { enrollmentToDelete.value = e; deleteConfirmModal.value = true }
  const handleDelete = async () => {
    if (!enrollmentToDelete.value) return
    deleting.value = true
    try {
      await enrollmentService.deleteEnrollment(Number(enrollmentToDelete.value.id))
      notify(t('studentEnrollments.messages.deleteSuccess'))
      deleteConfirmModal.value = false; enrollmentToDelete.value = null; applyFilters()
    } catch (err: any) {
      notify(err.response?.data?.message || err.message || t('studentEnrollments.messages.deleteError'), 'error')
    } finally {
      deleting.value = false
    }
  }
  const cancelDelete = () => { deleteConfirmModal.value = false; enrollmentToDelete.value = null }

  const goToPage = (page: number) => { if (page >= 1 && page <= lastPage.value) { currentPage.value = page; fetchEnrollments() } }
  const changePerPage = (n: number) => { perPage.value = n; currentPage.value = 1; fetchEnrollments() }
  function applyFilters() { currentPage.value = 1; fetchEnrollments() }
  const clearFilters = () => { filterStudentId.value = ''; filterScheduleId.value = ''; filterStatus.value = ''; applyFilters() }
  const retryFetch = () => fetchEnrollments()

  onMounted(fetchEnrollments)

  return {
    t, enrollments, allStudents, allSchedules, studentAvailabilities, showModal, isEditMode,
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
  }
}
