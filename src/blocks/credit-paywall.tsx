import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock3 } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { getPricingProduct } from '@/config/pricing';
import { apiGet } from '@/lib/api-client';
import {
  creditOfferKey,
  isCreditOfferActive,
  readCreditOffer,
  updateCreditOffer,
  type CreditOfferState,
} from '@/lib/credit-offer';
import type { VehicleSlug } from '@/lib/vehicle-catalog';
import { m } from '@/paraglide/messages.js';
import { CreditPacks } from '@/blocks/credit-packs';
import { FreeWrapLinks } from '@/blocks/free-wrap-links';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function CreditPaywall({
  open,
  onOpenChange,
  cost,
  vehicleSlug,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cost: number;
  vehicleSlug: VehicleSlug;
}) {
  const { data: session } = useSession();
  const userId = session?.user.id;
  const info = useQuery({
    queryKey: ['user-info', userId],
    queryFn: () => apiGet<{ isPaid: boolean }>('/api/user/info'),
    enabled: Boolean(userId),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const isPaid = info.data?.isPaid;
  const [offer, setOffer] = useState<{
    userId: string;
    state: CreditOfferState;
  } | null>(null);
  const [now, setNow] = useState(Date.now);
  const closed = useRef(false);
  useEffect(() => {
    if (open) closed.current = false;
  }, [open]);

  useEffect(() => {
    if (!userId || isPaid !== false) {
      setOffer(null);
      return;
    }
    const restore = () => {
      try {
        const state = readCreditOffer(window.localStorage, userId);
        // Only an explicit regular-paywall close opens an offer. Restoring a
        // page after checkout must not reopen a previously visible offer.
        setOffer((current) =>
          current?.userId === userId && isCreditOfferActive(state)
            ? { userId, state }
            : null
        );
        setNow(Date.now());
      } catch {
        setOffer(null);
      }
    };
    restore();
    const onStorage = (event: StorageEvent) => {
      if (event.key === creditOfferKey(userId) || event.key === null) restore();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId, isPaid]);

  useEffect(() => {
    if (!offer) return;
    const timer = window.setInterval(() => {
      const next = Date.now();
      setNow(next);
      if (!isCreditOfferActive(offer.state, next)) setOffer(null);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [offer]);

  const closeRegular = (next: boolean) => {
    if (next || !open || closed.current) return;
    closed.current = true;
    onOpenChange(false);
    if (!userId) return;
    try {
      const state = updateCreditOffer(
        window.localStorage,
        userId,
        'close',
        isPaid !== false
      );
      setOffer(
        state && isPaid === false && isCreditOfferActive(state)
          ? { userId, state }
          : null
      );
      setNow(Date.now());
    } catch {
      setOffer(null);
    }
  };
  const dismissOffer = () => {
    if (userId) {
      try {
        updateCreditOffer(
          window.localStorage,
          userId,
          'dismiss',
          isPaid !== false
        );
      } catch {
        /* Storage may be disabled. */
      }
    }
    setOffer(null);
  };
  const leaveForFreeOption = () => {
    closed.current = true;
    onOpenChange(false);
    dismissOffer();
  };
  const remaining = Math.max(
    0,
    Math.ceil(((offer?.state.expiresAt ?? 0) - now) / 1000)
  );
  const countdown = [
    Math.floor(remaining / 3600),
    Math.floor((remaining % 3600) / 60),
    remaining % 60,
  ]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
  const trial = getPricingProduct('credits_trial_20')!;
  const trialOpen =
    !open &&
    !!userId &&
    offer?.userId === userId &&
    isPaid === false &&
    !info.isFetching &&
    remaining > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={closeRegular}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">
              {m['landing.pricing.paywall_title']()}
            </DialogTitle>
            <DialogDescription>
              {m['landing.pricing.paywall_description']({ cost })}
              <FreeWrapLinks
                inline
                vehicleSlug={vehicleSlug}
                onNavigate={leaveForFreeOption}
              />
            </DialogDescription>
          </DialogHeader>
          <CreditPacks
            compact
            onPurchase={() => {
              if (userId) {
                try {
                  updateCreditOffer(
                    window.localStorage,
                    userId,
                    'purchase',
                    isPaid !== false
                  );
                } catch {
                  /* Keep checkout available. */
                }
              }
            }}
          />
        </DialogContent>
      </Dialog>
      <Dialog
        open={trialOpen}
        onOpenChange={(next) => {
          if (!next) dismissOffer();
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">
              {m['landing.pricing.trial_title']()}
            </DialogTitle>
            <DialogDescription>
              {m['landing.pricing.trial_description']()}
              <FreeWrapLinks
                inline
                vehicleSlug={vehicleSlug}
                onNavigate={leaveForFreeOption}
              />
            </DialogDescription>
          </DialogHeader>
          <div className="bg-signal/10 text-signal flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm">
            <Clock3 className="size-4" />
            <span>{m['landing.pricing.offer_remaining']()}</span>
            <span
              role="timer"
              aria-live="off"
              className="font-mono font-semibold tabular-nums"
            >
              {countdown}
            </span>
          </div>
          <CreditPacks
            compact
            products={[trial]}
            offerExpiresAt={offer?.state.expiresAt ?? undefined}
            onPurchase={() => {
              if (!userId || isPaid !== false) return false;
              try {
                return isCreditOfferActive(
                  readCreditOffer(window.localStorage, userId)
                );
              } catch {
                return false;
              }
            }}
          />
          <Button variant="ghost" onClick={dismissOffer}>
            {m['landing.pricing.trial_dismiss']()}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
