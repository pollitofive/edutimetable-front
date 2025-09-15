import { reactive } from 'vue';

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
}

interface ModalState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
}

// Estados globales reactivos
const toastState = reactive<ToastState>({
  show: false,
  message: '',
  type: 'info',
  duration: 3000
});

const modalState = reactive<ModalState>({
  show: false,
  message: '',
  type: 'success'
});

export const useToast = () => {
  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
    duration: number = 3000
  ) => {
    toastState.show = true;
    toastState.message = message;
    toastState.type = type;
    toastState.duration = duration;
  };

  const hideToast = () => {
    toastState.show = false;
  };

  const showModal = (message: string, type: 'success' | 'error') => {
    modalState.show = true;
    modalState.message = message;
    modalState.type = type;
  };

  const hideModal = () => {
    modalState.show = false;
  };

  // Métodos de conveniencia para toast
  const showSuccess = (message: string, duration?: number) => {
    showToast(message, 'success', duration);
  };

  const showError = (message: string, duration?: number) => {
    showToast(message, 'error', duration);
  };

  const showInfo = (message: string, duration?: number) => {
    showToast(message, 'info', duration);
  };

  const showWarning = (message: string, duration?: number) => {
    showToast(message, 'warning', duration);
  };

  // Métodos de conveniencia para modal
  const showSuccessModal = (message: string) => {
    showModal(message, 'success');
  };

  const showErrorModal = (message: string) => {
    showModal(message, 'error');
  };

  return {
    // Estados
    toastState,
    modalState,

    // Toast methods
    showToast,
    hideToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,

    // Modal methods
    showModal,
    hideModal,
    showSuccessModal,
    showErrorModal
  };
};