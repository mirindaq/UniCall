import { useCallback, useEffect, useRef, useState } from 'react';
import type { AxiosResponse } from 'axios';

interface UseQueryOptions<T> {
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: unknown) => void;
  deps?: React.DependencyList;
}

type QueryFn<T> = () => Promise<T> | Promise<AxiosResponse<T>>;

export function useQuery<T>(queryFn: QueryFn<T>, options: UseQueryOptions<T> = {}) {
  const { enabled = true, onSuccess, onError, deps = [] } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [isRefetching, setIsRefetching] = useState(false);

  const queryFnRef = useRef(queryFn);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  queryFnRef.current = queryFn;
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const fetchData = useCallback(
    async (isRefetch = false) => {
      if (!enabled) return;

      if (isRefetch) {
        setIsRefetching(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const result = await queryFnRef.current();
        const responseData =
          result instanceof Object && 'status' in result && 'headers' in result && 'config' in result
            ? (result as AxiosResponse<T>).data
            : (result as T);

        setData(responseData);
        onSuccessRef.current?.(responseData);
        return responseData;
      } catch (err) {
        setError(err);
        onErrorRef.current?.(err);
        throw err;
      } finally {
        setIsLoading(false);
        setIsRefetching(false);
      }
    },
    [enabled]
  );

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => {
    if (enabled) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  };
}
