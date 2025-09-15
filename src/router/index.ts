import { createRouter, createWebHistory } from "vue-router";
import Layout from "@/themes";
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        /*
        {
            path: "/login",
            name: "login",
            component: () => import("../views/Login.vue"),
        },*/
        {
            path: "/",
            component: Layout,
            meta: { requiresAuth: true },
            children: [
                {
                    path: "/",
                    name: "dashboard",
                    meta: { requiresAdmin: true },
                    component: () => import("../pages/DashboardOverview1.vue"),
                },
                {
                    path: "/teachers",
                    name: "teachers",
                    component: () => import("../views/TeachersView.vue"),
                }
            ],
        }
    ],
});


router.beforeEach((to) => {
    const auth = useAuthStore()

    // // Si la ruta requiere autenticación y el usuario no está autenticado
    // if (to.meta.requiresAuth && !auth.isAuthenticated()) {
    //     return '/login'
    // }
    //
    // // Si el usuario está autenticado pero intenta acceder a login, redirigir al dashboard
    // if (to.name === 'login' && auth.isAuthenticated()) {
    //     return '/transactions'
    // }
    //
    // // Si la ruta requiere ser admin y el usuario no lo es
    // if (auth.isAuthenticated() && to.meta.requiresAdmin && !auth.getDataUser().is_admin) {
    //     return '/transactions'
    // }
})


export default router;
