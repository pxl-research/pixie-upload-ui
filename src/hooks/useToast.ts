import { useContext } from 'react'
import { ToastContext, type ToastOptions } from '@/providers/ToastContext'

export type { ToastOptions }

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }

  return context.notify
}
