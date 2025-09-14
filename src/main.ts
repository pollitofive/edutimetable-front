import { createApp, h, provide } from 'vue'
import './style.css'
import './assets/css/main.css'
import App from './App.vue'
import { apolloClient } from "./apollo/clients";
import { DefaultApolloClient } from "@vue/apollo-composable"
import { createPinia } from 'pinia'
import { router } from './router'

const app = createApp({
    setup() {
        provide(DefaultApolloClient, apolloClient)
    },
    render: () => h(App),
})

app.use(createPinia())
app.use(router)
app.mount('#app')
