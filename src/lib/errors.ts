import { DataClientError } from './dataClient'

/** Extract error message from known error types. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof DataClientError) {
    return `${error.kind} error: ${error.message}`
  }
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}
