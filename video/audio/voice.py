"""Voiceover → timeline. Reads films/<film>/script.json, speaks every line (ElevenLabs by default, or a Microsoft
neural voice through edge-tts with "provider": "edge"), with word timings, lays the lines out and writes:

    out/<film>/vo.wav               the voiceover track (48 kHz mono)
    films/<film>/timeline.json      plates (one per line) and every animation cue, in seconds

Cues are written next to the words they belong to, so re-recording or rewording re-times the picture by itself:
    "word"        start of the first word in the line that contains "word"
    "word@end"    end of that word
    "start" / "end"  the line's first / last spoken moment
    any of these + or - an offset: "ובוחרים+0.2", "end-0.3", "start+0.5"

    python3 audio/voice.py contractor      (needs ffmpeg; edge-tts only for the edge provider)

ElevenLabs: set ELEVENLABS_API_KEY (needs only the text-to-speech permission). In the cloud environment the network
proxy injects the key instead, see KEY below.
"""
import asyncio
import hashlib
import json
import re
import ssl
import subprocess
import sys
import wave
from pathlib import Path

import base64
import os
import urllib.request

import numpy as np

CA = Path("/root/.ccr/ca-bundle.crt")

ROOT = Path(__file__).resolve().parent.parent
film = sys.argv[1] if len(sys.argv) > 1 else "contractor"
SCRIPT = json.loads((ROOT / "films" / film / "script.json").read_text())
OUT = ROOT / "out" / film
CACHE = OUT / "lines"
CACHE.mkdir(parents=True, exist_ok=True)
SR = 48000


# Behind the cloud environment's proxy the key is injected into requests that carry no key of their own, so send
# none there (a stale ELEVENLABS_API_KEY would override it). Elsewhere, ELEVENLABS_API_KEY is sent as usual.
KEY = {} if CA.exists() and not os.environ.get("ELEVENLABS_SEND_KEY") else {"xi-api-key": os.environ.get("ELEVENLABS_API_KEY", "")}


