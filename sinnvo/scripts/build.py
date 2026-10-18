"""One-command scene build (and optional renders).

    blender -b -P scripts/build.py -- --mode clay --render clay
    python scripts/build.py --mode clay --render clay      # bpy as a Python module

Options:
    --mode clay|full        material set
    --finish champagne|graphite|silver
    --render none|clay|stills
    --size WxH              still resolution (default 1200x1500)
    --samples N
    --save path.blend       also save the built scene
"""
import argparse
import os
import sys
import time

import bpy  # noqa: E402,F401  (first: as a Python module, bpy must load before bmesh/mathutils)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config as C  # noqa: E402
import lift  # noqa: E402
import materials  # noqa: E402
import scene  # noqa: E402
import villa  # noqa: E402


def parse():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", default="clay", choices=("clay", "full"))
    ap.add_argument("--finish", default=C.DEFAULT_FINISH, choices=tuple(C.FINISHES))
    ap.add_argument("--render", default="none", choices=("none", "clay", "stills"))
    ap.add_argument("--only", default="", help="comma-separated still names")
    ap.add_argument("--size", default="1200x1500")
    ap.add_argument("--samples", type=int, default=128)
    ap.add_argument("--save", default="")
    return ap.parse_args(argv)


def build_scene(mode, finish):
    scene.reset()
    materials.build(mode, finish)
    rig = lift.build(finish)
    villa.build()
    scene.world()
    scene.daylight_rig()
    for name, cam in scene.STILLS.items():
        scene.camera(f"CAM_{name}", **cam)
    return rig


def main():
    a = parse()
    rig = build_scene(a.mode, a.finish)
    # still pose: cabin parked at 1F, 1F landing + cabin doors open
    for e, cx, ox in rig["landing"][0] + rig["cabin_doors"]:
        e.location.x = ox
    if a.save:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.abspath(a.save))
    if a.render == "none":
        return
    w, h = (int(v) for v in a.size.split("x"))
    scene.render_settings(w, h, samples=a.samples)
    out_dir = os.path.join(C.RENDERS, "clay" if a.render == "clay" else "lookdev")
    os.makedirs(out_dir, exist_ok=True)
    names = [n for n in scene.STILLS if not a.only or n in a.only.split(",")]
    for name in names:
        t = time.time()
        scene.render_still(f"CAM_{name}", os.path.join(out_dir, f"{name}.png"))
        print(f"[render] {name}: {time.time() - t:.0f}s", flush=True)


if __name__ == "__main__":
    main()
