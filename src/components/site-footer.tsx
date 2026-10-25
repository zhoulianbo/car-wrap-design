import type { ComponentType, SVGProps } from 'react';
import { Mail } from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import type { FooterLinkItem } from '@/lib/footer-links';
import { BuiltWithShipAny } from '@/components/built-with-shipany';
import { FooterLinkRow } from '@/components/footer-link-row';

export interface FooterColumn {
  title: string;
  /** external: open in a new tab. Off-site (http) hrefs always open in a new tab. */
  links: { label: string; href: string; external?: boolean }[];
}

export interface FooterBrandLink {
  label: string;
  href: string;
}

/** Off-site URLs render as plain <a>; internal paths use the locale-aware Link. */
const isExternalHref = (href: string) => /^https?:\/\//.test(href);

function BrandWordmark({ name }: { name: string }) {
  const accent = 'Design';
  const index = name.lastIndexOf(accent);
  if (index < 0) return name;

  return (
    <>
      {name.slice(0, index)}
      <span className="text-signal">{accent}</span>
      {name.slice(index + accent.length)}
    </>
  );
}

export interface FooterSocial {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  href: string;
  label: string;
}

export function SiteFooter({
  tagline,
  brandLinks,
  footerLinks,
  columns,
  socials,
  copyright,
  email,
  showBuiltWith = true,
}: {
  tagline?: string;
  /** Root-path links shown under the tagline. Rendered as plain anchors so they stay unlocalized. */
  brandLinks?: FooterBrandLink[];
  footerLinks?: FooterLinkItem[];
  columns?: FooterColumn[];
  socials?: FooterSocial[];
  copyright?: string;
  email?: string;
  showBuiltWith?: boolean;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border/60 text-foreground border-t bg-[color:var(--studio-canvas)]">
      <div className="page-container pt-14 pb-6 sm:pt-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2 flex flex-col items-start gap-4 lg:pr-8">
            <Link href="/" className="flex items-center gap-3">
              <img
                src={envConfigs.app_logo}
                alt=""
                width={40}
                height={40}
                className="size-10 rounded-[10px]"
              />
              <span className="font-headline text-lg font-semibold">
                <BrandWordmark name={envConfigs.app_name} />
              </span>
            </Link>
            {tagline ? (
              <p className="text-muted-foreground max-w-sm text-sm leading-6">
                {tagline}
              </p>
            ) : null}
            {brandLinks && brandLinks.length > 0 ? (
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {brandLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-muted-foreground hover:text-primary text-sm transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {columns && columns.length > 0 ? (
            <>
              {columns.map((col) => (
                <div key={col.title} className="space-y-5">
                  <p className="font-headline text-foreground text-[13px] font-semibold tracking-wide">
                    {col.title}
                  </p>
                  <ul className="space-y-2">
                    {col.links.map((link) => (
                      <li key={link.label}>
                        {isExternalHref(link.href) ? (
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary text-sm transition-colors"
                          >
                            {link.label}
                          </a>
                        ) : (
                          <Link
                            href={link.href}
                            target={link.external ? '_blank' : undefined}
                            className="text-muted-foreground hover:text-primary text-sm transition-colors"
                          >
                            {link.label}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </>
          ) : null}
        </div>

        {footerLinks && footerLinks.length > 0 ? (
          <div data-footer-links className="mt-8 space-y-4 pt-3">
            <FooterLinkRow
              links={footerLinks.filter((link) => link.group === 'friend')}
              label="Friend links"
            />
            <FooterLinkRow
              links={footerLinks.filter((link) => link.group === 'badge')}
              label="Directory badges"
            />
          </div>
        ) : null}

        {socials && socials.length > 0 ? (
          <div className="mt-3 flex items-center gap-5">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                aria-label={s.label}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <s.icon className="size-[18px]" />
              </a>
            ))}
          </div>
        ) : null}

        <div className="border-border/60 mt-3 flex items-center justify-between gap-4 border-t pt-5">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            {showBuiltWith ? <BuiltWithShipAny /> : null}
            <span className="text-muted-foreground text-sm leading-5">
              {copyright ||
                `© ${year} ${envConfigs.app_name}. All rights reserved.`}
            </span>
          </div>
          {email ? (
            <a
              href={`mailto:${email}`}
              className="text-muted-foreground hover:text-primary flex max-w-[48%] items-center justify-end gap-2 text-right text-sm leading-5 transition-colors sm:max-w-none"
            >
              <Mail className="size-4 shrink-0" />
              {email}
            </a>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
