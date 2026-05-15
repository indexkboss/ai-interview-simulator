from transformers import pipeline

audio_classifier = pipeline(
    task="audio-classification",
    model="superb/wav2vec2-base-superb-er"
)

def predict_audio_emotion(audio_path):

    result = audio_classifier(audio_path)

    return result



