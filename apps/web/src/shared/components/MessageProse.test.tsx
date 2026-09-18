import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import MessageProse from './MessageProse.js';

describe('MessageProse', () => {
  it('renders an http link as a link', () => {
    render(<MessageProse markdown="[the card](https://ygoprodeck.com/card)" />);

    expect(screen.getByRole('link', { name: 'the card' })).toHaveAttribute(
      'href',
      'https://ygoprodeck.com/card'
    );
  });

  it('renders a mail link as plain text', () => {
    const { container } = render(
      <MessageProse markdown="[write me](mailto:someone@example.test)" />
    );

    expect(screen.queryByRole('link')).toBeNull();
    expect(container.textContent).toContain('write me');
  });

  it('renders a script link as plain text', () => {
    const { container } = render(
      <MessageProse markdown="[click](javascript:alert(1))" />
    );

    expect(screen.queryByRole('link')).toBeNull();
    expect(container.textContent).toContain('click');
  });

  it('still renders the prose around an unsafe link', () => {
    render(
      <MessageProse
        markdown={'**Blue-Eyes** matches. [more](mailto:x@y.test)'}
      />
    );

    expect(screen.getByText('Blue-Eyes')).toBeInTheDocument();
    expect(screen.getByText('matches.')).toBeInTheDocument();
  });
});
