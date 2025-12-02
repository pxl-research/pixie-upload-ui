import { Box, Container, Flex, Heading, Text } from '@chakra-ui/react'
import { Outlet } from 'react-router-dom'
import { env } from '@/config/env'

export function AppLayout() {
  const subtitleParts = [
    env.isTabularEnabled ? 'tabular' : null,
    env.isRagEnabled ? 'RAG' : null,
  ].filter(Boolean)

  const connections = [
    env.isTabularEnabled ? `tabular backend: ${env.tabularApiBaseUrl}` : null,
    env.isRagEnabled ? `rag backend: ${env.ragApiBaseUrl}` : null,
  ]
    .filter(Boolean)
    .join(' • ')

  return (
    <Flex direction="column" minH="100vh" bg="gray.50">
      <Box as="header" borderBottomWidth="1px" bg="white">
        <Container maxW="6xl" py={4} display="flex" gap={4} alignItems="center">
          <Box flex="1">
            <Heading as="h1" size="md">
              {env.appName}
            </Heading>
            <Text fontSize="sm" color="gray.500">
              Upload documenten ({subtitleParts.join(' & ') || 'geen backends actief'}) en beheer collecties binnen Pixie.
            </Text>
          </Box>
        </Container>
      </Box>

      <Container as="main" maxW="6xl" py={8} flex="1">
        <Outlet />
      </Container>

      <Box as="footer" borderTopWidth="1px" bg="white">
        <Container maxW="6xl" py={4}>
          <Text fontSize="xs" color="gray.500">
            {connections || 'Geen backends geactiveerd.'}
          </Text>
        </Container>
      </Box>
    </Flex>
  )
}
