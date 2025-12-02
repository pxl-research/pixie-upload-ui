import '@testing-library/jest-dom'
import 'whatwg-fetch'

process.env.TABULAR_API_KEY ??= 'test-api-key'
process.env.RAG_API_KEY ??= 'test-rag-api-key'
process.env.LOG_LEVEL ??= 'info'

// Ensure unhandled promise rejections fail tests explicitly.
process.on('unhandledRejection', (reason) => {
  throw reason
})
