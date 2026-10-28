#!/usr/bin/env python3
"""Generate every image the README uses, from the tool itself. Needs Node 22+ and Chrome or Chromium for the PNGs.

  python3 scripts/make-readme-images.py

Writes:
  docs/img/hero-y2k.png        the sample result card in the y2k-blog window (1080x1350)
  docs/img/triptych.png        the same result in analog | cyberpunk | y2k-blog (1620x720)
  docs/img/step-01..05.svg     pixel step badges for "Start here"
  docs/img/divider.svg         a gold pixel hairline
  docs/img/heart.svg           a pixel heart
  examples/result.sample.*     the analog sample result (HTML, PNG) and the analog sample email (HTML)
  docs/IMAGES.md               the list of all of the above
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "docs" / "img"
MOTIFS = ("analog", "cyberpunk", "y2k-blog")

# 3x5 pixel digits, rows top to bottom
DIGITS = {"0": ["111", "101", "101", "101", "111"], "1": ["010", "110", "010", "010", "111"],
          "2": ["111", "001", "111", "100", "111"], "3": ["111", "001", "111", "001", "111"],
          "4": ["101", "101", "111", "001", "001"], "5": ["111", "100", "111", "001", "111"]}


def _pixels(text: str, x0: int, y0: int) -> str:
    d = []
    for n, ch in enumerate(text):
        for r, row in enumerate(DIGITS[ch]):
            for c, bit in enumerate(row):
                if bit == "1":
                    d.append(f"M{x0 + n * 4 + c} {y0 + r}h1v1h-1z")
    return "".join(d)


def badge(num: str, ground: str, gold: str) -> str:
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 11 9" width="33" height="27" '
            f'shape-rendering="crispEdges"><path fill="{ground}" d="M1 0h9v1h1v7h-1v1H1v-1H0V1h1z"/>'
            f'<path fill="{gold}" d="{_pixels(num, 2, 2)}"/></svg>\n')


def divider(gold: str) -> str:
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="720" height="6" shape-rendering="crispEdges">'
            '<defs><pattern id="p" width="12" height="6" patternUnits="userSpaceOnUse">'
            f'<rect width="6" height="2" y="2" fill="{gold}"/><rect x="8" y="2" width="2" height="2" fill="{gold}"/>'
            '</pattern></defs><rect width="720" height="6" fill="url(#p)"/></svg>\n')


def heart(colour: str) -> str:
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7 6" width="21" height="18" shape-rendering="crispEdges">'
            f'<path fill="{colour}" d="M1 0h2v1h1V0h2v1h1v2H6v1H5v1H4v1H3V5H2V4H1V3H0V1h1z"/></svg>\n')


def triptych_html(pngs: dict[str, Path], ground: str, gold: str, cream: str) -> str:
    cells = "".join(
        f'<figure><img src="{p.as_uri()}" alt=""><figcaption>{m}</figcaption></figure>' for m, p in pngs.items())
    return f"""<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Silkscreen&display=swap">
