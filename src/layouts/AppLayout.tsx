import { Box, Container, Flex, Heading, Text } from '@chakra-ui/react'
import { Outlet } from 'react-router-dom'
import { env } from '@/config/env'

export function AppLayout() {
  return (
    <Flex direction="column" minH="100vh" bg="gray.50">
      <Box as="header" borderBottomWidth="1px" bg="white">
        <Container maxW="6xl" py={4} display="flex" gap={4} alignItems="center">
          <Box flex="1">
            <Heading as="h1" size="md">
              {env.appName}
            </Heading>
            <Text fontSize="sm" color="gray.500">
              Upload documenten (tabular & RAG) en beheer collecties binnen Pixie.
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
            Verbonden met tabular backend: {env.tabularApiBaseUrl}
            {env.ragApiBaseUrl ? ` • rag backend: ${env.ragApiBaseUrl}` : ''}
          </Text>
        </Container>
      </Box>
    </Flex>
  )
}
