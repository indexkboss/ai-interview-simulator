import os
from .noise import reduce_noise
from .whisper import transcribe_audio
from .fillers import detect_fillers
from .features import extract_audio_features
from .stress_audio import compute_audio_stress


def process_audio(file_path):
    """
    FULL AUDIO PIPELINE:
    audio -> clean -> transcription -> analysis -> stress score
    """

    print("🎤 Starting audio pipeline...")

    # 1. Noise reduction
    cleaned_path = reduce_noise(file_path)

    # 2. Speech to text (Whisper)
    transcript = transcribe_audio(cleaned_path)

    # 3. Filler words detection
    filler_data = detect_fillers(transcript)

    # 4. Audio features extraction
    features = extract_audio_features(cleaned_path)

    # 5. Stress analysis
    stress_score = compute_audio_stress(features, filler_data)

    return {
        "transcript": transcript,
        "fillers": filler_data,
        "features": features,
        "stress_score": stress_score
    }