import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiPost } from '@/lib/api-client';

/** Visit-only state: never stored in cookies, storage or an account record. */
export function useDesignLike(slug: string, initialCount: number) {
  const client = useQueryClient();
  const lock = useRef(false);
  const key = ['design-like-visit', slug];
  const state = useQuery({
    queryKey: key,
    queryFn: () => ({ liked: false, count: initialCount }),
    initialData: { liked: false, count: initialCount },
    staleTime: Infinity,
    gcTime: Infinity,
  });
  const mutation = useMutation({
    mutationKey: key,
    mutationFn: async () => {
      const current = client.getQueryData<{ liked: boolean; count: number }>(
        key
      )!;
      const next = !current.liked;
      const result = await apiPost<{ likeCount: number }>(
        `/api/gallery/${encodeURIComponent(slug)}`,
        { liked: next }
      );
      return { liked: next, count: result.likeCount };
    },
    onSuccess: (next) => {
      client.setQueryData(key, next);
      void client.invalidateQueries({ queryKey: ['gallery'] });
    },
    onSettled: () => {
      lock.current = false;
    },
  });
  return {
    liked: state.data.liked,
    count: state.data.count,
    isPending: mutation.isPending,
    toggle: (onError: () => void) => {
      if (lock.current || client.isMutating({ mutationKey: key })) return;
      lock.current = true;
      mutation.mutate(undefined, { onError });
    },
  };
}
