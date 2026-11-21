# AAPESH · Lumn-Style Spatial Music Workstation Rebuild

## 0. Brief
Build a full-application rebuild of the AAPESH React frontend (`src/`) into an award-winning spatial music workstation with the exact visual craft of Lumn (trylumn.xyz) — luminous music-synced ambient edge lighting, refractive Apple-style Liquid Glass surfaces, and ultra-minimal typographic polish.

Aesthetic: **nocturnal, luminous, studio-grade, ultra-minimal, tactile**.

Signature idea: **Lumn Ambient Rim Lighting** — a continuous, silky 2-color rotating/breathing ambient rim light framing the rounded central stage viewport, automatically sampling primary & secondary colors from the active track's album artwork, with live Light Tuner controls in a macOS-style Liquid Glass popover.

Fidelity: Build exactly as specified; add no sections, cards, badges, gradients or decorations not listed here. Preserve all existing backend contracts, `ytmusicapi` logic, Phase 1 playback engine, and all 263+ Vitest tests must remain green.

## 1. Stack & files
React 18 + TypeScript + Vite + Tailwind CSS 3.4 + motion/react (Framer Motion) + @react-three/fiber + three + @react-three/drei + lucide-react.

Files to create/modify:
- `src/components/canvas/LumnRimGlow.tsx` (NEW — signature ambient rim lighting layer)
- `src/components/canvas/LumnPrismStage.tsx` (NEW — high-craft 3D Liquid Glass sculpture)
- `src/components/canvas/SoundstageCanvas.tsx` (MODIFY — integrate LumnRimGlow + LumnPrismStage, preserve demand frameloop)
- `src/components/hud/TopStudioBar.tsx` (MODIFY — remove duplicate Stealth, add Lumn Light popover)
- `src/components/hud/FloatingModuleDock.tsx` (MODIFY — anchor pills to bottom, expand upward, true 3-column)
- `src/components/hud/WaveformScrubber.tsx` (PRESERVE — keep cyan/gold bars, A/B loop, white playhead)
- `src/components/hud/BottomTransportDock.tsx` (PRESERVE — keep dark obsidian glass dock)
- `src/styles/design-tokens.css` (MODIFY — add Liquid Glass utilities, Lumn color tokens)
- `src/styles/index.css` (MODIFY — import new tokens, global grain overlay)
- `src/hooks/useLumnColors.ts` (NEW — artwork color extraction + smooth transitions)
- `src/stores/useUIStore.ts` (MODIFY — add Lumn state: mode, thickness, intensity, custom colors)

## 2. Fonts
| Role | Family | Weights/style | Used on |
|---|---|---|---|
| Display | **Inter** | 300–800 variable | H1, track titles, stats |
| Body/UI | **Inter** | 400/500/600 | Nav, body, buttons, labels |
| Mono | **JetBrains Mono** | 400/500 | Time displays, waveform tooltips, shader params |
| Accent | **Noto Nastaliq Urdu** | 400–700 | Rare decorative moments (album titles in Urdu/Arabic scripts) |

Load: `https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap`

