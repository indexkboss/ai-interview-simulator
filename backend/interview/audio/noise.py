import noisereduce as nr
import librosa
import soundfile as sf

def reduce_noise(file_path):
    y, sr = librosa.load(file_path)

    reduced_noise = nr.reduce_noise(y=y, sr=sr)

    output_path = file_path.replace(".wav", "_clean.wav")
    sf.write(output_path, reduced_noise, sr)

    return output_path