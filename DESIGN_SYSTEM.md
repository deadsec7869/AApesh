# AAPESH — Spatial Liquid Glass Design System

## Overview

**AAPESH** is an original premium spatial music environment. It embodies spatial depth, selective translucency, natural light interactions, an artwork-driven atmosphere, and 100% Guest Mode with zero login friction.

AAPESH is monochromatic by design:
- **Base environment**: Dark charcoal / near-black (`#000000`, `#050505`, `#080808`, `#0C0C0C`, `#111111`).
- **Interaction language**: Crisp white controls, solid white primary play button with black icon, subtle white glass active navigation.
- **Atmosphere**: Album artwork provides the environmental color (radial gradients, soft blurred light fields, player underglow). The UI itself never competes with the music.

---

## 1. Material Hierarchy

Glass is used strictly to establish depth, priority, and spatial separation. It is NOT applied to every card or row to preserve 60fps performance and avoid nested blur lag.

| Level | Role | Description | Core CSS Classes / Tokens |
|---|---|---|---|
| **Level 0: Atmosphere** | Ambient Foundation | Dark charcoal base (`#050505`) with multi-point blurred color fields derived from the active track's extracted artwork palette. | Dynamic blurred radial gradient auras, vignette contrast balancer |
| **Level 1: Base Content** | Content Anchors | Solid/semi-solid surfaces for album grids, track rows, and shelves. Zero unnecessary blur for blazing 60fps GPU performance. | `.glass-surface`, `.glass-shelf`, `hover:bg-white/[0.04]` |
| **Level 2: Glass Surfaces** | Structural & Floating | Floating player dock, narrow navigation rail, top header bar, and slide-out panels. Translucent with specular edge highlights. | `.glass-dock`, `.glass-floating`, `.glass-nav`, `.glass-topbar`, `.glass-pill` |
| **Level 3: High-Priority Glass** | Modal & Focus | Spotlight command palette, context menus, and full-screen player playback controls. Deep backdrop blur (36–40px), layered elevation. | `.glass-modal`, `.glass-elevated` |

---

## 2. Color System & Monochromatic Philosophy

```css
/* Base Canvas */
--bg-deep: #000000;
--bg-base: #050505;
--bg-surface: #0c0c0e;
--bg-elevated: #141418;

/* Monochromatic Neutrals */
--text-primary: #ffffff;
--text-secondary: rgba(255, 255, 255, 0.70);
--text-muted: rgba(255, 255, 255, 0.45);
--border-subtle: rgba(255, 255, 255, 0.07);
--border-active: rgba(255, 255, 255, 0.16);

/* Functional Accents */
--like-heart: #f43f5e; /* Rose 500 */
--guest-dot: #10b981;  /* Emerald 500 pulse */
```

### Artwork Provides Color
The currently playing album artwork dynamically generates environmental light:
- Primary hue & glow fields in `AppLayout`
- Subtle ambient underglow behind the floating player dock (`BottomPlayer`)
- Multi-layer cinematic background in `FullScreenPlayer`
UI buttons, typography, navigation, and controls remain monochromatic white, charcoal, and gray.

---

## 3. Continuous Squircle Geometry

A standardized radius system ensures visual coherence across the floating application shell:

| Token | Radius | Usage |
|---|---|---|
| `.squircle-28` | 28px | Main floating application canvas, floating player dock, full-screen player artwork |
| `.squircle-24` | 24px | Large shelf containers (`.glass-shelf`), hero cards, discovery carousels |
| `.squircle-20` | 20px | 6-card quick jump grid cards, modal dialogues |
| `.squircle-16` | 16px | Album artwork thumbnails, track list rows, category pills |
| `.squircle-12` | 12px | Compact controls, context menu items, badges |
| `rounded-full` | 9999px | Navigation pills, avatar rings, primary play buttons |

---

## 4. Typography Hierarchy (SF Pro System Stack)

Using the native system font stack without bundling proprietary Apple font binaries:

```css
font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", "Noto Sans", Arial, sans-serif;
```

- **Large Title**: 34px, line-height 41px, tracking -0.025em
- **Title 1**: 28px, line-height 34px, tracking -0.02em
- **Title 2**: 22px, line-height 28px
- **Title 3**: 20px, line-height 25px
- **Headline**: 17px, semibold
- **Body**: 16px, regular
- **Callout**: 15px, medium
- **Subheadline**: 14px, regular
- **Footnote**: 13px, regular
- **Caption 1**: 12px, tabular-nums for time and durations
- **Caption 2**: 11px, uppercase tracking for category tags

---

## 5. Interaction Language

- **Primary Play Button** (`.btn-play-aapesh`):
  - Solid white (`#ffffff`) circular surface
  - Deep black icon (`#050505`)
  - Subtle natural drop shadow (`0 4px 16px -2px rgba(0, 0, 0, 0.5)`)
  - Hover: `scale(1.05)`, Active: `scale(0.95)`
- **Scrubber Slider** (`.scrubber-slider-aapesh`):
  - 4px track, white filled progress bar, white circular thumb (12px)
  - 60fps local scrubbing without audio engine freeze
- **Navigation Rail**:
  - Narrow vertical pill rail (68px width) detached from window edge
  - Active item highlighted with white/luminous pill
  - Inactive items neutral gray with hover preview tooltips

---

## 6. Smart Playback & Guest Mode Architecture

- **100% Guest Mode**: No user credentials, no membership tiers, no paywall prompts.
- **Local Persistence**:
  - Liked tracks, created playlists, playback history, volume, repeat, shuffle modes stored locally.
- **Smart Shuffle**:
  - Intelligent entropy engine avoiding repetitive artist/album loops while prioritizing liked songs and variety.
- **Autoplay**:
  - Seamless continuation when queue runs out by fetching related recommendations from catalog without interrupting audio.
- **Sleep Timer**:
  - 15m, 30m, 45m, 60m, end of track, with non-intrusive top-bar countdown chip.
