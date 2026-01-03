import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./assets/css/app.css";
import { createI18n } from 'vue-i18n';
import { DefaultApolloClient } from '@vue/apollo-composable';
import { apolloClient } from './apollo/clients';

import en from './locales/en.json';
import es from './locales/es.json';

const messages = { en, es };

// Obtener idioma guardado o del usuario, usar español por defecto
const getInitialLocale = () => {
  // Primero intentar obtener del localStorage (usuario logueado previamente)
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    const user = JSON.parse(savedUser);
    if (user.language && ['en', 'es'].includes(user.language)) {
      return user.language;
    }
  }

  // Fallback a español
  return 'es';
};

const i18n = createI18n({
  legacy: false, // Para usar Composition API
  locale: getInitialLocale(),
  fallbackLocale: 'es',
  messages,
});

const app = createApp(App);

app.provide(DefaultApolloClient, apolloClient);
app.use(createPinia());
app.use(router);
app.use(i18n);

app.mount("#app");
