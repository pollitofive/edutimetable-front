import { createRouter, createWebHistory } from "vue-router";
import Layout from "@/themes";
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: "/login",
            name: "login",
            component: () => import("../pages/Login.vue"),
        },
        {
            path: "/",
            component: Layout,
            meta: { requiresAuth: true },
            children: [
                {
                    path: "/",
                    name: "dashboard",
                    meta: { requiresAuth: true },
                    component: () => import("../pages/DashboardOverview1.vue"),
                },
                {
                    path: "/teachers",
                    name: "teachers",
                    meta: { requiresAuth: true },
                    component: () => import("../views/TeachersView.vue"),
                },
                {
                    path: "/courses",
                    name: "courses",
                    meta: { requiresAuth: true },
                    component: () => import("../views/CoursesView.vue"),
                },
                {
                    path: "/students",
                    name: "students",
                    meta: { requiresAuth: true },
                    component: () => import("../views/StudentsView.vue"),
                }
            ],
        }
    ],
});


router.beforeEach((to) => {
    const auth = useAuthStore()

    // If the route requires authentication and the user is not authenticated
    if (to.meta.requiresAuth && !auth.isAuthenticated()) {
        return '/login'
    }

    // If the user is authenticated but tries to access login, redirect to dashboard
    if (to.name === 'login' && auth.isAuthenticated()) {
        return '/teachers'
    }
})


export default router;
