import json, hashlib, os, sys, time, urllib.request

VOICE_ID = "BtWabtumIemAotTjP5sk"
key = os.environ["ELEVENLABS_API_KEY"].strip()
norm = lambda t: t.strip().lower()
fname = lambda t: hashlib.sha1(norm(t).encode()).hexdigest()[:12] + ".mp3"

words = [norm(w) for w in open("words.txt").read().splitlines() if w.strip()]
manifest = json.load(open("audio/manifest.json"))
added = 0
for w in dict.fromkeys(words):
    if w in manifest and os.path.exists("audio/" + manifest[w]):
        continue
    body = json.dumps({"text": w, "model_id": "eleven_v3", "voice_settings": {"stability": 0.5}}).encode()
    for attempt in range(4):
        try:
            req = urllib.request.Request(
                f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}?output_format=mp3_44100_64",
                body, {"xi-api-key": key, "Content-Type": "application/json"})
            data = urllib.request.urlopen(req, timeout=60).read()
            open("audio/" + fname(w), "wb").write(data)
            manifest[w] = fname(w)
            added += 1
            break
        except Exception as e:
            detail = e.read()[:200] if hasattr(e, "read") else ""
            print("retry", w, e, detail, "keylen", len(key), file=sys.stderr)
            time.sleep(4 * (attempt + 1))
    else:
        print("FAILED", w, file=sys.stderr)
json.dump(manifest, open("audio/manifest.json", "w"), indent=0)
print("added", added)
