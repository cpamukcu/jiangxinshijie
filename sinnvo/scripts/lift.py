"""Builds the SINNVO glass-shaft villa lift: extruded aluminium frame, 10 mm
laminated glass with gaskets, telescopic centre-opening doors, cabin with
walnut back wall, LED ceiling, handrail and control panel.

Axes: x = width, y = depth (front of the lift faces -y, towards camera),
z = up. z = 0 is the 1F finished floor."""
import math

import bmesh
import bpy

import config as C
from geo import MM, box, collection, cylinder, empty, glass_pane, grooved_rect, mat, sweep, t_rail

W, D, P = C.SHAFT_W, C.SHAFT_D, C.POST
SHAFT_TOP = C.FLOOR_H * (C.FLOORS - 1) + C.OVERHEAD
X_IN, Y_IN = W / 2 - P, D / 2 - P          # inner faces of the corner posts
Y_F, Y_B = -D / 2 + P / 2, D / 2 - P / 2   # front / back glass planes
X_L, X_R = -W / 2 + P / 2, W / 2 - P / 2   # side glass planes
JAMB_W, JAMB_D = 0.050, 0.070
DC = C.DOOR_CLEAR
X_JAMB = DC / 2 + JAMB_W / 2

# Door panel planes, front to back (see notes in docs/reference-notes.md)
Y_LAND = (Y_F + 0.050, Y_F + 0.080)          # landing door: fast, slow
CAB_FRONT = -0.640                           # cabin front returns plane
Y_CAB = (CAB_FRONT - 0.060, CAB_FRONT - 0.030)  # cabin door: fast, slow
CAB_Y0 = CAB_FRONT + 0.040 + C.CABIN_D / 2  # cabin centre y, so its front returns land on CAB_FRONT


def storey_glass_range(f):
    z0 = 0.06 if f == 0 else f * C.FLOOR_H + 0.04
    z1 = (f + 1) * C.FLOOR_H - 0.20 if f < C.FLOORS - 1 else SHAFT_TOP - C.BAND_H
    return z0, z1


def band(name, a, b, z0, z1, depth, along, plane, col, parent=None):
    """Horizontal frame band from a to b (along x or y) between heights z0..z1."""
    h = z1 - z0
    prof = grooved_rect(h, depth, 3 * MM, faces=("+y", "-y"))
    zc = (z0 + z1) / 2
    if along == "x":
        return sweep(name, prof, (a, plane, zc), (b, plane, zc), (0, 0, 1), "frame", col=col, parent=parent)
    return sweep(name, prof, (plane, a, zc), (plane, b, zc), (0, 0, 1), "frame", col=col, parent=parent)


def door_set(prefix, floor_z, y_planes, height, col, parent=None):
    """Telescopic centre-opening door: 2 panels each side. Returns
    [(empty, closed_x, open_x)] so the animation can slide them."""
    pw = DC / 4 + 0.020
    fr = 0.020
    panels = []
    for s in (-1, 1):
        for k, yp in enumerate(y_planes):  # k = 0 fast (centre), 1 slow
            if k == 0:
                cx = s * (C.DOOR_GAP / 2 + pw / 2)
                ox = s * (C.DOOR_GAP / 2 + pw / 2 + 2 * (pw - 0.020))
            else:
                cx = s * (DC / 2 + 0.020 - pw / 2)
                ox = cx + s * (pw - 0.020)
            name = f"{prefix}_{'LR'[s > 0]}{k + 1}"
            e = empty(name, (cx, yp, floor_z), parent=parent, col=col)
            depth = 0.022
            # frame: stiles and rails, glass in between
            box(f"{name}_StileA", (fr, depth, height), (-pw / 2 + fr / 2, 0, height / 2), "frame", col=col, parent=e)
            box(f"{name}_StileB", (fr, depth, height), (pw / 2 - fr / 2, 0, height / 2), "frame", col=col, parent=e)
            box(f"{name}_RailTop", (pw - 2 * fr, depth, fr), (0, 0, height - fr / 2), "frame", col=col, parent=e)
            box(f"{name}_RailBot", (pw - 2 * fr, depth, fr * 2.2), (0, 0, fr * 1.1), "frame", col=col, parent=e)
            glass_pane(f"{name}_Glass", -pw / 2 + fr, pw / 2 - fr, fr * 2.2, height - fr, 0, "x",
                       material="glass", embed=6 * MM, col=col, parent=e)
            panels.append((e, cx, ox))
    return panels


