import { Portal } from '@chakra-ui/react'
import {
  Box,
  Button,
  Card,
  Flex,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'
import { useCallback, useMemo, useRef, useState } from 'react'
import {
  ToastContext,
  type ToastContextValue,
  type ToastOptions,
  type ToastStatus,
} from '@/providers/ToastContext'

interface ToastItem extends ToastOptions {
  id: string
}

const STATUS_COLORS: Record<ToastStatus, { border: string; bg: string }> = {
  info: { border: 'purple.400', bg: 'white' },
  success: { border: 'green.400', bg: 'white' },
  warning: { border: 'orange.400', bg: 'white' },
  error: { border: 'red.400', bg: 'white' },
}

function generateId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return Math.random().toString(36).slice(2)
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const dismissTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
    const timeoutId = dismissTimers.current.get(id)
    if (timeoutId) {
      clearTimeout(timeoutId)
      dismissTimers.current.delete(id)
    }
  }, [])

  const notify = useCallback(
    (options: ToastOptions) => {
      const id = generateId()
      const status = options.status ?? 'info'
      const toast: ToastItem = {
        id,
        status,
        title: options.title,
        description: options.description,
        duration: options.duration,
      }

      setToasts((current) => [...current, toast])

      const duration = options.duration ?? 4000
      if (duration > 0) {
        const timeoutId = setTimeout(() => removeToast(id), duration)
        dismissTimers.current.set(id, timeoutId)
      }
    },
    [removeToast],
  )

  const value = useMemo<ToastContextValue>(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Portal>
        <Box position="fixed" top={4} right={4} zIndex="toast">
          <VStack align="stretch" gap={3}>
            {toasts.map((toast) => {
              const colors = STATUS_COLORS[toast.status ?? 'info']
              return (
                <Card.Root
                  key={toast.id}
                  borderLeftWidth="4px"
                  borderLeftColor={colors.border}
                  bg={colors.bg}
                  boxShadow="lg"
                  minW="280px"
                  maxW="360px"
                >
                  <Card.Body>
                    <Flex align="flex-start" justify="space-between" gap={3}>
                      <Stack gap={1} flex="1">
                        <Text fontWeight="semibold">{toast.title}</Text>
                        {toast.description ? (
                          <Text fontSize="sm" color="gray.600">
                            {toast.description}
                          </Text>
                        ) : null}
                      </Stack>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => removeToast(toast.id)}
                      >
                        Sluiten
                      </Button>
                    </Flex>
                  </Card.Body>
                </Card.Root>
              )
            })}
          </VStack>
        </Box>
      </Portal>
    </ToastContext.Provider>
  )
}
