# SpaceMax

A consumer-facing website for SpaceMax custom-fit organization. The confirmed range includes cable organization, under-sink storage, drawer and cabinet organization, custom toilet stools, and organization around the toilet. Four visual product groups explain the problem, solution, and everyday benefit. Toilet stools and surrounding storage have separate planning choices.

## Preview

Run `python3 -m http.server 4173 --bind 127.0.0.1 --directory dist` from this directory.

No build step or JavaScript dependencies are required. Source and deployment assets live in `dist/`.

## Working interactions

- Responsive navigation and practical product FAQ accordions.
- Interactive illustrated before/after comparison.
- Product-specific measuring prompts, optional dimensions, inch/cm conversion, finish inspiration, and notes.
- Separate browser-local details for each solution, with compatible migration from the earlier under-sink preview.
- Browser-local saving, plain-text brief download, and an option to erase saved details.
- Native dialogs with keyboard focus, Escape dismissal, and reduced-motion support.

## Business details to finalize

SpaceMax is a working brand name. The imagery and product illustrations are concepts. Product specifications, available materials, pricing, production and installation details, checkout, and lead delivery are not configured. The planner makes a personal downloadable brief and clearly states that it does not submit a request or place an order.

The source does not load analytics or a payment service. Fonts are loaded from Google Fonts with system fallbacks.

## Generated image

The under-sink image is AI-generated concept imagery, created with the built-in Imagegen tool. Its prompt and asset details are recorded in `ASSETS.md`. The matching before image is documented in `BEFORE-ASSET.md`.

Additional illustrative product images and exact generation prompts are documented in `CABLE-ASSET.md`, `DRAWER-ASSET.md`, and `TOILET-ASSET.md`. These are product concepts, not confirmed manufactured SKUs.
