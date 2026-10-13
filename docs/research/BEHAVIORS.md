# Interaction Behaviors

- Header: fixed 80px dark glass surface. Mobile navigation opens a sheet; keyboard focus stays visible.
- Hero viewer: vehicle/model selection is click driven. Orbit uses pointer/touch, wheel/pinch zoom. Auto-rotate pauses during interaction and resumes only when enabled.
- Camera presets: click transitions the camera to front three-quarter, side, top, or rear three-quarter.
- Finish and color: click updates physical paint materials immediately; selected controls expose `aria-pressed`.
- Gallery cards: image scales slightly on hover, metadata stays outside the image, keyboard focus mirrors hover.
- Editor preview: upload, text, shape, layer, selection, undo/redo and canvas transform are click/pointer driven. Saving has explicit dirty, saving, saved, conflict, and failed states.
- AI: text/image mode is click driven; total credit cost updates before submission; each candidate progresses independently.
- FAQ: one disclosure can open without closing others; buttons expose `aria-expanded`.
- Section entrance motion: one IntersectionObserver fade/translate treatment, disabled for reduced motion.
- Responsive: 1440px keeps the complete viewer docks; 768px moves secondary tools into compact rails; 390px stacks text and controls and uses horizontal scrolling for vehicle/finish selectors.

Browser automation for the competitor timed out in both available browser surfaces. Local design artifacts and the prior verified viewer provide the implementation truth; competitor hover/scroll values are not claimed as verified.
