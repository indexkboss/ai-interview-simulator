"""
test_report.py
--------------
Teste le rapport final sans avoir besoin d'Ollama.
Lance depuis backend/interview/ :
    python test_report.py
"""

import sys, os, json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "routers"))

G="\033[92m"; R="\033[91m"; Y="\033[93m"; B="\033[94m"; X="\033[0m"; BOLD="\033[1m"
def ok(m):   print(f"  {G}OK{X}   {m}")
def fail(m): print(f"  {R}FAIL{X} {m}")
def info(m): print(f"  {B}-->{X}  {m}")
def sec(t):
    print(f"\n{BOLD}{Y}{'─'*55}{X}")
    print(f"{BOLD}{Y}  {t}{X}")
    print(f"{BOLD}{Y}{'─'*55}{X}")


def make_request(
    dominant_valence="neutral",
    stress_label="moderate",
    vision_stress=0.35,
    audio_stress=0.30,
    avg_eye_contact=0.75,
    posture_score=0.72,
    posture_label="fair",
    shoulder_alignment=0.80,
    spine_alignment=0.85,
    head_stability=0.88,
    tilt_angle=2.5,
):
    """Construit un ReportRequest simulé."""
    from report import (
        ReportRequest, QAItem, EmotionLogItem,
        PostureData, HeadData, StressBreakdown
    )
    return ReportRequest(
        answers=[
            QAItem(question="Parlez-moi de vous.", answer="Je suis étudiant en IA et Data, passionné par le machine learning et les projets académiques."),
            QAItem(question="Quels sont vos points forts ?", answer="Je suis rigoureux, curieux et j'aime résoudre des problèmes complexes avec Python."),
            QAItem(question="Où vous voyez-vous dans 5 ans ?", answer="Je souhaite devenir data scientist senior dans une entreprise innovante."),
        ],
        emotion_log=[
            EmotionLogItem(time=0,  emotion="neutral"),
            EmotionLogItem(time=5,  emotion="neutral"),
            EmotionLogItem(time=10, emotion="happy"),
            EmotionLogItem(time=15, emotion="neutral"),
            EmotionLogItem(time=20, emotion="fear"),
        ],
        duration=180,
        job_title="Data Scientist",
        interview_type="hr",
        vision_stress_score=vision_stress,
        audio_stress_score=audio_stress,
        dominant_valence=dominant_valence,
        avg_eye_contact=avg_eye_contact,
        posture=PostureData(
            posture_score=posture_score,
            posture_label=posture_label,
            shoulder_alignment=shoulder_alignment,
            head_tilt=0.85,
            forward_lean=0.60,
            spine_alignment=spine_alignment,
        ),
        head_pose=HeadData(
            head_stability=head_stability,
            tilt_angle=tilt_angle,
            vertical_angle=1.5,
        ),
        stress_breakdown=StressBreakdown(
            emotion_contribution=vision_stress * 0.40,
            eye_contribution=vision_stress * 0.20,
            head_contribution=vision_stress * 0.20,
            posture_contribution=vision_stress * 0.20,
        ),
        stress_label=stress_label,
    )


def test_fallback_structure():
    sec("1. Structure du rapport fallback")
    try:
        from report import _fallback_report
        req = make_request()
        r = _fallback_report(req)

        required_keys = [
            "score_global", "points_forts", "axes_amelioration",
            "analyse_langage_corporel", "analyse_stress",
            "feedback_par_question", "conseil_final"
        ]
        missing = [k for k in required_keys if k not in r]
        if missing:
            fail(f"Clés manquantes : {missing}"); return False

        body = r["analyse_langage_corporel"]
        body_keys = ["resume","contact_visuel","posture","stabilite","impact_global"]
        missing_body = [k for k in body_keys if k not in body]
        if missing_body:
            fail(f"analyse_langage_corporel — clés manquantes : {missing_body}"); return False

        stress = r["analyse_stress"]
        stress_keys = ["niveau","interpretation","conseil"]
        missing_stress = [k for k in stress_keys if k not in stress]
        if missing_stress:
            fail(f"analyse_stress — clés manquantes : {missing_stress}"); return False

        ok("Toutes les clés présentes")
        assert 0 <= r["score_global"] <= 100, f"score_global={r['score_global']} hors [0,100]"
        ok(f"score_global = {r['score_global']}")
        assert len(r["points_forts"]) >= 1
        ok(f"points_forts ({len(r['points_forts'])}) : {r['points_forts']}")
        assert len(r["axes_amelioration"]) >= 1
        ok(f"axes_amelioration ({len(r['axes_amelioration'])}) : {r['axes_amelioration']}")
        ok(f"analyse_langage_corporel.resume : {body['resume'][:80]}...")
        ok(f"analyse_stress.niveau : {stress['niveau']}")
        ok(f"conseil_final : {r['conseil_final'][:80]}...")
        return True
    except Exception as e:
        fail(f"{type(e).__name__}: {e}"); return False


