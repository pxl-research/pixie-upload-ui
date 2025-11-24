import { Button, Card, Container, Heading, Stack, Text } from '@chakra-ui/react'
import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <Container maxW="lg" py={16}>
      <Card.Root variant="outline">
        <Card.Body>
          <Stack gap={3} textAlign="center">
            <Heading as="h1" size="md">
              Pagina niet gevonden
            </Heading>
            <Text color="gray.600">De opgevraagde pagina bestaat niet.</Text>
            <Button as={Link} to="/" colorScheme="purple">
              Terug naar dashboard
            </Button>
          </Stack>
        </Card.Body>
      </Card.Root>
    </Container>
  )
}

export default NotFound
