import { createRouter, createWebHistory } from 'vue-router'
import TeachersView from "../views/TeachersView.vue";

const routes = [
    { path: '/', component: TeachersView }
]

export const router = createRouter({
    history: createWebHistory(),
    routes,
})