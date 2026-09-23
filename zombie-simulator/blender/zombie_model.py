# Zombie Simulator - Low Poly Zombie Generator
# Blender 4.x
# Run from Blender: Scripting > Open > Run Script
# It creates a rigged blockout zombie ready for animation and Godot export.

import bpy
import math
from mathutils import Vector

# -------------------------------------------------
# Clean scene
# -------------------------------------------------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

for block in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.armatures):
    # Keep only datablocks still used by Blender internals.
    pass

# -------------------------------------------------
# Materials
# -------------------------------------------------
def mat(name, color, roughness=0.75, metallic=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1.0)
    m.roughness = roughness
    m.metallic = metallic
    return m

SKIN = mat("Zombie_Skin", (0.30, 0.43, 0.25), 0.92)
SHIRT = mat("Dirty_Shirt", (0.24, 0.25, 0.20), 0.95)
PANTS = mat("Old_Pants", (0.10, 0.13, 0.15), 0.97)
SHOE = mat("Shoes", (0.035, 0.035, 0.035), 0.98)
BLOOD = mat("Blood", (0.20, 0.015, 0.018), 0.70)
EYE = mat("Zombie_Eye", (0.75, 0.88, 0.58), 0.30)

# -------------------------------------------------
# Helpers
# -------------------------------------------------
def add_cube(name, loc, scale, material, bevel=0.08):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    if bevel > 0:
        mod = obj.modifiers.new(name="Small_Bevel", type='BEVEL')
        mod.width = bevel
        mod.segments = 2

    obj.data.materials.append(material)
    return obj


def add_sphere(name, loc, scale, material):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1.0, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    return obj


