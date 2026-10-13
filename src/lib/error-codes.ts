/** Stable public error codes. Legacy messages are normalized only at API boundaries. */
export const ERROR_CODES = {
  REQUEST_FAILED: ['Request failed', 'Internal error', 'Failed'],
  UNAUTHORIZED: [
    'Unauthorized',
    'No session token found',
    'UNAUTHENTICATED',
    'SESSION_EXPIRED',
  ],
  FORBIDDEN: ['Forbidden', 'Invalid origin'],
  INSUFFICIENT_CREDITS: ['Insufficient credits', 'Insufficient balance'],
  CREDITS_CHANGED: [
    'Credits changed, please retry',
    'Credits changed, please retry.',
    'Credits changed',
    'Credit reservation is missing',
    'Credit reservation is unavailable',
    'Credits changed; please retry',
  ],
  INVALID_REQUEST: [
    'Invalid body',
    'Invalid action',
    'Invalid status',
    'Invalid query',
    'Invalid credits',
    'Invalid attachments',
    'Invalid generation request',
    'Invalid publish data',
    'Invalid save data',
    'Invalid share request',
    'Invalid wrap data',
    'Invalid remix request',
    'Invalid report request',
    'Invalid like',
    'Invalid gallery filters',
    'Invalid limit',
    'Invalid vehicle family',
    'Invalid moderation status',
    'Invalid design moderation status',
    'Invalid gallery layer',
    'Only user uploads are accepted',
    'Vehicle cannot change',
    'Select one saved wrap or generated image',
    'Article limit must be an integer between 1 and 1000',
  ],
  REQUIRED_FIELD: [
    'Title and content are required',
    'Content is required',
    'Title is required',
    'Name and title are required',
    'Name cannot be empty',
    'ID is required',
    'Asset id required',
    'Key ID is required',
    'Missing product_id',
    'Missing userId',
    'orderNo is required',
    'roleId is required',
    'subscriptionNo is required',
    'userId and roleId are required',
    'code, resource, action, and title are required',
    'slug and title are required',
    'group is required',
    'No fields to update',
    'No changes',
  ],
  TEXT_TOO_LONG: ['Title is too long', 'Content is too long', 'Name too long'],
  NOT_FOUND: [
    'Asset not found',
    'Design not found',
    'Generated wrap not found',
    'Generation not found',
    'Post not found',
    'Report not found',
    'Saved wrap not found',
    'Subscription not found',
    'Task not found',
    'Ticket not found',
    'User not found',
    'Wrap not found',
  ],
  CONFLICT: [
    'Wrap changed in another tab',
    'Wrap changed or is private',
    'Wrap changed, refresh the review list',
    'Wrap changed, reload before sharing',
    'Wrap changed, save again before sharing',
    'Wrap changed; refresh the review list',
    'Wrap changed; reload before sharing',
    'Wrap changed; save again before sharing',
  ],
  SHARE_CHANGED: [
    'Share link changed, reopen the dialog',
    'Share link changed; reopen the dialog',
  ],
  SHARE_UNAVAILABLE: ['Share link unavailable'],
  SOURCE_CHANGED: [
    'Source design changed, reopen it from the gallery',
    'Source design changed; reopen it from the gallery',
  ],
  SOURCE_UNAVAILABLE: ['Source design is unavailable'],
  SAVE_REQUIRED: ['Save the wrap before submitting'],
  SAVE_FAILED: [
    'Failed to save wrap',
    'Failed to save cover',
    'Failed to preserve source layer',
  ],
  BUSY: [
    'Cover is already being saved, retry shortly',
    'Cover save claim expired',
    'Generation completion claim expired',
    'Cover is already being saved; retry shortly',
  ],
  DUPLICATE_REQUEST: [
    'Generation key is already in use',
    'Remix key is unavailable',
    'Save key is unavailable',
  ],
  RATE_LIMITED: ['too_many_requests', 'TOO_MANY_REQUESTS'],
  NETWORK_ERROR: [
    'Failed to fetch',
    'fetch failed',
    'NetworkError when attempting to fetch resource.',
    'Load failed',
  ],
  REQUEST_TIMEOUT: [],
  SERVICE_UNAVAILABLE: [],
  AI_UNAVAILABLE: [
    'The selected AI provider is not configured',
    'Prompt safety service is unavailable',
  ],
  AI_GENERATION_FAILED: [
    'Generation failed',
    'Provider request failed',
    'Failed to create generation',
    'Grsai generation failed',
  ],
  AI_RATE_LIMITED: [],
  AI_TIMEOUT: [],
  AI_OUTPUT_MODERATED: ['output_moderation'],
  AI_CONTENT_BLOCKED: [
    'Prompt blocked by content safety check',
    'content_policy_violation',
    'moderation_blocked',
  ],
  GENERATION_NOT_READY: ['Generated image is not ready to save'],
  REFERENCE_REQUIRED: ['Image-to-image generation needs a reference image'],
  REFERENCE_UNAVAILABLE: ['Input asset is unavailable'],
  STORAGE_UNAVAILABLE: [
    'Storage unavailable',
    'Storage is not configured',
    'R2 storage is not configured',
    'Generated image storage is unavailable',
  ],
  STORAGE_LIMIT: ['Storage limit reached'],
  UPLOAD_FAILED: [
    'Upload failed',
    'Image upload failed',
    'Texture upload failed',
    'upload image failed',
    'Failed to store generated image',
  ],
  FILE_REQUIRED: ['No files provided'],
  FILE_TOO_LARGE: ['Image too large'],
  INVALID_IMAGE: [
    'Image signature does not match WebP',
    'A WebP image within the size limit is required',
    'Invalid image URL',
    'Invalid image source',
    'Invalid texture source',
    'Texture is not a PNG',
  ],
  UNSUPPORTED_IMAGE: ['Use JPEG, PNG, or WebP'],
  IMAGE_PROCESSING_FAILED: [
    'Image processing is unavailable',
    'Image processing failed',
  ],
  IMAGE_UNAVAILABLE: [
    'Image unavailable',
    'Texture unavailable',
    'Texture not found',
    'Source texture unavailable',
    'Design texture is unavailable',
    'Wrap texture is unavailable',
    'Preview unavailable',
    'Unable to load image',
  ],
  UNSUPPORTED_VEHICLE: ['Unsupported vehicle'],
  PAYMENT_FAILED: ['Checkout failed'],
  PRODUCT_UNAVAILABLE: ['Unknown product'],
  OFFER_UNAVAILABLE: ['This trial offer is no longer available.'],
  CANCELLATION_UNAVAILABLE: ['Cancellation not supported for this provider'],
  TICKET_CLOSED: ['Ticket is closed'],
  PUBLICATION_NOT_ALLOWED: [
    'Private wraps cannot be published',
    'Approve the latest version before changing publication',
  ],
  INVITE_REQUIRED: ['Invite code is required'],
  INVITE_INVALID: ['Invalid invite code'],
  INVITE_EXPIRED: ['Invite code has expired'],
  INVITE_USED: ['Invite code has been fully used'],
  SIGN_IN_FAILED: ['Sign in failed'],
  SIGN_UP_FAILED: ['Sign up failed', 'FAILED_TO_CREATE_USER'],
  INVALID_CREDENTIALS: [
    'INVALID_EMAIL_OR_PASSWORD',
    'INVALID_PASSWORD',
    'Invalid email or password',
  ],
  EMAIL_NOT_VERIFIED: ['Email not verified'],
  EMAIL_IN_USE: [
    'USER_ALREADY_EXISTS',
    'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL',
    'User already exists',
  ],
  INVALID_EMAIL: ['Email is invalid'],
  PASSWORD_TOO_SHORT: [],
  PASSWORD_TOO_LONG: [],
  INVALID_TOKEN: ['TOKEN_EXPIRED', 'Invalid token'],
  EMAIL_SEND_FAILED: ['FAILED_TO_SEND_VERIFICATION_EMAIL'],
  PASSWORD_RESET_FAILED: ['Reset failed'],
  ACCOUNT_DISABLED: ['USER_BANNED'],
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && Object.hasOwn(ERROR_CODES, value);
}
const legacyCodes = new Map<string, ErrorCode>(
  Object.entries(ERROR_CODES).flatMap(([code, aliases]) =>
    aliases.map((alias) => [alias.toLowerCase(), code as ErrorCode])
  )
);

