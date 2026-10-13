import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { localizedAbsoluteUrl } from '@/lib/seo';
import { locales } from '@/paraglide/runtime.js';
import { getBlogPostsFn } from '@/content/posts/server';

const STATIC_PAGES = [
  {
    path: '/',
    title: 'Product overview',
    description:
      'Design a car wrap with AI or your own artwork, preview it on a 3D vehicle, and explore the current vehicle library.',
  },
  {
    path: '/ai-car-wrap-generator',
    title: 'AI car wrap generator',
    description:
      'Turn a text prompt and optional reference image into a vehicle-specific wrap texture, then preview or edit it.',
  },
  {
    path: '/gallery',
    title: 'Community gallery',
    description:
      'Discover community designs, filter by vehicle, preview textures in 3D, and find a starting point for your own wrap.',
  },
  {
    path: '/tesla-wrap',
    title: 'Tesla wrap design',
    description: 'Supported Tesla models, finishes, and design workflows.',
  },
  {
    path: '/tesla-model-3-wrap',
    title: 'Model 3 wrap design',
    description: 'Choose a supported Model 3 version and preview a design.',
  },
  {
    path: '/tesla-model-y-wrap',
    title: 'Model Y wrap design',
    description: 'Choose a supported Model Y version and preview a design.',
  },
  {
    path: '/pricing',
    title: 'Pricing',
    description:
      'Current one-time AI credit packs and paid benefits; manual editing and 3D preview are free.',
  },
  {
    path: '/blog',
    title: 'Design guides',
    description: 'Vehicle templates, artwork, and 3D preview tutorials.',
  },
  {
    path: '/privacy-policy',
    title: 'Privacy policy',
    description: 'Data handling and contact information.',
  },
  {
    path: '/terms-of-service',
    title: 'Terms of service',
    description: 'Usage terms, content rights, and support.',
  },
];

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: async () => {
        const lines = [
          `# ${envConfigs.app_name}`,
          '',
          `> ${envConfigs.app_name} is an online car wrap design platform that helps car owners, enthusiasts, and designers turn ideas into vehicle-specific artwork, see the result on a 3D car, and share or download their designs. It combines AI generation, a free browser editor, and a community gallery.`,
          '',
          'The goal is to become a global car wrap design platform for popular vehicles across brands. Tesla is the first supported brand. The current library includes Model 3, Model Y, Cybertruck, Model S, and Model X configurations; other brands are planned and are not available yet.',
          '',
          'Use the platform to explore a personal style, compare colors and finishes, position your own graphics, or explain a design direction to a wrap shop before committing to a physical wrap. No desktop design software is required.',
          '',
          'Current capabilities:',
          '- AI generation: create wrap artwork from a text prompt, optional reference image, and color preferences for a selected vehicle. AI generation requires sign-in and credits.',
          '- Manual editing: compose a wrap with a base color and separate text, uploaded image, and shape layers; move, resize, rotate, and arrange your own layers.',
          '- 3D preview: inspect the artwork from different angles and compare gloss, satin, matte, metallic, and pearlescent appearances.',
          '- Gallery: browse public designs, download available textures, open a design in the editor, or use it as an AI reference, subject to creator rights.',
          '- Save and share: sign in to save and reopen wraps, manage gallery publication, or create a revocable preview link independently of gallery publication.',
          '- Export: download a square PNG wrap texture and capture a vehicle preview for concept review.',
          '',
          'AI output is one flattened image: embedded lettering and graphics are not separate editable objects. Text, images, and shapes added manually remain separate editor layers. Exported textures and 3D previews are design concepts; a physical wrap still needs professional measurement and print preparation.',
          '',
          `Website: ${new URL('/', envConfigs.app_url).href}`,
          '',
          'Contact: support@carwrapdesign.app',
          '',
          '## Product reference',
          '',
          `- [Full product reference and guides](${new URL('/llms-full.txt', envConfigs.app_url).href}): Product value, current features, vehicle configurations, workflow, pricing model, and limitations, followed by published guides.`,
        ];
        for (const locale of locales) {
          lines.push('', `## Pages (${locale})`, '');
          for (const page of STATIC_PAGES) {
            lines.push(
              `- [${page.title}](${localizedAbsoluteUrl(page.path, locale)}): ${page.description}`
            );
          }
          const posts = await getBlogPostsFn({ data: { locale } });
          if (posts.length) {
            lines.push('', `## Guides (${locale})`, '');
            for (const post of posts) {
              lines.push(
                `- [${post.title}](${localizedAbsoluteUrl(`/blog/${post.slug}`, locale)}): ${post.description}`
              );
            }
          }
        }
        lines.push('');
        return new Response(lines.join('\n'), {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      },
    },
  },
});
