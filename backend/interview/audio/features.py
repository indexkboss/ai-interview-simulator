import librosa
import numpy as np


def extract_audio_features(file_path):

    y, sr = librosa.load(file_path)

    # -------------------
    # PITCH EXTRACTION
    # -------------------

    pitches, magnitudes = librosa.piptrack(y=y, sr=sr)

    pitch_values = pitches[pitches > 0]

    # Keep only human voice frequencies
    pitch_values = pitch_values[
        (pitch_values > 80) & (pitch_values < 400)
    ]

    if len(pitch_values) > 0:
        pitch_mean = np.mean(pitch_values)
        pitch_std = np.std(pitch_values)
    else:
        pitch_mean = 0
        pitch_std = 0

    # -------------------
    # ENERGY
    # -------------------

    energy = np.mean(librosa.feature.rms(y=y))

    # -------------------
    # DURATION
    # -------------------

    duration = librosa.get_duration(y=y, sr=sr)

    return {
        "pitch_mean": float(pitch_mean),
        "pitch_variation": float(pitch_std),
        "energy": float(energy),
        "duration": duration
    }