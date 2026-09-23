extends CharacterBody3D

signal health_changed(value: int)
signal died
signal shot

@export var move_speed := 6.0
@export var acceleration := 18.0
@export var mouse_sensitivity := 0.0022
@export var max_health := 100
@export var weapon_damage := 34
@export var fire_delay := 0.28
@export var weapon_range := 70.0

@onready var camera: Camera3D = $Camera3D
@onready var muzzle_flash: OmniLight3D = $Camera3D/Weapon/MuzzleFlash

var health := 100
var pitch := 0.0
var fire_cooldown := 0.0
var flash_timer := 0.0
var can_control := true

func _ready() -> void:
	add_to_group("player")
	health = max_health
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	health_changed.emit(health)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseMotion and can_control and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * mouse_sensitivity)
		pitch = clamp(pitch - event.relative.y * mouse_sensitivity, deg_to_rad(-72.0), deg_to_rad(72.0))
		camera.rotation.x = pitch

	if event is InputEventKey and event.pressed and event.keycode == KEY_ESCAPE:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		else:
			shoot()

func _physics_process(delta: float) -> void:
	if fire_cooldown > 0.0:
		fire_cooldown -= delta

	if flash_timer > 0.0:
		flash_timer -= delta
		if flash_timer <= 0.0:
			muzzle_flash.visible = false

	if not can_control:
		velocity.x = move_toward(velocity.x, 0.0, acceleration * delta)
		velocity.z = move_toward(velocity.z, 0.0, acceleration * delta)
		move_and_slide()
		return

	var input_vec := Vector2.ZERO
	if Input.is_key_pressed(KEY_A):
		input_vec.x -= 1.0
	if Input.is_key_pressed(KEY_D):
		input_vec.x += 1.0
	if Input.is_key_pressed(KEY_W):
		input_vec.y += 1.0
	if Input.is_key_pressed(KEY_S):
		input_vec.y -= 1.0

	input_vec = input_vec.normalized()
	var basis_forward := -global_transform.basis.z
	var basis_right := global_transform.basis.x
	var move_dir := (basis_right * input_vec.x + basis_forward * input_vec.y)
	move_dir.y = 0.0
	move_dir = move_dir.normalized()

	var target_x := move_dir.x * move_speed
	var target_z := move_dir.z * move_speed
	velocity.x = move_toward(velocity.x, target_x, acceleration * delta)
	velocity.z = move_toward(velocity.z, target_z, acceleration * delta)

	if not is_on_floor():
		velocity.y -= 24.0 * delta
	else:
		velocity.y = -0.5

	if Input.is_key_pressed(KEY_SPACE):
		shoot()

	move_and_slide()

func shoot() -> void:
	if not can_control or fire_cooldown > 0.0:
		return

	fire_cooldown = fire_delay
	muzzle_flash.visible = true
	flash_timer = 0.055
	shot.emit()

	var from := camera.global_position
	var to := from + (-camera.global_transform.basis.z * weapon_range)
	var query := PhysicsRayQueryParameters3D.create(from, to)
	query.exclude = [self]
	query.collide_with_areas = true
	query.collide_with_bodies = true

	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	if hit.is_empty():
		return

	var target = hit.get("collider")
	if target and target.has_method("take_damage"):
		target.take_damage(weapon_damage)

func take_damage(amount: int) -> void:
	if health <= 0:
		return

	health = max(0, health - amount)
	health_changed.emit(health)

	if health <= 0:
		can_control = false
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		died.emit()