def sill(name, x_w, y, top_z, col, parent=None, depth=0.090, grooves=2):
    """Aluminium threshold with door-guide grooves (one per door panel plane)."""
    h, g = 0.016, 0.005
    seg = (depth - grooves * g) / (grooves + 1)
    for i in range(grooves + 1):
        yy = y - depth / 2 + seg / 2 + i * (seg + g)
        box(f"{name}_{i}", (x_w, seg, h), (0, yy, top_z - h / 2), "frame", bevel=1 * MM, col=col, parent=parent)
    box(f"{name}_Base", (x_w, depth, 0.006), (0, y, top_z - h - 0.003), "frame", bevel=1 * MM, col=col, parent=parent)


def call_plate(name, x, y, z, col):
    box(f"{name}_Plate", (0.056, 0.006, 0.150), (x, y - 0.003, z), "steel", bevel=1.5 * MM, col=col)
    ring(f"{name}_Ring", (x, y - 0.0065, z - 0.020), 0.011, col)
    cylinder(f"{name}_Button", 0.009, 0.003, (x, y - 0.0055, z - 0.020), "button", axis="Y", col=col)
    # direction arrow (up on the bottom landing, down on the top one), a thin triangular prism
    up = name.endswith("L1")
    a = 0.007 if up else -0.007
    tri = [(-0.007, -a / 1.6), (0.007, -a / 1.6), (0.0, a)] if up else [(0.007, -a / 1.6), (-0.007, -a / 1.6), (0.0, a)]
    sweep(f"{name}_Arrow", tri, (x, y - 0.006, z + 0.035), (x, y - 0.0072, z + 0.035), (1, 0, 0), "button", bevel=0.4 * MM, col=col)


def ring(name, loc, r, col, parent=None, facing="-y"):
    bpy.ops.mesh.primitive_torus_add(major_radius=r, minor_radius=1.4 * MM, major_segments=48, minor_segments=10)
    ob = bpy.context.active_object
    ob.name = name
    for c in ob.users_collection:
        c.objects.unlink(ob)
    col.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = (math.pi / 2, 0, 0) if facing in ("-y", "+y") else (0, math.pi / 2, 0)
    ob.data.materials.append(mat("steel"))
    for p in ob.data.polygons:
        p.use_smooth = True
    if parent:
        ob.parent = parent
    return ob


