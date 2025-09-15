<script setup lang="ts">
import GlobalNotifications from '@/views/components/GlobalNotifications.vue';
import LoadingOverlay from '@/components/LoadingOverlay/LoadingOverlay.vue';
</script>

<template>
  <RouterView />

  <!-- Notificaciones globales disponibles en toda la app -->
  <GlobalNotifications />

  <!-- Loading global disponible en toda la app -->
  <LoadingOverlay />
</template>
