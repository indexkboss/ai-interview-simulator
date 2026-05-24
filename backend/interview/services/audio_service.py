from ..audio.pipeline import process_audio


def handle_audio_upload(file_path):
    """
    Service layer (clean architecture)
    """

    result = process_audio(file_path)

    return {
        "status": "success",
        "data": result
    }