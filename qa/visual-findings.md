# Visual QA findings

## Homepage screenshots

- Desktop 1440x900: premium hero composition is strong; header and hero alignment are clean; no visible horizontal overflow in the first viewport.
- Mobile 390x844: header collapses correctly to logo, search, cart, and menu; hero remains readable and the CTA fits. The perfume bottle overlaps behind the heading on the right, which is visually intentional but the supporting copy sits close to the image edge and should be checked on narrow 320px screens.
- The screenshot viewport ends just as the category section begins, which is expected for a full homepage and not a defect.

## Catalogue and product screenshots

- Direct `/shop` screenshots were blank on both desktop and mobile. The HTML response confirms the route is failing during SSR because the route initializes state from `window.location` during server rendering. This is a functional rendering defect and must be fixed before further visual QA.
- Desktop product detail: image gallery, purchase panel, metadata, and CTA align cleanly at 1440px; the large title is appropriately editorial.
- Mobile product detail: title wraps cleanly, gallery stacks correctly, and the two thumbnails remain usable. The purchase panel is below the first viewport, which is expected and should be checked by scrolling.

## Cart screenshots

- Desktop empty cart: content width, border treatment, button, and footer are balanced at 1440px.
- Mobile empty cart: the title and empty-state card fit without clipping; the footer begins within the captured viewport, which is acceptable for the short empty state.

## Fixed catalogue screenshots

- After deferring `window.location` access until hydration, `/shop` renders correctly on direct navigation. Desktop controls align in one row and the four-column grid is evenly spaced.
- At 320px, the header remains within the viewport, the search field and two selects stack cleanly, and the two-column product grid begins without horizontal clipping. Lower card content continues below the viewport as expected.
