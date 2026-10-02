# Student photo studio

Open `/studio`, or choose **Photo studio** in the `/3D` gallery.

The editor has **Students**, **Pose**, and **Scene** tabs. Select a student from the cast list or canvas to open their Pose tab. The scene remains visible while the editor scrolls on desktop and mobile. Students have a remove button beside their names, and the selected student's remove button also appears at the top of Pose.

Students and Scene use image-and-name tiles so you can see each choice before selecting it. Search filters the choices without changing your selection. **Show more** reveals another 12 choices; the tile area scrolls independently. Click or use Tab and Enter/Space to choose a tile. Selected tiles are highlighted. Student selection is followed by **Add student**, while choosing a background applies it immediately.

Use **Move students** to drag characters, or use the Left/Up/Down/Right buttons for precise placement. **Move camera** lets you orbit by dragging anywhere on the scene, including over a character. Pinch with two fingers to zoom. Tab navigation supports keyboard arrows, Home, and End.

- Add up to 12 students, including multiple instances of the same student.
- Drag a student to place it. Drag empty space to orbit, scroll to zoom, and right-drag to pan.
- Select a student in the cast list to change its rotation, size, or animation. Advanced placement exposes X/Y/Z.
- In **Pose**, use **Tilt forward**, **Tilt backward**, or the **Tilt** slider to change only the selected student's angle. **Reset tilt** returns them upright. Rotation turns them left/right, and tilt leans them forward/backward; their halo follows them. These independent angles are saved with the scene. **Move camera** still changes the view of everyone together.
- **Place body in front of** chooses the exact student body or halo to appear over. **Bring to front** and **Send to back** move the body layer to either end of the stack. These never change placement or Z, and the order remains fixed as the camera moves.
- **Place halo in front of**, **Halo to front**, and **Halo to back** control the selected student's halo independently. For example, send Kei's body to back and bring her halo to front to keep Aris over Kei while Kei's halo appears over Aris. Expand **Layer order · front to back** to inspect the stack. Halos are identified through exported source halo bindings; controls are disabled when an asset has no separately identified halo.
- **Pause pose** freezes the selected student's animation. Scrubbing **Pose timeline** also pauses it. Playback is independent for each student.
- Search and select a downloaded BAAD background. Backgrounds fill the canvas with centered cropping.
- **Export PNG** captures only the canvas, including the background and characters. It waits for all models and the background to finish loading.
- **Save scene** stores one scene in this browser. **Open saved scene** restores placement, independent body/halo ordering, camera, background, animation, time, and pause state. Older saves receive default layers, with each student's halo beside its body and later-added students in front. It works after a reload; browser storage is not account synchronization.

## Assets

Students use the existing public, published chibi catalog and the existing material/animation rendering path. The studio does not extract, modify, or republish models.

Backgrounds are read at runtime from:

`<CHIBI_SOURCE_DIR>/MediaResources/GameData/UIs/03_Scenario/01_Background`

`CHIBI_SOURCE_DIR` defaults to `Development_data/BAAD`. JPEG, PNG, and WebP files are included recursively, including `CS`. The BAAD download must include these scenario images; a missing folder is reported in the background panel. The studio does not download source assets on startup.

The public image handler is `/api/studio/background?file=<relative filename>`. It restricts reads to background images under that directory.

## Verification

```powershell
npm run test:studio
npx tsc --noEmit
$env:PUPPETEER_EXECUTABLE_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
npm run test:studio:browser
```

Run the browser check against a running local app with imported public models and BAAD backgrounds. `STUDIO_TEST_ORIGIN` defaults to `http://127.0.0.1:3000`. The test uses Airi (23000), Akane (13000), and Haruna (10002) for scene controls, then Kei (10135) with Aris (10015), Aris (Armed) (10134), and Aris (Maid) (10066) for independent body/halo overlap. It captures desktop/mobile screenshots and a downloaded PNG, and verifies scene restoration across reload. Evidence is saved under `Development_data/studio-test/`.