def speak_eleven(text, cfg, mp3):
    """ElevenLabs text-to-speech with character timings → word timings (each word keeps its offset `c` in text)."""
    body = {"text": text, "model_id": cfg.get("model", "eleven_v3"), "language_code": "he"}
    if cfg.get("settings"):
        body["voice_settings"] = cfg["settings"]
    if cfg.get("seed") is not None:
        body["seed"] = cfg["seed"]  # the same seed gives the same take, so a chosen take can be kept
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{cfg['voice_id']}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps(body).encode(),
        headers={"content-type": "application/json", **KEY},
    )
    ctx = ssl.create_default_context(cafile=str(CA)) if CA.exists() else None
    with urllib.request.urlopen(req, context=ctx, timeout=120) as r:
        d = json.load(r)
    mp3.write_bytes(base64.b64decode(d["audio_base64"]))
    al = d["alignment"]
    words, cur, t0, t1, c0 = [], "", None, None, 0
    for i, (ch, a, b) in enumerate(zip(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"])):
        if ch.isspace():
            if cur:
                words.append({"w": cur, "t": t0, "d": t1 - t0, "c": c0})
            cur, t0 = "", None
            continue
        if t0 is None:
            t0, c0 = a, i
        cur += ch
        t1 = b
    if cur:
        words.append({"w": cur, "t": t0, "d": t1 - t0, "c": c0})
    return words


async def speak(text, voice, rate, pitch, mp3):
    import edge_tts
    import edge_tts.communicate as ec

    # edge-tts pins certifi's bundle; trust the environment's CA bundle instead when there is one (TLS stays verified).
    if CA.exists():
        ec._SSL_CTX = ssl.create_default_context(cafile=str(CA))
    c = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
    audio, words = bytearray(), []
    async for ch in c.stream():
        if ch["type"] == "audio":
            audio += ch["data"]
        elif ch["type"] == "WordBoundary":
            words.append({"w": ch["text"], "t": ch["offset"] / 1e7, "d": ch["duration"] / 1e7})
    mp3.write_bytes(audio)
    return words


def load(mp3):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(mp3), "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, "<i2").astype(np.float32) / 32768


def norm(s):
    return re.sub(r"[^֐-׿0-9A-Za-z]", "", s)


PROVIDER = SCRIPT.get("provider", "elevenlabs")
EL = SCRIPT.get("elevenlabs", {})
voice = SCRIPT.get("voice", "")
rate = SCRIPT.get("rate", "+0%")
pitch = SCRIPT.get("pitch", "+0Hz")
sig = json.dumps(EL, sort_keys=True) if PROVIDER == "elevenlabs" else f"{voice}|{rate}|{pitch}"
lines = []


def one_take():
    """The whole script in one ElevenLabs request, so the read flows like a real take (one tone, natural
    breaths), then cut back into lines by the character timings. `direction` (v3 audio tags such as
    "[confident]") is prepended and is not spoken."""
    prefix = (EL.get("direction", "") + " ") if EL.get("direction") else ""
    full, spans = prefix, []
    for line in SCRIPT["lines"]:
        spans.append((len(full), len(full) + len(line["say"])))
        full += line["say"] + "\n"
    key = "take-" + hashlib.sha1(f"{full}|{sig}".encode()).hexdigest()[:10]
    # takes live next to the script and are committed: ElevenLabs takes vary even with a seed, and a take that was
    # checked and approved must not change on the next run. Delete the file to record a new take.
    mp3, meta = ROOT / "films" / film / f"{key}.mp3", ROOT / "films" / film / f"{key}.json"
    if not meta.exists():
        meta.write_text(json.dumps(speak_eleven(full, EL, mp3), ensure_ascii=False))
    words, pcm = json.loads(meta.read_text()), load(mp3)
    groups = [[dict(w) for w in words if c0 <= w["c"] < c1] for c0, c1 in spans]
    # Cut between lines only where the take is actually silent. The character timings of a long take drift by a
    # tenth of a second or more, and cutting by them chopped words and repeated the overlap (heard as a stutter).
    hop = int(0.01 * SR)
    env = np.sqrt(np.convolve(pcm**2, np.ones(hop * 2) / (hop * 2), mode="same"))[::hop]
    quiet = env < 10 ** (-48 / 20)
    runs, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]:
                j += 1
            if j - i >= 8:  # at least 80 ms of silence
                runs.append((i * hop / SR, j * hop / SR))
            i = j
        else:
            i += 1
    # start just before the first sound (the take may open with silence)
    first = runs[0][1] - 0.05 if runs and runs[0][0] == 0.0 else 0.0
    cuts = [(max(0.0, first), 0.0)]
    for g0, g1 in zip(groups, groups[1:]):
        guess = (g0[-1]["t"] + g0[-1]["d"] + g1[0]["t"]) / 2
        cand = [r for r in runs if r[0] > cuts[-1][0] + 0.3]
        r = min(cand, key=lambda r: abs((r[0] + r[1]) / 2 - guess))
        cuts.append(((r[0] + r[1]) / 2, r[1] - r[0]))
    cuts.append((len(pcm) / SR, 0.0))
    fade = int(0.012 * SR)
    for k, line in enumerate(SCRIPT["lines"]):
        a = cuts[k][0]
        b = cuts[k + 1][0]
        seg = pcm[int(a * SR) : int(b * SR)].copy()
        seg[:fade] *= np.linspace(0, 1, fade)
        seg[-fade:] *= np.linspace(1, 0, fade)
        ws = groups[k]
        for w in ws:
            w["t"] = round(w["t"] - a, 3)
        # the natural pause around this cut is already inside the segments; `pause` only adds to it if longer
        gap = cuts[k + 1][1] if k + 1 < len(SCRIPT["lines"]) else 0.0
        lines.append({**line, "pcm": seg, "words": ws, "len": len(seg) / SR, "gap": gap})


if PROVIDER == "elevenlabs" and EL.get("one_take"):
    one_take()
for i, line in enumerate([] if lines else SCRIPT["lines"]):
    key = f"{i:02d}-" + hashlib.sha1(f"{PROVIDER}|{line['say']}|{sig}".encode()).hexdigest()[:10]
    mp3, meta = CACHE / f"{key}.mp3", CACHE / f"{key}.json"
    if not meta.exists():
        if PROVIDER == "elevenlabs":
            words = speak_eleven(line["say"], EL, mp3)
        else:
            words = asyncio.run(speak(line["say"], voice, rate, pitch, mp3))
        meta.write_text(json.dumps(words, ensure_ascii=False))
    words = json.loads(meta.read_text())
    pcm = load(mp3)
    # trim the synthesizer's lead-in and tail to the spoken part (keep a breath of room)
    a = max(0.0, words[0]["t"] - 0.04)
    b = min(len(pcm) / SR, words[-1]["t"] + words[-1]["d"] + 0.18)
    pcm = pcm[int(a * SR) : int(b * SR)]
    for w in words:
        w["t"] = round(w["t"] - a, 3)
    lines.append({**line, "pcm": pcm, "words": words, "len": len(pcm) / SR})

# lay out: first line after `intro`, then each line after the previous one plus its pause. Lines cut from one
# take already carry their natural pause (`gap`), so only the difference is added, as silence at a silent cut.
t = SCRIPT.get("intro", 0.6)
for ln in lines:
    ln["at"] = t
    t += ln["len"] + max(0.0, ln.get("pause", SCRIPT.get("pause", 0.4)) - ln.get("gap", 0.0))
duration = round(lines[-1]["at"] + lines[-1]["len"] + SCRIPT.get("tail", 2.0), 2)

# plates: a line opens a plate (unless it says "plate": null) a little before its first word
lead = SCRIPT.get("lead", 0.3)
plates = []
for ln in lines:
    if ln.get("plate"):
        start = 0.0 if not plates else round(ln["at"] - lead, 3)
        if plates:
            plates[-1]["end"] = start
        plates.append({"id": ln["plate"], "start": start, "end": duration})


def resolve(spec, ln):
    m = re.match(r"^(.*?)([+-]\d+(?:\.\d+)?)?$", spec.strip())
    base, off = m.group(1), float(m.group(2) or 0)
    ws = ln["words"]
    if base == "start":
        v = ws[0]["t"]
    elif base == "end":
        v = ws[-1]["t"] + ws[-1]["d"]
    else:
        at_end = base.endswith("@end")
        key = norm(base[:-4] if at_end else base)
        hit = next((w for w in ws if key in norm(w["w"])), None)
        if hit is None:
            sys.exit(f"cue word not found: {base!r} in {ln['say']!r} (words: {[w['w'] for w in ws]})")
        v = hit["t"] + (hit["d"] if at_end else 0)
    return round(ln["at"] + v + off, 3)


cues = {}
for ln in lines:
    for name, spec in ln.get("cues", {}).items():
        cues[name] = resolve(spec, ln)

vo = np.zeros(int(duration * SR), np.float32)
for ln in lines:
    i = int(ln["at"] * SR)
    vo[i : i + len(ln["pcm"])] += ln["pcm"][: len(vo) - i]
vo *= 0.89 / max(1e-6, np.max(np.abs(vo)))
with wave.open(str(OUT / "vo.wav"), "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((vo * 32767).astype("<i2").tobytes())

timeline = {
    "film": film,
    "fps": 60,
    "width": 1920,
    "height": 1080,
    "duration": duration,
    "plates": plates,
    "cues": dict(sorted(cues.items(), key=lambda kv: kv[1])),
    "lines": [{"plate": ln.get("plate"), "say": ln["say"], "at": round(ln["at"], 3), "words": [{"w": w["w"], "t": round(ln["at"] + w["t"], 3)} for w in ln["words"]]} for ln in lines],
}
(ROOT / "films" / film / "timeline.json").write_text(json.dumps(timeline, ensure_ascii=False, indent=1))
print(f"{film}: {duration}s, {len(plates)} plates, {len(cues)} cues → out/{film}/vo.wav, films/{film}/timeline.json")
for p in plates:
    print(f"  {p['id']:<10} {p['start']:6.2f} – {p['end']:6.2f}")
if duration > 35:
    print(f"WARNING: {duration}s is over the 35 s limit")
