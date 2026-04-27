<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { FormCheck, FormInput, FormLabel } from "@/components/Base/Form";
import Button from "@/components/Base/Button";
import Alert from "@/components/Base/Alert";
import Lucide from "@/components/Base/Lucide";
import ThemeSwitcher from "@/components/ThemeSwitcher";

const router = useRouter()
const authStore = useAuthStore()
const { showError, showSuccess } = useToast()

// Form state
const email = ref('admin@example.com')
const password = ref('password')
const rememberMe = ref(false)
const isLoading = ref(false)

// Validation errors
const errors = ref({
  email: '',
  password: ''
})

// Form validation
const validateForm = (): boolean => {
  errors.value = { email: '', password: '' }
  let isValid = true

  // Email validation
  if (!email.value) {
    errors.value.email = 'Email is required'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errors.value.email = 'Please enter a valid email address'
    isValid = false
  }

  // Password validation
  if (!password.value) {
    errors.value.password = 'Password is required'
    isValid = false
  } else if (password.value.length < 6) {
    errors.value.password = 'Password must be at least 6 characters'
    isValid = false
  }

  return isValid
}

// Handle login submission
const handleLogin = async () => {
  if (!validateForm()) {
    return
  }

  isLoading.value = true

  try {
    await authStore.login(email.value, password.value)
    showSuccess('Login successful! Welcome back.')
    router.push('/teachers')
  } catch (error: any) {
    console.error('Login error:', error)
    const errorMessage = error.response?.data?.message || 'Invalid credentials. Please try again.'
    showError(errorMessage)
  } finally {
    isLoading.value = false
  }
}

// Handle enter key press
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    handleLogin()
  }
}
</script>

