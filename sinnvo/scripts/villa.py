"""Calm modern villa interior around the lift: double-height void, stone floor
with the pit recess, plaster back wall, upper-floor slab with a glass
balustrade, a tall window for side daylight, a staircase edge and a few
restrained props. Simple modelled geometry so the lift stays the hero."""
import math

import bmesh
import bpy

import config as C
from geo import MM, box, collection, cylinder, glass_pane, mat

W, D, H = C.SHAFT_W, C.SHAFT_D, C.FLOOR_H
GAP = 0.004                      # floor finishes stop a hair short of the shaft frame
X0, X1 = -4.5, 4.5               # room width
Y_BACK = D / 2 + 0.55            # plaster wall behind the lift
Y_FRONT = -7.5
SLAB_T = 0.25
Y_SLAB_EDGE = -2.40              # open edge of the upper floor
X_LANDING_L = -1.20              # left edge of the upper landing in front of the lift


def build():
    col = collection("Villa")
    sx, sy = W / 2 + GAP, D / 2 + GAP

    # Ground floor finish with a hole for the shaft, and the pit below
    t = 0.030
    box("Floor_Front", (X1 - X0, -sy - Y_FRONT, t), ((X0 + X1) / 2, (Y_FRONT - sy) / 2, -t / 2), "floor", bevel=1 * MM, col=col)
    box("Floor_Back", (X1 - X0, Y_BACK - sy, t), ((X0 + X1) / 2, (Y_BACK + sy) / 2, -t / 2), "floor", bevel=1 * MM, col=col)
    box("Floor_Left", (-sx - X0, 2 * sy, t), ((X0 - sx) / 2, 0, -t / 2), "floor", bevel=1 * MM, col=col)
    box("Floor_Right", (X1 - sx, 2 * sy, t), ((X1 + sx) / 2, 0, -t / 2), "floor", bevel=1 * MM, col=col)
    box("Pit", (2 * sx, 2 * sy, 0.05), (0, 0, -C.PIT - 0.025), "concrete", bevel=1 * MM, col=col)
    for i, (lx, ly, x, y) in enumerate(((2 * sx, 0.02, 0, -sy - 0.01), (2 * sx, 0.02, 0, sy + 0.01), (0.02, 2 * sy, -sx - 0.01, 0), (0.02, 2 * sy, sx + 0.01, 0))):
        box(f"Pit_Wall_{i}", (lx, ly, C.PIT + t), (x, y, -(C.PIT + t) / 2), "concrete", bevel=0.5 * MM, col=col)

    # Walls: plaster behind the lift, side walls, ceiling
    box("Wall_Back", (X1 - X0, 0.20, C.ROOM_H), ((X0 + X1) / 2, Y_BACK + 0.10, C.ROOM_H / 2), "plaster", bevel=2 * MM, col=col)
    box("Wall_Right", (0.20, Y_BACK - Y_FRONT, C.ROOM_H), (X1 + 0.10, (Y_BACK + Y_FRONT) / 2, C.ROOM_H / 2), "plaster", bevel=2 * MM, col=col)
    box("Wall_Front", (X1 - X0 + 0.4, 0.20, C.ROOM_H), ((X0 + X1) / 2, Y_FRONT - 0.10, C.ROOM_H / 2), "plaster", bevel=2 * MM, col=col)
    box("Ceiling", (X1 - X0 + 0.4, Y_BACK - Y_FRONT + 0.2, 0.20), ((X0 + X1) / 2, (Y_BACK + Y_FRONT) / 2, C.ROOM_H + 0.10), "plaster", bevel=2 * MM, col=col)
    box("Skirting_Back", (X1 - X0, 0.012, 0.08), ((X0 + X1) / 2, Y_BACK - 0.006, 0.04), "plaster_shadow", bevel=1 * MM, col=col)
    # Shadow-gap reveal where the back wall meets the floor
    box("Wall_Back_Reveal", (X1 - X0, 0.012, 0.012), ((X0 + X1) / 2, Y_BACK - 0.013, 0.086), "plaster_shadow", bevel=0.5 * MM, col=col)

    # Left wall: a tall window wall (daylight comes in here)
    wx = X0
    mull = 0.06
    win_y = [Y_FRONT + 1.0, -4.5, -2.0, 0.5, Y_BACK - 0.4]
    box("Wall_Left_Lower", (0.20, Y_BACK - Y_FRONT, 0.10), (wx - 0.10, (Y_BACK + Y_FRONT) / 2, 0.05), "plaster", col=col)
    box("Wall_Left_Upper", (0.20, Y_BACK - Y_FRONT, C.ROOM_H - 5.6), (wx - 0.10, (Y_BACK + Y_FRONT) / 2, (5.6 + C.ROOM_H) / 2), "plaster", col=col)
    box("Wall_Left_FrontPier", (0.20, win_y[0] - Y_FRONT, C.ROOM_H), (wx - 0.10, (win_y[0] + Y_FRONT) / 2, C.ROOM_H / 2), "plaster", col=col)
    box("Wall_Left_BackPier", (0.20, Y_BACK - win_y[-1], C.ROOM_H), (wx - 0.10, (Y_BACK + win_y[-1]) / 2, C.ROOM_H / 2), "plaster", col=col)
    for i, y in enumerate(win_y):
        box(f"Window_Mullion_{i}", (0.10, mull, 5.5), (wx - 0.05, y, 0.10 + 2.75), "window_frame", col=col)
    for z in (0.10, 5.60):
        box(f"Window_Rail_{z:.1f}", (0.10, win_y[-1] - win_y[0], mull), (wx - 0.05, (win_y[0] + win_y[-1]) / 2, z), "window_frame", col=col)
    for i in range(len(win_y) - 1):
        glass_pane(f"Window_Glass_{i}", win_y[i] + mull / 2, win_y[i + 1] - mull / 2, 0.10 + mull / 2, 5.60 - mull / 2, wx - 0.05, "y",
                   material="window_glass", embed=8 * MM, col=col, gaskets=False, thickness=0.024)

    # Upper floor: wing to the right of the lift + landing in front of its door
    top = H
    def slab(name, xa, xb, ya, yb):
        box(name, (xb - xa, yb - ya, SLAB_T - 0.02), ((xa + xb) / 2, (ya + yb) / 2, top - 0.02 - (SLAB_T - 0.02) / 2), "plaster", bevel=2 * MM, col=col)
        box(name + "_Floor", (xb - xa, yb - ya, 0.020), ((xa + xb) / 2, (ya + yb) / 2, top - 0.010), "floor", bevel=1 * MM, col=col)
    slab("Slab_Wing", sx, X1, Y_SLAB_EDGE, Y_BACK)
    slab("Slab_Landing", X_LANDING_L, sx, Y_SLAB_EDGE, -sy)

    # Glass balustrade on the open slab edges: base shoe channel + top cap
    def balustrade(name, a, b, fixed, along):
        bh = 1.05
        if along == "x":
            glass_pane(name, a, b, top + 0.06, top + bh, fixed, "x", material="glass", col=col, gaskets=False, thickness=0.017)
            box(name + "_Shoe", (b - a, 0.060, 0.070), ((a + b) / 2, fixed, top + 0.035), "frame", bevel=2 * MM, col=col)
            box(name + "_Cap", (b - a, 0.028, 0.030), ((a + b) / 2, fixed, top + bh + 0.010), "frame", bevel=2 * MM, col=col)
        else:
            glass_pane(name, a, b, top + 0.06, top + bh, fixed, "y", material="glass", col=col, gaskets=False, thickness=0.017)
            box(name + "_Shoe", (0.060, b - a, 0.070), (fixed, (a + b) / 2, top + 0.035), "frame", bevel=2 * MM, col=col)
            box(name + "_Cap", (0.028, b - a, 0.030), (fixed, (a + b) / 2, top + bh + 0.010), "frame", bevel=2 * MM, col=col)
    balustrade("Balustrade_Front", X_LANDING_L + 0.03, 2.9, Y_SLAB_EDGE + 0.035, "x")
    balustrade("Balustrade_Left", Y_SLAB_EDGE + 0.06, -sy - 0.03, X_LANDING_L + 0.035, "y")

    # Staircase edge on the right, rising towards the upper floor
    risers = 18
    rise, going = H / risers, 0.27
    sw = 1.10
    xs = X1 - sw / 2 - 0.02
    y_top = Y_SLAB_EDGE
    for i in range(risers):
        y = y_top - (risers - i) * going
        z = (i + 1) * rise
        box(f"Stair_Tread_{i:02d}", (sw, going + 0.02, 0.04), (xs, y + going / 2, z - 0.02), "floor", bevel=2 * MM, col=col)
    # solid stringer under the treads
    me = bpy.data.meshes.new("Stair_Stringer")
    bm = bmesh.new()
    y0 = y_top - risers * going
    xa, xb = xs - sw / 2, xs + sw / 2
    prof = [(y0, 0.0), (y_top, H - 0.04), (y_top, H - 0.04 - 0.30), (y0 + 1.2, 0.0)]
    vs = [[bm.verts.new((x, y, z)) for (y, z) in prof] for x in (xa, xb)]
    bm.faces.new(vs[0]); bm.faces.new(list(reversed(vs[1])))
    for i in range(4):
        j = (i + 1) % 4
        bm.faces.new((vs[0][i], vs[1][i], vs[1][j], vs[0][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    me.materials.append(mat("plaster"))
    ob = bpy.data.objects.new("Stair_Stringer", me)
    col.objects.link(ob)

    # Restrained props, kept off to the sides (they'll sit out of focus)
    # Low sofa edge, front-left
    sxp, syp = -2.6, -3.6
    box("Sofa_Base", (2.2, 0.95, 0.20), (sxp, syp, 0.12), "fabric", bevel=25 * MM, segments=6, col=col)
    box("Sofa_Seat", (2.1, 0.85, 0.16), (sxp, syp - 0.03, 0.30), "fabric", bevel=40 * MM, segments=6, col=col)
    box("Sofa_Back", (2.2, 0.22, 0.42), (sxp, syp + 0.40, 0.42), "fabric", bevel=50 * MM, segments=6, col=col)
    # Large plant in a stone pot, back-right
    px, py = 2.3, Y_BACK - 0.6
    cylinder("Plant_Pot", 0.26, 0.55, (px, py, 0.275), "pot", verts=64, bevel=8 * MM, col=col)
    for i in range(14):
        a = i * 2.39996
        r = 0.08 + 0.02 * (i % 3)
        h = 1.1 + 0.55 * ((i * 7) % 5) / 5
        stem = cylinder(f"Plant_Stem_{i}", 0.006, h, (px + r * math.cos(a) * 0.4, py + r * math.sin(a) * 0.4, 0.55 + h / 2), "plant", verts=8, col=col)
        stem.rotation_euler = (0.22 * math.sin(a), 0.22 * math.cos(a), 0)
        leaf = bpy.data.objects.new(f"Plant_Leaf_{i}", bpy.data.meshes.new(f"Plant_Leaf_{i}"))
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=8, radius=1.0)
        bmesh.ops.scale(bm, vec=(0.22, 0.10, 0.018), verts=bm.verts)
        bm.to_mesh(leaf.data); bm.free()
        for p in leaf.data.polygons:
            p.use_smooth = True
        leaf.data.materials.append(mat("plant"))
        top_pt = (px + (r * 0.4 + 0.22 * h * 0.22) * math.cos(a), py + (r * 0.4 + 0.22 * h * 0.22) * math.sin(a), 0.55 + h)
        leaf.location = top_pt
        leaf.rotation_euler = (0.4 * math.sin(a * 1.3), -0.5, a)
        col.objects.link(leaf)
    # Artwork on the back wall, left of the lift
    box("Art_Frame", (1.10, 0.035, 1.40), (-2.3, Y_BACK - 0.0175, 1.75), "art_frame", bevel=3 * MM, col=col)
    box("Art_Canvas", (1.00, 0.010, 1.30), (-2.3, Y_BACK - 0.036, 1.75), "art", bevel=1 * MM, col=col)
    return col