def test_three_profiles():
    sec("2. Test 3 profils candidats différents")
    from report import _fallback_report

    profiles = [
        {
            "name": "Candidat confiant (stress faible)",
            "kwargs": dict(dominant_valence="positive", stress_label="low",
                          vision_stress=0.18, avg_eye_contact=0.90,
                          posture_score=0.85, posture_label="good",
                          head_stability=0.92, tilt_angle=1.5),
            "expect_stress": "faible",
        },
        {
            "name": "Candidat moyen (stress modéré)",
            "kwargs": dict(dominant_valence="neutral", stress_label="moderate",
                          vision_stress=0.38, avg_eye_contact=0.65,
                          posture_score=0.65, posture_label="fair",
                          head_stability=0.72, tilt_angle=8.0),
            "expect_stress": "modéré",
        },
        {
            "name": "Candidat très stressé",
            "kwargs": dict(dominant_valence="negative", stress_label="very_high",
                          vision_stress=0.82, avg_eye_contact=0.35,
                          posture_score=0.30, posture_label="poor",
                          head_stability=0.40, tilt_angle=25.0),
            "expect_stress": "très élevé",
        },
    ]

    all_ok = True
    for p in profiles:
        try:
            req = make_request(**p["kwargs"])
            r = _fallback_report(req)
            assert r["analyse_stress"]["niveau"] == p["expect_stress"], \
                f"Attendu '{p['expect_stress']}', eu '{r['analyse_stress']['niveau']}'"
            ok(f"{p['name']} → score={r['score_global']}  stress={r['analyse_stress']['niveau']}")
            info(f"  points_forts[0]  : {r['points_forts'][0]}")
            info(f"  axes[0]          : {r['axes_amelioration'][0]}")
            info(f"  conseil_stress   : {r['analyse_stress']['conseil'][:70]}...")
        except Exception as e:
            fail(f"{p['name']} → {type(e).__name__}: {e}")
            all_ok = False
    return all_ok


def test_score_coherence():
    sec("3. Cohérence du score global")
    from report import _fallback_report

    r_good = _fallback_report(make_request(
        vision_stress=0.15, avg_eye_contact=0.92, posture_score=0.88,
        posture_label="good", head_stability=0.95
    ))
    r_poor = _fallback_report(make_request(
        vision_stress=0.80, avg_eye_contact=0.30, posture_score=0.20,
        posture_label="poor", head_stability=0.35
    ))

    info(f"Score bon profil  : {r_good['score_global']}")
    info(f"Score mauvais profil : {r_poor['score_global']}")

    if r_good["score_global"] > r_poor["score_global"]:
        ok("Score bon profil > score mauvais profil ✓")
        return True
    else:
        fail(f"Incohérence : {r_good['score_global']} <= {r_poor['score_global']}")
        return False


def test_prompt_structure():
    sec("4. Structure du prompt Ollama")
    try:
        from report import _build_report_prompt
        req = make_request()
        prompt = _build_report_prompt(req)

        checks = [
            ("Données entretien",      "DONNÉES ENTRETIEN"),
            ("Analyse non-verbale",    "ANALYSE NON-VERBALE"),
            ("Réponses candidat",      "RÉPONSES DU CANDIDAT"),
            ("JSON template",          "score_global"),
            ("Langage corporel",       "analyse_langage_corporel"),
            ("Analyse stress",         "analyse_stress"),
            ("Feedback questions",     "feedback_par_question"),
            ("Conseil final",          "conseil_final"),
        ]
        all_ok = True
        for name, keyword in checks:
            if keyword in prompt:
                ok(f"'{name}' présent dans le prompt")
            else:
                fail(f"'{name}' ABSENT du prompt (cherché: '{keyword}')")
                all_ok = False
        info(f"Longueur prompt : {len(prompt)} caractères")
        return all_ok
    except Exception as e:
        fail(f"{type(e).__name__}: {e}"); return False


def test_full_report_json():
    sec("5. Rapport complet — affichage JSON")
    try:
        from report import _fallback_report
        req = make_request(
            dominant_valence="neutral", stress_label="moderate",
            vision_stress=0.37, audio_stress=0.28,
            avg_eye_contact=0.75, posture_score=0.72,
            posture_label="fair", head_stability=0.88
        )
        r = _fallback_report(req)
        print(json.dumps(r, indent=2, ensure_ascii=False))
        ok("Rapport JSON affiché avec succès")
        return True
    except Exception as e:
        fail(f"{type(e).__name__}: {e}"); return False


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print(f"\n{BOLD}{'='*55}\n  TEST SUITE — RAPPORT FINAL\n{'='*55}{X}")

    results = {
        "structure fallback":  test_fallback_structure(),
        "3 profils candidats": test_three_profiles(),
        "cohérence scores":    test_score_coherence(),
        "structure prompt":    test_prompt_structure(),
        "rapport JSON complet":test_full_report_json(),
    }

    sec("RÉSUMÉ FINAL")
    for name, passed in results.items():
        tag = f"{G}PASS{X}" if passed else f"{R}FAIL{X}"
        print(f"  [{tag}]  {name}")
    nb = sum(results.values())
    print(f"\n{BOLD}  {nb}/{len(results)} tests OK{X}")
    if nb == len(results):
        print(f"{G}{BOLD}  Tous les tests passent !{X}\n")
    else:
        print(f"{Y}{BOLD}  Lis les erreurs ci-dessus.{X}\n")

if __name__ == "__main__":
    main()