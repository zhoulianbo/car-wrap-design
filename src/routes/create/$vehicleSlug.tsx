import { useQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  Navigate,
  notFound,
  redirect,
} from '@tanstack/react-router';
import { WrapStudio } from '@/features/wrap-studio';

import { useSession } from '@/core/auth/client';
import { apiGet } from '@/lib/api-client';
import { isVehicleSlug, type PaintFinishKey } from '@/lib/vehicle-catalog';
import { imageWrapDocument } from '@/lib/wrap-document';
import { aiWrapName } from '@/lib/wrap-naming';
import type { UserWrapSummary } from '@/lib/wrap-types';
import { m } from '@/paraglide/messages.js';
import type { WrapDocument } from '@/components/wrap-editor';

export const Route = createFileRoute('/create/$vehicleSlug')({
  validateSearch: (search: Record<string, unknown>) => ({
    generation:
      typeof search.generation === 'string' ? search.generation : undefined,
    design: typeof search.design === 'string' ? search.design : undefined,
  }),
  beforeLoad: ({ location, params, search }) => {
    if (new URLSearchParams(location.searchStr).has('tab')) {
      throw redirect({
        to: '/create/$vehicleSlug',
        params,
        search: { generation: search.generation, design: search.design },
        replace: true,
      });
    }
  },
  loader: ({ params }) => {
    if (!isVehicleSlug(params.vehicleSlug)) throw notFound();
    return { vehicleSlug: params.vehicleSlug };
  },
  head: () => ({
    meta: [
      { title: `${m['studio.title']()} | Car Wrap Design` },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: VehicleCreatePage,
});

function VehicleCreatePage() {
  const { vehicleSlug } = Route.useLoaderData();
  const search = Route.useSearch();
  const { data: session } = useSession();
  const source = useQuery({
    queryKey: [
      'wrap-source',
      search.generation,
      search.design,
      session?.user.id,
    ],
    enabled: Boolean(search.design || (search.generation && session?.user)),
    queryFn: async () => {
      if (search.generation) {
        const wrap = await apiGet<UserWrapSummary>(
          `/api/wraps?generation=${encodeURIComponent(search.generation)}`
        );
        if (wrap.vehicleSlug !== vehicleSlug)
          throw new Error(m['studio.source_unavailable']());
        return {
          wrap,
          document: undefined,
          finish: wrap.finish,
          sourceDesignId: undefined,
          usesAi: true,
        };
      }
      const item = await apiGet<{
        id: string;
        vehicleSlug: string;
        outputUrl?: string;
        prompt?: string;
        textureUrl?: string;
        finish?: PaintFinishKey;
        usesAi?: boolean;
      }>(
        search.generation
          ? `/api/ai-generations/${encodeURIComponent(search.generation)}`
          : `/api/gallery/${encodeURIComponent(search.design!)}`
      );
      const url = search.generation ? item.outputUrl : item.textureUrl;
      if (!url || item.vehicleSlug !== vehicleSlug)
        throw new Error(m['studio.source_unavailable']());
      return {
        document: {
          ...imageWrapDocument(
            search.design && !search.generation
              ? `/api/gallery/${encodeURIComponent(search.design)}?texture=1&source=${encodeURIComponent(url)}`
              : url
          ),
          ...(search.generation
            ? { generatedName: aiWrapName(item.prompt ?? '') }
            : {}),
        } as WrapDocument,
        wrap: undefined,
        usesAi: item.usesAi,
        finish: item.finish,
        sourceDesignId: search.design ? item.id : undefined,
      };
    },
  });
  if (source.isFetching && !source.data)
    return (
      <div className="bg-background text-muted-foreground flex h-dvh items-center justify-center">
        {m['studio.loading_wrap']()}
      </div>
    );
  if (source.isError)
    return (
      <div className="bg-background text-destructive flex h-dvh items-center justify-center">
        {source.error.message}
      </div>
    );
  if (search.generation && source.data?.wrap)
    return (
      <Navigate
        to="/wraps/$wrapId/edit"
        params={{ wrapId: source.data.wrap.id }}
        replace
      />
    );
  return (
    <>
      <WrapStudio
        key={`${vehicleSlug}:${source.data ? search.generation || search.design : 'new'}`}
        vehicleSlug={vehicleSlug}
        wrap={source.data?.wrap}
        initialUsesAi={source.data?.usesAi}
        draftDocument={source.data?.document}
        initialFinish={source.data?.finish}
        sourceDesignId={source.data?.sourceDesignId}
      />
    </>
  );
}
