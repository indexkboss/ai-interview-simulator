"""
test_vision.py
--------------
Lance depuis : backend/interview/
    python test_vision.py
    python test_vision.py --image temp_disgust.jpg
"""

import sys, os, json, argparse
import numpy as np
import cv2

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))   # = interview/
sys.path.insert(0, BASE_DIR)
sys.path.insert(0, os.path.join(BASE_DIR, "services"))
sys.path.insert(0, os.path.join(BASE_DIR, "vision"))

G="\033[92m"; R="\033[91m"; Y="\033[93m"; B="\033[94m"; X="\033[0m"; BOLD="\033[1m"
def ok(m):   print(f"  {G}OK{X}   {m}")
def fail(m): print(f"  {R}FAIL{X} {m}")
def info(m): print(f"  {B}-->{X}  {m}")
def sec(t):
    print(f"\n{BOLD}{Y}{'─'*55}{X}")
    print(f"{BOLD}{Y}  {t}{X}")
    print(f"{BOLD}{Y}{'─'*55}{X}")


def make_img(path):
    img = np.ones((480,640,3), dtype=np.uint8)*128
    cv2.ellipse(img,(320,200),(100,130),0,0,360,(220,190,160),-1)
    cv2.circle(img,(285,175),12,(50,50,50),-1)
    cv2.circle(img,(355,175),12,(50,50,50),-1)
    cv2.ellipse(img,(320,230),(40,15),0,0,180,(150,80,80),-1)
    cv2.rectangle(img,(220,330),(420,480),(100,140,180),-1)
    cv2.imwrite(path, img)
    info(f"Image synthétique : {path}")


def chk(r, keys, name):
    miss = [k for k in keys if k not in r]
    if miss: fail(f"{name} clés manquantes : {miss}"); return False
    return True

def rng(v, name, lo=0.0, hi=1.0):
    if not (lo<=v<=hi): fail(f"{name}={v} hors [{lo},{hi}]"); return False
    return True


# ── Tests ─────────────────────────────────────────────────────────────────────

def t_emotion(img):
    sec("1. emotion_model.py")
    try:
        from vision.emotion_model import predict_face_emotion
        ok("Import OK")
        r = predict_face_emotion(img)
        info(json.dumps(r, indent=4))
        if not chk(r,["dominant_emotion","emotions","emotion_stress",
                       "valence","confidence","face_detected"],"emotion"): return None
        rng(r["emotion_stress"],"emotion_stress"); rng(r["confidence"],"confidence")
        ok(f"dominant={r['dominant_emotion']}  stress={r['emotion_stress']}  valence={r['valence']}")
        return r
    except Exception as e: fail(f"{type(e).__name__}: {e}"); return None

def t_posture(img):
    sec("2. posture.py")
    try:
        from vision.posture import analyze_posture
        ok("Import OK")
        r = analyze_posture(img)
        info(json.dumps(r, indent=4))
        keys=["posture_score","posture_label","shoulder_alignment",
              "head_tilt","forward_lean","spine_alignment","pose_detected"]
        if not chk(r, keys, "posture"): return None
        for f in ["posture_score","shoulder_alignment","head_tilt","forward_lean","spine_alignment"]:
            rng(r[f], f)
        ok(f"score={r['posture_score']} label={r['posture_label']} detected={r['pose_detected']}")
        return r
    except Exception as e: fail(f"{type(e).__name__}: {e}"); return None

def t_eye(img):
    sec("3. eye_contact.py")
    try:
        from vision.eye_contact import analyze_eye_contact
        ok("Import OK")
        r = analyze_eye_contact(img)
        info(json.dumps(r, indent=4))
        if not chk(r,["eye_contact_score"],"eye"): return None
        rng(r["eye_contact_score"],"eye_contact_score")
        ok(f"eye_contact_score={r['eye_contact_score']}")
        return r
    except Exception as e: fail(f"{type(e).__name__}: {e}"); return None

def t_head(img):
    sec("4. head_pose.py")
    try:
        from vision.head_pose import analyze_head_pose
        ok("Import OK")
        r = analyze_head_pose(img)
        info(json.dumps(r, indent=4))
        if not chk(r,["head_stability"],"head"): return None
        rng(r["head_stability"],"head_stability")
        ok(f"head_stability={r['head_stability']}  tilt={r.get('tilt_angle')}°")
        return r
    except Exception as e: fail(f"{type(e).__name__}: {e}"); return None

