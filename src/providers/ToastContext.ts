import { createContext } from 'react'

export type ToastStatus = 'info' | 'success' | 'warning' | 'error'

export interface ToastOptions {
  title: string
  description?: string
  status?: ToastStatus
  duration?: number
}

export interface ToastContextValue {
  notify: (options: ToastOptions) => void
}

export const ToastContext = createContext<ToastContextValue | undefined>(undefined)
