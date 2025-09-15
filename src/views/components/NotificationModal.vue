<template>
  <Dialog :open="isVisible" @close="close">
    <Dialog.Panel class="p-5 text-center">
      <!-- Icon con animación -->
      <div
        class="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4"
        :class="type === 'success' ? 'bg-green-100' : 'bg-red-100'"
      >
        <svg v-if="type === 'success'" class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <svg v-else class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>

      <!-- Message -->
      <div class="text-lg font-medium mb-6">
        {{ message }}
      </div>

      <!-- Button -->
      <Button
        @click="close"
        :variant="type === 'success' ? 'primary' : 'danger'"
        class="w-24"
      >
        OK
      </Button>
    </Dialog.Panel>
  </Dialog>
</template>

<script setup lang="ts">
import { Dialog } from "@/components/Base/Headless";
import Button from "@/components/Base/Button";

interface Props {
  isVisible: boolean;
  message: string;
  type: 'success' | 'error';
}

interface Emits {
  (e: 'close'): void;
}

defineProps<Props>();
const emit = defineEmits<Emits>();

const close = () => {
  emit('close');
};
</script>
