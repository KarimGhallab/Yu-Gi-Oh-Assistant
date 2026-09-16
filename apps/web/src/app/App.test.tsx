import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from './App.js';

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the API status the server reports', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(await screen.findByText('API status: ok')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/health');
  });

  it('re-checks the API when the player asks again', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null))
      .mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await screen.findByText('API status: ok');

    await userEvent.click(screen.getByRole('button', { name: 'Check again' }));

    expect(
      await screen.findByText('API status: unreachable')
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
