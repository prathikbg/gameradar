import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function useApi(path, params) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const key = path + JSON.stringify(params || {});

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api.get(path, { params })
      .then((r) => alive && setData(r.data))
      .catch((e) => alive && setError(e.response?.data?.detail || "Could not load data"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data, error, loading };
}
