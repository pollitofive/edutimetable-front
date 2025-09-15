<script setup lang="ts">
import { useLoading } from "@/composables/useLoading";
import LoadingIcon from "@/components/Base/LoadingIcon";

const { isLoading } = useLoading();
</script>

<template>
  <Transition
    enter-active-class="transition-opacity duration-200"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-opacity duration-200"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isLoading"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <div class="flex flex-col items-center gap-4">
        <LoadingIcon icon="spinning-circles" class="w-16 h-16" />
      </div>
    </div>
  </Transition>
</template>