# Homepage Showcase Specification

- Targets: hero and Gallery preview blocks plus reusable vehicle viewer.
- Hero max width 1440px; centered copy contains headline, subtext, two distinct CTAs, then a 16px-radius real 3D stage.
- 3D stage: toolbar, model rail, live status, viewer canvas, camera controls, editor CTA, finish and swatch dock. Desktop height about 580px, mobile 460px.
- Gallery: four varied cards on desktop and horizontal snap rail on mobile. Cover ratio 16:10. Metadata and Remix action sit below the image.
- Use real GLBs and local derivatives. Do not render a fake vehicle UI or copy remote competitor images.
- Loading uses an aspect-stable skeleton; WebGL failure uses a poster and explanatory action.
