import { startTransition, useEffect, useRef, useState } from "react";
import { ApiRequestError } from "./api";

interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: ApiRequestError | null;
}

const initialState = {
  data: null,
  loading: true,
  error: null,
};

export function useApiResource<T>(key: string, loader: (signal?: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<ResourceState<T>>(initialState);
  const loaderRef = useRef(loader);

  loaderRef.current = loader;

  useEffect(() => {
    const controller = new AbortController();

    startTransition(() => {
      setState((current) => ({
        data: current.data,
        loading: true,
        error: null,
      }));
    });

    loaderRef.current(controller.signal)
      .then((data) => {
        startTransition(() => {
          setState({
            data,
            loading: false,
            error: null,
          });
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        const resolvedError =
          error instanceof ApiRequestError
            ? error
            : new ApiRequestError("Có lỗi xảy ra khi tải dữ liệu.", 500);

        startTransition(() => {
          setState({
            data: null,
            loading: false,
            error: resolvedError,
          });
        });
      });

    return () => {
      controller.abort();
    };
  }, [key]);

  return state;
}
