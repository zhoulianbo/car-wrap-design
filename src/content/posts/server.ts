import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

import { baseLocale, locales } from '@/paraglide/runtime.js';

import {
  BLOG_POST_SLUGS,
  getLocalPosts,
  loadLocalPost,
  mergePosts,
  RETIRED_POST_SLUGS,
  type BlogPost,
  type BlogPostDetail,
} from './index';

// Read local articles as text for the machine-readable public content endpoint.
// This deliberately removes MDX module declarations instead of exposing code.
export async function getLocalPostMarkdown(slug: string, locale: string) {
  if (!BLOG_POST_SLUGS.includes(slug as (typeof BLOG_POST_SLUGS)[number])) {
    return '';
  }
  const sources = import.meta.glob<string>('/src/content/posts/*.mdx', {
    query: '?raw',
    import: 'default',
  });
  const load =
    sources[`/src/content/posts/${slug}.${locale}.mdx`] ??
    sources[`/src/content/posts/${slug}.${baseLocale}.mdx`];
  if (!load) return '';
  return (await load())
    .replace(/^import\s[^\n]+;\s*$/gm, '')
    .replace(/export const meta = \{[\s\S]*?\n\};/g, '')
    .replace(
      /<(?:Link|a)\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/(?:Link|a)>/g,
      (_, href: string, label: string) =>
        `[${label.replace(/\s+/g, ' ').trim()}](${href})`
    )
    .replace(/<img\b[^>]*\/>/g, (tag) => {
      const src = tag.match(/src="([^"]+)"/)?.[1];
      const alt = tag.match(/alt="([^"]*)"/)?.[1] ?? '';
      return src ? `![${alt}](${src})` : '';
    })
    .replace(/<[^>]+>/g, '')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Database access stays behind server functions (dynamic import keeps
// drizzle out of the client bundle), mirroring the analytics pattern.

async function getDbPosts(): Promise<BlogPost[]> {
  try {
    const { listPublishedArticles } = await import('@/modules/posts/service');
    // The public index and sitemap must include every published article.
    // Unlimited retrieval is a server-owned option, never a request parameter.
    const rows = await listPublishedArticles({ all: true });
    return rows.map((row) => ({
      slug: row.slug,
      title: row.title || row.slug,
      description: row.description || '',
      image: row.image || undefined,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
      authorName: row.authorName || undefined,
      authorImage: row.authorImage || undefined,
      source: 'db' as const,
    }));
  } catch {
    // Database not configured/reachable — local posts still render.
    return [];
  }
}

/**
 * All blog posts: database posts merged with local MDX posts,
 * deduped by slug (database wins), newest first.
 */
export const getBlogPostsFn = createServerFn()
  .inputValidator(
    z.object({
      locale: z.enum(locales),
      limit: z.number().int().min(1).max(1000).optional(),
    })
  )
  .handler(async ({ data }) => {
    const dbPosts = await getDbPosts();
    return mergePosts(dbPosts, getLocalPosts(data.locale), {
      limit: data.limit,
    });
  });

/**
 * Single blog post by slug: database first, local MDX as fallback.
 * Local posts return meta only — the route component resolves the MDX
 * Content from the bundled glob map (components don't serialize).
 */
export const getBlogPostFn = createServerFn()
  .inputValidator(
    z.object({ slug: z.string().min(1).max(500), locale: z.enum(locales) })
  )
  .handler(async ({ data }): Promise<BlogPostDetail | null> => {
    if (RETIRED_POST_SLUGS.has(data.slug)) return null;
    try {
      const { findPublishedBySlug } = await import('@/modules/posts/service');
      const row = await findPublishedBySlug(data.slug);
      if (row) {
        return {
          slug: row.slug,
          title: row.title || row.slug,
          description: row.description || '',
          image: row.image || undefined,
          createdAt: new Date(row.createdAt).toISOString(),
          updatedAt: new Date(row.updatedAt).toISOString(),
          authorName: row.authorName || undefined,
          authorImage: row.authorImage || undefined,
          source: 'db',
          content: row.content || '',
        };
      }
    } catch {
      // Database not configured/reachable — fall through to local posts.
    }

    const mod = loadLocalPost(data.slug, data.locale);
    if (!mod) return null;
    const meta = mod.meta;
    return {
      slug: data.slug,
      title: meta.title,
      description: meta.description,
      image: meta.image,
      createdAt: new Date(meta.created_at).toISOString(),
      authorName: meta.author_name,
      authorType: meta.author_type,
      authorImage: meta.author_image,
      updatedAt: meta.updated_at
        ? new Date(meta.updated_at).toISOString()
        : undefined,
      source: 'local',
    };
  });