export function resolveErrorCode(
  error: unknown,
  fallback: ErrorCode = 'REQUEST_FAILED',
  status?: number
): ErrorCode {
  const value =
    error && typeof error === 'object'
      ? (error as {
          errorCode?: unknown;
          code?: unknown;
          message?: unknown;
          error?: unknown;
          name?: string;
          status?: number;
        })
      : { message: error };
  for (const candidate of [
    value.errorCode,
    value.code,
    value.message,
    value.error,
  ]) {
    if (isErrorCode(candidate)) return candidate;
    if (typeof candidate === 'string') {
      const legacy = legacyCodes.get(candidate.toLowerCase());
      if (legacy && legacy !== 'REQUEST_FAILED') return legacy;
    }
  }
  if (value.name === 'AbortError' || value.name === 'TimeoutError')
    return 'REQUEST_TIMEOUT';
  switch (status ?? value.status) {
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 408:
    case 504:
      return 'REQUEST_TIMEOUT';
    case 409:
      return 'CONFLICT';
    case 413:
      return 'FILE_TOO_LARGE';
    case 429:
      return 'RATE_LIMITED';
    case 502:
    case 503:
      return 'SERVICE_UNAVAILABLE';
    case 400:
    case 422:
      return 'INVALID_REQUEST';
    default:
      return fallback;
  }
}

/** Provider credentials/quota failures are not user sign-in or user-credit failures. */
export function generationErrorCode(
  message: string | null | undefined
): ErrorCode {
  const code = resolveErrorCode(message, 'AI_GENERATION_FAILED');
  if (
    [
      'AI_CONTENT_BLOCKED',
      'AI_OUTPUT_MODERATED',
      'AI_UNAVAILABLE',
      'AI_RATE_LIMITED',
      'AI_TIMEOUT',
      'STORAGE_UNAVAILABLE',
      'UPLOAD_FAILED',
      'INVALID_IMAGE',
    ].includes(code)
  )
    return code;
  if (
    /content_policy_violation|moderation_blocked|safety.*(?:blocked|rejected)/i.test(
      message ?? ''
    )
  )
    return 'AI_CONTENT_BLOCKED';
  if (/timeout|timed out/i.test(message ?? '')) return 'AI_TIMEOUT';
  if (/rate.?limit|too many requests|status 429/i.test(message ?? ''))
    return 'AI_RATE_LIMITED';
  return 'AI_GENERATION_FAILED';
}
