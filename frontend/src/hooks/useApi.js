import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function useApi(path, params) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify([path, params || {}]);

  useEffect(() => {
    const [p, q] = JSON.parse(key);
    let alive = true;
    setLoading(true);
    setError(null);
    api.get(p, { params: q })
      .then((r) => alive && setData(r.data))
      .catch((e) => alive && setError(e.response?.data?.detail || "Could not load data"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [key]);

  return { data, error, loading };
}
