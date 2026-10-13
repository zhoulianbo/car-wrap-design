import { createFileRoute } from '@tanstack/react-router';

import { envConfigs } from '@/config';
import { localizedAbsoluteUrl } from '@/lib/seo';
import { VEHICLE_ASSET_MANIFEST } from '@/lib/vehicle-catalog';
import { locales } from '@/paraglide/runtime.js';
import {
  getBlogPostFn,
  getBlogPostsFn,
  getLocalPostMarkdown,
} from '@/content/posts/server';

export const Route = createFileRoute('/llms-full.txt')({
  server: {
    handlers: {
      GET: async () => {
        const lines = [
          `# ${envConfigs.app_name}`,
          '',
          `> ${envConfigs.app_name} is an online car wrap design platform for turning an idea into artwork, previewing it on a 3D vehicle, and saving, sharing, or downloading the result. AI generation, a free manual editor, and a community gallery bring inspiration and vehicle visualization into one browser workflow.`,
          '',
          `Website: ${new URL('/', envConfigs.app_url).href}`,
          `Page directory: ${new URL('/llms.txt', envConfigs.app_url).href}`,
          'Contact: support@carwrapdesign.app',
          '',
          '## Product value and audience',
          '',
          'Car owners and enthusiasts can explore how a color scheme, pattern, or illustration might look on their vehicle before committing to a wrap. Designers can compose artwork, check how it reads across body panels, and share a visual direction with a client or wrap shop. The platform connects a flat artwork canvas with a matching 3D vehicle so users can move between creating and evaluating a design without installing desktop design software.',
          '',
          'Typical uses include planning a personal color change, exploring racing or illustrated styles, positioning an uploaded logo, comparing material appearances, and preparing a visual brief for a professional installer.',
          '',
          '## Current coverage and long-term vision',
          '',
          'The ambition is to become a global car wrap design platform covering popular vehicles from multiple brands. Tesla is the first supported brand, not the limit of the product vision. Additional brands and models are planned; they are not currently available, and no release dates are promised here.',
          '',
          'The current catalog covers Tesla Model 3, Model Y, Cybertruck, Model S, and Model X. Select the exact configuration because models and versions use different vehicle geometry and texture layouts. A texture for one configuration should not be assumed to fit another.',
          '',
          'Available vehicle configurations:',
          ...VEHICLE_ASSET_MANIFEST.map(
            (vehicle) =>
              `- ${vehicle.brand} ${vehicle.trim} (${vehicle.year}); vehicle identifier: ${vehicle.slug}.`
          ),
          '',
          'Vehicle coverage means the configuration is present in the design and preview catalog. It does not certify a physical installation pattern or guarantee compatibility with an in-car custom-wrap display.',
          '',
          '## Features available today',
          '',
          '### AI car wrap generation',
          '',
          'Choose a vehicle, describe the desired style, and optionally add a reference image and preferred colors. The generator creates a flat wrap texture using the selected vehicle template. Inspect the resulting image, view it on the matching 3D car, download it, or open it in the editor to add your own layers. Gallery artwork can also be used as a reference for a new generation.',
          '',
          'AI generation requires an account and credits. A generated image is a single flattened artwork layer: lettering, logos, and illustrations inside it cannot be selected as separate objects. To change those pixels, generate a revised result or edit the image in an external image editor. Adding a new layer does not erase the original pixels underneath it.',
          '',
          '### Free manual wrap editor',
          '',
          'Start from a blank canvas or existing artwork. Set a base color and add text, uploaded images, and shapes. Move, resize, rotate, and reorder the layers you create; use undo and redo while refining the composition. Text created with the text tool remains editable. An uploaded logo or illustration is one image layer that can be transformed as a whole.',
          '',
          'The browser editor and 3D preview are free to use. Sign-in is required for account operations such as uploading assets and saving a wrap. For precise wording or logo placement, add those elements as separate manual layers.',
          '',
          '### Interactive 3D vehicle preview',
          '',
          'See the design mapped to the selected vehicle, rotate the view, and inspect the front, sides, and rear. Compare gloss, satin, matte, metallic, and pearlescent appearances. Use the preview to spot awkward panel transitions, graphics near wheel arches, and hard-to-read lettering. Capture a preview image to communicate the intended look.',
          '',
          'Material appearances are visual simulations. They do not identify a specific vinyl product or guarantee printed color, reflectivity, or the finished result on a real car.',
          '',
          '### Community gallery and reuse',
          '',
          'Browse public wrap designs and filter by vehicle configuration. A design page presents the artwork with its vehicle preview. Download an available texture, open a design as a starting point in the editor, or use it as an AI reference. Reused flattened artwork remains a single image; new manual layers can be added above it.',
          '',
          'Public availability does not transfer copyright or automatically grant commercial reuse rights. Check the creator description and obtain permission where necessary.',
          '',
          '### Saved wraps, publication, and sharing',
          '',
          'Signed-in users can save wraps, reopen them for further editing, and manage their work in the dashboard. Gallery publication is subject to the gallery preference and moderation workflow. AI generation is open to the gallery by default; paid users can turn that preference off before generating.',
          '',
          'A saved wrap can have its own preview link without being published in the gallery. The owner can disable the link or create a replacement. Anyone with an active link can view the shared preview, so treat it as link-based access rather than a password-protected workspace.',
          '',
          '### Downloads and output',
          '',
          'The editor exports a 1024 x 1024 PNG texture, and the viewer can capture a vehicle preview. These outputs help users compare concepts, keep a record of a design, or give an installer a visual brief. AI textures can also be downloaded from the generation workflow.',
          '',
          'A PNG texture is not a layered vector file, measured panel template, cutting pattern, or print-ready installation package. Physical vinyl production requires a professional to check real vehicle measurements, panel seams, bleed, safe zones, image resolution, and print color. The product provides design software rather than physical wrap manufacture or installation.',
          '',
          '## Typical workflow',
          '',
          '1. Choose the exact supported vehicle configuration.',
          '2. Start with a blank canvas, a gallery design, or an AI prompt with an optional reference image.',
          '3. Add and arrange your own text, images, and shapes in the editor.',
          '4. Inspect the 3D result from multiple angles and compare material appearances.',
          '5. Download the texture or preview; sign in to save the wrap and manage sharing or gallery publication.',
          '6. If planning a physical wrap, ask a professional shop to measure the vehicle and prepare production artwork.',
          '',
          '## Pricing and access',
          '',
          'Manual editing and 3D preview are free. AI generation is a separate credit-based feature, currently charged at 10 credits per generated result. Credits are sold in one-time packs; free editing does not include unlimited AI generation. The pricing page and generation interface show current offers, costs, and paid benefits.',
          '',
          `Pricing: ${localizedAbsoluteUrl('/pricing', 'en')}`,
          '',
          '## Where to start',
          '',
          `- [Product overview](${localizedAbsoluteUrl('/', 'en')}): Explore the workflow and select an available vehicle.`,
          `- [AI car wrap generator](${localizedAbsoluteUrl('/ai-car-wrap-generator', 'en')}): Create a concept from a prompt or reference image.`,
          `- [Community gallery](${localizedAbsoluteUrl('/gallery', 'en')}): Find inspiration and inspect public designs.`,
          `- [Tesla vehicle guide](${localizedAbsoluteUrl('/tesla-wrap', 'en')}): Understand the current launch catalog.`,
          `- [Design guides](${localizedAbsoluteUrl('/blog', 'en')}): Read vehicle and workflow guidance.`,
          `- [Terms of service](${localizedAbsoluteUrl('/terms-of-service', 'en')}): Review usage and content rights.`,
          `- [Privacy policy](${localizedAbsoluteUrl('/privacy-policy', 'en')}): Review data handling.`,
          '',
          'The page directory in llms.txt lists the available language versions. The published guides below provide additional topic-specific detail; a Tesla guide describes the current vehicle support rather than the full long-term scope of the platform.',
        ];
        for (const locale of locales) {
          const posts = await getBlogPostsFn({ data: { locale } });
          if (!posts.length) continue;
          lines.push('', `## Guides (${locale})`, '');
          for (const post of posts) {
            lines.push(`### ${post.title}`, '');
            lines.push(
              `URL: ${localizedAbsoluteUrl(`/blog/${post.slug}`, locale)}`
            );
            lines.push(`Published: ${post.createdAt}`);
            if (post.updatedAt) lines.push(`Updated: ${post.updatedAt}`);
            if (post.authorName) lines.push(`Author: ${post.authorName}`);
            if (post.description)
              lines.push(`Description: ${post.description}`);
            const content =
              post.source === 'local'
                ? await getLocalPostMarkdown(post.slug, locale)
                : (await getBlogPostFn({ data: { slug: post.slug, locale } }))
                    ?.content;
            if (content) {
              // Make document-relative links useful when this text is read alone.
              const absoluteContent = content.replace(
                /\]\((\/(?!\/)[^\s)]*)\)/g,
                (_, path: string) =>
                  `](${
                    path.startsWith('/imgs/')
                      ? new URL(path, envConfigs.app_url).href
                      : localizedAbsoluteUrl(path, locale)
                  })`
              );
              lines.push('', absoluteContent);
            }
            lines.push('', '---', '');
          }
        }
        return new Response(lines.join('\n'), {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      },
    },
  },
});
