import type { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Prisma, Client, Review, User } from '@prisma/client';

import { pingFlaskApi } from '@/lib/actions/flask/flask.action';
import { onSuccessCallback, onErrorCallback } from '@/lib/utils/types';
import { runModel } from '@/lib/actions/flask';

const pingFlaskApiQueryKey = 'pingFlaskApi';

// Queries:
export function pingFlaskApiQuery() {
  return {
    queryKey: [pingFlaskApiQueryKey],
    queryFn: () => pingFlaskApi(),
  } satisfies UseQueryOptions;
}

export function usePingFlaskApiQuery() {
  return useQuery(pingFlaskApiQuery());
}

// Mutations:
export function useRunModel(onSuccessCb?: onSuccessCallback, onErrorCb?: onErrorCallback) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, formData }: { reviewId: string; formData: FormData }) =>
      runModel(reviewId, formData),
    onSuccess: (data) => {
      if (onSuccessCb) {
        onSuccessCb(data);
      }
    },
    onError: (error) => {
      if (onErrorCb) {
        onErrorCb(error);
      }
    },
  });
}
