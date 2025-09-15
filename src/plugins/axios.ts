import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

// Crear instancia personalizada de axios
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://sync-mp-api.test'
})

// Agregar el token en cada request
axiosInstance.interceptors.request.use((config) => {
    const auth = useAuthStore()
    if (auth.token) {
        config.headers.Authorization = `Bearer ${auth.token}`
    }
    return config
})

// Interceptor de respuesta para manejar errores 401
axiosInstance.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            const auth = useAuthStore()
            // Limpiar token y datos del usuario
            auth.logout()
            // Redirigir al login
            router.push('/login')
        }
        return Promise.reject(error)
    }
)

export default axiosInstance
