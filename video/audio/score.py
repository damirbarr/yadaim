"""Soundtrack for a Yadaim film: synthesized music + UI sound effects + the voiceover, mixed.

Timed from films/<film>/timeline.json (made by audio/voice.py), so the effects land on the same cues the
plates animate on. The music ducks under the voice. No samples: every sound is synthesized here.

    python3 audio/score.py contractor     → out/contractor/mix.wav (48 kHz, 16-bit stereo)
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
FILM = sys.argv[1] if len(sys.argv) > 1 else "contractor"
TL = json.loads((ROOT / "films" / FILM / "timeline.json").read_text())
Q = TL["cues"]
SR = 48000
DUR = TL["duration"]
N = int(DUR * SR)
BEAT = 60 / 120  # 120 BPM
rng = np.random.default_rng(7)

music = np.zeros((2, N))
sfx = np.zeros((2, N))
verb = np.zeros((2, N))  # reverb send


# ── building blocks ──────────────────────────────────────────────────────────
def add(*sigs):
    """Sum signals of different lengths (shorter ones are zero-padded)."""
    n = max(len(x) for x in sigs)
    out = np.zeros(n)
    for x in sigs:
        out[: len(x)] += x
    return out


def T(n):
    return np.arange(n) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def place(bus, sig, at, gain=1.0, pan=0.0):
    """Mix a mono or stereo signal into a bus at time `at` (s), equal-power pan -1..1."""
    i = int(round(at * SR))
    if i >= N:
        return
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        sig = np.vstack([sig * np.cos(a), sig * np.sin(a)]) * np.sqrt(2)
    j = min(N, i + sig.shape[1])
    s0 = max(0, -i)
    bus[:, max(i, 0):j] += sig[:, s0 : j - i] * gain


def fft_filter(x, lo=None, hi=None):
    """Static band filter in the frequency domain with soft (cosine) edges."""
    n = len(x)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    m = np.ones_like(f)
    if hi:
        m *= np.clip(1 - (f - hi) / (hi * 0.5), 0, 1) ** 2
    if lo:
        m *= np.clip((f - lo * 0.6) / (lo * 0.4), 0, 1) ** 2
    return np.fft.irfft(X * m, n)


def sweep(x, f0, f1, q=None):
    """Time-varying lowpass (or bandpass when q is set) by STFT overlap-add."""
    hop, win = 512, 2048
    w = np.hanning(win)
    out = np.zeros(len(x) + win)
    xp = np.concatenate([x, np.zeros(win)])
    f = np.fft.rfftfreq(win, 1 / SR)
    frames = max(1, (len(x)) // hop)
    for k in range(frames):
        s = k * hop
        u = k / max(1, frames - 1)
        fc = f0 * (f1 / f0) ** u
        if q:
            m = np.exp(-0.5 * ((np.log2(np.maximum(f, 1) / fc)) * q) ** 2)
        else:
            m = 1 / (1 + (f / fc) ** 4)
        seg = np.fft.irfft(np.fft.rfft(xp[s : s + win] * w) * m, win)
        out[s : s + win] += seg * w
    return out[: len(x)] / 1.5


def env(n, a=0.005, d=0.2, s=0.0, r=0.05, hold=None):
    """Attack-decay-sustain-release envelope, n samples long."""
    t = T(n)
    e = np.where(t < a, t / max(a, 1e-6), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-6)))
    if hold is not None:
        rel = t > hold
        e[rel] *= np.exp(-(t[rel] - hold) / max(r, 1e-6))
    return e


def saw_add(freq, n, bright=3500, detune=(0.0,)):
    """Band-limited saw by additive synthesis; harmonics above `bright` Hz fade out."""
    t = T(n)
    out = np.zeros(n)
    for dt in detune:
        f = freq * 2 ** (dt / 1200)
        ph = rng.uniform(0, 2 * np.pi)
        h = 1
        while h * f < min(bright * 1.8, SR / 2.2):
            g = (1 / h) * (1 / (1 + (h * f / bright) ** 2))
            out += g * np.sin(2 * np.pi * h * f * t + ph * h)
            h += 1
    return out / len(detune)


# ── instruments ──────────────────────────────────────────────────────────────
def kick(gain=1.0):
    n = int(0.45 * SR)
    t = T(n)
    f = 46 + 110 * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / 0.16)
    click = fft_filter(rng.standard_normal(n), lo=2500) * np.exp(-t / 0.004) * 0.25
    return np.tanh((body + click) * 1.6) * gain


def snare():
    n = int(0.3 * SR)
    t = T(n)
    nz = fft_filter(rng.standard_normal(n), lo=1200, hi=9000) * np.exp(-t / 0.07)
    tone = np.sin(2 * np.pi * 190 * t) * np.exp(-t / 0.04)
    # clap: three quick bursts
    clap = np.zeros(n)
    for k, o in enumerate((0, 0.011, 0.022)):
        i = int(o * SR)
        clap[i:] += np.exp(-(t[: n - i]) / (0.006 if k < 2 else 0.05))
    clap *= fft_filter(rng.standard_normal(n), lo=900, hi=5000)
    return nz * 0.55 + tone * 0.35 + clap * 0.6


def hat(open_=False):
    n = int((0.28 if open_ else 0.06) * SR)
    t = T(n)
    return fft_filter(rng.standard_normal(n), lo=7000) * np.exp(-t / (0.09 if open_ else 0.014))


def pluck(m, dur=0.4):
    n = int(dur * SR)
    t = T(n)
    f = mtof(m)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    return x * np.exp(-t / 0.11) * np.minimum(1, t / 0.003)


def bass(m, dur):
    n = int(dur * SR)
    t = T(n)
    f = mtof(m)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t) + 0.12 * saw_add(f, n, bright=700)
    return np.tanh(x * 1.3) * env(n, 0.004, 0.25, 0.55, 0.03, hold=dur - 0.04)


def pad(ms, dur, bright=2200):
    n = int(dur * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    for m in ms:
        L += saw_add(mtof(m), n, bright, detune=(-9, 4))
        R += saw_add(mtof(m), n, bright, detune=(-4, 9))
    e = env(n, 0.25, 9, 1, 0.3, hold=dur - 0.3)
    return np.vstack([L, R]) * e / len(ms)


def blip(f0, f1=None, dur=0.09, wave_="sine"):
    n = int(dur * SR)
    t = T(n)
    f = f0 if f1 is None else f0 * (f1 / f0) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(np.full(n, f) if np.isscalar(f) else f) / SR
    x = np.sin(ph) if wave_ == "sine" else np.sign(np.sin(ph)) * 0.5
    return x * np.exp(-t / (dur / 3)) * np.minimum(1, t / 0.002)


def bell(f, dur=0.9):
    n = int(dur * SR)
    t = T(n)
    parts = [(1, 1, 0.5), (2.76, 0.45, 0.18), (5.4, 0.25, 0.08), (2, 0.3, 0.3)]
    return sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / d) for r, a, d in parts) * np.minimum(1, t / 0.002)


def click(bright=4000, dur=0.02):
    n = int(dur * SR)
    return fft_filter(rng.standard_normal(n), lo=bright) * np.exp(-T(n) / (dur / 5))


def whoosh(dur=0.5, f0=300, f1=6000, q=1.6):
    n = int(dur * SR)
    t = T(n)
    shape = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return sweep(rng.standard_normal(n), f0, f1, q=q) * shape


def riser(dur):
    n = int(dur * SR)
    t = T(n)
    nz = sweep(rng.standard_normal(n), 200, 9000) * (t / dur) ** 2.2
    tone = np.sin(2 * np.pi * np.cumsum(110 * 2 ** (3 * (t / dur) ** 2)) / SR) * (t / dur) ** 3 * 0.25
    return nz + tone


def impact(gain=1.0):
    n = int(2.5 * SR)
    t = T(n)
    f = 38 + 70 * np.exp(-t / 0.08)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55)
    crash = fft_filter(rng.standard_normal(n), lo=2500, hi=9000) * np.exp(-t / 0.3) * 0.22
    return np.tanh((boom * 1.4 + crash)) * gain


def thud():
    n = int(0.35 * SR)
    t = T(n)
    f = 60 + 90 * np.exp(-t / 0.03)
    return add(np.tanh(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12) * 2), click(3000, 0.015) * 0.4)


def clunk():
    n = int(0.8 * SR)
    t = T(n)
    low = np.sin(2 * np.pi * np.cumsum(70 + 120 * np.exp(-t / 0.02)) / SR) * np.exp(-t / 0.12)
    metal = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, a, d in [(1180, 0.3, 0.06), (2330, 0.22, 0.04), (3570, 0.15, 0.03), (812, 0.2, 0.09)])
    return add(np.tanh(low * 1.8) + metal, click(2000, 0.03) * 0.6)


def buzz():
    n = int(0.28 * SR)
    t = T(n)
    x = np.sign(np.sin(2 * np.pi * 150 * t)) * 0.4 + np.sign(np.sin(2 * np.pi * 151.5 * t)) * 0.4
    return fft_filter(x, hi=2500) * env(n, 0.005, 0.5, 0.6, 0.04, hold=0.22)


# ── music ────────────────────────────────────────────────────────────────────
# A minor → C, 120 BPM. The first downbeat lands on the logo (the brand plate), the drums stop for the end hit.
CHORDS = [(57, 60, 64, 69), (53, 57, 60, 65), (55, 60, 64, 67), (55, 59, 62, 67)]
ROOTS = [45, 41, 48, 43]
PL = {p["id"]: p for p in TL["plates"]}
DOWN = PL["brand"]["start"]
END = Q["end.hit"]
QUIET = [(PL["lock"]["start"], Q["lock.clunk"])] if "lock" in PL else []  # the evening: drums out until the lock


def in_groove(t):
    return DOWN <= t < END and not any(a <= t < b for a, b in QUIET)


place(music, pad((45, 52, 57), DOWN, bright=600), 0, 0.35)
for k in range(int(DOWN / BEAT)):
    place(sfx, click(5000 if k % 2 == 0 else 2500, 0.03), k * BEAT, 0.22, pan=0.3 if k % 2 else -0.3)
place(music, riser(1.4), DOWN - 1.4, 0.4)

bar = 0
t = DOWN
while t < END:
    ch, root = CHORDS[bar % 4], ROOTS[bar % 4]
    quiet = any(a <= t < b for a, b in QUIET)
    place(music, pad(ch, min(2.0, END - t + 0.3), bright=900 if quiet else 2600), t, 0.22)
    place(verb, pad(ch, 2.0, bright=1500), t, 0.05)
    for k in range(8):
        tt = t + k * BEAT / 2
        if tt >= END:
            break
        if in_groove(tt):
            place(music, bass(root - 12 + (12 if k % 4 == 3 else 0), BEAT / 2 - 0.01), tt, 0.36)
        if tt >= DOWN + 2 and in_groove(tt):
            arp = [ch[3] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 24][k % 4]
            pl = pluck(arp)
            place(music, pl, tt, 0.1, pan=-0.35 if k % 2 else 0.35)
            place(music, pl, tt + 0.375, 0.04, pan=0.6 if k % 2 else -0.6)
            place(verb, pl, tt, 0.04)
    bar += 1
    t += 2.0

k = 0
while DOWN + k * BEAT / 4 < END:
    tt = DOWN + k * BEAT / 4
    pos = k % 16
    k += 1
    if not in_groove(tt):
        continue
    if pos % 4 == 0:
        place(music, kick(), tt, 0.85)
    if pos in (4, 12):
        place(music, snare(), tt, 0.4, pan=0.05)
        place(verb, snare(), tt, 0.1)
    if pos % 2 == 1:
        place(music, hat(open_=pos in (6, 14)), tt, 0.14, pan=0.25)
    elif tt >= DOWN + 2:
        place(music, hat(), tt, 0.06, pan=-0.2)
for k in range(4):  # a short, soft roll: the last line of the plate before is still being spoken
    place(music, snare(), END - 0.5 + k * 0.125, 0.06 + k * 0.03, pan=0.1)

pump = np.ones(N)
for k in range(int((END - DOWN) / BEAT) + 1):
    tt = DOWN + k * BEAT
    if in_groove(tt):
        i = int(tt * SR)
        j = min(N, i + int(0.25 * SR))
        pump[i:j] = np.minimum(pump[i:j], 1 - 0.45 * np.exp(-T(j - i) / 0.08))

# big moments
place(sfx, impact(0.9), DOWN, 0.75)
place(verb, impact(0.6), DOWN, 0.22)
place(sfx, impact(1.0), END, 0.8)
place(verb, impact(), END, 0.3)
place(music, pad((48, 55, 60, 64, 67, 72), DUR - END + 0.2, bright=3000), END, 0.3)
place(verb, pad((60, 64, 67, 72), DUR - END, bright=2000), END, 0.1)
for k, m in enumerate((72, 76, 79, 84)):
    place(music, pluck(m, 1.2), Q["end.tag"] + k * 0.12, 0.12, pan=(k - 1.5) / 2)
    place(verb, pluck(m, 1.2), Q["end.tag"] + k * 0.12, 0.08)
place(sfx, blip(800, 1300, 0.1), Q["end.cta"], 0.3)

# transitions: a whoosh into every plate after the first two
for p in TL["plates"][2:]:
    if p["id"] != "end":
        # starts at the cut, not before it: earlier it covered the last word of the line before
        place(sfx, whoosh(0.45, 500, 7000), p["start"], 0.22)

# ── UI sound effects on the cues ─────────────────────────────────────────────
def has(*names):
    return all(n in Q for n in names)


def ding_row(at, n, step, base=84):
    for k in range(n):
        m = base + [0, 4, 7, 12][k % 4]
        place(sfx, bell(mtof(m), 0.6), at + k * step, 0.1, pan=-0.2 + 0.15 * k)
        place(verb, bell(mtof(m), 0.6), at + k * step, 0.05)


# logo: hat lands
place(sfx, whoosh(0.5, 800, 5000, 2), Q["brand.reveal"], 0.15)
place(sfx, thud(), Q["brand.hat"] + 0.05, 0.35)
place(sfx, bell(1046), Q["brand.mark"], 0.1)

if FILM == "contractor":
    for c in ("hook.w1", "hook.w2", "hook.w3", "hook.w4"):
        place(sfx, thud(), Q[c], 0.45)
    for key in ("search.type1", "search.type2", "search.type3"):
        for k in range(5):
            place(sfx, click(3500 + rng.uniform(0, 2000), 0.015), Q[key] + k * 0.05 + rng.uniform(0, 0.01), 0.2, pan=rng.uniform(-0.3, 0.3))
    place(sfx, blip(600, 1200, 0.08), Q["search.press"], 0.28)
    for k in range(4):
        place(sfx, whoosh(0.2, 1500, 6000, 2.5), Q["search.press"] + 0.22 + k * 0.1, 0.1, pan=-0.3)
    for k in range(3):
        place(sfx, blip(mtof(76 + k * 3), None, 0.12), Q[f"search.pick{k + 1}"], 0.28)
    ding_row(Q["docs.d1"], 4, 0.14)
    place(sfx, bell(mtof(84), 1.2) + bell(mtof(91), 1.2) * 0.7, Q["docs.ok"] + 0.45, 0.09)  # after the word, not on it
    for k in range(14):
        place(sfx, click(5000, 0.012), Q["price.count"] + k * 0.05 * (1 + k / 14), 0.18)
    for key in ("price.toggle1", "price.toggle2"):
        place(sfx, click(1500, 0.03), Q[key], 0.35)
        place(sfx, blip(700, 1100, 0.07), Q[key] + 0.1, 0.22)
    place(sfx, bell(mtof(88), 0.8) + bell(mtof(95), 0.8) * 0.6, Q["price.badge"], 0.11)
    n = int((Q["lock.clunk"] - Q["lock.sweep"]) / 0.11)
    for k in range(n):
        place(sfx, click(3000 if k % 2 else 5000, 0.03), Q["lock.sweep"] + k * 0.11, 0.26)
    place(sfx, clunk(), Q["lock.clunk"], 0.6)
    place(verb, clunk(), Q["lock.clunk"], 0.25)
    place(sfx, kick(1.0), Q["lock.clunk"], 0.45)
    for key, m in (("checkin.c1", 81), ("checkin.c2", 84)):
        place(sfx, blip(mtof(m), None, 0.1), Q[key], 0.26)
        place(sfx, blip(mtof(m + 7), None, 0.12), Q[key] + 0.07, 0.22)
    place(sfx, buzz(), Q["checkin.c3"], 0.22)
    place(sfx, thud(), Q["checkin.zero"] + 0.55, 0.4)  # after "משלמים", which it masked
    place(sfx, bell(mtof(91), 1.0) + bell(mtof(96), 1.0), Q["checkin.zero"] + 0.6, 0.1)

if FILM == "agency":
    for k in range(2):
        place(sfx, buzz(), Q["idle.empty"] + k * 0.12, 0.12)
        place(sfx, blip(500, 250, 0.2), Q["idle.cost"] + k * 0.15, 0.2)
    place(sfx, thud(), Q["idle.sum"], 0.5)
    for k in range(12):
        place(sfx, click(5000, 0.012), Q["idle.sum"] + k * 0.06 * (1 + k / 12), 0.16)
    place(sfx, whoosh(0.4, 3000, 300, 1.5), Q["import.drop"], 0.3)
    place(sfx, thud(), Q["import.drop"] + 0.3, 0.35)
    for k in range(5):
        place(sfx, blip(mtof(74 + k * 2), None, 0.07), Q["import.rows"] + 0.1 + k * 0.08, 0.16)
    place(sfx, bell(mtof(84), 1.0) + bell(mtof(91), 1.0) * 0.7, Q["import.done"], 0.1)
    place(sfx, whoosh(0.9, 800, 3000, 3), Q["expiry.scan"], 0.12)
    for k in range(3):
        place(sfx, bell(mtof(88), 0.4), Q["expiry.warn"] + k * 0.13, 0.08)
    place(sfx, blip(900, 1400, 0.1), Q["expiry.wa"], 0.26)
    place(sfx, blip(500, 900, 0.1), Q["offer.card"], 0.26)
    place(sfx, click(1200, 0.03), Q["offer.send"], 0.35)
    # kept low: "בוואטסאפ" is spoken right here and the effects masked it
    place(sfx, whoosh(0.5, 600, 8000, 1.8), Q["offer.fly"] - 0.1, 0.14, pan=-0.4)
    for k in range(3):
        place(sfx, blip(1100, 1500, 0.08), Q["offer.fly"] + 0.15 + k * 0.12, 0.08)
    for k in range(13):
        place(sfx, blip(mtof(72 + (k * 5) % 14), None, 0.06), Q["offer.fill"] + k * 0.05, 0.1, pan=-0.5 + k / 12)
    place(sfx, blip(500, 900, 0.1), Q["request.card"], 0.24)
    place(sfx, click(1200, 0.03), Q["request.approve"], 0.35)
    place(sfx, bell(mtof(84), 1.0) + bell(mtof(88), 1.0) + bell(mtof(91), 1.0), Q["request.approve"] + 0.1, 0.08)

# ── reverb (FFT convolution with a synthetic stereo IR) ──────────────────────
ir_n = int(2.2 * SR)
ir_t = T(ir_n)
irs = []
for ch in range(2):
    ir = rng.standard_normal(ir_n) * np.exp(-ir_t / 0.45)
    irs.append(fft_filter(ir, lo=180, hi=6000) * 0.04)
L = N + ir_n
wet = np.zeros((2, N))
for ch in range(2):
    nfft = 1 << (L - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(verb[ch], nfft) * np.fft.rfft(irs[ch], nfft), nfft)
    wet[ch] = y[:N]

# ── voice, ducking, master ──────────────────────────────────────────────────
with wave.open(str(ROOT / "out" / FILM / "vo.wav")) as w:
    vo = np.frombuffer(w.readframes(w.getnframes()), "<i2").astype(np.float64) / 32768
vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]
# envelope follower on the voice: the music (not the effects) dips up to ~10 dB while someone speaks
win = int(0.12 * SR)
envv = np.sqrt(np.convolve(vo**2, np.ones(win) / win, mode="same"))
envv = np.convolve(envv, np.hanning(int(0.3 * SR)) / (0.15 * SR), mode="same")
duck = 1 - 0.68 * np.clip(envv / (np.percentile(envv[envv > 1e-4], 70) + 1e-9), 0, 1)

bed = music * pump * duck * 0.55 + sfx * 0.75 + wet * 0.7 * duck
bed = np.vstack([fft_filter(bed[0], lo=28, hi=15000), fft_filter(bed[1], lo=28, hi=15000)])
voice = fft_filter(vo, lo=90)
mix = bed + np.vstack([voice, voice]) * 1.0
rms = np.sqrt(np.mean(mix**2))
mix *= 10 ** (-15 / 20) / rms  # roughly −14 LUFS for voice + music
mix = np.tanh(mix * 1.05) / np.tanh(1.05)
mix *= 0.93 / np.max(np.abs(mix))
fade = np.ones(N)
fn = int(0.35 * SR)
fade[-fn:] = np.linspace(1, 0, fn) ** 2
mix *= fade

out = ROOT / "out" / FILM / "mix.wav"
pcm = (mix.T * 32767).astype("<i2")
with wave.open(str(out), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(out, f"{DUR}s", f"peak {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS", f"rms {20 * np.log10(np.sqrt(np.mean(mix ** 2))):.1f} dBFS")
