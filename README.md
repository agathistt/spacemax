# SpaceMax

A responsive custom-storage brand site and interactive planning prototype, focused on exposed bathroom sinks. Static HTML, CSS, and ES modules; no build dependencies.

## Preview

Run `python3 -m http.server 5174 --bind 127.0.0.1 --directory dist` from this directory, then open `http://127.0.0.1:5174`.

## Four-step space studio

1. Add a local JPEG, PNG, or WebP photo, or load the prepared sink example.
2. Enter width, height, and depth; distinguish demo, entered, and user-confirmed measurements. Uploaded spaces require manual depth confirmation. Position the photo frame with handles or numeric fields.
3. Mark a full-height plumbing/equipment band and reserved access. Live side bays respond to boundary changes. Move shelf height and switch between see-through and finished views of the same geometry.
4. Choose open, concealed, or combination storage; save locally with the photo, reopen after reload, or download a text brief.

Uploaded spaces receive no sample dimensions or automatically identified obstacles. Replacing an existing photo clears its measurements and boundaries. Inch/centimeter display uses canonical millimeters to avoid round-trip drift. Editing a measurement clears its confirmation.

The original image is a separate, unchanged layer beneath SVG annotations. The prepared after-design image is a static visual reference, clearly separate from the live schematic. Uploaded images and saved concepts stay in browser IndexedDB; there is no photo analysis or server submission.

## Implementation

- `dist/index.html`, `dist/styles.css`, and `dist/app.js`: brand site, before/after image controls, navigation, FAQs, privacy and image dialogs.
- `dist/studio.js` and `dist/configurator.css`: responsive four-step dialog, local photo intake and persistence, accessible numeric alternatives, status messages, and brief export.
- `dist/planner-model.js`: measurement units, confirmation state, saved-record validation, and brief content.
- `dist/config-renderer.js`: shared 2D bay geometry and SVG drawing. Shelves, panels, and fronts remain outside one marked obstacle/access band. Bays below 120 mm are omitted by an explicit demonstration rule; fully blocked layouts cannot advance.

## Limits and pilot direction

This is a private concept prototype, not an operational checkout or manufacturing tool. The 2D preview does not infer dimensions, reconstruct pipe geometry, verify depth, assess mounting or loads, or produce fabrication-ready output. User confirmations are not professional verification. Storage-goal choices are recorded in the brief; they do not optimize geometry. Concealed and combination fronts cover the side bays while preserving the central service band.

A proposed first offering is guided configuration, followed by human fit review and a storage kit. Before orders open, define materials, clearances, removable/split panels and assembly, supports and loads, tolerances, pricing, lead times, delivery regions, returns, and fulfillment. Quotes, accounts, payments, and orders are not connected.

Asset provenance is in `ASSETS.md`. The editorial storage concept is AI-generated. The before photo and prepared after-design reference were supplied by the user.

## Validation

`node --test tests/*.test.mjs` passes 21 focused tests covering obstacle exclusion, independent bay widths, blocked layouts, shared view geometry, invalid dimensions, unit fidelity, confirmation resets, depth gating, safe saved records, and shelf defaults during typing. JavaScript syntax checks pass.

Verified in the in-app browser on desktop and a 390px mobile viewport: example and uploaded-photo flows; numeric and dragged annotations; measurement validation and focused errors; live boundary changes; invalid-layout blocking and reset recovery; layout and view selection; local photo/measurement persistence after reload; downloaded brief contents; and mobile controls without horizontal overflow. No browser console errors or warnings were observed.

## Hosting

`.openai/hosting.json` retains the existing private Sites project and deploys `dist`. Use the Sites skill for future publication and preserve the project's identity and current audience.
