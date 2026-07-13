export const defaultSettings = {
  general: {
    language: 'en',
    timezone: 'UTC',
    default_date_range: '7d',
    automatic_synchronization: false,
    sync_interval: 15,
  },
  appearance: {
    theme: 'dark',
    compact_mode: false,
    collapsed_sidebar: false,
  },
  message_display: {
    show_sender_email: true,
    show_from_domain: true,
    show_ip: true,
    show_spf: true,
    show_dkim: true,
    show_dmarc: true,
    show_category: true,
  },
}

export function mergeSettings(settings = {}) {
  return {
    ...defaultSettings,
    ...settings,
    general: { ...defaultSettings.general, ...(settings.general || {}) },
    appearance: { ...defaultSettings.appearance, ...(settings.appearance || {}) },
    message_display: { ...defaultSettings.message_display, ...(settings.message_display || {}) },
  }
}
