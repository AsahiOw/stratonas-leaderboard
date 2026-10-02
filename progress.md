# Photo studio handoff — 2026-10-02

Objective: separate scene/photo studio route, downloaded BAAD scenario backgrounds, character animation playback/pause/scrubbing, and tested working feature.

Implemented `/studio` with multiple independent students, drag placement, size/rotation/advanced coordinates, camera presets/orbit/pan/zoom, background search, PNG export, and browser scene save/load. `/3D` links to the studio. Reuses `ChibiViewer` through an optional shared Three.js host, preserving the existing profile/material/arrangement rendering path. No data migrations or asset/import pipeline changes.

Source background folder currently contains 2146 supported images. It is served from the configured BAAD source root; no copies or startup extraction.

Browser validation at `http://127.0.0.1:3000` verified three students (Airi/Akane/Haruna), independent playback/pause/scrubbing, animation selection, frozen rendered pixels, drag/rotation/size, BAAD background, camera, PNG download, exact save/reload restoration, control hiding, mobile layout, removal, and the existing gallery, without runtime errors. Evidence: `Development_data/studio-test/result.json`, desktop/mobile screenshots, and `stratonas-studio.png`. TypeScript and targeted ESLint passed. Scene/background and related material/arrangement/animation/halo checks: 52 passed, 2 existing skips.

Pre-existing regression mismatch: `chibi-viewer-interaction.test.ts` expects gallery rotation `Math.PI / 30`; the existing viewer uses `Math.PI / 5`. The studio preserves that existing speed. The gesture harness was updated to provide the new optional `studio` variable; the other five interaction tests pass.

Existing dirty changes in import/worker/Admin/database/configuration files were preserved. Feature docs and repeatable test commands are in `docs/photo-studio.md`.

## Depth controls follow-up

Added **Bring to front** and **Send to back** above rotation in Student & pose. They move only the selected actor along the current camera direction, using visible animated bounds to clear the other actors. Source material depth rules remain intact; the saved scene already stores the resulting placement. If moving in front would cross the camera, the UI asks the user to zoom out.

Verified with Kei (10135) and all three Aris variants (10015, 10134, 10066): Kei renders in front after the button, Aris placements are unchanged, sending back works, reversing the camera reverses the movement direction, and depth placement survives reload. Full studio browser check passed with seven students and no runtime errors; TypeScript, targeted ESLint, and studio unit tests passed. Before/after images: `Development_data/studio-test/kei-behind.png` and `kei-front.png`. Browser tests now wait for enabled controls and actual gallery readiness rather than network idleness or a particular default animation label.

## Desktop/mobile UI improvement

Replaced the long stacked inspector with keyboard-accessible Students/Pose/Scene tabs and an independently scrolling editor beside/below a persistent preview. Added visible cast-row removal buttons and selected-student name/removal at the top of Pose, portraits, movement nudges, explicit student/camera interaction modes, highlighted PNG export, empty/search guidance, readable animation labels, and larger touch targets. Two-finger input releases student drag capture so camera gestures work. Import/storage formats and model rendering remain unchanged.

Full browser check passed with seven students, including tab navigation, fixed preview during mobile editing, position nudges, two-finger pinch zoom, camera mode preserving character placement, both removal controls, and all earlier pose/depth/save/export/gallery checks. TypeScript, targeted ESLint, and three studio unit tests passed. Additional visual/layout checks passed at 320px phone, 768px tablet, and 1366px desktop widths, including long student names and 44px button targets. Screenshots are in `Development_data/studio-test/`, including `students-panel.png` and `layout-320.png`.

## Independent body and halo layers

Superseded physical depth buttons with explicit back-to-front compositing. Pose now offers **Place body in front of** and **Place halo in front of**, plus independent front/back buttons and a readable layer stack. Ordering changes no transforms and remains fixed when the camera moves. Canvas picking follows the displayed layer priority. PNG export uses the same compositor as the live preview.

Halo meshes are identified through exact exported `haloFollow` node associations and descendants after material setup, preserving source animation and rendering inside each part. Aris (10015), Aris (Armed) (10134), Aris (Maid) (10066), and Kei (10135) all have explicit halo roots. Assets without identified halo meshes retain the whole asset in their body layer and disable halo controls. No importer, GLB, or live database writes.

