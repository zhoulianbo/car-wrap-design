import { z } from 'zod';

const allowedRel = new Set([
  'nofollow',
  'noopener',
  'noreferrer',
  'sponsored',
  'ugc',
]);

export function normalizeFooterLinkRel(value: string): string {
  return [
    ...new Set([
      ...value
        .toLowerCase()
        .split(/\s+/)
        .filter((token) => allowedRel.has(token)),
      'noopener',
    ]),
  ].join(' ');
}

export function isFooterLinkUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

const urlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(isFooterLinkUrl, 'Use an HTTP or HTTPS URL.');

export const footerLinkInputSchema = z
  .object({
    group: z.enum(['friend', 'badge']),
    title: z.string().trim().min(1).max(200),
    url: urlSchema,
    imageUrl: z.union([z.literal(''), urlSchema]),
    altText: z.string().trim().max(300),
    rel: z
      .string()
      .trim()
      .max(100)
      .refine(
        (value) =>
          value
            .toLowerCase()
            .split(/\s+/)
            .filter(Boolean)
            .every((token) => allowedRel.has(token)),
        'Allowed rel values: nofollow, noopener, noreferrer, sponsored, ugc.'
      ),
    sort: z.number().int().min(0).max(9999),
  })
  .refine((value) => value.group !== 'badge' || Boolean(value.imageUrl), {
    path: ['imageUrl'],
    message: 'An image URL is required for a badge.',
  });

export type FooterLinkInput = z.infer<typeof footerLinkInputSchema>;
export type FooterLinkItem = FooterLinkInput & { id: string };
export const footerLinkSnapshotSchema = z.array(
  footerLinkInputSchema.and(z.object({ id: z.string().min(1) }))
);

// Parse inert markup into fields; never render or store pasted HTML.
export function importFooterLinkHtml(html: string): Partial<FooterLinkInput> {
  const document = new DOMParser().parseFromString(html, 'text/html');
  const anchor = document.querySelector('a[href]');
  const url = anchor?.getAttribute('href')?.trim() || '';
  if (!anchor || !isFooterLinkUrl(url)) throw new Error('Invalid link HTML');
  const img = anchor.querySelector('img');
  const imageUrl = img?.getAttribute('src')?.trim() || '';
  if (img && !isFooterLinkUrl(imageUrl))
    throw new Error('Invalid badge image URL');
  const altText = img?.getAttribute('alt')?.trim() || '';
  return {
    group: img ? 'badge' : 'friend',
    title:
      anchor.textContent?.trim() ||
      altText ||
      anchor.getAttribute('title')?.trim() ||
      new URL(url).hostname,
    url,
    imageUrl,
    altText,
    rel: normalizeFooterLinkRel(anchor.getAttribute('rel') || ''),
  };
}
