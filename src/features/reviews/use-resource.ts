"use client";
import { useCallback, useEffect, useState } from "react";
import { ApiError, request } from "@/lib/api-client";

type Result<T> = { key: string; data?: T; error?: ApiError };

export function useResource<T>(
  path: string | null,
  leaderId?: string,
  load = request<T>,
) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const key = `${path}:${leaderId}:${revision}`;
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    if (path === null) return;
    const controller = new AbortController();
    load(path, { leaderId, signal: controller.signal }).then(
      (data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      },
      (error) => {
        if (!controller.signal.aborted) setResult({ key, error });
      },
    );
    return () => controller.abort();
  }, [key, path, leaderId, load]);
  const current = result?.key === key ? result : null;
  return {
    data: current?.data,
    error: current?.error,
    loading: path !== null && !current,
    refresh,
  };
}
