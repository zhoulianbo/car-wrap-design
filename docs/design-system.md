# Car Wrap Design System

## Design read

Car Wrap Design is an automotive creation studio for Tesla owners and visual creators. The interface uses a dark photo-studio stage with the precision and density of a professional wrap editor. The vehicle, wrap finish, and authored work remain the visual focus.

Design dials: variance 7, motion 5, density 6. The public site changes layout rhythm between sections; motion is limited to 3D, state transitions, and entrance hierarchy; the editor can be denser than the marketing surface.

## Brand mark

The primary mark is a folded **W ribbon** built from two interlocking emerald planes, with a small signal-orange film tab as the only accent. The mark reads as both “wrap” and a folded sheet of material without relying on a vehicle manufacturer emblem. It must never be placed inside a permanent tile, badge, container, or decorative border.

- Master artwork: `public/logo.png`, 800×800, transparent background. `public/logo.svg` is a compatibility wrapper that references the approved raster master and is not the editable source.
- Browser assets: `public/favicon.svg`, `public/favicon.ico`, `public/favicon-32x32.png`, and `public/apple-touch-icon.png`.
- Social master: `public/og-image.png`, 1672×941. `public/og-image.svg` is a compatibility wrapper; Gallery reuses the social master instead of maintaining a duplicate derivative.
- Minimum digital size: 16px for the simplified favicon, 24px for the full mark.
- Never place a permanent background tile or outline around the mark. The surrounding product surface supplies the background.
- Cyber Emerald is dominant. Signal Orange is restricted to the detached film tab; darker emerald planes provide fold depth. A one-color reproduction merges the emerald planes and omits the orange tab only when production constraints require it.

## Color tokens

The product is dark-only at launch. All colors are implemented as semantic oklch variables in `src/styles/globals.css`.

| Role             | Source color | Use                                |
| ---------------- | ------------ | ---------------------------------- |
| Canvas           | `#070a10`    | Deep page and 3D stage background  |
| Surface          | `#0f131c`    | Main page surface                  |
| Raised surface   | `#181e2b`    | Cards and docks                    |
| Active surface   | `#222a3a`    | Hover and selected containers      |
| Foreground       | `#e2e6f0`    | Primary text                       |
| Muted foreground | `#94a3b8`    | Supporting copy                    |
| Cyber Emerald    | `#00f59b`    | Primary actions and selected state |
| Signal Orange    | `#ff7849`    | Logo film-fold accent only         |
| Aero Cyan        | `#38bdf8`    | Real secondary telemetry only      |
| Border           | `#334155`    | Hairline structure                 |

Cyber Emerald remains the sole interface and CTA accent. Signal Orange is a brand-mark detail, not a second button color. Cyan is reserved for actual secondary state in the editor or viewer and is never a competing CTA color. Text on Cyber Emerald uses the deepest canvas color.

Editor workspaces use neutral slate inspection surfaces: `--studio-preview` for 3D and `--studio-checker-low` / `--studio-checker-high` for transparency. These surfaces are lighter than the surrounding application chrome so black wraps and wheel details remain visible. Docks, buttons, text, and popovers retain the standard semantic tokens above.

## Typography

- Display and controls: Space Grotesk, weights 500-700.
- Body and forms: Plus Jakarta Sans Variable, weights 400-700.
- Hero: 40/48 mobile, 64/72 desktop, tracking `-0.03em`.
- Section headline: 32/40 mobile, 44/52 desktop.
- Body: 15/24 default, 18/28 lead.
- Technical labels: 12/16, weight 600, tracking `0.04em`.

## Shape, depth, and motion

- Primary sections use 16px corners; nested controls use 12px; compact controls use 8px.
- Glass docks use translucent slate, a single cool border, and 16px backdrop blur. Provide an opaque fallback when reduced transparency is preferred.
- Shadows are deep and neutral. Emerald outer glow is restricted to active generation or selection feedback.
- Motion duration is 160-260ms for controls and 400-600ms for section entrances. Respect `prefers-reduced-motion`.
- Marketing pages must not use decorative status dots, gradient headline text, generic three-card rows, or simulated product screenshots. The 3D viewer and editor are real product surfaces.

## Layout and accessibility

- 12 columns on desktop, 8 on tablet, 4 on mobile. Marketing content max width is 1540px.
- Desktop outer margin 48px, tablet 24px, mobile 20px.
- Controls have visible focus rings and a minimum 44px touch target where practical.
- Canvas-based interfaces include text alternatives, keyboard-accessible controls, loading, empty, WebGL failure, save error, and provider error states.
- CTA labels remain one line. The whole product remains in the dark theme for launch.
