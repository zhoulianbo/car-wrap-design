import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { SignInForm } from '@/components/auth/sign-in-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function SignInDialog({
  open,
  onOpenChange,
  returnTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnTo: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="dark max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-3xl bg-[#171f2a] p-0 text-slate-50 ring-slate-600/60 sm:max-w-[480px] [&>button]:top-4 [&>button]:right-4 [&>button]:size-9 [&>button]:text-slate-400 [&>button:hover]:bg-white/5 [&>button:hover]:text-white">
        <div className="flex flex-col items-center px-6 pt-6 sm:pt-8">
          <img
            src={envConfigs.app_logo}
            alt=""
            width={80}
            height={80}
            className="size-20 object-contain"
          />
          <p className="font-headline -mt-1 text-xl font-medium tracking-tight">
            {envConfigs.app_name}
          </p>
        </div>
        <div
          className="pointer-events-none mx-auto my-4 w-[66%] max-w-[320px] sm:my-5"
          aria-hidden="true"
        >
          <img
            src="/imgs/sign-in-wrap-car.webp"
            alt=""
            width={900}
            height={600}
            className="h-auto w-full object-contain"
          />
        </div>
        <DialogHeader className="items-center gap-2 px-6 text-center sm:px-8">
          <DialogTitle className="font-headline flex flex-wrap justify-center gap-x-2 text-[1.625rem] leading-tight font-semibold tracking-tight sm:text-3xl">
            <span>{m['common.sign.bonus_title']()}</span>
            <span className="text-[#ff987b]">
              {m['common.sign.bonus_credits']()}
            </span>
          </DialogTitle>
          <DialogDescription className="max-w-[32ch] text-base leading-relaxed text-slate-400">
            {m['common.sign.bonus_description']()}
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pt-6 pb-7 sm:px-8 sm:pb-8">
          <SignInForm
            afterLoginUrl={returnTo}
            signUpHref={`/sign-up?callbackUrl=${encodeURIComponent(returnTo)}`}
            surface="popover"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
