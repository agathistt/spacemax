# Customization ideas gallery

Standalone route: `/customizations.html`.

## Scope and provenance

This page presents two design examples, not verified customer stories or completed installations. It does not invent customer names, quotes, endorsements, performance statistics, pricing, or manufacturing availability.

1. **Commercial restroom** — supplied starting-space photograph (`bathroom-step-1-original.png`, 1254 × 1254) paired with an edited cabinet design concept (`bathroom-step-4-cabinet-only.png`, 1254 × 1254). Persistent case status: “Supplied space · Edited design concept.” The proposed shelving and pull-out trays are descriptions of the concept image, not confirmed product specifications.
2. **Residential bathroom** — existing generated before/after illustrations (`under-sink-before.jpg` and `under-sink-concept.jpg`, both 1448 × 1086). Persistent case status: “Illustrative design concept.”

All images retain their full aspect ratio within the comparison and enlarged viewer. No new images were generated for this page.

## Interactions

- All spaces / Residential / Commercial filters with visible counts and `aria-pressed` state.
- Separate Before / After concept controls for each case. Both begin on the concept view.
- Native modal image viewer with synchronized before/after controls, current-image descriptions, and persistent source captions. Native modal behavior contains focus; closing restores focus to the opening button. Escape, the close button, or clicking the backdrop closes the viewer.
- Mobile navigation with expanded-state labels, Escape dismissal, and outside-click dismissal.
- Planner links go to `/#planner`; the home page owns that planner integration.

The page imports the existing `styles.css` brand foundation, plus its own `customizations.css` and `customizations.js`. It does not load or alter home-page JavaScript.

## Validation

- Inspected all four source images and confirmed their dimensions before implementation.
- JavaScript syntax, local asset references, case/filter behavior, and viewer behavior checked during implementation.
- Main task performs the final browser layout and navigation checks.
