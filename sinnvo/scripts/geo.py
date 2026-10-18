"""Geometry helpers: bevelled boxes, swept extrusion profiles, glass with real
thickness and gasket strips. Every edge gets a bevel; nothing is left razor sharp."""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

MM = 0.001
_mats = {}


def set_materials(table):
    """table: name -> bpy.types.Material, filled in by materials.py."""
    _mats.clear()
    _mats.update(table)


def mat(name):
    if name not in _mats:
        _mats[name] = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    return _mats[name]


def collection(name, parent=None):
    col = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if col.name not in (parent or bpy.context.scene.collection).children:
        (parent or bpy.context.scene.collection).children.link(col)
    return col


def empty(name, loc=(0, 0, 0), parent=None, col=None):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.1
    e.location = loc
    (col or bpy.context.scene.collection).objects.link(e)
    if parent:
        e.parent = parent
    return e


def _finish(ob, bevel, segments, col, parent, smooth_angle=30):
    me = ob.data
    for p in me.polygons:
        p.use_smooth = True
    me.set_sharp_from_angle(angle=math.radians(smooth_angle))
    if bevel > 0:
        m = ob.modifiers.new("Bevel", "BEVEL")
        m.width = bevel
        m.segments = segments
        m.limit_method = "ANGLE"
        m.angle_limit = math.radians(smooth_angle)
        m.harden_normals = True
        m.miter_outer = "MITER_ARC"
    (col or bpy.context.scene.collection).objects.link(ob)
    if parent:
        ob.parent = parent
    return ob


