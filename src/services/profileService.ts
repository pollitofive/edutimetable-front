import http from '@/api/http'
import type { User } from '@/stores/auth'

export interface ProfileData {
  name: string
  email: string
}

export interface PasswordData {
  current_password: string
  password: string
  password_confirmation: string
}

export const profileService = {
  async get(): Promise<User> {
    const res = await http.get('/me')
    return res.data
  },

  async update(data: ProfileData): Promise<User> {
    const res = await http.patch('/me', data)
    return res.data
  },

  // Also signs out the user's other sessions; the current one stays valid
  async changePassword(data: PasswordData): Promise<void> {
    await http.put('/me/password', data)
  },
}
