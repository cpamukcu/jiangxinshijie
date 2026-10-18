"""Shared dimensions, finishes and paths for the SINNVO villa-lift scene.

Units are metres (Blender default). Every value marked ASSUMPTION is a realistic
villa-lift default, not taken from SINNVO material yet; docs/reference-notes.md
lists them and they get corrected once the reference photos are in.
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
RENDERS = os.path.join(ROOT, "renders")

# ── Lift ────────────────────────────────────────────────────────────────
FLOOR_H = 3.10          # storey height, from the draft model
FLOORS = 2
PIT = 0.15              # ASSUMPTION: shallow villa pit, shaft base sits in a floor recess

# Shaft (outside of frame). ASSUMPTION: sized round a 1000 x 1200 cabin.
SHAFT_W = 1.50
SHAFT_D = 1.70           # leaves ~180 mm behind the cabin for guide rails and car frame
OVERHEAD = 2.75         # ASSUMPTION: top landing floor -> underside of head unit
HEAD_H = 0.36           # head unit (machine/cover box) on top of the shaft

# Frame extrusion profiles (mm-scale details live in geo.py)
POST = 0.080            # corner post section, square
BAND_H = 0.080          # horizontal frame bands
BAND_SLAB_H = 0.24      # band hiding the floor slab line between storeys

# Glass
GLASS_T = 0.010         # 10 mm laminated

# Doors: telescopic centre-opening, 2 panels per side.
DOOR_CLEAR = 0.80       # ASSUMPTION: clear opening
DOOR_H = 2.10           # ASSUMPTION: clear height
DOOR_GAP = 0.003        # gap between door panels
DOOR_OPEN_S = 2.5       # seconds to open

# Cabin (inside dimensions). ASSUMPTION from typical villa lifts.
CABIN_W = 1.00
CABIN_D = 1.20
CABIN_H = 2.15

# Ride
RIDE_SPEED = 0.35       # m/s, typical villa lift (0.3-0.4)
RIDE_ACCEL = 0.25       # m/s^2, gentle start/stop

# ── Frame finishes (base colour in linear sRGB approx., roughness) ─────
FINISHES = {
    "champagne": {"color": (0.62, 0.50, 0.33), "rough": 0.30},
    "graphite": {"color": (0.075, 0.075, 0.08), "rough": 0.34},
    "silver": {"color": (0.80, 0.80, 0.80), "rough": 0.26},
}
DEFAULT_FINISH = "champagne"

# ── Villa room ─────────────────────────────────────────────────────────
ROOM_W = 9.0            # x
ROOM_D = 8.0            # y (depth, lift sits against the back wall)
ROOM_H = FLOOR_H * FLOORS + 0.35  # double-height void, ceiling above the head unit