def add_cylinder(name, loc, radius, depth, material, rotation=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=depth, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    return obj


def bone_parent(obj, armature, bone_name):
    obj.parent = armature
    obj.parent_type = 'BONE'
    obj.parent_bone = bone_name


# -------------------------------------------------
# Armature
# -------------------------------------------------
bpy.ops.object.armature_add(enter_editmode=True, location=(0,0,0))
arm = bpy.context.object
arm.name = "Zombie_Rig"
arm.show_in_front = True

eb = arm.data.edit_bones
root = eb[0]
root.name = "root"
root.head = (0, 0, 0)
root.tail = (0, 0, 0.65)

def new_bone(name, head, tail, parent=None, connected=False):
    b = eb.new(name)
    b.head = head
    b.tail = tail
    b.parent = parent
    b.use_connect = connected
    return b

hips = new_bone("hips", (0,0,0.70), (0,0,1.20), root)
spine = new_bone("spine", (0,0,1.15), (0,0,2.10), hips)
neck = new_bone("neck", (0,0,2.05), (0,0,2.45), spine)
head = new_bone("head", (0,0,2.42), (0,0,3.15), neck)

ua_l = new_bone("upper_arm.L", (0.05,0,1.95), (0.78,0,1.70), spine)
la_l = new_bone("lower_arm.L", (0.78,0,1.70), (1.35,0,1.35), ua_l)
hand_l = new_bone("hand.L", (1.35,0,1.35), (1.62,0,1.18), la_l)

ua_r = new_bone("upper_arm.R", (-0.05,0,1.95), (-0.78,0,1.78), spine)
la_r = new_bone("lower_arm.R", (-0.78,0,1.78), (-1.30,0,1.58), ua_r)
hand_r = new_bone("hand.R", (-1.30,0,1.58), (-1.58,0,1.48), la_r)

ul_l = new_bone("upper_leg.L", (0.30,0,1.03), (0.34,0,0.22), hips)
ll_l = new_bone("lower_leg.L", (0.34,0,0.22), (0.34,0,-0.65), ul_l)
foot_l = new_bone("foot.L", (0.34,0,-0.65), (0.34,-0.34,-0.77), ll_l)

ul_r = new_bone("upper_leg.R", (-0.30,0,1.03), (-0.25,0,0.20), hips)
ll_r = new_bone("lower_leg.R", (-0.25,0,0.20), (-0.20,0,-0.68), ul_r)
foot_r = new_bone("foot.R", (-0.20,0,-0.68), (-0.20,-0.34,-0.80), ll_r)

bpy.ops.object.mode_set(mode='OBJECT')

# -------------------------------------------------
# Zombie body blockout
# -------------------------------------------------
parts = []

# Pelvis + torso
pelvis = add_cube("Pelvis", (0,0,1.02), (0.46,0.28,0.34), PANTS)
parts.append((pelvis, "hips"))

torso = add_cube("Torso", (0,0,1.72), (0.62,0.34,0.66), SHIRT)
torso.rotation_euler[1] = math.radians(-4)
parts.append((torso, "spine"))

# Torn shirt chunk / wound
wound = add_cube("Chest_Wound", (0.36,-0.345,1.78), (0.16,0.035,0.22), BLOOD, bevel=0.02)
parts.append((wound, "spine"))

# Head + jaw
head_obj = add_sphere("Head", (0,0,2.68), (0.43,0.38,0.50), SKIN)
head_obj.rotation_euler[1] = math.radians(8)
parts.append((head_obj, "head"))

jaw = add_cube("Jaw", (0,-0.30,2.48), (0.31,0.13,0.16), SKIN, bevel=0.05)
parts.append((jaw, "head"))

# Eyes
for x in (-0.15, 0.15):
    eye = add_sphere("Eye", (x,-0.355,2.77), (0.07,0.035,0.07), EYE)
    parts.append((eye, "head"))

# Arms
upper_l = add_cylinder("UpperArm_L", (0.47,0,1.82), 0.18, 0.82, SKIN, rotation=(0,math.radians(67),0))
parts.append((upper_l, "upper_arm.L"))
lower_l = add_cylinder("LowerArm_L", (1.05,0,1.50), 0.16, 0.72, SKIN, rotation=(0,math.radians(58),0))
parts.append((lower_l, "lower_arm.L"))
hand_l_obj = add_sphere("Hand_L", (1.47,0,1.23), (0.18,0.15,0.19), SKIN)
parts.append((hand_l_obj, "hand.L"))

upper_r = add_cylinder("UpperArm_R", (-0.47,0,1.86), 0.18, 0.78, SKIN, rotation=(0,math.radians(-72),0))
parts.append((upper_r, "upper_arm.R"))
lower_r = add_cylinder("LowerArm_R", (-1.00,0,1.66), 0.16, 0.70, SKIN, rotation=(0,math.radians(-67),0))
parts.append((lower_r, "lower_arm.R"))
hand_r_obj = add_sphere("Hand_R", (-1.44,0,1.51), (0.18,0.15,0.19), SKIN)
parts.append((hand_r_obj, "hand.R"))

# Legs
thigh_l = add_cylinder("Thigh_L", (0.32,0,0.62), 0.23, 0.88, PANTS)
parts.append((thigh_l, "upper_leg.L"))
shin_l = add_cylinder("Shin_L", (0.34,0,-0.22), 0.20, 0.88, SKIN)
parts.append((shin_l, "lower_leg.L"))
foot_l_obj = add_cube("Foot_L", (0.34,-0.16,-0.75), (0.25,0.43,0.16), SHOE, bevel=0.05)
parts.append((foot_l_obj, "foot.L"))

thigh_r = add_cylinder("Thigh_R", (-0.27,0,0.60), 0.23, 0.90, PANTS)
parts.append((thigh_r, "upper_leg.R"))
shin_r = add_cylinder("Shin_R", (-0.20,0,-0.25), 0.20, 0.90, SKIN)
parts.append((shin_r, "lower_leg.R"))
foot_r_obj = add_cube("Foot_R", (-0.20,-0.16,-0.78), (0.25,0.43,0.16), SHOE, bevel=0.05)
parts.append((foot_r_obj, "foot.R"))

# Extra damage details
blood_arm = add_cube("Arm_Blood", (1.10,-0.13,1.50), (0.11,0.04,0.18), BLOOD, bevel=0.02)
parts.append((blood_arm, "lower_arm.L"))

# Parent pieces to bones
for obj, bone in parts:
    bone_parent(obj, arm, bone)

# -------------------------------------------------
# Add a simple ground reference (not exported as character)
# -------------------------------------------------
bpy.ops.mesh.primitive_plane_add(size=8, location=(0,0,-0.95))
ground = bpy.context.object
ground.name = "Preview_Ground"
ground.hide_render = True
ground.display_type = 'WIRE'

# -------------------------------------------------
# Pose: slightly hunched zombie stance
# -------------------------------------------------
bpy.context.view_layer.objects.active = arm
arm.select_set(True)
bpy.ops.object.mode_set(mode='POSE')

arm.pose.bones["spine"].rotation_mode = 'XYZ'
arm.pose.bones["spine"].rotation_euler[0] = math.radians(12)
arm.pose.bones["head"].rotation_mode = 'XYZ'
arm.pose.bones["head"].rotation_euler[2] = math.radians(-7)
arm.pose.bones["upper_arm.L"].rotation_mode = 'XYZ'
arm.pose.bones["upper_arm.L"].rotation_euler[1] = math.radians(-8)
arm.pose.bones["upper_arm.R"].rotation_mode = 'XYZ'
arm.pose.bones["upper_arm.R"].rotation_euler[1] = math.radians(13)

bpy.ops.object.mode_set(mode='OBJECT')

# -------------------------------------------------
# Set origin-friendly scale for Godot (roughly 1.8m tall)
# -------------------------------------------------
group_objects = [arm] + [o for o,_ in parts]
for obj in group_objects:
    obj.scale *= 0.58

# Select character only
bpy.ops.object.select_all(action='DESELECT')
for obj in group_objects:
    obj.select_set(True)
arm.select_set(True)
bpy.context.view_layer.objects.active = arm

print("Zombie blockout created.")
print("Next: save .blend, then export selected objects as GLB for Godot.")