def build_shaft(col):
    zb = -C.PIT
    # Corner posts
    prof = grooved_rect(P, P, 4 * MM)
    for i, (sx, sy) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
        x, y = sx * (W / 2 - P / 2), sy * (D / 2 - P / 2)
        sweep(f"Post_{i + 1}", prof, (x, y, zb), (x, y, SHAFT_TOP), (1, 0, 0), "frame", col=col)

    bd = 0.060
    # Bands on back and sides at base, slab line(s) and top
    levels = [("Base", zb, 0.06)]
    for f in range(1, C.FLOORS):
        levels.append((f"L{f + 1}", f * C.FLOOR_H - 0.20, f * C.FLOOR_H + 0.04))
    levels.append(("Top", SHAFT_TOP - C.BAND_H, SHAFT_TOP))
    for tag, z0, z1 in levels:
        band(f"Band_{tag}_Back", -X_IN, X_IN, z0, z1, bd, "x", Y_B, col)
        band(f"Band_{tag}_Left", -Y_IN, Y_IN, z0, z1, bd, "y", X_L, col)
        band(f"Band_{tag}_Right", -Y_IN, Y_IN, z0, z1, bd, "y", X_R, col)
        if tag == "Top":
            band(f"Band_{tag}_Front", -X_IN, X_IN, z0, z1, bd, "x", Y_F, col)
        else:
            # front band is split by the door opening; below the sill it continues
            floor_z = 0.0 if tag == "Base" else (int(tag[1:]) - 1) * C.FLOOR_H
            for s in (-1, 1):
                a, b = s * X_IN, s * (X_JAMB + JAMB_W / 2)
                band(f"Band_{tag}_Front_{'LR'[s > 0]}", min(a, b), max(a, b), z0, z1, bd, "x", Y_F, col)
            band(f"Band_{tag}_Front_Under", -(X_JAMB + JAMB_W / 2), X_JAMB + JAMB_W / 2, z0, floor_z - 0.030, bd, "x", Y_F, col)

    # Glass, storey by storey
    for f in range(C.FLOORS):
        z0, z1 = storey_glass_range(f)
        glass_pane(f"Glass_L{f + 1}_Back", -X_IN, X_IN, z0, z1, Y_B, "x", col=col)
        glass_pane(f"Glass_L{f + 1}_Left", -Y_IN, Y_IN, z0, z1, X_L, "y", col=col)
        glass_pane(f"Glass_L{f + 1}_Right", -Y_IN, Y_IN, z0, z1, X_R, "y", col=col)

        floor_z = f * C.FLOOR_H
        head_z = floor_z + C.DOOR_H
        for s in (-1, 1):
            a, b = s * X_IN, s * (X_JAMB + JAMB_W / 2)
            glass_pane(f"Glass_L{f + 1}_FrontSide_{'LR'[s > 0]}", min(a, b), max(a, b), z0, z1, Y_F, "x", col=col)
            # jamb from floor to header
            jprof = grooved_rect(JAMB_W, JAMB_D, 3 * MM, faces=("+y", "-y"))
            sweep(f"Jamb_L{f + 1}_{'LR'[s > 0]}", jprof, (s * X_JAMB, Y_F, floor_z), (s * X_JAMB, Y_F, head_z + 0.07),
                  (1, 0, 0), "frame", col=col)
        hprof = grooved_rect(0.070, JAMB_D, 3 * MM, faces=("+y", "-y"))
        sweep(f"Header_L{f + 1}", hprof, (-X_JAMB + JAMB_W / 2, Y_F, head_z + 0.035), (X_JAMB - JAMB_W / 2, Y_F, head_z + 0.035),
              (0, 0, 1), "frame", col=col)
        if z1 - (head_z + 0.07) > 0.05:
            glass_pane(f"Glass_L{f + 1}_Transom", -X_JAMB + JAMB_W / 2, X_JAMB - JAMB_W / 2, head_z + 0.07, z1, Y_F, "x", col=col)
        # landing threshold runs from the floor edge back under both door panels
        sill_d = 0.130
        sill(f"Sill_L{f + 1}", DC + 0.10, -D / 2 - 0.004 + sill_d / 2, floor_z, col, depth=sill_d, grooves=2)
        call_plate(f"CallPlate_L{f + 1}", W / 2 - P / 2, -D / 2, floor_z + 1.05, col)

    # Guide rails on the back, blade towards the cabin
    for i, x in enumerate((-0.30, 0.30)):
        y0 = Y_IN - 0.005
        sweep(f"GuideRail_{i + 1}", t_rail(), (x, y0, -C.PIT), (x, y0, SHAFT_TOP), (1, 0, 0), "rail", bevel=0.8 * MM, col=col)
        for k in range(int(SHAFT_TOP / 1.2) + 1):
            box(f"RailBracket_{i + 1}_{k}", (0.10, 0.012, 0.06), (x, Y_IN + 0.004, 0.4 + k * 1.2), "rail", col=col)

    # Head unit with a soft downlight strip just inside the front
    box("Head_Unit", (W + 0.020, D + 0.020, C.HEAD_H), (0, 0, SHAFT_TOP + C.HEAD_H / 2), "frame", bevel=4 * MM, segments=4, col=col)
    box("Head_Shadow_Gap", (W + 0.004, D + 0.004, 0.010), (0, 0, SHAFT_TOP + 0.050), "gasket", bevel=1 * MM, col=col)
    box("Head_Downlight", (W - 0.40, 0.035, 0.006), (0, Y_F + 0.09, SHAFT_TOP - 0.004), "led_soft", bevel=1 * MM, col=col)

    landing = [door_set(f"LandingDoor_L{f + 1}", f * C.FLOOR_H, Y_LAND, C.DOOR_H - 0.005, col) for f in range(C.FLOORS)]
    return landing