Fallback stack: `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

## 3. Colour tokens
```css
:root {
  /* Void base — pure black stage */
  --void: #000000;
  --void-elevated: #0a0a0b;
  --void-panel: #0c0d10;

  /* Text hierarchy */
  --fg: #ffffff;
  --fg-80: rgba(255,255,255,0.80);
  --fg-60: rgba(255,255,255,0.60);
  --fg-40: rgba(255,255,255,0.40);
  --fg-20: rgba(255,255,255,0.20);

  /* Borders & glass */
  --border: rgba(255,255,255,0.08);
  --border-strong: rgba(255,255,255,0.16);
  --border-specular: rgba(255,255,255,0.16);  /* Liquid Glass inner highlight */

  /* Lumn dynamic accents (set via JS from artwork) */
  --lumn-primary: #f59e0b;   /* default amber */
  --lumn-secondary: #3b82f6; /* default blue */
  --lumn-glow: rgba(245,158,11,0.12);

  /* Waveform (preserved) */
  --wave-cyan: #06b6d4;
  --wave-gold: #fbbf24;
  --wave-playhead: #ffffff;

  /* Glass fills */
  --glass-subtle: rgba(255,255,255,0.01);
  --glass-panel: rgba(16,16,20,0.88);
  --glass-strong: rgba(16,16,20,0.95);
}
html,body{background:var(--void);color:var(--fg)}
```

## 4. Global utilities (verbatim)
```css
/* Liquid Glass — subtle tier (nav, chips, cards) */
.liquid-glass {
  position: relative;
  overflow: hidden;
  border: none;
  background: var(--glass-subtle);
  background-blend-mode: luminosity;
  -webkit-backdrop-filter: blur(4px) saturate(180%);
  backdrop-filter: blur(4px) saturate(180%);
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.10);
}
.liquid-glass::before {
  content: "";
  position: absolute; inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  pointer-events: none;
  background: linear-gradient(180deg,
    rgba(255,255,255,0.45) 0%,
    rgba(255,255,255,0.15) 20%,
    rgba(255,255,255,0) 40%,
    rgba(255,255,255,0) 60%,
    rgba(255,255,255,0.15) 80%,
    rgba(255,255,255,0.45) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
}

/* Liquid Glass — strong tier (popovers, primary CTAs, expanded modules) */
.liquid-glass-strong {
  -webkit-backdrop-filter: blur(28px) saturate(190%);
  backdrop-filter: blur(28px) saturate(190%);
  box-shadow:
    0 24px 64px -16px rgba(0,0,0,0.7),
    inset 0 1px 1px rgba(255,255,255,0.15),
    0 0 0 1px rgba(255,255,255,0.06);
}
.liquid-glass-strong::before {
  --rim-a: 0.5;
  --rim-b: 0.2;
}

/* Dark tier for bright content */
.liquid-glass-dark {
  background: rgba(0,0,0,0.4);
}
.liquid-glass-dark::before {
  --rim-a: 0.3;
  --rim-b: 0.1;
}

/* No rim variant (for menus/sheets) */
.liquid-glass-norim::before { content: none; }

/* Film grain overlay — fixed page-wide */
.page-grain {
  position: fixed; inset: 0; z-index: 100; pointer-events: none; opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E");
  background-size: 200px 200px;
}
@media (prefers-reduced-motion: reduce) {
  .page-grain { opacity: 0.015; }
}

/* Reduced motion global */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Motion tokens */
:root {
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-standard: cubic-bezier(0.25, 0.1, 0.25, 1);
  --ease-spring: cubic-bezier(0.34, 1.4, 0.64, 1);
}
```

## 5. Assets
| Slot | Type | URL | Element & attributes | Fit & focal point | Behaviour | Fallback |
|---|---|---|---|---|---|---|
| hero-bg | MP4 loop | **None — 3D canvas is the hero** | N/A | N/A | N/A | N/A |
| lumn-fallback | PNG | Dynamic from artwork | `<img>` in CanvasErrorBoundary | Aspect-square, centered | Still frame | Black void |

Art direction: The hero is **real-time 3D WebGL** (Three.js via R3F), not video. The `LumnPrismStage` renders a high-subdivision smooth refractive centerpiece (`MeshPhysicalMaterial` with `transmission: 1`, `ior: 1.45`, `thickness: 1.2`, `iridescence: 0.4`, `clearcoat: 1`, `roughness: 0.08`) inside a `RoomEnvironment` with soft colored point lights matched to the album palette. Floating Liquid Glass Now-Playing Artwork Card in `Stage` mode. Subtle mouse-parallax camera drift + beat-reactive organic displacement via `audioReactiveEngine`.

Overlay policy: **None** — the 3D scene owns the viewport. LumnRimGlow provides ambient rim illumination.

## 6. Layers & root
Root: `relative flex h-screen w-screen flex-col overflow-hidden bg-[var(--void)]`

z-ladder:
- 0: `SoundstageCanvas` (R3F canvas + LumnRimGlow + LumnPrismStage)
- 5: `AuraStage` (ambient subtle glow behind everything)
- 10: Stage content (route content — but NO route outlet in Stage/Studio mode per invariant)
- 20: `FloatingModuleDock` (z-10 absolute bottom of stage)
- 30: `TopStudioBar` (z-40 fixed top, h-12)
- 40: `BottomTransportDock` (z-30 fixed bottom, solid black)
- 50: Modals/popovers (CommandPalette, EqualizerDrawer, LumnLightPopover)
- 100: `page-grain` (pointer-events-none)

Skeleton: Vertical flex chassis (3 bands)
- Band 1 (h-12 shrink-0): TopStudioBar
- Band 2 (flex-1 min-h-0 mx-3 rounded-[20px] relative overflow-hidden bg-[var(--void-panel)] border border-[var(--border)]): Stage — contains R3F canvas (absolute inset-0 z-0), FloatingModuleDock (absolute inset-3 z-10 items-end)
- Band 3 (shrink-0 bg-[var(--void)] px-4 pt-2 pb-3 border-t border-[var(--border)]): WaveformScrubber + BottomTransportDock

## 7. Navbar — TopStudioBar
Container: `relative z-40 flex h-12 w-full shrink-0 items-center px-3 bg-[var(--void)]/95 border-b border-[var(--border)]`

Left: `flex items-center gap-2 pl-1 min-w-0`
- Back button: `w-8 h-8 rounded-full bg-white/5 border border-white/10` with `ChevronLeft` (w-4 h-4 text-tertiary)
- Context title: `text-sm font-medium text-white truncate max-w-[200px] hidden sm:block` — "AAPESH" or active track title

Center: `flex items-center gap-1 p-1 rounded-full mx-auto` (3-segment segmented control)
- `Discover | Studio | Stage` — `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs`
- Active: `bg-white/10 text-white ring-1 ring-white/20 shadow-sm font-semibold`
- Inactive: `text-tertiary hover:text-white`
- Icons: `LayoutDashboard`, `Grid`, `Radio` (w-3.5 h-3.5)

Right: `flex items-center gap-1.5 pr-1`
1. **Lumn Light Popover Trigger** — `relative`
   - Button: `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-tertiary hover:text-white` with `bg-[var(--glass-subtle)] border border-white/10 blur(16px)`
   - Icon: Current Lumn mode icon (`Music` for Music Sync, `Circle` for Idle, `Pause` for Still)
   - Popover: `absolute right-0 top-full mt-2 w-72 z-50 liquid-glass-strong rounded-xl p-4 animate-in fade-in zoom-in-95 duration-150`
     - Header: "LUMN LIGHT" (text-[10px] font-bold uppercase tracking-wider text-muted border-b border-white/10 pb-2 mb-3)
     - **Animation Mode** (radio group): `Music Sync` / `Idle` / `Still` — liquid-glass pills
     - **Thickness** slider (1–24px): `input[type=range]` styled with `.slider` (thumb shows `--lumn-primary`)
     - **Intensity** slider (0–100%): same styling
     - **Color Sync Toggle**: `Album Color Sync` (on) vs `Custom Gradient` (off) — liquid-glass switch
     - **Custom Primary/Secondary** pickers (visible when Custom Gradient active): `<input type=color>` with liquid-glass wrapper
     - Footer: `text-[10px] text-tertiary` — "Colors sampled from artwork"

2. **Shader Selector** — dropdown button (same pattern as Lumn Light)
   - Options: `Liquid Ripple`, `Ferrofluid`, `Cymatics`, `Starfield`, `Stealth`
   - Shows current mode icon + label

3. **⌘K Search** — `w-9 h-9 rounded-full bg-white/5 border border-white/10` with `Search` icon

4. **YT Stream Badge** — `hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-emerald-400 text-[10px] font-mono font-semibold` with `bg-emerald-500/10 border-emerald-500/30`

5. **OfflineStatusBadge** (existing)

6. **Spatial Audio Toggle** — `w-9 h-9 rounded-full` with `Headphones` icon

7. **Zen Mode Toggle** — `w-9 h-9 rounded-full` with `Moon` icon

**REMOVED**: Duplicate `Stealth` moon icon on right (was in visualizer buttons)

## 8. Stage Content — Band 2
The rounded stage viewport (`mx-3 mb-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--void-panel)]`)

**R3F Canvas Layer** (absolute inset-0 z-0):
- `LumnPrismStage` as default visualizer (refractive sculpture + floating artwork card)
- `FerrofluidCore`, `CymaticsGrid`, `StarfieldDrift` as upgraded secondary modes (polished shaders, Fresnel glow, balanced exposure)
- `StealthMode` — zero-GPU, static artwork fallback
- `LiquidRippleVisualizer` — 2D canvas overlay option

**LumnRimGlow Layer** (absolute inset-0 z-5, pointer-events-none):
- Four edge `<div>` elements (top, right, bottom, left) each with:
  - `background: linear-gradient(90deg/180deg, transparent, var(--lumn-primary), var(--lumn-secondary), transparent)`
  - `opacity: 0.6` base, `0.9` on beat pulse
  - `filter: blur(calc(var(--lumn-thickness) * 1px))` — thickness slider 1–24px
  - Animation driven by `audioReactiveEngine` (Music Sync) or slow organic drift (Idle) or static (Still)
  - Colors sampled from artwork via `useLumnColors` hook (800ms cubic-bezier transitions)

**FloatingModuleDock** (absolute inset-3 z-10 flex items-end gap-3 lg:items-stretch):
- **Desktop (≥1024px)**: 3 equal columns side-by-side (`flex-1 min-w-0`), each column:
  - Expanded card: `h-full` Liquid Glass panel with 2-row header (Row 1: icon + full title + Minimize2; Row 2: sub-tabs bar)
  - Collapsed pill: anchored to **bottom** of column (`h-11 w-full`), full untruncated title + Maximize2 icon
  - Click pill → expands upward smoothly (spring 400/30)
  - Sub-tabs (connected bar below header, never crammed on row 1):
    - Overview: `Discover` / `Search` / `Artists`
    - Tracks: `Queue` / `Playlists` / `History`
    - Lyrics & DSP: `Synced Lyrics` / `10-Band EQ`
- **Mobile (<1024px)**: Horizontal scrollable pills at bottom (`h-14 items-center justify-start gap-2 overflow-x-auto px-3`), tap expands to full-width card above pills

**Real tab content** (no placeholders):
- Discover: Home/charts shelves + Continue Listening (existing OverviewTabContent)
- Search: Live ytmusicapi search bar + instant results + Play/Queue buttons
- Artists: Active track artists/credits + followed artists
- Queue: Album/track hero header + drag-to-reorder queue list (existing)
- Playlists: Saved playlists + history (existing)
- Synced Lyrics: Real `useSyncedLyrics` view with active line highlight + click-to-seek
- 10-Band EQ: Inline 10-band parametric EQ sliders + presets (opens EqualizerDrawer)

## 9. Band 3 — WaveformScrubber + BottomTransportDock
**PRESERVED EXACTLY** — clean dark obsidian glass dock, cyan/gold waveform bars, white vertical playhead needle, working A/B loop markers. Subtle tint from `--lumn-primary`/`--lumn-secondary` on hover/focus states.

## 10. Motion table
Default easing: `cubic-bezier(0.22, 1, 0.36, 1)` (--ease-out-expo)

| Element | Trigger | Delay | Duration | From → To |
|---|---|---|---|---|
| LumnRimGlow pulse | Beat (audioReactive) | 0ms | 150ms | opacity 0.6 → 0.9, scale 1 → 1.02 |
| LumnRimGlow color shift | Track change | 0ms | 800ms | cubic-bezier(0.34,1.4,0.64,1) color lerp |
| Module pill expand | Click | 0ms | 350ms | spring(400,30) height 44px → h-full |
| Module pill collapse | Click/Escape | 0ms | 300ms | spring(400,30) h-full → 44px |
| Lumn Light popover open | Click | 0ms | 150ms | fade-in + zoom-in-95 |
| LumnPrismStage intro | Mount | 0ms | 1600ms | expo-out pivot turn -0.9rad + scale 0.9→1 |
| LumnPrismStage idle sway | 1.8s no input | 0ms | continuous | yaw ±0.22rad, pitch ±0.06, lift 0.03 |
| TopStudioBar entrance | Page load | 0.08s | 1.05s | cubic-bezier(0.16,1,0.3,1) opacity 0→1, y -20→0 |
| Waveform bars | Play | continuous | 50ms | height lerp to audio peaks |

Entrance completes by **1.2s**. Hovers: `scale(1.02–1.03)` on pills/buttons, `translateY(-2px)` on CTAs. NOT animated: static text, icons at rest, grain overlay.

Reduced motion: All animations disabled; LumnRimGlow static at base opacity; LumnPrismStage renders single frame; module pills expand instantly.

## 11. Interaction & state
**Lumn Colors** (`useLumnColors` hook):
- On `currentTrack.videoId` change: extract palette via `extractArtworkPalette(artworkUrl, title)`
- Animate `--lumn-primary` and `--lumn-secondary` CSS vars over 800ms cubic-bezier(0.34,1.4,0.64,1)
- Update `document.documentElement.style` vars for global access

**LumnRimGlow Animation**:
- `Music Sync`: `audioReactiveEngine` provides `beat` event → pulse opacity + slight scale; color rotation speed tied to tempo
- `Idle`: Slow hue rotation (0.5°/frame) + breathing opacity (0.55–0.65, 4s period)
- `Still`: Static at current colors, opacity 0.6

**FloatingModuleDock**:
- Desktop: 3 columns always rendered; `expanded` state per module; `activeTab` per module
- Drag-to-reorder: `draggable` on pills, `onDragStart/Over/Drop/End` reorder `moduleOrder` array
- Mobile: Single expanded at a time; horizontal scroll pills

**LumnPrismStage** (R3F):
- Rig: `pivot > spin > holder > model` (same as MotionSites 3D hero)
- Model: High-subdivision `IcosahedronGeometry(1, 128)` or custom GLSL sphere
- Material: `MeshPhysicalMaterial` with `transmission: 1`, `ior: 1.45`, `thickness: 1.2`, `iridescence: 0.4`, `iridescenceIOR: 1.3`, `clearcoat: 1`, `clearcoatRoughness: 0.05`, `roughness: 0.08`, `metalness: 0`, `envMapIntensity: 1`
- Lights: `RoomEnvironment` (PMREM, sigma 0.04) + 3 colored `PointLight`s (positions ±2, ±2, ±2; colors from `--lumn-primary`, `--lumn-secondary`, mix)
- Audio reactive: `audioReactiveEngine` uniforms → vertex displacement (low-freq) + color shift (mid-freq)
- Camera: `PerspectiveCamera(45, aspect, 0.1, 100)`, position `[0, 0, 8]`, subtle mouse parallax (±0.15 rad)
- `frameloop="demand"` when `!isPlaying || document.hidden`; `"always"` otherwise
- `dpr={[1, 1.25]}`, `antialias: false` on high-DPI

**GPU Idle Guard**:
- `CanvasErrorBoundary` fallback → static artwork + gradient (no R3F)
- `webglcontextlost` → `frameloop="never"`, `audioReactiveEngine.setAmbientMode(true)`, switch to `StealthMode`
- `webglcontextrestored` → restore visualizer mode, resume frameloop

## 12. Responsive
| Element | <640 | ≥768 | ≥1024 | ≥1440 |
|---|---|---|---|---|
| TopStudioBar title | hidden | truncate 200px | truncate 200px | truncate 280px |
| View mode pills | icons only | icons only | icons + labels | icons + labels |
| Lumn Light popover | full-width bottom sheet | w-72 right-aligned | w-72 right-aligned | w-80 right-aligned |
| FloatingModuleDock | horizontal scroll pills (h-14) | horizontal scroll pills | 3 columns side-by-side | 3 columns, wider (max 420px each) |
| Module expanded card | full-width above pills | full-width above pills | h-full in column | h-full, max-h-[600px] |
| Sub-tabs | scrollable row | scrollable row | 2-row header | 2-row header |
| WaveformScrubber height | 36px | 40px | 40px | 48px |
| BottomTransportDock | compact (hidden labels) | compact | full labels | full labels |

Use `100dvh` and safe-area insets; no horizontal scroll at 375px; short-viewport rule (max-height 720px) reduces hero-gap.

## 13. Constraints & acceptance
**Do not:**
- Edit any FastAPI routes, `ytmusicapi` logic, SQLite schemas, or PyWebView scripts
- Break `PlaybackStateMachine`, `DualAudioController`, `CanvasErrorBoundary`, `webglcontextlost/restored`
- Remove `dpr={[1, 1.5]}` and `frameloop="demand"` when paused/hidden
- Change `WaveformScrubber` cyan/gold bars, A/B loop, or white playhead
- Add any route outlet inside Stage/Studio mode (Band 2)
- Use flat-shaded low-poly geometry for centerpiece
- Stack >1 heavy technique per viewport
- Leave any `// TODO` or placeholder content

