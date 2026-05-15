import librosa
import numpy as np

def extract_features(audio_path):
    y, sr = librosa.load(audio_path, sr=16000)

    # MFCC (voix texture)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    mfcc_mean = np.mean(mfcc, axis=1)

    # énergie (intensité voix)
    energy = np.mean(librosa.feature.rms(y=y))

    # pitch
    pitches, _ = librosa.piptrack(y=y, sr=sr)
    pitches = pitches[pitches > 0]
    pitch = np.mean(pitches) if len(pitches) > 0 else 0

    # instabilité
    zcr = np.mean(librosa.feature.zero_crossing_rate(y))

    return {
        "mfcc": mfcc_mean,
        "energy": float(energy),
        "pitch": float(pitch),
        "zcr": float(zcr)
    }