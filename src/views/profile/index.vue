<script setup lang="ts">
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import { FormInput, FormLabel } from '@/components/Base/Form'
import ToastNotification from '@/views/components/ToastNotification.vue'
import { useProfile } from './useProfile'

const {
  t,
  loading, loadError, fetchProfile,
  profile, profileErrors, savingProfile, saveProfile,
  passwords, passwordErrors, savingPassword, savePassword,
  showToast, toastMessage, toastType, handleToastClose,
} = useProfile()
</script>

<template>
  <div class="flex flex-col gap-y-3 md:h-10 md:flex-row md:items-center">
    <div class="text-base font-medium">{{ t('profile.title') }}</div>
  </div>

  <!-- Loading -->
  <div v-if="loading" class="box box--stacked flex items-center justify-center p-10 mt-5">
    <Lucide icon="Loader" class="w-6 h-6 animate-spin text-slate-400" />
  </div>

  <!-- Error State -->
  <div v-else-if="loadError" class="box box--stacked flex items-center justify-center p-10 mt-5">
    <div class="flex flex-col items-center gap-3">
      <Lucide icon="AlertCircle" class="w-8 h-8 text-danger" />
      <div class="text-sm text-slate-500">{{ t('profile.messages.loadError') }}</div>
      <Button variant="outline-primary" @click="fetchProfile">{{ t('profile.actions.retry') }}</Button>
    </div>
  </div>

  <div v-else class="grid grid-cols-12 gap-5 mt-5">
    <!-- My data -->
    <form class="col-span-12 lg:col-span-6 box box--stacked flex flex-col" @submit.prevent="saveProfile">
      <div class="px-5 py-4 border-b border-slate-200/60 font-medium">{{ t('profile.data.title') }}</div>
      <div class="flex flex-col gap-4 p-5">
        <div>
          <FormLabel htmlFor="profile-name">{{ t('profile.data.name') }}</FormLabel>
          <FormInput id="profile-name" v-model="profile.name" type="text" autocomplete="name" :class="{ 'border-danger': profileErrors.name }" />
          <div v-if="profileErrors.name" class="mt-1 text-xs text-danger">{{ profileErrors.name }}</div>
        </div>
        <div>
          <FormLabel htmlFor="profile-email">{{ t('profile.data.email') }}</FormLabel>
          <FormInput id="profile-email" v-model="profile.email" type="email" autocomplete="email" :class="{ 'border-danger': profileErrors.email }" />
          <div v-if="profileErrors.email" class="mt-1 text-xs text-danger">{{ profileErrors.email }}</div>
        </div>
      </div>
      <div class="px-5 pb-5 mt-auto text-right">
        <Button type="submit" variant="primary" :disabled="savingProfile" class="w-full sm:w-auto sm:min-w-[7rem]">
          <Lucide v-if="savingProfile" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else>{{ t('profile.actions.save') }}</span>
        </Button>
      </div>
    </form>

    <!-- Change password -->
    <form class="col-span-12 lg:col-span-6 box box--stacked flex flex-col" @submit.prevent="savePassword">
      <div class="px-5 py-4 border-b border-slate-200/60 font-medium">{{ t('profile.password.title') }}</div>
      <div class="flex flex-col gap-4 p-5">
        <div>
          <FormLabel htmlFor="profile-current-password">{{ t('profile.password.current') }}</FormLabel>
          <FormInput id="profile-current-password" v-model="passwords.current_password" type="password" autocomplete="current-password" :class="{ 'border-danger': passwordErrors.current_password }" />
          <div v-if="passwordErrors.current_password" class="mt-1 text-xs text-danger">{{ passwordErrors.current_password }}</div>
        </div>
        <div>
          <FormLabel htmlFor="profile-new-password">{{ t('profile.password.new') }}</FormLabel>
          <FormInput id="profile-new-password" v-model="passwords.password" type="password" autocomplete="new-password" :class="{ 'border-danger': passwordErrors.password }" />
          <div v-if="passwordErrors.password" class="mt-1 text-xs text-danger">{{ passwordErrors.password }}</div>
        </div>
        <div>
          <FormLabel htmlFor="profile-confirm-password">{{ t('profile.password.confirm') }}</FormLabel>
          <FormInput id="profile-confirm-password" v-model="passwords.password_confirmation" type="password" autocomplete="new-password" :class="{ 'border-danger': passwordErrors.password_confirmation }" />
          <div v-if="passwordErrors.password_confirmation" class="mt-1 text-xs text-danger">{{ passwordErrors.password_confirmation }}</div>
        </div>
        <div class="text-xs text-slate-500">{{ t('profile.password.otherSessionsNote') }}</div>
      </div>
      <div class="px-5 pb-5 mt-auto text-right">
        <Button type="submit" variant="primary" :disabled="savingPassword" class="w-full sm:w-auto sm:min-w-[7rem]">
          <Lucide v-if="savingPassword" icon="Loader" class="w-4 h-4 animate-spin" />
          <span v-else>{{ t('profile.actions.changePassword') }}</span>
        </Button>
      </div>
    </form>
  </div>

  <!-- Toast -->
  <ToastNotification :show="showToast" :message="toastMessage" :type="toastType" @close="handleToastClose" />
</template>
