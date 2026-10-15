import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { LoaderCircle } from 'lucide-react';
import { z } from 'zod';

import { authClient, signIn } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import { getErrorMessage } from '@/lib/error-message';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { localizeHref } from '@/paraglide/runtime.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import { TextField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

const signInSchema = z.object({
  email: z.string().email(m['common.sign.email_placeholder']()),
  password: z.string().min(1),
});

export function SignInForm({
  afterLoginUrl,
  signUpHref,
  surface = 'card',
  beforeNavigate,
}: {
  afterLoginUrl: string;
  signUpHref: string;
  surface?: 'card' | 'popover';
  beforeNavigate?: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pendingProvider, setPendingProvider] = useState<string | null>(null);
  const configQuery = usePublicConfig();
  const configs = configQuery.data ?? {};

  const configsLoaded = configQuery.isSuccess;
  const emailEnabled = configs.email_auth_enabled !== 'false';
  const googleEnabled = configs.google_auth_enabled === 'true';
  const githubEnabled = configs.github_auth_enabled === 'true';
  const passwordResetEnabled = configs.password_reset_enabled === 'true';
  const hasSocial = googleEnabled || githubEnabled;
  const hasAnyMethod = emailEnabled || hasSocial;

  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: signInSchema },
    onSubmit: async ({ value }) => {
      setError('');
      try {
        const result: any = await signIn.email({
          email: value.email,
          password: value.password,
        });
        if (result.error) {
          const status = result.error.status;
          const code = result.error.code;
          const msg = result.error.message || '';
          if (
            code === 'EMAIL_NOT_VERIFIED' ||
            (status === 403 && /not verified/i.test(msg))
          ) {
            const verifyPath = `/verify-email?sent=1&email=${encodeURIComponent(
              value.email
            )}&callbackUrl=${encodeURIComponent(afterLoginUrl)}`;
            void authClient.sendVerificationEmail({
              email: value.email,
              callbackURL: localizeHref(afterLoginUrl),
            });
            beforeNavigate?.();
            router.push(verifyPath);
            return;
          }
          setError(getErrorMessage(result.error, 'SIGN_IN_FAILED'));
        } else {
          // Hard navigation so the destination reloads with a fresh session
          // cookie — a client push would let the guard read a stale session.
          beforeNavigate?.();
          window.location.assign(localizeHref(afterLoginUrl));
        }
      } catch (err: any) {
        setError(getErrorMessage(err, 'SIGN_IN_FAILED'));
      }
    },
  });

  async function handleSocial(provider: 'google' | 'github') {
    setError('');
    setPendingProvider(provider);
    try {
      const result = await signIn.social({
        provider,
        callbackURL: afterLoginUrl,
      });
      if (result.error)
        setError(getErrorMessage(result.error, 'SIGN_IN_FAILED'));
    } catch (error) {
      setError(getErrorMessage(error, 'SIGN_IN_FAILED'));
    } finally {
      setPendingProvider(null);
    }
  }

  if (!configsLoaded && configQuery.isPending) {
    return (
      <div
        className="bg-muted h-12 animate-pulse rounded-xl"
        role="status"
        aria-label={m['common.state.loading']()}
      />
    );
  }

  if (configQuery.isError) {
    return (
      <div className="space-y-3 text-center" role="alert">
        <p className="text-muted-foreground text-sm">
          {m['common.state.failed']()}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={() => void configQuery.refetch()}
        >
          {m['common.error.retry']()}
        </Button>
      </div>
    );
  }

  if (configsLoaded && !hasAnyMethod) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center">
        <p className="text-sm font-medium">
          {m['common.sign.no_methods_title']()}
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          {m['common.sign.no_methods_description']()}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      <FieldGroup>
        {error && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
            {error}
          </div>
        )}

        {hasSocial && (
          <Field>
            {googleEnabled && (
              <Button
                variant="outline"
                type="button"
                disabled={Boolean(pendingProvider)}
                aria-busy={pendingProvider === 'google'}
                className={cn(
                  surface === 'popover' &&
                    'h-12 w-full gap-3 rounded-xl border-0 bg-slate-50 text-base font-medium text-slate-900 hover:bg-white hover:text-slate-950 focus-visible:ring-[#ff987b]/60 dark:border-0 dark:bg-slate-50 dark:hover:bg-white'
                )}
                onClick={() => handleSocial('google')}
              >
                {pendingProvider === 'google' ? (
                  <LoaderCircle className="size-5 animate-spin" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    className="size-5"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24v7.42h11a9.4 9.4 0 0 1-4.08 6.18v5.14h6.61c3.87-3.56 6.08-8.8 6.08-14.82Z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 44c5.51 0 10.13-1.83 13.51-4.72l-6.61-5.14c-1.83 1.23-4.17 1.97-6.9 1.97-5.32 0-9.82-3.59-11.43-8.42H5.74v5.3A20.4 20.4 0 0 0 24 44Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M12.57 27.69a12.26 12.26 0 0 1 0-7.38v-5.3H5.74a20 20 0 0 0 0 17.98l6.83-5.3Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M24 11.89c3 0 5.69 1.03 7.81 3.05l5.86-5.86A19.6 19.6 0 0 0 24 4 20.4 20.4 0 0 0 5.74 15.01l6.83 5.3C14.18 15.48 18.68 11.89 24 11.89Z"
                    />
                  </svg>
                )}
                {surface === 'popover'
                  ? m['common.sign.google_continue']()
                  : m['common.sign.google_sign_in']()}
              </Button>
            )}
            {githubEnabled && (
              <Button
                variant="outline"
                type="button"
                disabled={Boolean(pendingProvider)}
                onClick={() => handleSocial('github')}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="size-4"
                >
                  <path
                    d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
                    fill="currentColor"
                  />
                </svg>
                {m['common.sign.github_sign_in']()}
              </Button>
            )}
          </Field>
        )}

        {hasSocial && emailEnabled && (
          <FieldSeparator
            className={cn(
              surface === 'popover'
                ? '*:data-[slot=field-separator-content]:bg-popover'
                : '*:data-[slot=field-separator-content]:bg-card'
            )}
          >
            {m['common.sign.or']()}
          </FieldSeparator>
        )}

        {emailEnabled && (
          <>
            <form.Field name="email">
              {(field) => (
                <TextField
                  field={field}
                  label={m['common.sign.email_title']()}
                  type="email"
                  required
                  placeholder={m['common.sign.email_placeholder']()}
                />
              )}
            </form.Field>
            <form.Field name="password">
              {(field) => {
                const err = field.state.meta.isTouched
                  ? (field.state.meta.errors?.[0] as any)
                  : null;
                const errMsg =
                  err == null
                    ? null
                    : typeof err === 'string'
                      ? err
                      : err.message
                        ? String(err.message)
                        : String(err);
                return (
                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor={field.name}>
                        {m['common.sign.password_title']()}
                      </FieldLabel>
                      {passwordResetEnabled && (
                        <Link
                          href="/forgot-password"
                          className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-4"
                        >
                          {m['common.sign.forgot_password']()}
                        </Link>
                      )}
                    </div>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      value={field.state.value}
                      onChange={(e) => field.handleChange(e.target.value)}
                      onBlur={field.handleBlur}
                      required
                      placeholder={m['common.sign.password_placeholder']()}
                      aria-invalid={errMsg ? true : undefined}
                    />
                    {errMsg && (
                      <p className="text-destructive text-sm">{errMsg}</p>
                    )}
                  </Field>
                );
              }}
            </form.Field>
            <Field>
              <form.Subscribe selector={(s) => s.isSubmitting}>
                {(isSubmitting) => (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? '...' : m['common.sign.sign_in_title']()}
                  </Button>
                )}
              </form.Subscribe>
              <FieldDescription className="text-center">
                {m['common.sign.no_account']()}{' '}
                <Link
                  href={signUpHref}
                  className="underline underline-offset-4"
                >
                  {m['common.sign.sign_up_title']()}
                </Link>
              </FieldDescription>
            </Field>
          </>
        )}
      </FieldGroup>
    </form>
  );
}
