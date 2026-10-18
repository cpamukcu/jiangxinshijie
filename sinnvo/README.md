# SINNVO villa lift: photoreal 3D model and 15 s ad

Brief: [`PROMPT.md`](PROMPT.md). Reference notes and assumptions:
[`docs/reference-notes.md`](docs/reference-notes.md).

## Status

| Phase | State |
|---|---|
| 1. Reference notes + chosen model | waiting on the SINNVO photos / brochures |
| 2. Geometry (clay renders) | first pass built from the draft + assumed villa-lift sizes |
| 3. Look development | not started |
| 4. Animation rough cut | not started |
| 5. Final render, edit, EN/ZH, 9:16 + 16:9 | not started |

## Layout

```
scripts/        Blender build + render scripts (bpy); the whole scene rebuilds from these
  build.py      entry point: builds the scene and optionally renders stills
  config.py     every dimension, finish and speed in one place
  lift.py       the lift: extruded frame, glass + gaskets, doors, cabin
  villa.py      the villa interior around it
  materials.py  clay and full material sets
  scene.py      render settings, lights, still cameras
docs/           reference notes
assets/         CC0 textures/HDRIs (downloaded, not committed) + CREDITS.md
renders/        stills/ and ad/ are committed; clay/, lookdev/, frames/, preview/ are not
*.js, *.html    three.js web viewer (draft; updated to the new .glb in phase 5)
```

## Setup (Mac)

```sh
brew install --cask blender          # Blender 4.5 LTS or newer
```

Cycles uses the Metal GPU automatically when it's available, otherwise CPU.

## Rebuild and render

```sh
# clay shape check: front, 3/4 and detail stills into renders/clay/
blender -b -P scripts/build.py -- --mode clay --render clay

# options
#   --finish champagne|graphite|silver   frame finish
#   --size 1200x1500 --samples 128      resolution and samples
#   --only front,detail                 render a subset
#   --save scene.blend                  also save the built .blend to open in Blender
```

The scripts also run with Blender as a Python module (`pip install bpy==4.5.*`
on Python 3.11): `python scripts/build.py -- --mode clay --render clay`.

## Swap the frame finish

Pass `--finish graphite` (or `silver`). The finish colours and roughness are in
`FINISHES` in `scripts/config.py`; add a new entry there to create another.
