export type User = {
  id: number
  name: string
  email: string
}

export type GoogleMailboxStatus =
  | 'connected'
  | 'syncing'
  | 'paused'
  | 'reconnect_required'
  | 'error'

export type GoogleMailbox = {
  id: number
  email: string
  display_name: string | null
  avatar_url: string | null
  status: GoogleMailboxStatus
  granted_scopes: string[]
  gmail_history_id: string | null
  messages_total: number
  cached_messages_count?: number
  last_synced_at: string | null
  last_sync_error: string | null
  created_at: string | null
}

export type AuthResult = {
  token: string
  user: User
}

export type AuthResultName = 'pass' | 'fail' | 'softfail' | 'neutral' | 'none' | 'temperror' | 'permerror' | 'unknown'

export type EmailMessage = {
  id: number
  google_mailbox_id: number
  gmail_message_id: string
  gmail_thread_id: string | null
  message_id_header: string | null
  sender_name: string | null
  sender_email: string | null
  subject: string | null
  snippet: string | null
  received_at: string | null
  placement: 'inbox' | 'spam' | 'other'
  gmail_category: string | null
  from_domain: string | null
  return_path: string | null
  return_path_domain: string | null
  observed_sending_ip: string | null
  spf_result: AuthResultName
  spf_domain: string | null
  dkim_result: AuthResultName
  dkim_domain: string | null
  dkim_selector: string | null
  dmarc_result: AuthResultName
  dmarc_domain: string | null
  raw_label_ids: string[]
  authentication_results_raw: string | null
  received_spf_raw: string | null
}

export type MessageFilters = {
  search: string
  category: string
  placement: string
  spf: string
  dkim: string
  dmarc: string
  date_from: string
  date_to: string
}

export type DashboardStats = {
  mailboxes: {
    total: number
    active: number
    paused: number
    reconnect_required: number
  }
  messages: {
    cached: number
    inbox: number
    spam: number
    auth_pass_rate: number
  }
}

export type TopSendingIp = {
  observed_sending_ip: string
  total: number
}

export type AppSettings = {
  general: {
    language: string
    timezone: string
    default_date_range: '24h' | '7d' | '14d' | '30d' | '90d'
    automatic_synchronization: boolean
    sync_interval: 5 | 10 | 15 | 30 | 60
  }
  appearance: {
    theme: 'light' | 'dark' | 'system'
    compact_mode: boolean
    collapsed_sidebar: boolean
  }
  message_display: {
    show_sender_email: boolean
    show_from_domain: boolean
    show_ip: boolean
    show_spf: boolean
    show_dkim: boolean
    show_dmarc: boolean
    show_category: boolean
  }
}
