import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, LoaderCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Link } from '@/core/i18n/navigation';
import { apiDelete } from '@/lib/api-client';
import { formatDateTime } from '@/lib/time';
import type { VehicleSlug } from '@/lib/vehicle-catalog';
import { vehicleWrapName } from '@/lib/wrap-naming';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';

export interface DashboardWrap {
  id: string;
  name: string;
  vehicleSlug: string;
  textureUrl?: string | null;
  updatedAt: string | Date;
}
export function DashboardWrapCard({ wrap }: { wrap: DashboardWrap }) {
  const queryClient = useQueryClient();
  const name = wrap.name || vehicleWrapName(wrap.vehicleSlug as VehicleSlug);
  const remove = useMutation({
    mutationFn: () => apiDelete(`/api/wraps/${encodeURIComponent(wrap.id)}`),
    onSuccess: () => {
      for (const key of [
        'wrap-dashboard',
        'user-wraps',
        'gallery',
        'admin-designs',
        'hero-designs',
      ])
        void queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <article className="border-border bg-card min-w-0 overflow-hidden rounded-xl border">
      <Link href={`/wraps/${wrap.id}/edit`} className="group block">
        <div className="bg-muted flex aspect-[4/3] items-center justify-center overflow-hidden">
          {wrap.textureUrl ? (
            <img
              src={wrap.textureUrl}
              alt={name}
              loading="lazy"
              width={320}
              height={240}
              className="size-full object-contain"
            />
          ) : (
            <ImageIcon className="text-muted-foreground size-10" />
          )}
        </div>
        <div className="space-y-2 p-4">
          <h3 className="truncate font-medium group-hover:underline">{name}</h3>
          <time
            className="text-muted-foreground block text-xs"
            dateTime={new Date(wrap.updatedAt).toISOString()}
          >
            {formatDateTime(wrap.updatedAt)}
          </time>
        </div>
      </Link>
      <div className="border-border flex justify-end border-t px-3 py-1">
        <Button
          size="icon"
          variant="ghost"
          disabled={remove.isPending}
          aria-label={m['wraps.delete']({ name })}
          onClick={() => {
            if (window.confirm(m['wraps.delete_confirm']({ name })))
              remove.mutate();
          }}
        >
          {remove.isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
        </Button>
      </div>
    </article>
  );
}
