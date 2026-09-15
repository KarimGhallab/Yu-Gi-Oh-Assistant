import { useEffect, useState } from 'react';

export default function App() {
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    fetch('/health')
      .then(response => setApiStatus(response.ok ? 'ok' : 'error'))
      .catch(() => setApiStatus('unreachable'));
  }, []);

  return (
    <main>
      <h1>Yu-Gi-Oh Assistant</h1>
      <p>API status: {apiStatus}</p>
    </main>
  );
}
