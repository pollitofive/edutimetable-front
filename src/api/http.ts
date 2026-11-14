import axios from 'axios'
import { getCurrentBusinessId } from '@/services/businessService'
import { useAuthStore } from '@/stores/auth'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  const businessId = getCurrentBusinessId()

  if (token) config.headers.Authorization = `Bearer ${token}`
  if (businessId) config.headers['X-Business-Id'] = businessId

  return config
})

// A 401 means the token is no longer valid (logged out or revoked from another session)
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('token')) {
      useAuthStore().clearSession()
    }
    return Promise.reject(error)
  }
)

export default http