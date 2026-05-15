# import numpy as np

# def compute_audio_stress(audio_result):
#     scores = {r["label"]: r["score"] for r in audio_result}

#     weights = {
#         "ang": 0.5,
#         "sad": 0.3,
#         "neu": 0.1,
#         "hap": -0.4
#     }

#     stress = 0

#     for k, w in weights.items():
#         stress += scores.get(k, 0) * w

#     # sigmoid normalization
#     stress = 1 / (1 + np.exp(-stress * 5))

#     return float(stress)


# def compute_stress(audio_result=None, image_result=None):
#     audio_stress = 0
#     image_stress = 0

#     # AUDIO
#     if audio_result:
#         audio_stress = compute_audio_stress(audio_result)

#     # IMAGE
#     if image_result:
#         img = {r["label"]: r["score"] for r in image_result}

#         image_stress = (
#             img.get("sad", 0) * 0.4 +
#             img.get("angry", 0) * 0.6
#         )

#     # FUSION
#     final_stress = 0.7 * audio_stress + 0.3 * image_stress

#     # LEVEL
#     if final_stress < 0.35:
#         level = "CALM 🟢"
#     elif final_stress < 0.65:
#         level = "MODERATE 🟠"
#     else:
#         level = "HIGH 🔴"

#     return {
#         "stress_score": round(final_stress, 3),
#         "stress_level": level
#     }

#hada blach meno merci mmais gha khlih la 7tajinah