import { useCallback, useEffect, useState } from 'react';
import api from './client';

// Minimal GET hook with loading/error state and a manual refetch.
export function useApi(url, { params, skip } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (skip || !url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(url, { params });
      setData(res.data);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [url, JSON.stringify(params), skip]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
