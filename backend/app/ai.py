import json
import os
import urllib.error
import urllib.request

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY") or os.environ.get("VISION_API_KEY", "")
HF_TOKEN = os.environ.get("HF_TOKEN", "")

DAMAGE_KEYWORDS: dict[str, list[str]] = {
    "illegal_dumping": ["trash", "garbage", "waste", "dump", "rubbish", "debris", "litter", "refuse",
                         "landfill", "rubbish dump", "pile of trash", "waste disposal", "scrap",
                         "junk", "illegal dumping", "dumpsite", "garbage dump", "dump site"],
    "flooding": ["flood", "flooded", "standing water", "submerged", "water", "inundated",
                  "floodwater", "flood water", "overflow", "swamp", "underwater"],
    "erosion": ["erosion", "eroded", "landslide", "gully", "mudslide", "landslip",
                 "soil erosion", "bare soil", "exposed soil", "collapsed earth", "scour"],
    "water_pollution": ["water pollution", "polluted water", "oil spill", "oil sheen", "foam",
                         "discolored water", "algae bloom", "industrial discharge", "dead fish",
                         "sewage", "effluent", "contaminated water", "chemical spill"],
    "deforestation": ["deforestation", "deforested", "cleared forest", "logging", "stump",
                       "stumps", "burned vegetation", "burned forest", "cleared land", "cut trees",
                       "tree stumps", "slash and burn", "forest fire damage"],
}

SEVERITY_KEYWORDS: dict[str, list[str]] = {
    "high": ["severe", "extensive", "large", "massive", "heavy", "critical", "major", "catastrophic",
              "widespread", "deep", "toxic", "hazardous"],
    "medium": ["moderate", "significant", "noticeable", "partial", "some", "several"],
}

GEMINI_PROMPT = """You are an environmental damage classifier. Analyze the image and return ONLY valid JSON with no markdown formatting:

{
  "damage_type": "illegal_dumping" | "flooding" | "erosion" | "water_pollution" | "deforestation" | "",
  "severity_level": "low" | "medium" | "high",
  "description": "short 1-sentence description in English",
  "confidence": 0.0-1.0
}"""


def _parse_json(text: str) -> dict | None:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1].rsplit("```", 1)[0]
        if text.startswith("json"):
            text = text[4:]
    try:
        parsed = json.loads(text)
        return {
            "damage_type": parsed.get("damage_type", ""),
            "severity_level": parsed.get("severity_level", ""),
            "ai_description": parsed.get("description", ""),
            "ai_confidence": parsed.get("confidence", 0.0),
        }
    except json.JSONDecodeError:
        return None


def _classify_from_caption(caption: str) -> dict:
    caption_lower = caption.lower()
    best_type = ""
    best_score = 0
    for dtype, keywords in DAMAGE_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in caption_lower)
        if score > best_score:
            best_score = score
            best_type = dtype

    best_severity = "low"
    for sev, keywords in SEVERITY_KEYWORDS.items():
        if any(kw in caption_lower for kw in keywords):
            best_severity = sev
            break

    confidence = min(0.5 + best_score * 0.1, 0.95)
    if best_score == 0:
        confidence = 0.2

    return {
        "damage_type": best_type,
        "severity_level": best_severity,
        "ai_description": caption,
        "ai_confidence": round(confidence, 2),
    }


def _call_gemini(image_bytes: bytes) -> dict | None:
    if not GEMINI_API_KEY:
        return None
    import base64
    b64 = base64.b64encode(image_bytes).decode()
    body = json.dumps({
        "contents": [{
            "parts": [
                {"text": GEMINI_PROMPT},
                {"inline_data": {"mime_type": "image/jpeg", "data": b64}},
            ],
        }],
    }).encode()

    for model in ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-lite"]:
        url = f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent?key={GEMINI_API_KEY}"
        req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                result = json.loads(resp.read())
            text = result["candidates"][0]["content"]["parts"][0]["text"]
            parsed = _parse_json(text)
            if parsed:
                return parsed
        except urllib.error.HTTPError as e:
            err = e.read().decode()
            if e.code == 429 and "limit: 0" in err:
                print("[AI] Gemini quota exhausted")
                return None
            if e.code == 404:
                continue
            if e.code == 429:
                continue
        except Exception as e:
            print(f"[AI] Gemini error: {e}")
    return None


def _call_huggingface_caption(image_bytes: bytes) -> dict | None:
    if not HF_TOKEN:
        return None

    url = "https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base"
    req = urllib.request.Request(
        url, data=image_bytes,
        headers={
            "Authorization": f"Bearer {HF_TOKEN}",
            "Content-Type": "application/octet-stream",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read())
        if isinstance(result, list) and len(result) > 0:
            caption = result[0].get("generated_text", "")
            if caption:
                return _classify_from_caption(caption)
        if isinstance(result, dict) and "error" in result:
            print(f"[AI] HuggingFace error: {result['error']}")
            return None
    except urllib.error.HTTPError as e:
        err = e.read().decode()[:200]
        if e.code == 503:
            print("[AI] HuggingFace model loading, try again shortly")
        else:
            print(f"[AI] HuggingFace {e.code}: {err}")
    except Exception as e:
        print(f"[AI] HuggingFace error: {e}")
    return None


def _call_huggingface_classify(image_bytes: bytes) -> dict | None:
    if not HF_TOKEN:
        return None

    url = "https://api-inference.huggingface.co/models/google/vit-base-patch16-224"
    req = urllib.request.Request(
        url, data=image_bytes,
        headers={
            "Authorization": f"Bearer {HF_TOKEN}",
            "Content-Type": "application/octet-stream",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read())
        labels = [item["label"].lower() for item in result if isinstance(item, dict)]
        combined = " ".join(labels)
        return _classify_from_caption(combined)
    except urllib.error.HTTPError as e:
        if e.code == 503:
            pass
    except Exception:
        pass
    return None


def analyze_image(image_url: str) -> dict | None:
    try:
        req = urllib.request.Request(image_url, headers={"User-Agent": "TerraPulseAI/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            image_bytes = resp.read()
    except Exception as e:
        print(f"[AI] Failed to download image: {e}")
        return None

    result = _call_gemini(image_bytes)
    if result:
        print(f"[AI] Gemini → {result['damage_type']}")
        return result

    result = _call_huggingface_caption(image_bytes)
    if result:
        print(f"[AI] HF caption → {result['damage_type']} ({result['severity_level']}, {result['ai_confidence']})")
        return result

    result = _call_huggingface_classify(image_bytes)
    if result and result["damage_type"]:
        print(f"[AI] HF classify → {result['damage_type']}")
        return result

    print("[AI] No analysis available")
    return None
