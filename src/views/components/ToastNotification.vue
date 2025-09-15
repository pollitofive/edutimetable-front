<script setup lang="ts">
import Notification from "@/components/Base/Notification";
import Lucide from "@/components/Base/Lucide";
import { type NotificationElement } from "@/components/Base/Notification";
import { ref, onMounted, watch, provide } from "vue";

interface Props {
  show: boolean;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

interface Emits {
  (e: 'close'): void;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 3000
});

const emit = defineEmits<Emits>();

const toastRef = ref<NotificationElement>();

// Crear un refKey único para este componente
const refKey = `toast-${Math.random().toString(36).substr(2, 9)}`;

// Proveer el binding para el componente Notification
provide(`bind[${refKey}]`, (el: NotificationElement) => {
  toastRef.value = el;
});

// Configuración de iconos y colores por tipo
const getNotificationConfig = (type: string) => {
  const configs = {
    success: {
      icon: 'CheckCircle',
      iconClass: 'text-success',
      bgClass: 'bg-success/10 border-success/20'
    },
    error: {
      icon: 'XCircle',
      iconClass: 'text-danger',
      bgClass: 'bg-danger/10 border-danger/20'
    },
    warning: {
      icon: 'AlertTriangle',
      iconClass: 'text-warning',
      bgClass: 'bg-warning/10 border-warning/20'
    },
    info: {
      icon: 'Info',
      iconClass: 'text-primary',
      bgClass: 'bg-primary/10 border-primary/20'
    }
  };
  return configs[type as keyof typeof configs] || configs.info;
};

const config = getNotificationConfig(props.type);

// Mostrar notificación cuando show cambie a true
watch(() => props.show, (newValue) => {
  if (newValue && toastRef.value && toastRef.value.showToast) {
    toastRef.value.showToast();

    // Auto-cerrar después del duration si es mayor a 0
    if (props.duration > 0) {
      setTimeout(() => {
        emit('close');
      }, props.duration);
    }
  }
});
</script>

<template>
  <Notification
    :refKey="refKey"
    :options="{
      duration: duration > 0 ? duration : -1,
      newWindow: true,
      close: true,
      gravity: 'top',
      position: 'right',
      stopOnFocus: true,
    }"
    :class="[
      'flex items-center p-4',
      config.bgClass
    ]"
  >
    <Lucide
      :icon="config.icon"
      :class="[
        'w-5 h-5 mr-3',
        config.iconClass
      ]"
    />
    <div class="font-medium">
      {{ message }}
    </div>
  </Notification>
</template>