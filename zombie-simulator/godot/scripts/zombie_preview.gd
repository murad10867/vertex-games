extends Node3D

@onready var zombie_spawn: Node3D = $ZombieSpawn
@onready var camera: Camera3D = $Camera3D

var zombie: Node3D
var orbit := 0.0

func _ready() -> void:
	var path := "res://assets/zombie.glb"
	if ResourceLoader.exists(path):
		var packed := load(path)
		if packed is PackedScene:
			zombie = packed.instantiate()
			zombie_spawn.add_child(zombie)
			zombie.position = Vector3.ZERO
			print("Zombie model loaded.")
	else:
		print("Waiting for res://assets/zombie.glb exported from Blender.")

func _process(delta: float) -> void:
	orbit += delta * 0.22
	if zombie:
		zombie.rotation.y += delta * 0.18

	var target := Vector3(0, 1.0, 0)
	camera.look_at(target, Vector3.UP)
