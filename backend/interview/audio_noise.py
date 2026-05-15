import librosa
import noisereduce as nr
import soundfile as sf

def clean_audio(input_path, output_path="clean.wav"):
    y, sr = librosa.load(input_path, sr=16000)

    # réduction bruit
    reduced = nr.reduce_noise(y=y, sr=sr)

    sf.write(output_path, reduced, sr)

    return output_path