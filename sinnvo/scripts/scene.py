"""Render settings, lighting rigs and the still cameras."""
import math
import os

import bpy
from mathutils import Vector

import config as C


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def render_settings(width, height, samples=128, noise=0.02, preview=False):
    s = bpy.context.scene
    s.render.engine = "CYCLES"
    cy = s.cycles
    prefs = bpy.context.preferences.addons["cycles"].preferences
    # Metal on Apple Silicon, otherwise whatever GPU exists, else CPU
    for backend in ("METAL", "OPTIX", "CUDA", "HIP", "ONEAPI"):
        try:
            prefs.compute_device_type = backend
        except TypeError:
            continue
        prefs.get_devices()
        if any(d.type == backend for d in prefs.devices):
            for d in prefs.devices:
                d.use = d.type == backend
            cy.device = "GPU"
            break
    else:
        cy.device = "CPU"
    cy.samples = samples
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = noise
    cy.use_denoising = True
    cy.denoiser = "OPENIMAGEDENOISE"
    cy.max_bounces = 16
    cy.diffuse_bounces = 4
    cy.glossy_bounces = 6
    cy.transmission_bounces = 14   # >= 12 or stacked glass renders black
    cy.transparent_max_bounces = 16
    cy.caustics_reflective = False
    cy.caustics_refractive = False
    cy.sample_clamp_indirect = 6.0
    cy.blur_glossy = 0.5
    s.render.resolution_x, s.render.resolution_y = width, height
    s.render.resolution_percentage = 100
    s.render.film_transparent = False
    s.view_settings.view_transform = "AgX"
    s.view_settings.look = "AgX - Base Contrast"
    s.view_settings.exposure = 0.0
    s.render.image_settings.file_format = "PNG"
    s.render.image_settings.color_depth = "16" if not preview else "8"
    s.render.use_persistent_data = True


def world(color=(0.55, 0.56, 0.58), strength=0.5, hdri=None):
    w = bpy.data.worlds.get("World") or bpy.data.worlds.new("World")
    bpy.context.scene.world = w
    w.use_nodes = True
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs["Strength"].default_value = strength
    if hdri and os.path.exists(hdri):
        env = nt.nodes.new("ShaderNodeTexEnvironment")
        env.image = bpy.data.images.load(hdri)
        nt.links.new(env.outputs["Color"], bg.inputs["Color"])
    else:
        bg.inputs["Color"].default_value = (*color, 1)
    nt.links.new(bg.outputs["Background"], out.inputs["Surface"])


def area_light(name, loc, target, size, power, kelvin=5600, shape="RECTANGLE", size_y=None):
    ld = bpy.data.lights.new(name, "AREA")
    ld.shape = shape
    ld.size = size
    ld.size_y = size_y or size
    ld.energy = power
    ld.use_nodes = True
    bb = ld.node_tree.nodes.new("ShaderNodeBlackbody")
    bb.inputs["Temperature"].default_value = kelvin
    ld.node_tree.links.new(bb.outputs["Color"], ld.node_tree.nodes["Emission"].inputs["Color"])
    ob = bpy.data.objects.new(name, ld)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    look_at(ob, target)
    return ob


def daylight_rig():
    """Window daylight from the left (x-), soft and large, plus a weak bounce."""
    area_light("Window_Daylight", (-6.0, -1.8, 3.0), (0, -0.6, 1.8), 5.0, 1800, 5600, size_y=5.5)
    area_light("Front_Fill", (0.5, -7.2, 3.6), (0, 0, 2.2), 3.0, 90, 5200)


def look_at(ob, target):
    d = Vector(target) - ob.location
    ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def camera(name, loc, target, focal=50, fstop=None, focus=None):
    cd = bpy.data.cameras.new(name)
    cd.lens = focal
    cd.sensor_width = 36
    cd.sensor_fit = "AUTO"  # 36 mm across the long side, like a rotated full-frame body
    cd.clip_start = 0.02
    cd.clip_end = 100
    if fstop:
        cd.dof.use_dof = True
        cd.dof.aperture_fstop = fstop
        cd.dof.focus_distance = focus or (Vector(target) - Vector(loc)).length
        cd.dof.aperture_blades = 9
    ob = bpy.data.objects.new(name, cd)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = loc
    look_at(ob, target)
    return ob


# Still cameras used for clay and look-dev checkpoints
STILLS = {
    "front": dict(loc=(0.0, -5.2, 1.5), target=(0.0, 0.0, 1.45), focal=50),
    "three_quarter": dict(loc=(-3.6, -6.4, 1.35), target=(0.15, 0.0, 2.85), focal=35),
    "detail": dict(loc=(1.22, -1.62, 1.16), target=(0.68, -0.86, 1.04), focal=100, fstop=2.8),
}


def render_still(name, path):
    s = bpy.context.scene
    s.camera = bpy.data.objects[name]
    s.render.filepath = path
    bpy.ops.render.render(write_still=True)
