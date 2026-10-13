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
      <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">
            {m['common.sign.sign_in_title']()}
          </DialogTitle>
          <DialogDescription>
            {m['common.sign.sign_in_description']()}
          </DialogDescription>
        </DialogHeader>
        <SignInForm
          afterLoginUrl={returnTo}
          signUpHref={`/sign-up?callbackUrl=${encodeURIComponent(returnTo)}`}
          surface="popover"
        />
      </DialogContent>
    </Dialog>
  );
}
