import { m } from '@/paraglide/messages.js';

import { resolveErrorCode, type ErrorCode } from './error-codes';

// Static references keep the error catalog typed and tree-shakeable.
const messages = {
  REQUEST_FAILED: () => m['common.error_code.REQUEST_FAILED'](),
  UNAUTHORIZED: () => m['common.error_code.UNAUTHORIZED'](),
  FORBIDDEN: () => m['common.error_code.FORBIDDEN'](),
  INSUFFICIENT_CREDITS: () => m['common.error_code.INSUFFICIENT_CREDITS'](),
  CREDITS_CHANGED: () => m['common.error_code.CREDITS_CHANGED'](),
  INVALID_REQUEST: () => m['common.error_code.INVALID_REQUEST'](),
  REQUIRED_FIELD: () => m['common.error_code.REQUIRED_FIELD'](),
  TEXT_TOO_LONG: () => m['common.error_code.TEXT_TOO_LONG'](),
  NOT_FOUND: () => m['common.error_code.NOT_FOUND'](),
  CONFLICT: () => m['common.error_code.CONFLICT'](),
  SHARE_CHANGED: () => m['common.error_code.SHARE_CHANGED'](),
  SHARE_UNAVAILABLE: () => m['common.error_code.SHARE_UNAVAILABLE'](),
  SOURCE_CHANGED: () => m['common.error_code.SOURCE_CHANGED'](),
  SOURCE_UNAVAILABLE: () => m['common.error_code.SOURCE_UNAVAILABLE'](),
  SAVE_REQUIRED: () => m['common.error_code.SAVE_REQUIRED'](),
  SAVE_FAILED: () => m['common.error_code.SAVE_FAILED'](),
  BUSY: () => m['common.error_code.BUSY'](),
  DUPLICATE_REQUEST: () => m['common.error_code.DUPLICATE_REQUEST'](),
  RATE_LIMITED: () => m['common.error_code.RATE_LIMITED'](),
  NETWORK_ERROR: () => m['common.error_code.NETWORK_ERROR'](),
  REQUEST_TIMEOUT: () => m['common.error_code.REQUEST_TIMEOUT'](),
  SERVICE_UNAVAILABLE: () => m['common.error_code.SERVICE_UNAVAILABLE'](),
  AI_UNAVAILABLE: () => m['common.error_code.AI_UNAVAILABLE'](),
  AI_GENERATION_FAILED: () => m['common.error_code.AI_GENERATION_FAILED'](),
  AI_RATE_LIMITED: () => m['common.error_code.AI_RATE_LIMITED'](),
  AI_TIMEOUT: () => m['common.error_code.AI_TIMEOUT'](),
  AI_CONTENT_BLOCKED: () => m['common.error_code.AI_CONTENT_BLOCKED'](),
  AI_OUTPUT_MODERATED: () => m['common.error_code.AI_OUTPUT_MODERATED'](),
  GENERATION_NOT_READY: () => m['common.error_code.GENERATION_NOT_READY'](),
  REFERENCE_REQUIRED: () => m['common.error_code.REFERENCE_REQUIRED'](),
  REFERENCE_UNAVAILABLE: () => m['common.error_code.REFERENCE_UNAVAILABLE'](),
  STORAGE_UNAVAILABLE: () => m['common.error_code.STORAGE_UNAVAILABLE'](),
  STORAGE_LIMIT: () => m['common.error_code.STORAGE_LIMIT'](),
  UPLOAD_FAILED: () => m['common.error_code.UPLOAD_FAILED'](),
  FILE_REQUIRED: () => m['common.error_code.FILE_REQUIRED'](),
  FILE_TOO_LARGE: () => m['common.error_code.FILE_TOO_LARGE'](),
  INVALID_IMAGE: () => m['common.error_code.INVALID_IMAGE'](),
  UNSUPPORTED_IMAGE: () => m['common.error_code.UNSUPPORTED_IMAGE'](),
  IMAGE_PROCESSING_FAILED: () =>
    m['common.error_code.IMAGE_PROCESSING_FAILED'](),
  IMAGE_UNAVAILABLE: () => m['common.error_code.IMAGE_UNAVAILABLE'](),
  UNSUPPORTED_VEHICLE: () => m['common.error_code.UNSUPPORTED_VEHICLE'](),
  PAYMENT_FAILED: () => m['common.error_code.PAYMENT_FAILED'](),
  PRODUCT_UNAVAILABLE: () => m['common.error_code.PRODUCT_UNAVAILABLE'](),
  OFFER_UNAVAILABLE: () => m['common.error_code.OFFER_UNAVAILABLE'](),
  CANCELLATION_UNAVAILABLE: () =>
    m['common.error_code.CANCELLATION_UNAVAILABLE'](),
  TICKET_CLOSED: () => m['common.error_code.TICKET_CLOSED'](),
  PUBLICATION_NOT_ALLOWED: () =>
    m['common.error_code.PUBLICATION_NOT_ALLOWED'](),
  INVITE_REQUIRED: () => m['common.error_code.INVITE_REQUIRED'](),
  INVITE_INVALID: () => m['common.error_code.INVITE_INVALID'](),
  INVITE_EXPIRED: () => m['common.error_code.INVITE_EXPIRED'](),
  INVITE_USED: () => m['common.error_code.INVITE_USED'](),
  SIGN_IN_FAILED: () => m['common.error_code.SIGN_IN_FAILED'](),
  SIGN_UP_FAILED: () => m['common.error_code.SIGN_UP_FAILED'](),
  INVALID_CREDENTIALS: () => m['common.error_code.INVALID_CREDENTIALS'](),
  EMAIL_NOT_VERIFIED: () => m['common.error_code.EMAIL_NOT_VERIFIED'](),
  EMAIL_IN_USE: () => m['common.error_code.EMAIL_IN_USE'](),
  INVALID_EMAIL: () => m['common.error_code.INVALID_EMAIL'](),
  PASSWORD_TOO_SHORT: () => m['common.error_code.PASSWORD_TOO_SHORT'](),
  PASSWORD_TOO_LONG: () => m['common.error_code.PASSWORD_TOO_LONG'](),
  INVALID_TOKEN: () => m['common.error_code.INVALID_TOKEN'](),
  EMAIL_SEND_FAILED: () => m['common.error_code.EMAIL_SEND_FAILED'](),
  PASSWORD_RESET_FAILED: () => m['common.error_code.PASSWORD_RESET_FAILED'](),
  ACCOUNT_DISABLED: () => m['common.error_code.ACCOUNT_DISABLED'](),
} satisfies Record<ErrorCode, () => string>;

/** Never show unrecognized server or provider diagnostics directly to users. */
export function getErrorMessage(
  error: unknown,
  fallback: ErrorCode = 'REQUEST_FAILED'
): string {
  return messages[resolveErrorCode(error, fallback)]();
}
