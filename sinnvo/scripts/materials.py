"""Material library. 'clay' = plain white shape check (glass stays clear so the
cabin reads); 'full' = physically based look-dev materials (phase 3)."""
import bpy

import config as C
from geo import set_materials

NAMES = [
    "frame", "glass", "gasket", "steel", "button", "button_lit", "rail", "led", "led_soft", "black_glass",
    "display", "stone", "walnut", "floor", "concrete", "plaster", "plaster_shadow", "window_frame",
    "window_glass", "fabric", "pot", "plant", "art_frame", "art",
]


def _new(name):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return m, bsdf


def _glass(name, tint=(0.97, 0.99, 0.98)):
    """Refractive glass for camera/reflection rays; shadow rays pass straight
    through (tinted) so daylight and LEDs light the scene behind the glass the
    way thin architectural glass does. Without this, with caustics off,
    everything behind glass sits in shadow."""
    m, b = _new(name)
    b.inputs["Base Color"].default_value = (*tint, 1)
    b.inputs["Transmission Weight"].default_value = 1.0
    b.inputs["Roughness"].default_value = 0.0
    b.inputs["IOR"].default_value = 1.52
    nt = m.node_tree
    out = nt.nodes["Material Output"]
    lp = nt.nodes.new("ShaderNodeLightPath")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    tr.inputs["Color"].default_value = (*tint, 1)
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(lp.outputs["Is Shadow Ray"], mix.inputs["Fac"])
    nt.links.new(b.outputs["BSDF"], mix.inputs[1])
    nt.links.new(tr.outputs["BSDF"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    return m


def _emit(name, kelvin, strength):
    m, b = _new(name)
    nt = m.node_tree
    bb = nt.nodes.new("ShaderNodeBlackbody")
    bb.inputs["Temperature"].default_value = kelvin
    b.inputs["Base Color"].default_value = (1, 1, 1, 1)
    nt.links.new(bb.outputs["Color"], b.inputs["Emission Color"])
    b.inputs["Emission Strength"].default_value = strength
    b.inputs["Roughness"].default_value = 0.5
    return m


def clay():
    table = {}
    for n in NAMES:
        m, b = _new(n)
        b.inputs["Base Color"].default_value = (0.70, 0.70, 0.68, 1)
        b.inputs["Roughness"].default_value = 0.55
        table[n] = m
    for n in ("gasket", "black_glass"):
        table[n].node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.05, 0.05, 0.05, 1)
    table["glass"] = _glass("glass")
    table["window_glass"] = _glass("window_glass")
    table["led"] = _emit("led", 3200, 4.0)
    table["led_soft"] = _emit("led_soft", 3200, 2.0)
    table["display"] = _emit("display", 3200, 1.5)
    table["button_lit"] = _emit("button_lit", 3200, 2.0)
    set_materials(table)
    return table


def build(mode="clay", finish=C.DEFAULT_FINISH):
    if mode == "clay":
        return clay()
    raise NotImplementedError("full look-dev materials arrive in phase 3")