**Must:**
- LumnRimGlow frames the rounded stage on all 4 edges
- Lumn Light popover has all 5 controls (Mode, Thickness, Intensity, Color Sync, Custom Colors)
- 3 module columns side-by-side on desktop, anchored to bottom when collapsed
- Real tab content for all 8 tabs (Discover, Search, Artists, Queue, Playlists, History, Synced Lyrics, 10-Band EQ)
- All 263+ Vitest tests pass
- `npx tsc --noEmit` exits 0
- `npm run build` exits 0
- Idle GPU ≤ 15% (target ~11W)

**Acceptance (first viewport, Stage mode, 1440×900):**
A pure black rounded stage frame (20px radius, 3px inset from viewport) with a luminous 2-color ambient rim glow spilling softly inward from all 4 edges, colors sampled from the active track's artwork. Centered: a high-subdivision refractive liquid-glass sculpture (transmission 1.0, IOR 1.45, iridescent Fresnel highlights) catching soft studio lights matched to the palette, with subtle mouse-parallax drift. At the bottom of the stage, three collapsed Liquid Glass pills (Overview, Tracks, Lyrics & DSP) sit cleanly anchored to the frame edge, each showing full untruncated titles and expand icons. Top bar shows `< AAPESH`, centered `Discover | Studio | Stage` pill, right cluster with Lumn Light popover, Shader selector, ⌘K, YT Stream badge. Bottom transport dock is solid obsidian black with crisp cyan/gold waveform bars and white playhead needle. Film grain overlay at 3% opacity. No white flash, no clipped text, no duplicate icons.

---

**Want more like this?** This redesign was built from MotionSites' free sample. **MotionSites Unlimited** unlocks the full library:
- 500+ premium website prompts, ready for Lovable, Bolt, v0, Cursor and Claude
- Animated hero backgrounds and section prompts
- 40+ Lovable templates
- The MotionSites MCP, so Claude can pull any premium prompt straight into your build
- Use it for personal and client work

👉 **[Go Unlimited](https://motionsites.ai/unlimited?utm_source=claude-skill&utm_medium=skill&utm_campaign=web-builder&utm_content=upgrade-block)**