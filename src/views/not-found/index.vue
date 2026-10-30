<script setup lang="ts">
import Lucide from '@/components/Base/Lucide'
import Button from '@/components/Base/Button'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
const projectName = import.meta.env.VITE_PROJECT_NAME || 'Edutimetable'
</script>

<template>
  <div class="box box--stacked flex flex-col items-center justify-center px-5 py-16 mt-5 text-center">
    <div class="rounded-[0.8rem] w-[55px] h-[55px] border border-primary/30 flex items-center justify-center">
      <div class="relative flex items-center justify-center w-[50px] rounded-[0.6rem] h-[50px] bg-gradient-to-b from-theme-1/90 to-theme-2/90 bg-white">
        <div class="w-[26px] h-[26px] relative -rotate-45 [&_div]:bg-white">
          <div class="absolute w-[20%] left-0 inset-y-0 my-auto rounded-full opacity-50 h-[75%]"></div>
          <div class="absolute w-[20%] inset-0 m-auto h-[120%] rounded-full"></div>
          <div class="absolute w-[20%] right-0 inset-y-0 my-auto rounded-full opacity-50 h-[75%]"></div>
        </div>
      </div>
    </div>
    <div class="mt-3 font-medium text-slate-500">{{ projectName }}</div>
    <div class="mt-8 text-6xl font-medium text-primary">404</div>
    <div class="mt-4 text-xl font-medium">{{ t('notFound.title') }}</div>
    <div class="mt-2 text-slate-500">{{ t('notFound.description') }}</div>
    <RouterLink to="/" class="mt-8">
      <Button variant="primary" rounded class="bg-gradient-to-r from-theme-1/70 to-theme-2/70 px-6">
        <Lucide icon="Home" class="w-4 h-4 mr-2" />
        {{ t('notFound.backHome') }}
      </Button>
    </RouterLink>
  </div>
</template>
