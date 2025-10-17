import '@testing-library/jest-dom'
import 'whatwg-fetch'

// Ensure unhandled promise rejections fail tests explicitly.
process.on('unhandledRejection', (reason) => {
  throw reason
})
