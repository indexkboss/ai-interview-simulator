import os

files = [
    "pose_landmarker.task",
    "face_landmarker.task"
]

base_dir = os.path.dirname(__file__)

print("🔍 Vérification des modèles...\n")

for f in files:
    path = os.path.join(base_dir, f)

    print(f"📄 Fichier : {f}")

    if os.path.exists(path):
        size = os.path.getsize(path)
        print("   ✅ Existe")

        if size > 0:
            print(f"   📦 Taille : {size} bytes (OK)")
        else:
            print("   ❌ Fichier vide !")
    else:
        print("   ❌ N'existe pas")

    print("-" * 40)