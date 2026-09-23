# Zombie Simulator - Zombie_02 Heavy Variant
# Blender 4.x
# Creates a second, bulkier zombie model with a simple rig and Godot-ready materials.

import bpy
import math

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def mat(name, color, rough=.85, metal=0.0):
    m=bpy.data.materials.new(name)
    m.diffuse_color=(*color,1)
    m.roughness=rough
    m.metallic=metal
    return m

SKIN=mat("Zombie02_Skin",(0.22,0.34,0.18),.95)
SHIRT=mat("Zombie02_Shirt",(0.18,0.12,0.09),.98)
PANTS=mat("Zombie02_Pants",(0.08,0.09,0.10),.98)
BLOOD=mat("Zombie02_Blood",(0.24,0.01,0.015),.72)
SHOE=mat("Zombie02_Shoes",(0.025,0.025,0.025),.99)
EYE=mat("Zombie02_Eyes",(0.82,0.92,0.52),.28)

def cube(name,loc,scale,material,bevel=.06):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o=bpy.context.object
    o.name=name
    o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new("Bevel","BEVEL")
        mod.width=bevel
        mod.segments=2
    o.data.materials.append(material)
    return o

def sphere(name,loc,scale,material):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=loc)
    o=bpy.context.object
    o.name=name
    o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(material)
    return o

def cyl(name,loc,radius,depth,material,rot=(0,0,0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=radius,depth=depth,location=loc,rotation=rot)
    o=bpy.context.object
    o.name=name
    o.data.materials.append(material)
    return o

# Rig
bpy.ops.object.armature_add(enter_editmode=True,location=(0,0,0))
arm=bpy.context.object
arm.name="Zombie02_Rig"
arm.show_in_front=True
eb=arm.data.edit_bones
root=eb[0]
root.name="root"
root.head=(0,0,0)
root.tail=(0,0,.6)

def bone(name,head,tail,parent):
    b=eb.new(name); b.head=head; b.tail=tail; b.parent=parent; return b

hips=bone("hips",(0,0,.65),(0,0,1.2),root)
spine=bone("spine",(0,0,1.15),(0,0,2.15),hips)
neck=bone("neck",(0,0,2.08),(0,0,2.42),spine)
head=bone("head",(0,0,2.4),(0,0,3.1),neck)
uaL=bone("upper_arm.L",(.1,0,1.98),(.9,0,1.68),spine)
laL=bone("lower_arm.L",(.9,0,1.68),(1.5,0,1.36),uaL)
uaR=bone("upper_arm.R",(-.1,0,1.98),(-.9,0,1.72),spine)
laR=bone("lower_arm.R",(-.9,0,1.72),(-1.48,0,1.45),uaR)
ulL=bone("upper_leg.L",(.34,0,1.02),(.36,0,.15),hips)
llL=bone("lower_leg.L",(.36,0,.15),(.32,0,-.72),ulL)
ulR=bone("upper_leg.R",(-.34,0,1.02),(-.30,0,.12),hips)
llR=bone("lower_leg.R",(-.30,0,.12),(-.24,0,-.75),ulR)
bpy.ops.object.mode_set(mode='OBJECT')

parts=[]
parts.append((cube("Pelvis",(0,0,1.0),(.56,.34,.36),PANTS),"hips"))
parts.append((cube("Torso",(0,0,1.72),(.77,.42,.70),SHIRT),"spine"))
parts.append((sphere("Head",(0,0,2.68),(.48,.43,.52),SKIN),"head"))
parts.append((cube("Head_Wound",(.28,-.41,2.84),(.17,.04,.18),BLOOD,.02),"head"))
parts.append((sphere("Eye_L",(.16,-.40,2.75),(.075,.035,.075),EYE),"head"))
parts.append((sphere("Eye_R",(-.16,-.40,2.75),(.075,.035,.075),EYE),"head"))

parts.append((cyl("UpperArm_L",(.53,0,1.82),.24,.90,SKIN,(0,math.radians(64),0)),"upper_arm.L"))
parts.append((cyl("LowerArm_L",(1.20,0,1.48),.21,.82,SKIN,(0,math.radians(60),0)),"lower_arm.L"))
parts.append((cyl("UpperArm_R",(-.53,0,1.84),.24,.88,SHIRT,(0,math.radians(-66),0)),"upper_arm.R"))
parts.append((cyl("LowerArm_R",(-1.17,0,1.55),.21,.78,SKIN,(0,math.radians(-63),0)),"lower_arm.R"))

parts.append((cyl("Thigh_L",(.34,0,.60),.29,.95,PANTS),"upper_leg.L"))
parts.append((cyl("Shin_L",(.32,0,-.30),.24,.92,SKIN),"lower_leg.L"))
parts.append((cube("Foot_L",(.32,-.18,-.80),(.31,.47,.18),SHOE),"lower_leg.L"))
parts.append((cyl("Thigh_R",(-.31,0,.58),.29,.98,PANTS),"upper_leg.R"))
parts.append((cyl("Shin_R",(-.24,0,-.32),.24,.94,SKIN),"lower_leg.R"))
parts.append((cube("Foot_R",(-.24,-.18,-.83),(.31,.47,.18),SHOE),"lower_leg.R"))

for obj,bone_name in parts:
    obj.parent=arm
    obj.parent_type='BONE'
    obj.parent_bone=bone_name

# Hunched pose
bpy.context.view_layer.objects.active=arm
arm.select_set(True)
bpy.ops.object.mode_set(mode='POSE')
arm.pose.bones["spine"].rotation_mode='XYZ'
arm.pose.bones["spine"].rotation_euler[0]=math.radians(17)
arm.pose.bones["head"].rotation_mode='XYZ'
arm.pose.bones["head"].rotation_euler[2]=math.radians(9)
bpy.ops.object.mode_set(mode='OBJECT')

# Godot-friendly overall scale
for o in [arm]+[p[0] for p in parts]:
    o.scale*=.62

bpy.ops.object.select_all(action='DESELECT')
for o in [arm]+[p[0] for p in parts]:
    o.select_set(True)
bpy.context.view_layer.objects.active=arm

print("Zombie_02 Heavy blockout created.")
print("Export selected as GLB to godot/assets/zombie_02.glb")
