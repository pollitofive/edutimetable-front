import { defineStore } from 'pinia'
import axios from 'axios'
import { useBusinessStore } from './business'
import { useLoading } from '@/composables/useLoading'

export interface User {
    id: number
    name: string
    email: string
    default_business_id: number | null
    locale: string | null
}

interface AuthState {
    token: string | null
    user: User | null
}

export const useAuthStore = defineStore('auth', {
    state: (): AuthState => ({
        token: localStorage.getItem('token'),
        user: JSON.parse(localStorage.getItem('user') ?? 'null'),
    }),
    actions: {
        async login(email: string, password: string) {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/login-token`, {
                email, password
            })

            this.token = res.data.token
            this.user = res.data.user

            localStorage.setItem('token', this.token!)
            localStorage.setItem("user", JSON.stringify(this.user));

            // Initialize business context after login
            const businessStore = useBusinessStore()
            await businessStore.initialize()
        },
        setUser(user: User) {
            this.user = user
            localStorage.setItem('user', JSON.stringify(user))
        },
        async logout() {
            const { show: showLoading } = useLoading()
            showLoading()
            try {
                await axios.post(`${import.meta.env.VITE_API_URL}/logout-token`, {}, {
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    }
                });
            } catch (error) {
                console.error("Error en logout", error);
            } finally {
                this.clearSession()
            }
        },
        // Drop the local session and go to the login, without calling the API: also used when
        // the token was revoked (e.g. the password was changed from another session)
        clearSession() {
            this.user = null;
            this.token = null;
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            // Clear business context
            const businessStore = useBusinessStore()
            businessStore.clear()

            window.location.href = "/login";
        },
        isAuthenticated(): boolean {
            return !!this.token
        }
    }
})
