# Photo-assisted measurement module

The module calculates width and height from a user-marked rectangle and a known reference length. It does not use AI, infer absolute scale, correct perspective, or estimate depth. The photo, reference, and target must describe the same flat plane in a straight-on image.

## Integration

Insert `photo-measure-dialog.html` into the page body, include `dist/photo-measure.css` after the main stylesheet, and load `dist/photo-measure.js` with `defer` before `app.js`. Exclude `#photo-measure-dialog` from the main script's generic dialog handlers: the module manages its own close events, focus restoration, and scroll locking while leaving the underlying planner open.

```js
window.SpaceMaxPhotoMeasure.open({
  unit: 'in', // 'in' or 'cm'
  hasMeasurements: true, // shows the width/height replacement notice
  onApply({width, height, unit, referenceLength}) {
    // Apply these estimates to the current planner context.
    // Preserve/convert the existing manual depth separately when units change.
  }
});
```

Every open starts a fresh session; no previous project's photo or marks are reused. Applying returns the same width and height shown in the review, rounded to at most two decimal places. Reference length is preserved. Existing planner values remain untouched until the apply callback runs.

## Interaction and privacy

- Accepts JPEG, PNG, and WebP files up to 15 MiB. Other types, including HEIC/HEIF, show a clear message. The camera input uses `capture="environment"`; browser/device support determines whether it offers the camera.
- The four numbered marks are the reference endpoints and the opposite target corners. Click/tap to place points, select any point to adjust it, or enter X/Y percentages. With the photo focused, arrow keys move the crosshair by 1%; Shift + arrow moves by 0.1%; Enter/Space places the point.
- Normalized marks use oriented natural image dimensions and the image's actual displayed bounds, so resize and surrounding padding do not change the calculation.
- Changing units converts the known reference while retaining its original value for a lossless round trip. A new photo clears marks and reference length. Reset marks keeps the reference length.
- All processing is local. No uploads, network requests, photo persistence, or localStorage calls occur in this module. Object URLs are revoked on photo replacement and dialog close; stale asynchronous loads cannot update another session.
- Native dialog Escape/cancel and the close button clear the photo, restore the prior body overflow style, and return focus to the opener. The module does not remove the main planner's scroll-lock class.

## Calculation checks

`calculateEstimate` is exposed on `window.SpaceMaxPhotoMeasure` and exported through CommonJS for Node checks:

```js
const {calculateEstimate} = require('./dist/photo-measure.js');
calculateEstimate({
  reference: [{x: 0, y: 0}, {x: 200, y: 0}],
  target: [{x: 25, y: 40}, {x: 525, y: 340}],
  referenceLength: 10
}); // {width: 25, height: 15, referenceLength: 10}
```

Coordinates are pixels in the original, oriented image. Euclidean reference distance supplies one scale; rectangle width/height use horizontal/vertical differences. Reversed endpoints/corners work. Missing/nonfinite points, nonpositive reference length, overlapping endpoints, references shorter than 10 image pixels, and zero-width/height targets are rejected. The UI also rejects estimates that round to zero.

Validation completed: `node --check` plus ten calculation checks covering known scaling, reversed points, inch/centimeter equivalence, diagonal reference length, zero/nonfinite reference length, overlapping/tiny references, zero-width rectangles, and invalid points. Browser upload, nested-dialog, responsive layout, and keyboard checks are handled in the parent task.
