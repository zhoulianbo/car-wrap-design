import { createFileRoute, notFound } from '@tanstack/react-router';
import { MDXProvider } from '@mdx-js/react';
import { ArrowLeft, Calendar } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { localizedAbsoluteUrl, marketingHead } from '@/lib/seo';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { Footer } from '@/blocks/footer';
import { Header } from '@/blocks/header';
import { MarkdownContent } from '@/components/markdown-content';
import { mdxComponents } from '@/components/mdx-components';
import { StructuredData } from '@/components/seo/structured-data';
import { formatPostDate, loadLocalPost } from '@/content/posts';
import { getBlogPostFn } from '@/content/posts/server';

export const Route = createFileRoute('/blog/$slug')({
  loader: async ({ params }) => {
    const locale = getLocale();
    const post = await getBlogPostFn({
      data: { slug: params.slug, locale },
    });
    if (!post) throw notFound();
    return { locale, post };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return {};
    const { locale, post } = loaderData;
    const head = marketingHead({
      path: `/blog/${post.slug}`,
      locale,
      title: `${post.title} | ${envConfigs.app_name}`,
      description: post.description,
      image: post.image,
    });
    return {
      ...head,
      meta: [
        ...head.meta.map((meta) =>
          'property' in meta && meta.property === 'og:type'
            ? { ...meta, content: 'article' }
            : meta
        ),
        { property: 'article:published_time', content: post.createdAt },
        ...(post.updatedAt
          ? [{ property: 'article:modified_time', content: post.updatedAt }]
          : []),
      ],
    };
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const { locale, post } = Route.useLoaderData();
  const pageUrl = localizedAbsoluteUrl(`/blog/${post.slug}`, locale);

  // Local posts render their bundled MDX component; database posts render
  // raw markdown through MarkdownContent.
  const LocalContent =
    post.source === 'local' ? loadLocalPost(post.slug, locale)?.default : null;

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-6 pt-28 pb-12 md:px-8 md:pt-32 md:pb-16">
        <article className="mx-auto max-w-3xl">
          <Link
            href="/blog"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-4" />
            {m['blog.back_to_blog']()}
          </Link>

          <header className="border-border mt-8 mb-6 border-b pb-6">
            <h1 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
              {post.title}
            </h1>
            {post.description && (
              <p className="text-muted-foreground mt-3">{post.description}</p>
            )}
            <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="size-4" />
                <time dateTime={post.createdAt}>
                  {formatPostDate(post.createdAt, locale)}
                </time>
              </span>
              {post.updatedAt && post.updatedAt !== post.createdAt && (
                <span>
                  {m['common.pages.last_updated']()}:{' '}
                  <time dateTime={post.updatedAt}>
                    {formatPostDate(post.updatedAt, locale)}
                  </time>
                </span>
              )}
              {(post.authorName || post.authorImage) && (
                <span className="inline-flex items-center gap-2">
                  {post.authorImage && (
                    <img
                      src={post.authorImage}
                      alt={post.authorName || ''}
                      width={20}
                      height={20}
                      className="size-5 rounded-full object-cover"
                    />
                  )}
                  {post.source === 'local' ? (
                    <a href="#editorial-note" className="hover:underline">
                      {post.authorName}
                    </a>
                  ) : (
                    post.authorName
                  )}
                </span>
              )}
            </div>
          </header>

          {post.image && (
            <img
              src={post.image}
              alt={post.title}
              width={1600}
              height={900}
              className="border-border mb-8 aspect-video w-full rounded-2xl border object-cover"
            />
          )}

          {LocalContent ? (
            <div className="text-foreground/90 text-[15px] leading-7">
              <MDXProvider components={mdxComponents}>
                <LocalContent />
              </MDXProvider>
            </div>
          ) : (
            <MarkdownContent content={post.content || ''} />
          )}
          {post.source === 'local' && (
            <aside
              id="editorial-note"
              className="border-border mt-10 border-t pt-6"
            >
              <h2 className="text-lg font-semibold">
                {m['blog.editorial_title']()}
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-7">
                {m['blog.editorial_description']({ name: envConfigs.app_name })}
              </p>
              <a
                href="mailto:support@carwrapdesign.app"
                className="text-primary mt-3 inline-block text-sm underline underline-offset-4"
              >
                {m['blog.editorial_contact']()}
              </a>
            </aside>
          )}
        </article>
      </main>
      <Footer />
      <StructuredData
        data={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          '@id': `${pageUrl}#article`,
          headline: post.title,
          description: post.description,
          url: pageUrl,
          mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl },
          inLanguage: locale,
          datePublished: post.createdAt,
          ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
          ...(post.image
            ? { image: new URL(post.image, envConfigs.app_url).href }
            : {}),
          ...(post.authorName
            ? {
                author: {
                  '@type': post.authorType ?? 'Person',
                  name: post.authorName,
                  ...(post.source === 'local'
                    ? { url: `${pageUrl}#editorial-note` }
                    : {}),
                },
              }
            : {}),
          publisher: {
            '@type': 'Organization',
            '@id': `${new URL('/', envConfigs.app_url).href}#organization`,
            name: envConfigs.app_name,
            url: new URL('/', envConfigs.app_url).href,
            logo: new URL('/favicon-32x32.png', envConfigs.app_url).href,
          },
        }}
      />
    </div>
  );
}
