import { useMemo } from 'react'
import {
  Box,
  Button,
  Card,
  Container,
  Field,
  Heading,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useForm } from 'react-hook-form'
import { useLocation, useNavigate, type Location as RouterLocation } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { useToast } from '@/hooks/useToast'
import { env } from '@/config/env'

interface LoginFormValues {
  username: string
  password: string
  adminToken?: string
}

export function LoginPage() {
  const setCredentials = useAuthStore((state) => state.setCredentials)
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const from = useMemo(() => {
    if (location.state && typeof location.state === 'object' && 'from' in location.state) {
      const state = location.state as { from?: RouterLocation }
      return state.from?.pathname ?? '/'
    }
    return '/'
  }, [location.state])

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: {
      username: '',
      password: '',
      adminToken: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    setCredentials({
      username: values.username,
      password: values.password,
      adminToken: values.adminToken?.trim() || undefined,
    })
    toast({
      title: 'Ingelogd',
      description: 'Authenticatie ingesteld voor API-calls.',
      status: 'success',
    })
    navigate(from)
  })

  return (
    <Container maxW="lg" py={16}>
      <Card.Root variant="outline">
        <Card.Header>
          <Heading as="h1" size="md">
            Login voor Basic Auth
          </Heading>
          <Text fontSize="sm" color="gray.500">
            Vul je Basic Auth gegevens in. Ze worden in deze sessie gebruikt voor alle API-calls.
          </Text>
        </Card.Header>
        <Card.Body>
          <Stack as="form" gap={4} onSubmit={onSubmit}>
            <Field.Root required>
              <Field.Label>Gebruikersnaam</Field.Label>
              <Input placeholder="username" autoComplete="username" {...register('username', { required: true })} />
            </Field.Root>

            <Field.Root required>
              <Field.Label>Wachtwoord</Field.Label>
              <Input
                type="password"
                placeholder="password"
                autoComplete="current-password"
                {...register('password', { required: true })}
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>Admin token (optioneel)</Field.Label>
              <Input
                placeholder="X-Admin-Token"
                autoComplete="off"
                {...register('adminToken')}
              />
              <Field.HelperText>Wordt meegestuurd bij mutaties (create/update/delete).</Field.HelperText>
            </Field.Root>

            <Box>
              <Text fontSize="xs" color="gray.500">
                API tabular: {env.tabularApiBaseUrl}
                {env.ragApiBaseUrl ? ` • API rag: ${env.ragApiBaseUrl}` : ''}
              </Text>
            </Box>

            <Button type="submit" colorScheme="purple" isLoading={isSubmitting} loadingText="Bezig">
              Inloggen
            </Button>
          </Stack>
        </Card.Body>
      </Card.Root>
    </Container>
  )
}

export default LoginPage
