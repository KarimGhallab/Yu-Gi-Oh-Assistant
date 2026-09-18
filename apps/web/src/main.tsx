import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';

import { createQueryClient } from './shared/createQueryClient.js';

import App from './App.js';
import './styles.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root container not found');
}

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={createQueryClient()}>
      {/* A route change is rendered on the spot rather than as a React
          transition, because the one view transition in this app has to do its
          work inside the callback that opens it: a transition-lane update
          cannot be flushed there, and the browser would then photograph the old
          screen as the new one and drop the movement. */}
      <BrowserRouter useTransitions={false}>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);
