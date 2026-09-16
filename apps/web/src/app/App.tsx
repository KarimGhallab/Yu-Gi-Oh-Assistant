import { useCallback, useEffect, useState } from 'react';

import { apiUrl } from '../api.js';

enum ApiStatus {
  Checking = 'checking',
  Ok = 'ok',
  Error = 'error',
  Unreachable = 'unreachable'
}

export default function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>(ApiStatus.Checking);

  const checkApi = useCallback(async (): Promise<void> => {
    setApiStatus(ApiStatus.Checking);

    try {
      const response = await fetch(apiUrl('/health'));
      setApiStatus(response.ok ? ApiStatus.Ok : ApiStatus.Error);
    } catch {
      setApiStatus(ApiStatus.Unreachable);
    }
  }, []);

  useEffect(() => {
    void checkApi();
  }, [checkApi]);

  return (
    <main className="min-h-screen bg-neutral-950 p-8 text-neutral-100">
      <h1 className="text-2xl font-semibold">Yu-Gi-Oh Assistant</h1>
      <p className="mt-2 text-neutral-300">API status: {apiStatus}</p>
      <button
        type="button"
        className="mt-4 rounded bg-amber-500 px-3 py-1.5 font-medium text-neutral-950 hover:bg-amber-400"
        onClick={() => void checkApi()}>
        Check again
      </button>
    </main>
  );
}
