import numpy as np
from .audio_features import extract_features

def normalize(value, min_v, max_v):
    return np.clip((value - min_v) / (max_v - min_v), 0, 1)

def compute_stress_v2(audio_path):
    f = extract_features(audio_path)

    energy = f["energy"]
    pitch = f["pitch"]
    zcr = f["zcr"]
    mfcc = f["mfcc"]

    # 🔥 NORMALISATION RÉALISTE (IMPORTANT)
    energy_score = normalize(energy, 0.01, 0.3)   # voix humaine
    pitch_score = normalize(pitch, 80, 400)       # plage réaliste
    instability = normalize(zcr, 0.01, 0.2)

    mfcc_score = normalize(np.mean(np.abs(mfcc)), 10, 60)

    # 🔥 fusion plus stable
    stress = (
        energy_score * 0.25 +
        pitch_score * 0.25 +
        instability * 0.25 +
        mfcc_score * 0.25
    )

    # sigmoid smoothing
    stress = 1 / (1 + np.exp(-6 * (stress - 0.5)))

    if stress < 0.4:
        level = "CALM 🟢"
    elif stress < 0.65:
        level = "MODERATE 🟠"
    else:
        level = "HIGH 🔴"

    return {
        "stress_score": round(float(stress), 3),
        "stress_level": level,
        "features": {
            "energy": float(energy),
            "pitch": float(pitch),
            "zcr": float(zcr)
        }
    }