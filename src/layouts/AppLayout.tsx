import { Box, Container, Flex, Heading, Text } from '@chakra-ui/react'
import { Outlet } from 'react-router-dom'
import { env } from '@/config/env'

export function AppLayout() {
  return (
    <Flex direction="column" minH="100vh" bg="gray.50">
      <Box as="header" borderBottomWidth="1px" bg="white">
        <Container maxW="6xl" py={4}>
          <Heading as="h1" size="md">
            {env.appName}
          </Heading>
          <Text fontSize="sm" color="gray.500">
            Upload tabulaire documenten en beheer collecties binnen Pixie.
          </Text>
        </Container>
      </Box>

      <Container as="main" maxW="6xl" py={8} flex="1">
        <Outlet />
      </Container>

      <Box as="footer" borderTopWidth="1px" bg="white">
        <Container maxW="6xl" py={4}>
          <Text fontSize="xs" color="gray.500">
            Verbonden met tabular backend: {env.tabularApiBaseUrl}
          </Text>
        </Container>
      </Box>
    </Flex>
  )
}
