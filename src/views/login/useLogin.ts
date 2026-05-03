import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useLoading } from '@/composables/useLoading'
import { useI18n } from '@/composables/useI18n'

export function useLogin() {
  const router = useRouter()
  const authStore = useAuthStore()
  const { showError, showSuccess } = useToast()
  const { show: showLoading, hide: hideLoading } = useLoading()
  const { t } = useI18n()

  const email = ref('admin@example.com')
  const password = ref('password')
  const rememberMe = ref(false)
  const isLoading = ref(false)
  const errors = ref({ email: '', password: '' })

  const validateForm = (): boolean => {
    errors.value = { email: '', password: '' }
    let isValid = true
    if (!email.value) { errors.value.email = t('login.validation.emailRequired'); isValid = false }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { errors.value.email = t('login.validation.emailInvalid'); isValid = false }
    if (!password.value) { errors.value.password = t('login.validation.passwordRequired'); isValid = false }
    else if (password.value.length < 6) { errors.value.password = t('login.validation.passwordMinLength'); isValid = false }
    return isValid
  }

  const handleLogin = async () => {
    if (!validateForm()) return
    isLoading.value = true
    showLoading()
    try {
      await authStore.login(email.value, password.value)
      showSuccess(t('login.successMessage'))
      router.push('/teachers')
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || t('login.errorInvalidCredentials')
      showError(errorMessage)
    } finally {
      isLoading.value = false
      hideLoading()
    }
  }

  const handleKeyPress = (event: KeyboardEvent) => {
    if (event.key === 'Enter') handleLogin()
  }

  return { t, email, password, rememberMe, isLoading, errors, handleLogin, handleKeyPress }
}