<style>
* {{ margin: 0; box-sizing: border-box; }}
body {{ width: 1620px; height: 720px; background: {ground}; display: flex; gap: 30px; padding: 24px 36px; }}
figure {{ flex: 1; display: flex; flex-direction: column; align-items: center; gap: 12px; }}
img {{ width: 100%; height: auto; border: 2px solid {gold}; }}
figcaption {{ font-family: "Silkscreen", monospace; color: {cream}; font-size: 22px; letter-spacing: .06em; }}
</style></head><body>{cells}</body></html>"""
def find_chrome() -> str | None:
    env = os.environ.get("CHROME_PATH")
    if env and Path(env).exists():
        return env
    for cmd in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome"):
        p = shutil.which(cmd)
        if p:
            return p
    for p in ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
              "/Applications/Chromium.app/Contents/MacOS/Chromium",
              r"C:\Program Files\Google\Chrome\Application\chrome.exe"):
        if Path(p).exists():
            return p
    return None


def shoot(page: Path, png: Path, width: int, height: int) -> tuple[bool, str]:
    chrome = find_chrome()
    if not chrome:
        return False, "No Chrome or Chromium found, so no PNGs this time. Install Chrome or set CHROME_PATH."
    with tempfile.TemporaryDirectory() as profile:
        cmd = [chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run",
               "--no-default-browser-check", f"--user-data-dir={profile}", f"--window-size={width},{height}",
               "--force-device-scale-factor=1", "--virtual-time-budget=6000", f"--screenshot={png}", page.resolve().as_uri()]
        if hasattr(os, "geteuid") and os.geteuid() == 0:
            cmd.insert(1, "--no-sandbox")
        try:
            subprocess.run(cmd, capture_output=True, timeout=90, check=False)
        except (OSError, subprocess.TimeoutExpired) as exc:
            return False, f"Chrome could not render {png.name} ({exc})."
    return (png.exists(), f"{png.name} written" if png.exists() else f"Chrome wrote no {png.name}.")


def palette() -> dict:
    data = json.loads((ROOT / "examples" / "style.rocha-coded.json").read_text(encoding="utf-8"))
    return data.get("palette", {})


def main() -> int:
    pal = palette()
    ground, gold = pal.get("hero", "#50163C"), pal.get("gold", "#E9B949")
    cream, candy = pal.get("paper", "#FFF7F4"), pal.get("accent", "#FE9DCA")
    IMG.mkdir(parents=True, exist_ok=True)
    for i in range(1, 6):
        (IMG / f"step-{i:02d}.svg").write_text(badge(f"{i:02d}", ground, gold), encoding="utf-8")
    (IMG / "divider.svg").write_text(divider(gold), encoding="utf-8")
    (IMG / "heart.svg").write_text(heart(candy), encoding="utf-8")
    print("SVGs: step-01..05, divider, heart")

    ok_all = True
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        style = ROOT / "examples" / "style.rocha-coded.json"
        subprocess.run(["node", str(ROOT / "scripts" / "render-samples.js"), "--out", str(tmp), "--fit", "--style", str(style)],
                       check=True, cwd=ROOT)
        pngs = {}
        for m in MOTIFS:
            ok, msg = shoot(tmp / f"result-{m}.html", tmp / f"{m}.png", 1080, 1350)
            print(msg)
            ok_all &= ok
            if ok:
                pngs[m] = tmp / f"{m}.png"
        if ok_all:
            (IMG / "hero-y2k.png").write_bytes(pngs["y2k-blog"].read_bytes())
            (ROOT / "examples" / "result.sample.png").write_bytes(pngs["analog"].read_bytes())
            strip = tmp / "triptych.html"
            strip.write_text(triptych_html(pngs, ground, gold, cream), encoding="utf-8")
            ok, msg = shoot(strip, IMG / "triptych.png", 1620, 720)
            print(msg)
            ok_all &= ok
        subprocess.run(["node", str(ROOT / "scripts" / "render-samples.js"), "--out", str(tmp / "plain"), "--motif", "analog",
                        "--style", str(style)], check=True, cwd=ROOT, capture_output=True)
        (ROOT / "examples" / "result.sample.html").write_bytes((tmp / "plain" / "result-analog.html").read_bytes())
        (ROOT / "examples" / "email.sample.html").write_bytes((tmp / "plain" / "email-analog.html").read_bytes())

    (ROOT / "docs" / "IMAGES.md").write_text("""# Images

Every image here is generated by `scripts/make-readme-images.py` from the fictional sample quiz in `quiz.config.json`
and a made-up taker. No photos, no real people, no real businesses.

| File | What it is |
|---|---|
| `docs/img/hero-y2k.png` | the sample result card in the y2k-blog motif, used as the README hero |
| `docs/img/triptych.png` | the same result in analog, cyberpunk and y2k-blog, side by side |
| `docs/img/step-01.svg` to `step-05.svg` | pixel step badges for "Start here" |
| `docs/img/divider.svg` | a gold pixel hairline between README sections |
| `docs/img/heart.svg` | the pixel heart beside "If it goes wrong" |
| `examples/result.sample.png` | the sample result in the analog motif, 1080x1350 |
| `examples/result.sample.html` | the same result as a page you can open |
| `examples/email.sample.html` | the result email in the analog motif |
""", encoding="utf-8")
    print("docs/IMAGES.md written" + ("" if ok_all else " (PNGs skipped)"))
    return 0 if ok_all else 1


if __name__ == "__main__":
    sys.exit(main())