Saved scenes include independent body/halo layer ordering; legacy scenes remain readable and receive default layers. TypeScript, targeted ESLint, and all five studio unit checks passed. The full seven-student browser suite passed without runtime errors, including unchanged positions, body overlap, Kei body behind Aris with Kei halo above Aris, specific-layer choices, mobile layer controls, camera reversal, saved-layer reload, and byte-for-byte PNG export matching the composited canvas. Visual evidence: `Development_data/studio-test/kei-halo-front.png` and `mobile-layers.png`.

## Selection image previews

Added a 72px student image beside the Student selector before adding, and a compact 16:9 uncropped background preview in Scene. Plain studio uses its matching background color and label. Student search, selector, preview, and Add student share the same filtered choice; empty search results hide the preview and disable selection. Native selects retain mobile/keyboard behavior.

TypeScript and targeted ESLint passed. Targeted browser validation verified decoded student and background images, changing selections, student search/empty results, returning to Plain studio, 320/768/1366px layouts and touch-sized selectors, without runtime errors. Evidence: `Development_data/studio-test/student-selection-preview.png` and `background-preview-320.png` (also 768/1366).

## Browse images before selecting

Corrected the preview interaction: replaced Student and Background name-only selects with image-and-name tile choices. Every visible unselected choice has an image. Search filters without applying a student/background; click or keyboard activation selects. Tiles show selection, the browse region scrolls, and Show more reveals 12 additional choices at a time to avoid loading the entire background catalog. Removed the earlier selected-only image displays.

TypeScript and targeted lint passed. The full studio browser suite passed after updating picker interactions. Additional browser checks verified decoded images before selection, search preserving selection, Show more (12 to 24), Space-key selection, background click, empty results, and 320/768/1366px layouts without runtime errors. Evidence: `student-thumbnail-choices.png`, `background-thumbnail-choices.png`, and `thumbnail-choices-320.png` under `Development_data/studio-test/`.

Student tile image containers now use a square aspect ratio. A panel container query uses three columns when its content is at least 310px wide, retaining two on narrow phones. Background thumbnails keep their landscape ratio. Browser measurements verified square images and three columns at 1366/768/390px viewport widths, two at 320px, with no horizontal overflow. Screenshots: `Development_data/studio-test/square-choices-<width>.png`.

Student thumbnails now use `object-fit: cover` to fill the square rather than letterbox. Verified the computed cover style and square/responsive grid dimensions at 1366/768/390/320px, and targeted lint passed. Separate per-student camera behavior is awaiting clarification between independently changing a student's viewing angle in the composed scene and switching among saved camera views.

## Independent student viewing angles

The user clarified that Aris should tilt forward while Kei tilts backward in the same scene. Added independent **Tilt** sliders and **Tilt forward / Tilt backward / Reset tilt** buttons in Pose. Existing Rotation turns left/right; tilt pitches each actor locally using YXZ orientation, including their halo, without moving the shared camera or other actors. Saved scenes persist optional tilt; old saves remain upright.

TypeScript, targeted lint, and all six studio unit checks passed. Full seven-student browser suite passed with independent Aris +20° / Kei -20° tilts, reset, changed rendered pixels, mobile controls/no overflow, unchanged camera and placements, and persistence across reload. Camera comparison allows tiny OrbitControls floating-point drift. Screenshots: `Development_data/studio-test/independent-student-tilts.png` and `mobile-student-tilt.png`.

## Background picker fills available panel space

Scene now uses the full panel height. The background tile grid grows into the remaining space above Show more, catalog count, and camera presets, replacing the 280px cap. ResizeObserver increases the initial loaded tile count to cover visible rows. Short mobile panels retain scrolling to reach all controls; the student picker keeps its existing height.

TypeScript and targeted lint passed. Browser checks measured a 765px gallery in a 1300px-tall desktop window (21 initial choices, only 14px below the final camera controls), verified Show more, 768/390/320px no-overflow layouts, and correct tab hiding without runtime errors. Evidence: `Development_data/studio-test/background-full-height.png` and width-specific screenshots. Test waits for hydrated canvas before clicking tabs.