<template>
  <div
    class="container grid lg:h-screen grid-cols-12 lg:max-w-[1550px] 2xl:max-w-[1750px] py-10 px-5 sm:py-14 sm:px-10 md:px-36 lg:py-0 lg:pl-14 lg:pr-12 xl:px-24"
  >
    <div
      :class="[
        'relative z-50 h-full col-span-12 p-7 sm:p-14 bg-white rounded-2xl lg:bg-transparent lg:pr-10 lg:col-span-5 xl:pr-24 2xl:col-span-4 lg:p-0 dark:bg-darkmode-600',
        'before:content-[\'\'] before:absolute before:inset-0 before:-mb-3.5 before:bg-white/40 before:rounded-2xl before:mx-5 dark:before:hidden',
      ]"
    >
      <div
        class="relative z-10 flex flex-col justify-center w-full h-full py-2 lg:py-32"
      >
        <div
          class="rounded-[0.8rem] w-[55px] h-[55px] border border-primary/30 flex items-center justify-center"
        >
          <div
            class="relative flex items-center justify-center w-[50px] rounded-[0.6rem] h-[50px] bg-gradient-to-b from-theme-1/90 to-theme-2/90 bg-white"
          >
            <div class="w-[26px] h-[26px] relative -rotate-45 [&_div]:bg-white">
              <div
                class="absolute w-[20%] left-0 inset-y-0 my-auto rounded-full opacity-50 h-[75%]"
              ></div>
              <div
                class="absolute w-[20%] inset-0 m-auto h-[120%] rounded-full"
              ></div>
              <div
                class="absolute w-[20%] right-0 inset-y-0 my-auto rounded-full opacity-50 h-[75%]"
              ></div>
            </div>
          </div>
        </div>
        <div class="mt-10">
          <div class="text-2xl font-medium">Sign In</div>
          <div class="mt-2.5 text-slate-600 dark:text-slate-400">
            Don't have an account?
            <a class="font-medium text-primary" href=""> Sign Up </a>
          </div>
          <Alert
            variant="outline-primary"
            class="flex items-center px-4 py-3 my-7 bg-primary/5 border-primary/20 rounded-[0.6rem] leading-[1.7]"
            v-slot="{ dismiss }"
          >
            <div class="">
              <Lucide
                icon="Lightbulb"
                class="stroke-[0.8] w-7 h-7 mr-2 fill-primary/10"
              />
            </div>
            <div class="ml-1 mr-8">
              Welcome to <span class="font-medium">Tailwise</span>
              demo! Simply click
              <span class="font-medium">Sign In</span> to explore and access our
              documentation.
            </div>
            <Alert.DismissButton
              type="button"
              class="btn-close text-primary"
              @click="dismiss"
              aria-label="Close"
            >
              <Lucide icon="X" class="w-5 h-5" />
            </Alert.DismissButton>
          </Alert>
          <div class="mt-6">
            <FormLabel>Email*</FormLabel>
            <FormInput
              v-model="email"
              type="email"
              class="block px-4 py-3.5 rounded-[0.6rem] border-slate-300/80"
              :class="{ 'border-red-500': errors.email }"
              placeholder="admin@example.com"
              @keypress="handleKeyPress"
              :disabled="isLoading"
            />
            <div v-if="errors.email" class="mt-1 text-xs text-red-500">
              {{ errors.email }}
            </div>

            <FormLabel class="mt-4">Password*</FormLabel>
            <FormInput
              v-model="password"
              type="password"
              class="block px-4 py-3.5 rounded-[0.6rem] border-slate-300/80"
              :class="{ 'border-red-500': errors.password }"
              placeholder="************"
              @keypress="handleKeyPress"
              :disabled="isLoading"
            />
            <div v-if="errors.password" class="mt-1 text-xs text-red-500">
              {{ errors.password }}
            </div>

            <div class="flex mt-4 text-xs text-slate-500 sm:text-sm">
              <div class="flex items-center mr-auto">
                <FormCheck.Input
                  id="remember-me"
                  v-model="rememberMe"
                  type="checkbox"
                  class="mr-2.5 border"
                  :disabled="isLoading"
                />
                <label class="cursor-pointer select-none" htmlFor="remember-me">
                  Remember me
                </label>
              </div>
              <a href="#" class="hover:text-primary">Forgot Password?</a>
            </div>

            <div class="mt-5 text-center xl:mt-8 xl:text-left">
              <Button
                variant="primary"
                rounded
                class="bg-gradient-to-r from-theme-1/70 to-theme-2/70 w-full py-3.5 xl:mr-3 dark:border-darkmode-400"
                @click="handleLogin"
                :disabled="isLoading"
              >
                <Lucide v-if="isLoading" icon="Loader" class="w-4 h-4 mr-2 animate-spin" />
                {{ isLoading ? 'Signing In...' : 'Sign In' }}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div
    class="fixed container grid w-screen inset-0 h-screen grid-cols-12 lg:max-w-[1550px] 2xl:max-w-[1750px] pl-14 pr-12 xl:px-24"
  >
    <div
      :class="[
        'relative h-screen col-span-12 lg:col-span-5 2xl:col-span-4 z-20',
        'after:bg-white after:hidden after:lg:block after:content-[\'\'] after:absolute after:right-0 after:inset-y-0 after:bg-gradient-to-b after:from-white after:to-slate-100/80 after:w-[800%] after:rounded-[0_1.2rem_1.2rem_0/0_1.7rem_1.7rem_0] dark:after:bg-darkmode-600 dark:after:from-darkmode-600 dark:after:to-darkmode-600',
        'before:content-[\'\'] before:hidden before:lg:block before:absolute before:right-0 before:inset-y-0 before:my-6 before:bg-gradient-to-b before:from-white/10 before:to-slate-50/10 before:bg-white/50 before:w-[800%] before:-mr-4 before:rounded-[0_1.2rem_1.2rem_0/0_1.7rem_1.7rem_0] dark:before:from-darkmode-300 dark:before:to-darkmode-300',
      ]"
    ></div>
    <div
      :class="[
        'h-full col-span-7 2xl:col-span-8 lg:relative',
        'before:content-[\'\'] before:absolute before:lg:-ml-10 before:left-0 before:inset-y-0 before:bg-gradient-to-b before:from-theme-1 before:to-theme-2 before:w-screen before:lg:w-[800%]',
        'after:content-[\'\'] after:absolute after:inset-y-0 after:left-0 after:w-screen after:lg:w-[800%] after:bg-texture-white after:bg-fixed after:bg-center after:lg:bg-[25rem_-25rem] after:bg-no-repeat',
      ]"
    >
      <div
        class="sticky top-0 z-10 flex-col justify-center hidden h-screen ml-16 lg:flex xl:ml-28 2xl:ml-36"
      >
        <div
          class="leading-[1.4] text-[2.6rem] xl:text-5xl font-medium xl:leading-[1.2] text-white"
        >
          Embrace Excellence <br />
          in Dashboard Development
        </div>
        <div class="mt-5 text-base leading-relaxed xl:text-lg text-white/70">
          Unlock the potential of Tailwise, where developers craft meticulously
          structured, visually stunning dashboards with feature-rich modules.
          Join us today to shape the future of your application development.
        </div>
        <div class="mt-10">
          <div class="text-base leading-relaxed text-white/70">
            Start managing your educational timetables with ease and efficiency.
          </div>
        </div>
      </div>
    </div>
  </div>
  <ThemeSwitcher />
</template>
