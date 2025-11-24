import { create } from 'zustand'

interface AuthState {
  basicAuthHeader?: string
  adminToken?: string
  isAuthenticated: boolean
  setCredentials: (input: { username: string; password: string; adminToken?: string }) => void
  clear: () => void
}

const STORAGE_KEY = 'pixie-upload-auth'

function encodeBasicAuth(username: string, password: string) {
  if (typeof btoa === 'function') {
    return `Basic ${btoa(`${username}:${password}`)}`
  }
  return `Basic ${Buffer.from(`${username}:${password}`, 'utf-8').toString('base64')}`
}

function loadPersistedState(): Pick<AuthState, 'basicAuthHeader' | 'adminToken'> {
  if (typeof window === 'undefined') return {}
  const raw = window.sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object') {
      const { basicAuthHeader, adminToken } = parsed as Partial<AuthState>
      return {
        basicAuthHeader,
        adminToken,
      }
    }
  } catch {
    // ignore parse errors
  }
  return {}
}

function persistState(state: Pick<AuthState, 'basicAuthHeader' | 'adminToken'>) {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const useAuthStore = create<AuthState>((set) => {
  const persisted = loadPersistedState()

  return {
    basicAuthHeader: persisted.basicAuthHeader,
    adminToken: persisted.adminToken,
    isAuthenticated: Boolean(persisted.basicAuthHeader),
    setCredentials: ({ username, password, adminToken }) => {
      const basicAuthHeader = encodeBasicAuth(username, password)
      const nextState = {
        basicAuthHeader,
        adminToken,
      }
      persistState(nextState)
      set({ ...nextState, isAuthenticated: true })
    },
    clear: () => {
      persistState({ basicAuthHeader: undefined, adminToken: undefined })
      set({ basicAuthHeader: undefined, adminToken: undefined, isAuthenticated: false })
    },
  }
})
