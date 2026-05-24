from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

from .audio.pipeline import process_audio
from .services.vision_service import analyze_face


@csrf_exempt
def analyze_audio(request):
    if request.method == "POST":
        file = request.FILES["audio"]

        path = f"temp_{file.name}"

        with open(path, "wb") as f:
            for chunk in file.chunks():
                f.write(chunk)

        result = process_audio(path)

        return JsonResponse(result)

@csrf_exempt
def analyze_face_api(request):

    if request.method == "POST":

        file = request.FILES["image"]

        path = f"temp_{file.name}"

        with open(path, "wb") as f:
            for chunk in file.chunks():
                f.write(chunk)

        result = analyze_face(path)

        return JsonResponse(result)