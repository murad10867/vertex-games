extends CharacterBody3D

signal attacked_player(damage: int)
signal died(points: int)

@export var move_speed := 2.6
@export var max_health := 100
@export var attack_damage := 12
@export var attack_distance := 1.65
@export var attack_delay := 1.0
@export var points := 100
@export var model_path := "res://assets/zombie.glb"

@onready var fallback: Node3D = $Fallback
@onready var model_root: Node3D = $ModelRoot

var health := 100
var player: Node3D
var attack_timer := 0.0
var animation_player: AnimationPlayer
var dead := false

func _ready() -> void:
	health = max_health
	add_to_group("zombie")
	player = get_tree().get_first_node_in_group("player")
	_load_model()
	_play_animation("Idle")

func _physics_process(delta: float) -> void:
	if dead:
		return

	if not is_instance_valid(player):
		player = get_tree().get_first_node_in_group("player")
		return

	attack_timer = max(0.0, attack_timer - delta)
	var flat_target := Vector3(player.global_position.x, global_position.y, player.global_position.z)
	var distance := global_position.distance_to(flat_target)

	if distance > attack_distance:
		var dir := global_position.direction_to(flat_target)
		velocity.x = dir.x * move_speed
		velocity.z = dir.z * move_speed

		if dir.length_squared() > 0.001:
			look_at(flat_target, Vector3.UP)

		_play_animation("Walk")
	else:
		velocity.x = move_toward(velocity.x, 0.0, 10.0 * delta)
		velocity.z = move_toward(velocity.z, 0.0, 10.0 * delta)

		if attack_timer <= 0.0:
			attack_timer = attack_delay
			_play_animation("Attack")
			attacked_player.emit(attack_damage)

	if not is_on_floor():
		velocity.y -= 24.0 * delta
	else:
		velocity.y = -0.5

	move_and_slide()

func take_damage(amount: int) -> void:
	if dead:
		return

	health -= amount
	if health <= 0:
		dead = true
		velocity = Vector3.ZERO
		died.emit(points)
		queue_free()

func set_difficulty(wave: int) -> void:
	max_health = 85 + wave * 14
	health = max_health
	move_speed = min(4.4, 2.3 + wave * 0.12)
	attack_damage = min(28, 9 + wave * 2)
	points = 80 + wave * 20

func _load_model() -> void:
	if not ResourceLoader.exists(model_path):
		return

	var packed = load(model_path)
	if packed is PackedScene:
		var model = packed.instantiate()
		model_root.add_child(model)
		fallback.visible = false
		_find_animation_player(model)

func _find_animation_player(node: Node) -> void:
	if animation_player:
		return
	if node is AnimationPlayer:
		animation_player = node
		return
	for child in node.get_children():
		_find_animation_player(child)

func _play_animation(wanted: String) -> void:
	if not animation_player:
		return

	for animation_name in animation_player.get_animation_list():
		if String(animation_name).to_lower().contains(wanted.to_lower()):
			if animation_player.current_animation != String(animation_name):
				animation_player.play(animation_name, 0.18)
			return
