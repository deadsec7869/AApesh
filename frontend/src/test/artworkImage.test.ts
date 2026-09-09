import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArtworkImage } from '@/components/common/ArtworkImage';
import { getArtworkUrl } from '@/utils/artwork';

describe('Artwork Canonical Resolver & ArtworkImage Component', () => {
  it('resolves direct string URL', () => {
    expect(getArtworkUrl('https://example.com/art.jpg')).toBe('https://example.com/art.jpg');
    expect(getArtworkUrl('   ')).toBeNull();
    expect(getArtworkUrl(null)).toBeNull();
  });

  it('resolves thumbnail and thumbnail_url fields safely', () => {
    expect(getArtworkUrl({ thumbnail: 'https://example.com/thumb.jpg' })).toBe('https://example.com/thumb.jpg');
    expect(getArtworkUrl({ thumbnail_url: 'https://example.com/thumb_url.jpg' })).toBe('https://example.com/thumb_url.jpg');
    expect(getArtworkUrl({ thumbnailUrl: 'https://example.com/thumbUrl.jpg' })).toBe('https://example.com/thumbUrl.jpg');
    expect(getArtworkUrl({ cover: 'https://example.com/cover.jpg' })).toBe('https://example.com/cover.jpg');
  });

  it('resolves best thumbnail from thumbnails array', () => {
    const item = {
      thumbnails: [
        { url: 'https://example.com/60.jpg', width: 60, height: 60 },
        { url: 'https://example.com/544.jpg', width: 544, height: 544 },
      ],
    };
    expect(getArtworkUrl(item, 500)).toBe('https://example.com/544.jpg');
    expect(getArtworkUrl(item, 80)).toBe('https://example.com/60.jpg');
  });

  it('renders fallback icon when src and item are null or empty', () => {
    const { container } = render(React.createElement(ArtworkImage, { src: null, alt: 'Test Track' }));
    expect(screen.getByRole('img', { name: 'Test Track' })).toBeDefined();
    expect(container.querySelector('svg')).toBeDefined();
  });

  it('resolves artwork from item prop correctly', () => {
    render(
      React.createElement(ArtworkImage, {
        item: { thumbnail_url: 'https://example.com/song.jpg' },
        alt: 'Item Track',
      })
    );
    const img = screen.getByRole('img', { name: 'Item Track' });
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('https://example.com/song.jpg');
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
