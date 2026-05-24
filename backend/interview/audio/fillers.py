import re

FRENCH_FILLERS = {
    "euh":          [r"\beuh+\b", r"\bheu+\b", r"\beu+h*\b", r"\be\b"],  # ← \be\b pour la lettre seule
    "heu":          [r"\bh?eu+h?\b"],
    "bah":          [r"\bbah\b"],
    "ben":          [r"\bben\b", r"\bbeh\b"],
    # "bon":          [r"\bbon\b"],
    # "voilà":        [r"\bvoil[aà]\b"],
    # "donc":         [r"\bdonc\b"],
    # "en fait":      [r"\ben fait\b"],
    "genre":        [r"\bgenre\b"],
    "du coup":      [r"\bdu coup\b"],
    "tu vois":      [r"\btu vois\b"],
    "comment dire": [r"\bcomment dire\b"],
    "quoi":         [r"\bquoi\b"],
    "enfin":        [r"\benfin\b"],
    # "c'est-à-dire": [r"\bc'est.à.dire\b"],
    "okay":         [r"\bokay\b", r"\bok\b"],
    # ── Nouveaux mots à éviter en entretien ──────────────────
    # "franchement":  [r"\bfranchement\b"],
    # "sincèrement":  [r"\bsincèrement\b"],
    # "honnêtement":  [r"\bhonnêtement\b"],   # signale manque de confiance
    "peut-être":    [r"\bpeut.être\b"],      # montre hésitation
    "je sais pas":  [r"\bje sais pas\b", r"\bchais pas\b", r"\bsais pas\b"],
    "en gros":      [r"\ben gros\b"],
    "style":        [r"\bstyle\b"],          # argot
    "truc":         [r"\btruc\b", r"\bmachin\b"],  # vague
    "chose":        [r"\bla chose\b", r"\bune chose\b"],
    "normalement":  [r"\bnormalement\b"],    # imprécis
    "carrément":    [r"\bcarrément\b"],      # argot
    # "clairement":   [r"\bclairement\b"],     # sur-utilisé
    "basiquement":  [r"\bbasiquement\b"],    # franglais
    "du genre":     [r"\bdu genre\b"],
    "ouais":        [r"\bouais\b"],          # informel
    "ouai":         [r"\bouai\b"],
    "nan":          [r"\bnan\b"],            # informel pour "non"
    "wesh":         [r"\bwesh\b"],           # argot
    # "trop":         [r"\btrop\b"],           # sur-utilisé
}


def detect_fillers(text: str) -> dict:
    text_lower = text.lower()
    words = text_lower.split()

    filler_count = 0
    detected = []

    for filler_name, patterns in FRENCH_FILLERS.items():
        count = 0
        for pattern in patterns:
            try:
                count += len(re.findall(pattern, text_lower))
            except re.error:
                pass
        if count > 0:
            detected.append({"word": filler_name, "count": count})
            filler_count += count

    # Détection répétitions (bégaiement)
    repetitions = 0
    for i in range(1, len(words)):
        if words[i] == words[i-1] and len(words[i]) > 2:
            repetitions += 1
    if repetitions > 0:
        detected.append({"word": "répétitions", "count": repetitions})
        filler_count += repetitions

    return {
        "filler_count": filler_count,
        "filler_ratio": round(filler_count / len(words), 3) if words else 0,
        "details": detected,
        "total_words": len(words)
    }