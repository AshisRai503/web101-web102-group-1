// Pulls a user-friendly message out of the backend's error envelope.
// Backend shape: { success: false, error: { code, message, details: [] } }
export default function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  const apiError = err?.response?.data?.error;
  if (apiError?.message) return apiError.message;
  if (Array.isArray(apiError?.details) && apiError.details.length > 0) {
    const first = apiError.details[0];
    if (typeof first === 'string') return first;
    if (first?.message) return first.message;
  }
  if (err?.message) return err.message;
  return fallback;
}
