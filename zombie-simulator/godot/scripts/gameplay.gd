extends Node3D

const ZOMBIE_SCENE := preload("res://scenes/zombie_enemy.tscn")

@onready var player = $Player
@onready var health_label: Label = $HUD/Health
@onready var wave_label: Label = $HUD/Wave
@onready var score_label: Label = $HUD/Score
@onready var zombies_label: Label = $HUD/Zombies
@onready var game_over: Control = $HUD/GameOver

var wave := 1
var score := 0
var alive_zombies := 0
var wave_pending := false

func _ready() -> void:
	player.health_changed.connect(_on_player_health_changed)
	player.died.connect(_on_player_died)
	_on_player_health_changed(player.health)
	_spawn_wave()

func _process(_delta: float) -> void:
	if game_over.visible and Input.is_key_pressed(KEY_R):
		get_tree().reload_current_scene()

func _spawn_wave() -> void:
	wave_pending = false
	var count := min(4 + wave * 2, 24)
	alive_zombies = count

	for i in range(count):
		var zombie = ZOMBIE_SCENE.instantiate()
		var angle := TAU * float(i) / float(max(1, count))
		var radius := 18.0 + float((i * 7) % 10)
		zombie.position = Vector3(cos(angle) * radius, 0.9, sin(angle) * radius)
		add_child(zombie)

		zombie.set_difficulty(wave)
		zombie.attacked_player.connect(_on_zombie_attack)
		zombie.died.connect(_on_zombie_died)

	_update_hud()

func _on_player_health_changed(value: int) -> void:
	health_label.text = "الصحة: %d" % value

func _on_zombie_attack(damage: int) -> void:
	player.take_damage(damage)

func _on_zombie_died(points: int) -> void:
	alive_zombies = max(0, alive_zombies - 1)
	score += points
	_update_hud()

	if alive_zombies == 0 and not wave_pending:
		wave_pending = true
		await get_tree().create_timer(1.2).timeout
		if is_instance_valid(player) and player.health > 0:
			wave += 1
			_spawn_wave()

func _on_player_died() -> void:
	game_over.visible = true
	game_over.get_node("Panel/Result").text = "النقاط: %d   |   الموجة: %d" % [score, wave]

func _update_hud() -> void:
	wave_label.text = "الموجة: %d" % wave
	score_label.text = "النقاط: %d" % score
	zombies_label.text = "الزومبي: %d" % alive_zombies
