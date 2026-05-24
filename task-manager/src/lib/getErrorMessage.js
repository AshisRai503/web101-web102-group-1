/**
 * getErrorMessage.js – API Error Message Extractor
 *
 * A utility that extracts a human-readable error message from the various
 * error shapes the application may encounter:
 *
 *  1. Backend API envelope  : { error: { message, details[] } }
 *  2. Joi validation detail : details[0].message  or  details[0] (string)
 *  3. Generic JS/network    : err.message
 *  4. Caller-supplied fallback string
 *
 * Using this helper in every catch block ensures the UI always shows a clear
 * message rather than a raw "[object Object]" or a stack trace.
 *
 * @example
 *   } catch (err) {
 *     setApiError(getErrorMessage(err, 'Login failed. Please try again.'));
 *   }
 */

/**
 * Extracts the most specific user-facing error message from an Axios error.
 *
 * Resolution order:
 *  1. err.response.data.error.message        Primary backend message
 *  2. err.response.data.error.details[0]     First validation detail (string)
 *  3. err.response.data.error.details[0].message  First detail (object)
 *  4. err.message                            Native JS Error message
 *  5. fallback                               Caller-supplied default
 *
 * @param {unknown} err      – The caught error (typically an AxiosError).
 * @param {string}  fallback – Message to show when no specific error is found.
 *   Defaults to 'Something went wrong. Please try again.'
 *
 * @returns {string} A user-friendly error message string.
 */
export default function getErrorMessage(
  err,
  fallback = 'Something went wrong. Please try again.'
) {
  // Try to read the backend's standard error envelope.
  // Shape: { success: false, error: { code, message, details: [] } }
  const apiError = err?.response?.data?.error;

  // Prefer the top-level message in the error envelope.
  if (apiError?.message) return apiError.message;

  // If the backend returned validation detail objects, use the first one.
  if (Array.isArray(apiError?.details) && apiError.details.length > 0) {
    const first = apiError.details[0];
    if (typeof first === 'string')  return first;          // Plain string detail
    if (first?.message)             return first.message;  // Object detail
  }

  // Fall back to the native JS Error message (network errors, timeouts, etc.)
  if (err?.message) return err.message;

  // Final fallback.
  return fallback;
}
