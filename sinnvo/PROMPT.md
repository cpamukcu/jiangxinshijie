# SINNVO villa lift: photoreal 3D ad

Paste everything below the line into Claude Code, opened in this folder.

---

You are working in a project folder that contains a first-draft 3D model of a villa home elevator for my client SINNVO (星沃), a villa elevator brand. I run CP Export Marketing and I'm producing their ad. Your job is to turn this draft into a **photoreal 3D model and a 15-second premium product ad** that looks like a real filmed product launch (Apple / luxury-architecture style), not like AI or a game engine.

## What's already in this folder

- `elevator-model.js`: parametric three.js model (glass shaft, champagne aluminium frame, cabin with walnut back wall, LED ceiling, telescopic centre-opening glass doors, 2 floors at 3.1 m). Units are metres.
- `viewer.template.html` + `build.mjs`: interactive web viewer (`node build.mjs` writes `sinnvo-villa-lift.html`).
- `export-glb.mjs`: exports the model to `.glb` with a 20 s ride animation baked in.
- `sinnvo-villa-lift-champagne.glb`: current export.
- `shots/sheet.png`: screenshots of the current draft. This is the "before". It looks clean but obviously CG: flat materials, perfect sharp edges, no real light, empty grey void.

## Reference material (read this first)

My real SINNVO brand assets and product photos are in **`~/Desktop/sinvoo`**. Before building anything:

1. List and look at every image in that folder (and any PDFs/brochures).
2. Write `docs/reference-notes.md` covering:
   - which models/variants appear
   - shaft type (glass/steel/frameless)
   - frame profile shape and colour
   - door type (swing, telescopic or centre-opening)
   - cabin interior (wall panels, ceiling light pattern, floor, handrail, control panel)
   - landing call buttons
   - logo placement
   - any dimensions, capacity or speed printed in the materials
3. Pick the one model that photographs best for an ad, and tell me which one and why.

Match the real product. Where a detail isn't visible in the references, use realistic villa-lift values and list each assumption in the notes. Never invent specs that would appear on screen (capacity, speed, certifications). Only use numbers that come from the brochures.

## Approach

Use **Blender (Cycles, path-traced)** for the photoreal model and the ad. It's the only reliable way to get real glass, real reflections and real soft shadows.

- Install it on my Mac if needed: `brew install --cask blender`.
- Drive Blender entirely with Python scripts run headless: `blender -b -P scripts/<file>.py`.
- Keep every step as a script in `scripts/` so the whole scene can be rebuilt from scratch with one command.
- Use the Metal GPU backend for Cycles (Apple Silicon).

Keep the three.js viewer as the interactive web version. At the end, export the improved model to `.glb` and update the viewer to use it.

## Realism checklist

These are the things that separate "AI-looking" from "filmed". Do all of them.

**Geometry**
- Bevel every edge: 1–3 mm on aluminium, 0.5–1 mm on glass edges. Real objects never have perfectly sharp corners; this is the single biggest tell.
- Build real aluminium extrusion profiles (cross-section shapes swept along paths), not boxes: rounded corners, a shadow-gap groove, and a separate rubber gasket strip where glass meets frame.
- Give the glass real thickness (10 mm laminated) with a visible edge.
- Add the small details:
  - door sill/threshold track
  - 2–3 mm gaps between door panels
  - landing call button plate on the frame
  - cabin control panel with recessed round buttons and a floor display
  - LED ceiling panel with a diffuser and a thin trim
  - handrail with proper wall brackets
  - kick plates, screws/cover caps where visible in the references
  - the floor recess (pit) the shaft sits in
- Use real proportions from the references. Typical villa cabin: about 1000 × 1200 mm, cabin height about 2100–2200 mm, door clear opening about 750–800 mm, headroom unit on top.

**Materials (Principled BSDF, physically based)**
- *Glass:* transmission 1.0, IOR 1.52, roughness about 0.0–0.02, a very slight green tint that is stronger on the edges (like real float glass), plus thin-film/fingerprint smudge only at very low strength.
- *Aluminium:* metallic 1.0, colour matched to the reference (champagne / graphite / silver variants), anisotropic brushed finish along the extrusion direction, roughness 0.25–0.35, and subtle roughness variation from a noise texture so it isn't perfectly uniform.
- *Wood panels:* a real CC0 wood texture set (ambientCG or Poly Haven: colour, roughness, normal), with grain running vertically and a satin clear-coat.
- *Floor:* marble or stone texture set with a slight clear-coat reflection.
- *LEDs:* emission about 3000–3500 K warm white, at realistic intensity, not blown out.
- Download CC0 textures/HDRIs with curl into `assets/` and record the source URL and licence for each in `assets/CREDITS.md`.

**Environment and lighting**
- Place the lift in a believable **modern villa interior**:
  - double-height space
  - light stone or oak floor
  - a plaster wall behind
  - the upper-floor slab with a glass balustrade (the lift should visibly connect two floors)
  - a staircase edge or large window to one side
  - one or two restrained props (large plant, low sofa edge, artwork) kept out of focus
