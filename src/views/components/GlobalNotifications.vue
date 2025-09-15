<template>
  <!-- Modal de notificación global -->
  <NotificationModal
    :isVisible="modalState.show"
    :message="modalState.message"
    :type="modalState.type"
    @close="hideModal"
  />

  <!-- Toast Notifications global -->
  <ToastNotification
    :show="toastState.show"
    :message="toastState.message"
    :type="toastState.type"
    :duration="toastState.duration"
    @close="hideToast"
  />
</template>

<script setup lang="ts">
import NotificationModal from '@/views/components/NotificationModal.vue';
import ToastNotification from '@/views/components/ToastNotification.vue';
import { useToast } from '@/composables/useToast';

// Usar los estados globales del composable
const { toastState, modalState, hideToast, hideModal } = useToast();
</script>