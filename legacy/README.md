# The original script

`vectorize_emblems.py` is the script that started this project. It cut up one specific
sheet of fourteen emblems at coordinates written straight into the code, and wrote out
one SVG per emblem under names that were just as hard-coded.

It is kept for the record. The application does not use it and does not need to: its
logic was taken over and corrected in `src/core/`.

What changed along the way:

| Original script | The project |
| --- | --- |
| Hard-coded paths, bands and names | Any image, dropped in by the user |
| OpenCV, NumPy, SciPy | No processing dependency at all |
| OpenCV contours, one point in nine | Contour following on the pixel corner lattice, then Ramer-Douglas-Peucker |
| Uniform Catmull-Rom | Centripetal Catmull-Rom, which does not overshoot on irregular spacing |
| Fixed threshold of 70 after blur | Contour placed halfway between the threshold and the real intensity of the emblem |
| No verification | Fidelity tests, and diagnostics shown to the user |

To vectorize a batch of files from the command line, the way to do it now is:

```bash
npm run vectorize -- image.png output.svg --threshold=40
```
