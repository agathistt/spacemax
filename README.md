# SpaceMax

A responsive brand website introducing custom-fit storage, beginning under the sink. Built as static HTML, CSS, and JavaScript with no build dependencies.

## Preview

Run `python3 -m http.server 5174 --bind 127.0.0.1 --directory dist` from this directory, then open `http://127.0.0.1:5174`.

## Working interactions

- User-supplied before photo and after-design preview, with full-original image viewers.

- Three-step planner: choose a space, enter interior dimensions, select a finish direction, and add obstacle notes.
- Inches/centimeters conversion preserves source measurements across repeated switches.
- Plan summary with an explicitly illustrative schematic.
- Browser-local saving, reopening, and deletion.
- Downloadable plain-text design brief.
- Mobile navigation, native FAQ disclosures, and privacy dialog.

## Business details needed before sales launch

This version is a private brand concept, not an operational checkout. There are no live products, prices, quote submissions, customer accounts, or payments. The site says this in the collection, FAQ, and planner. Plans are saved only in the visitor's browser.

To open orders, confirm the product specifications, available finishes, fabrication/installation process, pricing, lead times, delivery regions, returns, business contact details, and whether to use custom quotes or fixed-price checkout. Then connect the chosen ordering and fulfillment flow.

The homepage editorial image is AI-generated concept imagery, not manufactured-product photography. The before-and-after section uses user-supplied images: an existing-space photo and a proposed design preview. Prompt and asset provenance are in `ASSETS.md`.

## Validation

Verified in the in-app browser on desktop and at a 390px mobile viewport: planner navigation, required-input validation, unit conversion, decimal round trips, finish selection, saved-plan persistence after reload, download content, and mobile menu behavior. Checked images loaded and no console warnings/errors or horizontal overflow. JavaScript syntax checked with `node --check dist/app.js`.

## Hosting

`.openai/hosting.json` identifies the private Sites project and deploys the `dist` directory. Use the Sites skill for future publication. Keep the project's identity and current audience on updates.
