import { ref } from "vue";

export function useValidation() {
  const validationErrors = ref<Record<string, string[]>>({});

  const clearValidationErrors = () => {
    validationErrors.value = {};
  };

  const getFieldError = (fieldName: string): string | null => {
    const errors = validationErrors.value[fieldName];
    return errors && errors.length > 0 ? errors[0] : null;
  };

  const setValidationErrors = (errors: Record<string, string[]>) => {
    validationErrors.value = errors;
  };

  return {
    validationErrors,
    clearValidationErrors,
    getFieldError,
    setValidationErrors,
  };
}