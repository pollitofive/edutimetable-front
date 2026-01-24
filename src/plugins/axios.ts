import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import { getCurrentBusinessId } from '@/services/businessService'
import router from '@/router'

// Crear instancia personalizada de axios
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://sync-mp-api.test'
})

// Agregar el token y business ID en cada request
axiosInstance.interceptors.request.use((config) => {
    const auth = useAuthStore()
    if (auth.token) {
        config.headers.Authorization = `Bearer ${auth.token}`
    }

    // Add business ID header
    const businessId = getCurrentBusinessId()
    if (businessId) {
        config.headers['X-Business-Id'] = businessId.toString()
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
