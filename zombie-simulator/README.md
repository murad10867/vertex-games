# Zombie Simulator — Model Blockout

بدأنا تطوير Zombie Simulator باستخدام **Blender + Godot 4.7**.

## المرحلة الحالية
أول موديل: **Zombie_01** منخفض التفاصيل (Low Poly) ومجهز بهيكل عظام أولي.

## ملفات المشروع
- `blender/zombie_model.py` — سكربت Blender يصنع موديل الزومبي والـRig.
- `godot/project.godot` — مشروع Godot 4.7.
- `godot/scenes/zombie_preview.tscn` — مشهد معاينة.
- `godot/scripts/zombie_preview.gd` — يحمل موديل GLB تلقائياً.
- ضع التصدير النهائي في `godot/assets/zombie.glb`.

## تشغيل سكربت Blender
1. افتح Blender.
2. افتح تبويب **Scripting**.
3. افتح ملف `blender/zombie_model.py`.
4. اضغط **Run Script**.
5. احفظ ملف Blender باسم `Zombie_01.blend`.
6. حدد الزومبي والـRig فقط.
7. File → Export → glTF 2.0.
8. اختر **GLB** وفعّل **Selected Objects**.
9. احفظه باسم `zombie.glb` داخل `godot/assets/`.

## الشكل الأول
- جسم بشري منخفض التفاصيل.
- جلد أخضر/رمادي.
- ملابس قديمة.
- جرح في الصدر والذراع.
- وقفة منحنية.
- Rig أولي للرأس والذراعين والرجلين.

## الحركات الأساسية — تمت إضافتها
سكربت Blender الآن ينشئ 3 حركات تلقائياً:
1. **Idle** — تنفس وحركة رأس خفيفة.
2. **Walk** — مشية زومبي غير متوازنة.
3. **Attack** — اندفاع بالذراعين للأمام.

بعد تشغيل سكربت Blender، صدّر GLB مع **Animations** مفعّلة وضعه في:
`godot/assets/zombie.glb`

داخل Godot:
- اضغط **1** لتشغيل Idle.
- اضغط **2** لتشغيل Walk.
- اضغط **3** لتشغيل Attack.

## الخطوة التالية
نجهز **Zombie_02** بشكل مختلف، ثم نبدأ مشهد اللعب: اللاعب + الزومبي + المطاردة والهجوم.
