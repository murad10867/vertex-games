extends Node3D

@onready var zombie_spawn: Node3D = $ZombieSpawn
@onready var camera: Camera3D = $Camera3D
@onready var animation_label: Label = $HUD/AnimationLabel

var zombie: Node3D
var animation_player: AnimationPlayer
var orbit := 0.0
var current_animation := "Idle"

func _ready() -> void:
	var path := "res://assets/zombie.glb"

	if ResourceLoader.exists(path):
		var packed := load(path)
		if packed is PackedScene:
			zombie = packed.instantiate()
			zombie_spawn.add_child(zombie)
			zombie.position = Vector3.ZERO
			_find_animation_player(zombie)
			_play_animation("Idle")
			print("Zombie model loaded.")
	else:
		animation_label.text = "بانتظار assets/zombie.glb من Blender"
		print("Waiting for res://assets/zombie.glb exported from Blender.")


func _process(delta: float) -> void:
	orbit += delta * 0.22

	var target := Vector3(0, 1.0, 0)
	camera.look_at(target, Vector3.UP)


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_1:
				_play_animation("Idle")
			KEY_2:
				_play_animation("Walk")
			KEY_3:
				_play_animation("Attack")


func _find_animation_player(node: Node) -> void:
	if node is AnimationPlayer:
		animation_player = node
		return

	for child in node.get_children():
		_find_animation_player(child)
		if animation_player:
			return


func _play_animation(name: String) -> void:
	current_animation = name

	if not animation_player:
		animation_label.text = "لا يوجد AnimationPlayer داخل GLB"
		return

	var selected := _find_animation_name(name)
	if selected.is_empty():
		animation_label.text = "الحركة غير موجودة: " + name
		return

	animation_player.play(selected, 0.18)

	if name == "Idle" or name == "Walk":
		var anim := animation_player.get_animation(selected)
		if anim:
			anim.loop_mode = Animation.LOOP_LINEAR

	animation_label.text = "الحركة: " + name + "   |   1 Idle   2 Walk   3 Attack"


func _find_animation_name(wanted: String) -> StringName:
	if not animation_player:
		return &""

	for name in animation_player.get_animation_list():
		if String(name).to_lower().contains(wanted.to_lower()):
			return name

	return &""
