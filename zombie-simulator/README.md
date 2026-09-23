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

## الخطوة التالية
نجهز 3 حركات أساسية:
1. Idle
2. Walk
3. Attack