- Keep the environment calm and neutral so the lift is the hero. Use simple modelled geometry and textures, not busy clutter.
- Lighting:
  - a CC0 interior HDRI for reflections and fill
  - a large soft area light acting as window daylight (about 5000–5600 K), coming from the side
  - the warm cabin LEDs as a contrast
- Real exposure: use the Filmic/AgX view transform, no crushed blacks, no blown highlights.
- Ambient occlusion comes from path tracing. Enable enough bounces for glass (transmission bounces ≥ 12) so the glass doesn't render black.

**Camera (this makes it feel filmed)**
- Real focal lengths only: 35 mm for wide, 50 mm for medium, 85–100 mm for detail shots. Sensor 36 mm.
- Shallow but realistic depth of field (f/2.8–f/4) on detail shots.
- Slow, deliberate moves: dolly, slide, orbit and crane, with eased starts and stops. Nothing whips or spins.
- Add very subtle camera shake (a noise modifier on rotation, tiny amplitude) so it feels hand-operated, not robotic.
- Motion blur on.

**Post (render then grade)**
- Slight film grain, gentle vignette, very subtle chromatic aberration at the frame edges, light bloom/glare only on the LEDs.
- Grade warm-neutral and premium: soft contrast, clean whites, no oversaturation.

## The ad: 15 seconds, shot list

Render at **24 fps**. Primary output is **1080×1920 (9:16)** for Instagram, Douyin and TikTok. Also render **1920×1080 (16:9)** by re-framing the same cameras, not cropping.

| Time | Shot | Notes |
|---|---|---|
| 0.0–2.5 s | Macro detail | 100 mm, f/2.8: slow slide along the champagne frame edge and glass, catching a light glint. Hook: no logo yet, just craft. |
| 2.5–5.0 s | Doors open | 50 mm, front-on at eye height (1.5 m) on the ground floor. Telescopic glass doors glide open; warm cabin light spills onto the floor. |
| 5.0–7.5 s | Interior | 35 mm inside the cabin, slow push towards the control panel; a finger-free shot of the 2F button lighting up. |
| 7.5–11.0 s | The ride | 35 mm wide exterior, slow crane up as the cabin rises from 1F to 2F through the slab. This is the money shot: shows the whole lift in the villa. |
| 11.0–13.0 s | Arrival | 50 mm on the upper landing; doors open onto the upper floor. |
| 13.0–15.0 s | Logo end card | Pull back to a calm wide frame (or cut to a clean background) with the real SINNVO logo from `~/Desktop/sinvoo` and one line of text. |

Animation timing must be physically plausible:
- doors about 2.5 s to open
- the cabin accelerates and decelerates smoothly
- realistic villa-lift speed (about 0.3–0.4 m/s); use editing (cuts) to compress time, rather than making the lift fly

## Edit and captions

- Do the final edit in **Remotion** (or HyperFrames if it's already set up on this machine): assemble the rendered shots, add the logo end card and captions, export MP4 (H.264, high bitrate).
- Captions: minimal, thin modern sans-serif, generous spacing, fading in and out. Start with:
  - "Your home." → "One more floor." → [SINNVO logo] "Villa lifts"
  - Also produce a Chinese version: "你的家。" → "多一层自在。" → [星沃 SINNVO logo]
- Keep caption text in one config file so I can change copy and re-render quickly.
- Leave a music track slot. I'll add licensed music myself. Add subtle sound-design placeholders (soft whoosh on the cut into the ride, a gentle door-glide sound) only if you can source them CC0, with credits.

## How to work: checkpoints

Work in phases and **stop for my approval** after each one:

1. **Reference notes** + chosen model.
2. **Geometry**: render 3 clay renders (plain white material, simple light) from front, 3/4 and detail angles. I approve the shape before any materials.
3. **Look development**: 3 full-quality stills from the hero angles. Put each one side by side with the closest reference photo in a single comparison image, and tell me honestly what still looks CG.
4. **Animation**: low-res fast previews (EEVEE or low-sample Cycles) of every shot, assembled into one rough cut.
5. **Final**: full-quality render, edit, both aspect ratios, EN + ZH versions.

At every phase, **look at your own renders** (open the PNGs) before showing me. Fix obvious problems first: black glass, z-fighting, intersecting meshes, floating objects, noise, wrong scale.

Use denoising (OpenImageDenoise) and adaptive sampling to keep render times reasonable on a MacBook. Tell me the estimated full render time before starting phase 5.

## Deliverables

- `scripts/`: Blender build, animation and render scripts (the scene must rebuild from scratch with one command)
- `renders/stills/`: 4–6 hero stills (4K) usable as website and social images
- `renders/ad/sinnvo-ad-15s-9x16-en.mp4`, `…-9x16-zh.mp4`, `…-16x9-en.mp4`, `…-16x9-zh.mp4`
- `sinnvo-villa-lift.glb`: the improved model (with materials baked where needed) and the web viewer updated to use it
- `docs/reference-notes.md` and `assets/CREDITS.md`
- a short `README.md`: how to re-render, change captions, and swap the frame finish

Start with phase 1 now.
