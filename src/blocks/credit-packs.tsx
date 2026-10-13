import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { useSession } from '@/core/auth/client';
import { useRouter } from '@/core/i18n/navigation';
import { listPricingProducts, type PricingProduct } from '@/config/pricing';
import { apiPost } from '@/lib/api-client';
import { currentPathWithQuery } from '@/lib/redirect';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { getLocale, localizeHref } from '@/paraglide/runtime.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import {
  PaymentProviderModal,
  type PaymentProvider,
} from '@/components/payment-provider-modal';
import { Button } from '@/components/ui/button';

const providerKeys: PaymentProvider[] = [
  'stripe',
  'creem',
  'paypal',
  'waffo',
  'alipay',
  'wechat',
];

export function CreditPacks({
  products = listPricingProducts(),
  onPurchase,
  offerExpiresAt,
  compact = false,
}: {
  products?: PricingProduct[];
  onPurchase?: (product: PricingProduct) => boolean | void;
  offerExpiresAt?: number;
  compact?: boolean;
} = {}) {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: configData } = usePublicConfig();
  const configs = configData ?? {};
  const [selectedProductId, setSelectedProductId] = useState<string>();
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingProvider, setLoadingProvider] =
    useState<PaymentProvider | null>(null);
  const enabledProviders = useMemo(
    () =>
      providerKeys.filter(
        (provider) => configs[`${provider}_enabled`] === 'true'
      ),
    [configs]
  );
  const selectedProduct = products.find(
    (product) => product.productId === selectedProductId
  );

  const checkout = useMutation({
    mutationFn: ({
      productId,
      provider,
    }: {
      productId: string;
      provider: PaymentProvider;
    }) =>
      apiPost<{ checkout_url?: string }>('/api/payment/checkout', {
        product_id: productId,
        payment_provider: provider,
        redirect: localizeHref(currentPathWithQuery('/dashboard/billing')),
        locale: getLocale(),
        offer_expires_at: offerExpiresAt,
      }),
    onSuccess: (result) => {
      if (!result.checkout_url)
        throw new Error(m['landing.pricing.checkout_error']());
      window.location.href = result.checkout_url;
    },
    onError: (error: Error) => {
      setLoadingProvider(null);
      toast.error(error.message);
    },
  });

  const startCheckout = (productId: string, provider: PaymentProvider) => {
    setLoadingProvider(provider);
    checkout.mutate({ productId, provider });
  };

  const chooseProduct = (productId: string) => {
    if (!session?.user) {
      router.push(
        `/sign-in?callbackUrl=${encodeURIComponent(currentPathWithQuery('/pricing'))}`
      );
      return;
    }
    const product = products.find((item) => item.productId === productId);
    if (!product || onPurchase?.(product) === false) return;
    const providers = enabledProviders.length
      ? enabledProviders
      : ['stripe' as const];
    if (configs.select_payment_enabled === 'true' && providers.length > 1) {
      setSelectedProductId(productId);
      setModalOpen(true);
      return;
    }
    const provider = (configs.default_payment_provider ||
      providers[0] ||
      'stripe') as PaymentProvider;
    startCheckout(productId, provider);
  };

  const names: Record<string, string> = {
    credits_100: m['landing.pricing.starter_pack'](),
    credits_250: m['landing.pricing.creator_pack'](),
    credits_1000: m['landing.pricing.studio_pack'](),
    credits_trial_20: m['landing.pricing.trial_pack'](),
  };
  const sharedBenefits = compact && products.length > 1;
  const benefits = [
    m['landing.pricing.one_time'](),
    m['landing.pricing.never_expires'](),
    m['landing.pricing.storage'](),
    m['landing.pricing.exports'](),
  ];
  return (
    <>
      <div
        className={`grid gap-3 ${products.length > 1 ? 'sm:grid-cols-3' : ''}`}
      >
        {products.map((product) => (
          <article
            key={product.productId}
            className={cn(
              'relative rounded-2xl border',
              compact ? 'p-4' : 'p-7',
              sharedBenefits
                ? 'grid grid-cols-[1fr_auto] items-center gap-x-3 sm:flex sm:flex-col sm:items-stretch'
                : 'flex flex-col',
              product.productId === 'credits_250'
                ? 'border-primary/40 bg-primary/[.07]'
                : 'border-border bg-muted/20'
            )}
          >
            {product.productId === 'credits_250' && (
              <span className="bg-signal text-primary-foreground absolute top-3 right-3 rounded-full px-2 py-1 text-[10px] font-semibold">
                {m['landing.pricing.popular']()}
              </span>
            )}
            {!compact && <Sparkles className="text-primary mb-5 size-6" />}
            <h2 className="font-headline col-start-1 text-base font-semibold">
              {names[product.productId] ?? product.planName}
            </h2>
            <p
              className={cn(
                'text-primary col-start-1 text-lg font-semibold',
                sharedBenefits ? 'mt-1 sm:mt-3' : 'mt-3'
              )}
            >
              {m['landing.pricing.credits']({ credits: product.credits })}
            </p>
            <p className="text-muted-foreground col-start-1 mt-1 text-xs">
              {m['landing.pricing.results']({ count: product.credits / 10 })}
            </p>
            <p
              className={cn(
                'font-headline font-semibold tracking-tight',
                compact ? 'text-3xl' : 'text-5xl',
                sharedBenefits
                  ? 'col-start-2 row-span-3 row-start-1 pt-4 sm:mt-5 sm:pt-0'
                  : 'mt-5'
              )}
            >
              ${(product.priceInCents / 100).toFixed(2)}
            </p>
            {!sharedBenefits && (
              <ul
                className={`my-6 grid gap-3 ${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}
              >
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2">
                    <Check className="text-primary size-4 shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            )}
            <Button
              className={cn(
                'h-12 w-full rounded-xl px-2',
                sharedBenefits ? 'col-span-2 mt-3 sm:mt-6' : 'mt-auto'
              )}
              disabled={
                checkout.isPending ||
                (product.paywallOnly &&
                  (!offerExpiresAt || offerExpiresAt <= Date.now()))
              }
              onClick={() => chooseProduct(product.productId)}
            >
              {m['landing.pricing.buy']({ credits: product.credits })}
            </Button>
          </article>
        ))}
      </div>
      {sharedBenefits && (
        <ul className="text-muted-foreground grid gap-2 text-xs sm:grid-cols-2">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2">
              <Check className="text-primary size-4 shrink-0" />
              {benefit}
            </li>
          ))}
        </ul>
      )}
      <PaymentProviderModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setLoadingProvider(null);
        }}
        providers={enabledProviders.length ? enabledProviders : ['stripe']}
        loadingProvider={loadingProvider}
        onSelect={(provider) =>
          selectedProductId && startCheckout(selectedProductId, provider)
        }
        planName={selectedProduct && names[selectedProduct.productId]}
        price={
          selectedProduct
            ? `$${(selectedProduct.priceInCents / 100).toFixed(2)}`
            : undefined
        }
      />
    </>
  );
}