def t_stress(emo, eye, head, pos):
    sec("5. stress_vision.py")
    try:
        from vision.stress_vision import compute_vision_stress
        ok("Import OK")
        emo = emo or {"dominant_emotion":"neutral","emotion_stress":0.2,"confidence":0.5,"face_detected":False}
        eye = eye or {"eye_contact_score":0.5}
        head= head or {"head_stability":0.5}
        pos = pos or {"posture_score":0.5,"pose_detected":False}
        r = compute_vision_stress(emo, eye, head, pos)
        info(json.dumps(r, indent=4))
        if not chk(r,["stress_score","stress_label","breakdown","confidence"],"stress"): return None
        rng(r["stress_score"],"stress_score")
        ok(f"stress={r['stress_score']}  label={r['stress_label']}")
        return r
    except Exception as e: fail(f"{type(e).__name__}: {e}"); return None

def t_service(img):
    sec("6. vision_service.py  (pipeline complet)")
    try:
        from services.vision_service import analyze_frame
        ok("Import OK")
        r = analyze_frame(img)
        info(f"Temps : {r.get('processing_time_ms')} ms")
        info(json.dumps(r, indent=4))
        if not chk(r,["emotion","eye_contact","head_pose","posture","stress",
                       "processing_time_ms"],"service"): return None
        ok(f"stress_score={r['stress']['stress_score']}  label={r['stress']['stress_label']}")
        return r
    except Exception as e: fail(f"{type(e).__name__}: {e}"); return None

def t_extreme():
    sec("7. Cas extrêmes (synthétiques)")
    try:
        from vision.stress_vision import compute_vision_stress
        s1 = compute_vision_stress(
            {"dominant_emotion":"fear","emotion_stress":0.85,"confidence":0.9,"face_detected":True},
            {"eye_contact_score":0.1},{"head_stability":0.1},{"posture_score":0.1,"pose_detected":True})
        assert s1["stress_score"] >= 0.6, f"attendu >=0.6 eu {s1['stress_score']}"
        ok(f"Très stressé  → {s1['stress_score']} ({s1['stress_label']})")

        s2 = compute_vision_stress(
            {"dominant_emotion":"happy","emotion_stress":0.05,"confidence":0.9,"face_detected":True},
            {"eye_contact_score":0.95},{"head_stability":0.95},{"posture_score":0.95,"pose_detected":True})
        assert s2["stress_score"] <= 0.35, f"attendu <=0.35 eu {s2['stress_score']}"
        ok(f"Détendu       → {s2['stress_score']} ({s2['stress_label']})")

        ok("Cas extrêmes OK")
    except AssertionError as e: fail(f"Assertion: {e}")
    except Exception as e:      fail(f"{type(e).__name__}: {e}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--image", default=None)
    args = p.parse_args()

    print(f"\n{BOLD}{'='*55}\n  TEST SUITE — MODULES VISION\n{'='*55}{X}")

    tmp = None
    if args.image and os.path.exists(args.image):
        img = args.image; info(f"Image : {img}")
    else:
        tmp = os.path.join(BASE_DIR,"_tmp_test.jpg")
        make_img(tmp); img = tmp

    emo_r = t_emotion(img)
    pos_r = t_posture(img)
    eye_r = t_eye(img)
    hd_r  = t_head(img)
    st_r  = t_stress(emo_r, eye_r, hd_r, pos_r)
    sv_r  = t_service(img)
    t_extreme()

    sec("RÉSUMÉ FINAL")
    res = {
        "emotion_model" : emo_r is not None,
        "posture"       : pos_r is not None,
        "eye_contact"   : eye_r is not None,
        "head_pose"     : hd_r  is not None,
        "stress_vision" : st_r  is not None,
        "vision_service": sv_r  is not None,
    }
    for name, passed in res.items():
        tag = f"{G}PASS{X}" if passed else f"{R}FAIL{X}"
        print(f"  [{tag}]  {name}")
    nb = sum(res.values())
    print(f"\n{BOLD}  {nb}/{len(res)} modules OK{X}")
    if nb == len(res): print(f"{G}{BOLD}  Tous les tests passent !{X}\n")
    else: print(f"{Y}{BOLD}  Lis les erreurs ci-dessus.{X}\n")

    if tmp and os.path.exists(tmp): os.unlink(tmp)

if __name__ == "__main__":
    main()