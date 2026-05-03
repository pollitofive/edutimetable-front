import { createRouter, createWebHistory } from "vue-router";
import Layout from "@/themes";
import { useAuthStore } from '@/stores/auth'
import { useBusinessStore } from '@/stores/business'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: "/login",
            name: "login",
            component: () => import("../views/login/index.vue"),
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
                    path: "/course-levels",
                    name: "course-levels",
                    meta: { requiresAuth: true },
                    component: () => import("../views/course-levels/index.vue"),
                },
                {
                    path: "/teachers",
                    name: "teachers",
                    meta: { requiresAuth: true },
                    component: () => import("../views/teachers/index.vue"),
                },
                {
                    path: "/courses",
                    name: "courses",
                    meta: { requiresAuth: true },
                    component: () => import("../views/courses/index.vue"),
                },
                {
                    path: "/students",
                    name: "students",
                    meta: { requiresAuth: true },
                    component: () => import("../views/students/index.vue"),
                },
                {
                    path: "/student-availabilities",
                    name: "student-availabilities",
                    meta: { requiresAuth: true },
                    component: () => import("../views/student-availabilities/index.vue"),
                },
                {
                    path: "/schedules",
                    name: "schedules",
                    meta: { requiresAuth: true },
                    component: () => import("../views/schedules/index.vue"),
                },
                {
                    path: "/student-enrollments",
                    name: "student-enrollments",
                    meta: { requiresAuth: true },
                    component: () => import("../views/enrollments/index.vue"),
                }
            ],
        }
    ],
});


router.beforeEach(async (to) => {
    const auth = useAuthStore()
    const business = useBusinessStore()

    // If the route requires authentication and the user is not authenticated
    if (to.meta.requiresAuth && !auth.isAuthenticated()) {
        return '/login'
    }

    // If the user is authenticated but tries to access login, redirect to dashboard
    if (to.name === 'login' && auth.isAuthenticated()) {
        return '/teachers'
    }

    // Initialize business context for authenticated users
    if (auth.isAuthenticated() && !business.isInitialized) {
        try {
            await business.initialize()
        } catch (error) {
            console.error('Error initializing business context:', error)
        }
    }
})


export default router;
