import { defineStore } from 'pinia'
import axios from 'axios'

interface User {
    id: number
    business_id: number
    first_name: string
    last_name: string
    dni: string
    email: string
    birth_date: string | null
    gender: string | null
    phone: string | null
    is_admin: boolean
    can_view_incoming: boolean
    can_view_outgoing: boolean
    deleted_at: string | null
    created_at: string
    updated_at: string
}

interface AuthState {
    token: string | null
    user: User | null
}

export const useAuthStore = defineStore('auth', {
    state: (): AuthState => ({
        token: localStorage.getItem('token'),
        user: null,
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
        },
        async logout() {
            try {
                await axios.post(`${import.meta.env.VITE_API_URL}/logout`, {}, {
                    headers: {
                        Authorization: `Bearer ${this.token}`,
                    }
                });
            } catch (error) {
                console.error("Error en logout", error);
            } finally {
                this.user = null;
                this.token = null;
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                window.location.href = "/login";
            }
        },
        isAuthenticated(): boolean {
            return !!this.token
        },
        getDataUser(): User {
            return JSON.parse(<string>localStorage.getItem("user")) || null
        }
    }
})