def box(name, size, loc, material, bevel=2 * MM, segments=3, col=None, parent=None, rot=(0, 0, 0)):
    """Axis-aligned box centred on loc. size = (x, y, z)."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat(material))
    ob = bpy.data.objects.new(name, me)
    ob.location = loc
    ob.rotation_euler = rot
    bevel = min(bevel, min(size) * 0.45)
    return _finish(ob, bevel, segments, col, parent)


def cylinder(name, radius, depth, loc, material, axis="Z", verts=48, bevel=0.6 * MM, col=None, parent=None):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=radius, radius2=radius, depth=depth)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat(material))
    ob = bpy.data.objects.new(name, me)
    ob.location = loc
    # create_cone builds along z; rotate so the cylinder axis follows `axis`
    ob.rotation_euler = {"X": (0, math.pi / 2, 0), "Y": (math.pi / 2, 0, 0), "Z": (0, 0, 0)}[axis]
    return _finish(ob, min(bevel, depth * 0.4, radius * 0.4), 2, col, parent)


# ── 2D profiles (counter-clockwise lists of (x, y) in metres) ─────────────
def rounded_rect(w, h, r, seg=6, cx=0.0, cy=0.0):
    r = min(r, w / 2, h / 2)
    pts = []
    corners = [(w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)]
    for x, y, a0 in corners:
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((cx + x + r * math.cos(a), cy + y + r * math.sin(a)))
    return pts


def grooved_rect(w, h, r, groove_w=3 * MM, groove_d=2 * MM, faces=("+x", "-x", "+y", "-y"), seg=6):
    """Rounded rectangle with a shadow-gap groove centred in the chosen faces,
    like a real aluminium extrusion."""
    base = rounded_rect(w, h, r, seg)
    out = []
    n = len(base)
    for i in range(n):
        a, b = base[i], base[(i + 1) % n]
        out.append(a)
        # straight edges are the ones between corner arcs: detect by length > 2r
        if math.dist(a, b) < 2 * r + 1e-6 and r > 0:
            continue
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        face = "+x" if abs(mx - w / 2) < 1e-6 else "-x" if abs(mx + w / 2) < 1e-6 else "+y" if abs(my - h / 2) < 1e-6 else "-y"
        if face not in faces:
            continue
        d = Vector((b[0] - a[0], b[1] - a[1])).normalized()
        inward = Vector((-d.y, d.x))  # CCW -> left normal points inside
        m = Vector((mx, my))
        g0, g1 = m - d * groove_w / 2, m + d * groove_w / 2
        out += [tuple(g0), tuple(g0 + inward * groove_d), tuple(g1 + inward * groove_d), tuple(g1)]
    return out


def t_rail(w=0.070, h=0.065, web=0.009, flange=0.010):
    """T-section guide rail profile, flange at y=0, blade pointing to -y."""
    pts = [(-w / 2, 0), (w / 2, 0), (w / 2, -flange), (web / 2, -flange), (web / 2, -h), (-web / 2, -h), (-web / 2, -flange), (-w / 2, -flange)]
    return list(reversed(pts))


def sweep(name, profile, start, end, xaxis, material, bevel=1.5 * MM, col=None, parent=None):
    """Extrude a 2D profile along the straight path start->end. The profile's
    x axis maps to `xaxis` (perpendicular to the path); y = path x xaxis."""
    start, end = Vector(start), Vector(end)
    z = (end - start).normalized()
    x = Vector(xaxis).normalized()
    x = (x - z * x.dot(z)).normalized()
    y = z.cross(x)
    length = (end - start).length

    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bottom = [bm.verts.new((px, py, 0.0)) for px, py in profile]
    top = [bm.verts.new((px, py, length)) for px, py in profile]
    n = len(profile)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bottom[i], bottom[j], top[j], top[i]))
    bm.faces.new(list(reversed(bottom)))
    bm.faces.new(top)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(mat(material))
    ob = bpy.data.objects.new(name, me)
    ob.matrix_world = Matrix.Translation(start) @ Matrix((x, y, z)).transposed().to_4x4()
    return _finish(ob, bevel, 2, col, parent)


def glass_pane(name, x0, x1, z0, z1, plane, axis, material="glass", embed=10 * MM, col=None, parent=None,
               gaskets=True, thickness=None):
    """Glass pane filling the visible opening [x0,x1]x[z0,z1] in a vertical plane.
    axis 'x': pane spans world x, sits at y=plane. axis 'y': spans world y at x=plane.
    The pane runs `embed` into the surrounding frame and gets black EPDM gasket
    strips on both faces along the visible edge."""
    from config import GLASS_T
    t = thickness or GLASS_T
    w, h = (x1 - x0) + 2 * embed, (z1 - z0) + 2 * embed
    cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
    if axis == "x":
        pane = box(name, (w, t, h), (cx, plane, cz), material, bevel=0.8 * MM, segments=2, col=col, parent=parent)
    else:
        pane = box(name, (t, w, h), (plane, cx, cz), material, bevel=0.8 * MM, segments=2, col=col, parent=parent)
    if gaskets:
        gw, gd = 5 * MM, 3.5 * MM
        for side in (-1, 1):
            off = side * (t / 2 + gd / 2)
            strips = [
                ((x1 - x0), (cx, z0 + gw / 2)), ((x1 - x0), (cx, z1 - gw / 2)),
            ]
            for i, (length, (sx, sz)) in enumerate(strips):
                size = (length, gd, gw) if axis == "x" else (gd, length, gw)
                loc = (sx, plane + off, sz) if axis == "x" else (plane + off, sx, sz)
                box(f"{name}_Gasket_H{i}{'ab'[side > 0]}", size, loc, "gasket", bevel=1 * MM, segments=2, col=col, parent=parent)
            for i, sx in enumerate((x0 + gw / 2, x1 - gw / 2)):
                length = (z1 - z0) - 2 * gw
                size = (gw, gd, length) if axis == "x" else (gd, gw, length)
                loc = (sx, plane + off, cz) if axis == "x" else (plane + off, sx, cz)
                box(f"{name}_Gasket_V{i}{'ab'[side > 0]}", size, loc, "gasket", bevel=1 * MM, segments=2, col=col, parent=parent)
    return pane
