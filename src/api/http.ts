import axios from 'axios'
import { getCurrentBusinessId } from '@/services/businessService'

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

export default http