def build_cabin(col):
    cw, cd, ch = C.CABIN_W, C.CABIN_D, C.CABIN_H
    car = empty("Cabin", (0, CAB_Y0, 0), col=col)
    fy = -cd / 2 - 0.040  # front returns plane (local)
    post = 0.040
    xo, yo = cw / 2 + post / 2, cd / 2 + post / 2

    # Platform with stone floor
    box("Cabin_Platform", (cw + 2 * post, cd + 2 * post + 0.04, 0.100), (0, -0.02, -0.012 - 0.050), "frame", bevel=2 * MM, col=col, parent=car)
    box("Cabin_Floor_Stone", (cw, cd, 0.012), (0, 0, -0.006), "stone", bevel=1 * MM, col=col, parent=car)
    sill("Cabin_Sill", DC + 0.06, fy - 0.045, 0.0, col, parent=car)

    # Corner posts
    pprof = grooved_rect(post, post, 3 * MM)
    for i, (sx, sy) in enumerate(((-1, -1), (1, -1), (-1, 1), (1, 1))):
        sweep(f"Cabin_Post_{i + 1}", pprof, (sx * xo, sy * yo, 0), (sx * xo, sy * yo, ch), (1, 0, 0), "frame", col=col, parent=car)

    # Back wall: walnut panel in an aluminium surround
    box("Cabin_Back_Walnut", (cw, 0.022, ch - 0.10), (0, cd / 2 + 0.011, 0.10 + (ch - 0.10) / 2), "walnut", bevel=1.5 * MM, col=col, parent=car)
    box("Cabin_Back_Kick", (cw, 0.024, 0.10), (0, cd / 2 + 0.012, 0.05), "steel", bevel=1 * MM, col=col, parent=car)

    # Side walls: kick rail + glass
    for s in (-1, 1):
        x = s * xo
        box(f"Cabin_Side_Kick_{'LR'[s > 0]}", (post, cd, 0.10), (x, 0, 0.05), "frame", bevel=1.5 * MM, col=col, parent=car)
        box(f"Cabin_Side_KickPlate_{'LR'[s > 0]}", (0.002, cd, 0.10), (x - s * (post / 2 + 0.001), 0, 0.05), "steel", bevel=0.5 * MM, col=col, parent=car)
        glass_pane(f"Cabin_Glass_{'LR'[s > 0]}", -cd / 2, cd / 2, 0.10, ch, x, "y", col=col, parent=car)
        # front returns either side of the door opening
        rw = (cw - DC) / 2
        box(f"Cabin_Return_{'LR'[s > 0]}", (rw, 0.030, ch), (s * (DC / 2 + rw / 2), fy + 0.015, ch / 2), "frame", bevel=2 * MM, col=col, parent=car)
    box("Cabin_Front_Header", (cw, 0.030, 0.06), (0, fy + 0.015, ch + 0.03), "frame", col=col, parent=car)

    # Ceiling with recessed LED diffuser and a thin trim
    box("Cabin_Ceiling", (cw + 2 * post + 0.004, cd + 2 * post + 0.004, 0.080), (0, 0, ch + 0.040), "frame", bevel=3 * MM, col=col, parent=car)
    dw, dd = cw - 0.20, cd - 0.24
    box("Cabin_LED_Diffuser", (dw, dd, 0.006), (0, 0, ch - 0.003), "led", bevel=1 * MM, col=col, parent=car)
    t = 0.012
    for i, (sx, sy, lx, ly) in enumerate(((0, 1, dw + 2 * t, t), (0, -1, dw + 2 * t, t), (1, 0, t, dd), (-1, 0, t, dd))):
        box(f"Cabin_LED_Trim_{i}", (lx, ly, 0.010), (sx * (dw / 2 + t / 2), sy * (dd / 2 + t / 2), ch - 0.005), "steel", bevel=1 * MM, col=col, parent=car)

    # Handrail on the walnut wall with wall brackets and rosettes
    hy = cd / 2 - 0.050
    cylinder("Cabin_Handrail", 0.016, 0.70, (0, hy, 0.90), "steel", axis="X", col=col, parent=car)
    for i, x in enumerate((-0.27, 0.27)):
        cylinder(f"Cabin_Handrail_Bracket_{i}", 0.006, 0.050, (x, hy + 0.025, 0.90), "steel", axis="Y", col=col, parent=car)
        cylinder(f"Cabin_Handrail_Rosette_{i}", 0.024, 0.006, (x, cd / 2 - 0.003, 0.90), "steel", axis="Y", col=col, parent=car)
    for i, x in enumerate((-0.35, 0.35)):
        b = bpy.data.objects.new(f"Cabin_Handrail_End_{i}", bpy.data.meshes.new(f"Cabin_Handrail_End_{i}"))
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=0.016)
        bm.to_mesh(b.data)
        bm.free()
        for p in b.data.polygons:
            p.use_smooth = True
        b.data.materials.append(mat("steel"))
        b.location = (x, hy, 0.90)
        col.objects.link(b)
        b.parent = car

    # Control panel on the inside of the right front return
    px, py = DC / 2 + (cw - DC) / 4, fy + 0.030 + 0.003
    box("COP_Plate", (0.075, 0.006, 0.44), (px, py, 1.08), "black_glass", bevel=1.5 * MM, col=col, parent=car)
    box("COP_Display", (0.046, 0.002, 0.030), (px, py + 0.0035, 1.25), "display", bevel=0.5 * MM, col=col, parent=car)
    buttons = {}
    for label, z in (("2F", 1.16), ("1F", 1.09), ("Open", 1.01), ("Close", 0.95), ("Alarm", 0.89)):
        ring(f"COP_Ring_{label}", (px, py + 0.0045, z), 0.011, col, parent=car)
        buttons[label] = cylinder(f"COP_Button_{label}", 0.0085, 0.003, (px, py + 0.0030, z), "button", axis="Y", col=col, parent=car)

    # Car frame riding the guide rails
    for i, x in enumerate((-0.30, 0.30)):
        box(f"Car_Stile_{i}", (0.05, 0.035, ch + 0.30), (x, cd / 2 + 0.050, (ch + 0.30) / 2 - 0.15), "rail", col=col, parent=car)
        for k, z in enumerate((-0.10, ch + 0.08)):
            box(f"Car_Shoe_{i}_{k}", (0.08, 0.07, 0.10), (x, cd / 2 + 0.090, z), "rail", col=col, parent=car)

    cabin_doors = door_set("CabinDoor", 0.0, (Y_CAB[0] - CAB_Y0, Y_CAB[1] - CAB_Y0), ch - 0.01, col, parent=car)
    return car, cabin_doors, buttons


def build(finish=C.DEFAULT_FINISH):
    col = collection("Lift")
    landing = build_shaft(col)
    car, cabin_doors, buttons = build_cabin(col)
    return {"collection": col, "landing": landing, "cabin": car, "cabin_doors": cabin_doors, "buttons": buttons}
