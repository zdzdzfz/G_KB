import axios from 'axios'
import type {
  AppSettings,
  AuthResult,
  DashboardStats,
  EmailMessage,
  GoogleMailbox,
  MessageFilters,
  TopSendingIp,
  User,
} from '../types'

const tokenKey = 'mailauth_token'
const apiBaseUrl = import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api')

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(tokenKey)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export const tokenStorage = {
  key: tokenKey,
  get: () => localStorage.getItem(tokenKey),
  set: (token: string) => localStorage.setItem(tokenKey, token),
  clear: () => localStorage.removeItem(tokenKey),
}

export const api = {
  async login(email: string, password: string) {
    return (await apiClient.post<AuthResult>('/login', { email, password })).data
  },
  async logout() {
    await apiClient.post('/logout')
  },
  async me() {
    return (await apiClient.get<{ data: User }>('/me')).data.data
  },
  async googleRedirect() {
    return (await apiClient.get<{ redirect_url: string }>('/google/redirect')).data
  },
  async createGoogleInvitation(target_email: string) {
    return (
      await apiClient.post<{ url: string; target_email: string | null; expires_at: string }>('/google/invitations', {
        target_email: target_email || null,
      })
    ).data
  },
  async mailboxes() {
    return (await apiClient.get<{ data: GoogleMailbox[] }>('/mailboxes')).data.data
  },
  async syncAll() {
    return (await apiClient.post<{ results: { mailbox_id: number; status: string; message?: string }[] }>('/mailboxes/sync-all')).data
  },
  async syncMailbox(id: number) {
    return (await apiClient.post<{ data: GoogleMailbox }>(`/mailboxes/${id}/sync`)).data.data
  },
  async pauseMailbox(id: number) {
    return (await apiClient.post<{ data: GoogleMailbox }>(`/mailboxes/${id}/pause`)).data.data
  },
  async resumeMailbox(id: number) {
    return (await apiClient.post<{ data: GoogleMailbox }>(`/mailboxes/${id}/resume`)).data.data
  },
  async reconnectMailbox(id: number) {
    return (await apiClient.get<{ redirect_url: string }>(`/mailboxes/${id}/reconnect`)).data
  },
  async deleteMailbox(id: number) {
    await apiClient.delete(`/mailboxes/${id}`)
  },
  async messages(mailboxId: number, filters: MessageFilters, signal?: AbortSignal) {
    return (
      await apiClient.get<{ data: EmailMessage[] }>(`/mailboxes/${mailboxId}/messages`, {
        params: Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '')),
        signal,
      })
    ).data.data
  },
  async message(id: number) {
    return (await apiClient.get<{ data: EmailMessage }>(`/messages/${id}`)).data.data
  },
  async stats() {
    return (await apiClient.get<DashboardStats>('/dashboard/stats')).data
  },
  async topSendingIps() {
    return (await apiClient.get<{ data: TopSendingIp[] }>('/dashboard/top-sending-ips')).data.data
  },
  async settings() {
    return (await apiClient.get<{ data: { settings: AppSettings } }>('/settings')).data.data.settings
  },
  async updateSettings(settings: AppSettings) {
    return (await apiClient.put<{ data: { settings: AppSettings } }>('/settings', settings)).data.data.settings
  },
  async resetSettings() {
    return (await apiClient.post<{ data: { settings: AppSettings } }>('/settings/reset')).data.data.settings
  },
}
