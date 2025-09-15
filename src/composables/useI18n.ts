import { useI18n as useVueI18n } from 'vue-i18n';

export const useI18n = () => {
  const { t, locale, availableLocales } = useVueI18n();

  // Función para cambiar idioma
  const changeLanguage = (newLocale: string) => {
    if (availableLocales.includes(newLocale)) {
      locale.value = newLocale;
      // Guardar preferencia en localStorage
      localStorage.setItem('locale', newLocale);
    }
  };

  // Función para obtener idioma actual
  const getCurrentLanguage = () => locale.value;

  // Función para obtener idiomas disponibles
  const getAvailableLanguages = () => availableLocales;

  // Función helper para traducir con fallback
  const translate = (key: string, fallback?: string) => {
    const translation = t(key);
    return translation !== key ? translation : (fallback || key);
  };

  return {
    t,
    locale,
    changeLanguage,
    getCurrentLanguage,
    getAvailableLanguages,
    translate
  };
};