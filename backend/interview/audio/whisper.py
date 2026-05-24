import whisper

model = whisper.load_model("medium")  
def transcribe_audio(file_path):
    result = model.transcribe(file_path,language="fr")
    return result["text"]