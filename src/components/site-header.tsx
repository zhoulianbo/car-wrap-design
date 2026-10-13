import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Coins, Menu, Sparkles, X } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link, usePathname } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { apiGet } from '@/lib/api-client';
import { currentPathWithQuery } from '@/lib/redirect';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { SignInDialog } from '@/components/auth/sign-in-dialog';
import { LocaleSelector } from '@/components/locale-selector';
import { SiteUserMenu } from '@/components/site-user-menu';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface NavLink {
  href?: string;
  label: string;
  /** Open in a new tab. Off-site (http) hrefs always open in a new tab. */
  external?: boolean;
  accent?: boolean;
  children?: NavLink[];
}

/** Off-site URLs render as plain <a>; internal paths use the locale-aware Link. */
const isExternalHref = (href: string) => /^https?:\/\//.test(href);

const accentNavClass =
  'bg-signal text-primary-foreground hover:bg-signal/90 shadow-[0_0_18px_color-mix(in_oklab,var(--signal)_34%,transparent)]';
const activeNavClass = 'bg-emerald-300/10 text-emerald-300';
const inactiveNavClass =
  'text-muted-foreground hover:bg-accent hover:text-foreground';

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

export function SiteHeader({ navLinks }: { navLinks?: NavLink[] }) {
  const pathname = usePathname().replace(/\/$/, '') || '/';
  const isActive = (href?: string): boolean => {
    if (!href || isExternalHref(href)) return false;
    const path = href.split(/[?#]/)[0].replace(/\/$/, '') || '/';
    return (
      pathname === path || (path !== '/' && pathname.startsWith(`${path}/`))
    );
  };
  const navClass = (link: NavLink) =>
    link.accent
      ? cn(
          accentNavClass,
          isActive(link.href) &&
            'ring-2 ring-emerald-300 ring-offset-2 ring-offset-background'
        )
      : isActive(link.href)
        ? activeNavClass
        : inactiveNavClass;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signInReturnTo, setSignInReturnTo] = useState('/');

  function openSignIn() {
    setSignInReturnTo(currentPathWithQuery('/'));
    setSignInOpen(true);
    setMobileOpen(false);
  }
  const { data: session } = useSession();
  // The browser auth store may resolve before this SSR boundary hydrates.
  // Keep its first render identical to the anonymous server markup.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const user = hydrated ? session?.user : undefined;
  const creditsQuery = useQuery({
    queryKey: ['header-credit-balance', user?.id],
    queryFn: () => apiGet<{ balance: number }>('/api/credits'),
    enabled: Boolean(user),
    staleTime: 30_000,
  });
  const balance = creditsQuery.data?.balance;

  return (
    <header className="border-border/60 fixed inset-x-0 top-0 z-50 w-full border-b bg-[color:var(--studio-canvas)]/88 backdrop-blur-xl">
      <div className="page-container flex h-20 items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <img
            src={envConfigs.app_logo}
            alt=""
            width={36}
            height={36}
            className="size-9 shrink-0 rounded-[10px]"
          />
          <span className="font-headline truncate text-base font-semibold tracking-[-0.02em] sm:text-lg">
            <BrandWordmark name={envConfigs.app_name} />
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks?.map((link) =>
            link.children?.length ? (
              <DropdownMenu key={link.label}>
                <DropdownMenuTrigger
                  data-active={
                    link.children.some((child) => isActive(child.href)) ||
                    undefined
                  }
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold normal-case transition-colors',
                    link.children.some((child) => isActive(child.href))
                      ? activeNavClass
                      : inactiveNavClass
                  )}
                >
                  {link.label}
                  <ChevronDown className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="min-w-56">
                  {link.children.map((child) => (
                    <DropdownMenuItem
                      key={child.href}
                      render={<Link href={child.href || '/'} />}
                      aria-current={isActive(child.href) ? 'page' : undefined}
                      className={
                        isActive(child.href) ? activeNavClass : undefined
                      }
                    >
                      {child.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : link.href && isExternalHref(link.href) ? (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              >
                {link.label}
              </a>
            ) : link.href ? (
              <Link
                key={link.href}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-semibold normal-case transition-colors',
                  navClass(link)
                )}
              >
                <span className="flex items-center gap-1.5">
                  {link.accent ? <Sparkles className="size-3.5" /> : null}
                  {link.label}
                </span>
              </Link>
            ) : null
          )}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          <LocaleSelector />
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/credits"
                className="border-border/70 bg-secondary/70 hover:border-signal/50 flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors"
                aria-label={m['common.nav.credits']({ balance: balance ?? 0 })}
              >
                <Coins className="text-signal size-3.5" />
                <span className="text-signal">{balance ?? '—'}</span>
              </Link>
              <SiteUserMenu
                name={user.name || m['common.user.fallback_name']()}
                email={user.email}
                image={user.image}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={openSignIn}
              className={cn(
                buttonVariants({ variant: 'outline' }),
                'border-border/70 bg-muted/40 hover:bg-muted normal-case shadow-none'
              )}
            >
              {m['common.nav.sign_in']()}
            </button>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="hover:bg-accent rounded-lg p-2 transition-colors lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={
            mobileOpen
              ? m['common.nav.close_menu']()
              : m['common.nav.open_menu']()
          }
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-border border-t bg-[color:var(--studio-canvas)] px-4 pt-3 pb-5 lg:hidden">
          <nav className="flex flex-col gap-2">
            {navLinks?.map((link) =>
              link.children?.length ? (
                <div
                  key={link.label}
                  className="border-border/60 border-t pt-2 first:border-0 first:pt-0"
                >
                  <p
                    className={cn(
                      'px-3 py-1 text-xs font-semibold normal-case',
                      link.children.some((child) => isActive(child.href))
                        ? 'text-emerald-300'
                        : 'text-muted-foreground'
                    )}
                  >
                    {link.label}
                  </p>
                  {link.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href || '/'}
                      aria-current={isActive(child.href) ? 'page' : undefined}
                      className={cn(
                        'block rounded-md px-5 py-2 text-sm transition-colors',
                        isActive(child.href) ? activeNavClass : inactiveNavClass
                      )}
                      onClick={() => setMobileOpen(false)}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              ) : link.href && isExternalHref(link.href) ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:bg-accent hover:text-foreground rounded-md px-3 py-2 text-sm transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ) : link.href ? (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.external ? '_blank' : undefined}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-3 py-2 text-sm transition-colors',
                    navClass(link)
                  )}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="flex items-center gap-1.5">
                    {link.accent ? <Sparkles className="size-3.5" /> : null}
                    {link.label}
                  </span>
                </Link>
              ) : null
            )}
          </nav>
          <div className="border-border mt-3 flex items-center gap-2 border-t pt-3">
            <LocaleSelector />
            <div className="flex-1" />
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/credits"
                  className="border-border bg-secondary flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold"
                  onClick={() => setMobileOpen(false)}
                >
                  <Coins className="text-signal size-3.5" />
                  <span className="text-signal">{balance ?? '—'}</span>
                </Link>
                <SiteUserMenu
                  name={user.name || m['common.user.fallback_name']()}
                  email={user.email}
                  image={user.image}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={openSignIn}
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'border-border/70 bg-muted/40 hover:bg-muted normal-case shadow-none'
                )}
              >
                {m['common.nav.sign_in']()}
              </button>
            )}
          </div>
        </div>
      )}
      <SignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        returnTo={signInReturnTo}
      />
    </header>
  );
}
