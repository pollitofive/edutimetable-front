import axios from 'axios'
import { ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useAuthStore } from '@/stores/auth'
import { profileService } from '@/services/profileService'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_MIN_LENGTH = 8 // Password::defaults() in the API

type ProfileErrors = { name?: string; email?: string }
type PasswordErrors = { current_password?: string; password?: string; password_confirmation?: string }

/** Fields the API rejected with a 422, or null for any other error */
const validationErrors = (error: unknown): Record<string, string[]> | null =>
  axios.isAxiosError(error) && error.response?.status === 422
    ? error.response.data?.errors ?? {}
    : null

export function useProfile() {
  const { t } = useI18n()
  const auth = useAuthStore()

  // ── State ──────────────────────────────────────────────────────────────────
  const loading = ref(true)
  const loadError = ref(false)

  const profile = ref({ name: '', email: '' })
  const profileErrors = ref<ProfileErrors>({})
  const savingProfile = ref(false)

  const passwords = ref({ current_password: '', password: '', password_confirmation: '' })
  const passwordErrors = ref<PasswordErrors>({})
  const savingPassword = ref(false)

  const showToast = ref(false)
  const toastMessage = ref('')
  const toastType = ref<'success' | 'error' | 'info' | 'warning'>('success')

  // ── Notification ───────────────────────────────────────────────────────────
  const notify = (message: string, type: 'success' | 'error' = 'success') => {
    toastMessage.value = message
    toastType.value = type
    showToast.value = true
  }
  const handleToastClose = () => { showToast.value = false }

  // ── Load ───────────────────────────────────────────────────────────────────
  const fetchProfile = async () => {
    loading.value = true
    loadError.value = false
    try {
      const user = await profileService.get()
      auth.setUser(user)
      profile.value = { name: user.name, email: user.email }
    } catch {
      loadError.value = true
    } finally {
      loading.value = false
    }
  }

  onMounted(fetchProfile)

  // ── My data ────────────────────────────────────────────────────────────────
  const validateProfile = (): boolean => {
    profileErrors.value = {}
    if (!profile.value.name.trim()) profileErrors.value.name = t('profile.validation.nameRequired')
    if (!profile.value.email.trim()) profileErrors.value.email = t('profile.validation.emailRequired')
    else if (!EMAIL_PATTERN.test(profile.value.email.trim())) profileErrors.value.email = t('profile.validation.emailInvalid')
    return Object.keys(profileErrors.value).length === 0
  }

  const saveProfile = async () => {
    if (!validateProfile()) return
    savingProfile.value = true
    try {
      const user = await profileService.update({
        name: profile.value.name.trim(),
        email: profile.value.email.trim(),
      })
      auth.setUser(user)
      profile.value = { name: user.name, email: user.email }
      notify(t('profile.messages.profileSaved'))
    } catch (error) {
      const errors = validationErrors(error)
      if (errors?.email) {
        // Format and required are checked above: what's left is an email already in use
        profileErrors.value.email = t('profile.validation.emailTaken')
      } else if (errors?.name) {
        profileErrors.value.name = t('profile.validation.nameRequired')
      } else {
        notify(t('profile.messages.profileError'), 'error')
      }
    } finally {
      savingProfile.value = false
    }
  }

  // ── Change password ────────────────────────────────────────────────────────
  const validatePassword = (): boolean => {
    passwordErrors.value = {}
    const { current_password, password, password_confirmation } = passwords.value
    if (!current_password) passwordErrors.value.current_password = t('profile.validation.currentPasswordRequired')
    if (!password) passwordErrors.value.password = t('profile.validation.passwordRequired')
    else if (password.length < PASSWORD_MIN_LENGTH) passwordErrors.value.password = t('profile.validation.passwordMinLength', { min: PASSWORD_MIN_LENGTH })
    if (password && password_confirmation !== password) passwordErrors.value.password_confirmation = t('profile.validation.passwordMismatch')
    return Object.keys(passwordErrors.value).length === 0
  }

  const savePassword = async () => {
    if (!validatePassword()) return
    savingPassword.value = true
    try {
      await profileService.changePassword(passwords.value)
      passwords.value = { current_password: '', password: '', password_confirmation: '' }
      notify(t('profile.messages.passwordChanged'))
    } catch (error) {
      const errors = validationErrors(error)
      if (errors?.current_password) {
        passwordErrors.value.current_password = t('profile.validation.currentPasswordWrong')
      } else if (errors?.password) {
        passwordErrors.value.password = errors.password[0]
      } else {
        notify(t('profile.messages.passwordError'), 'error')
      }
    } finally {
      savingPassword.value = false
    }
  }

  return {
    t,
    loading, loadError, fetchProfile,
    profile, profileErrors, savingProfile, saveProfile,
    passwords, passwordErrors, savingPassword, savePassword,
    showToast, toastMessage, toastType, handleToastClose,
  }
}
