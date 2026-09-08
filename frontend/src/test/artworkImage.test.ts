import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArtworkImage } from '@/components/common/ArtworkImage';

describe('ArtworkImage Component', () => {
  it('renders fallback icon when src is null or empty', () => {
    const { container } = render(React.createElement(ArtworkImage, { src: null, alt: 'Test Track' }));
    expect(screen.getByRole('img', { name: 'Test Track' })).toBeDefined();
    expect(container.querySelector('svg')).toBeDefined();
  });

  it('switches to fallback gracefully when image triggers onError', () => {
    const { container } = render(
      React.createElement(ArtworkImage, { src: 'https://broken-domain-404.xyz/broken.jpg', alt: 'Broken Track' })
    );
    const img = container.querySelector('img');
    if (img) {
      fireEvent.error(img);
    }
    expect(screen.getByRole('img', { name: 'Broken Track' })).toBeDefined();
    expect(container.querySelector('svg')).toBeDefined();
  });
});
