#!/usr/bin/env python3
"""Génère les visuels Instagram LeBonProspect (1080x1350) depuis des specs HTML.
DA : Archivo (titres), Inter (texte), JetBrains Mono (chiffres). Teal #31777A, crème #F6F2EA, encre #14181D.
Usage : python3 ig_render.py  -> vente/instagram/<post>/<slide>.png
"""
import os, subprocess, json, html
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "instagram")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

CSS = """
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px;overflow:hidden}
body{font-family:Inter,sans-serif;color:#14181D;background:#F6F2EA;position:relative}
.slide{width:1080px;height:1350px;padding:96px 88px 80px;display:flex;flex-direction:column;position:relative}
.body{flex:1;display:flex;flex-direction:column;justify-content:center;padding-bottom:40px}
.dark{background:#14181D;color:#F6F2EA}
.teal{background:#31777A;color:#fff}
.brand{display:flex;align-items:center;gap:14px;font-family:Archivo,sans-serif;font-weight:800;font-size:26px;letter-spacing:-.01em}
.brand .mark{width:40px;height:40px;border-radius:12px;background:#31777A;display:grid;place-items:center}
.dark .brand .mark,.teal .brand .mark{background:#fff}
.brand .mark svg{width:22px;height:22px}
.eyebrow{font-family:'JetBrains Mono',monospace;font-size:20px;letter-spacing:.14em;text-transform:uppercase;color:#31777A;font-weight:600;margin-bottom:26px}
.dark .eyebrow{color:#7FB8BA}.teal .eyebrow{color:rgba(255,255,255,.75)}
h1{font-family:Archivo,sans-serif;font-weight:900;font-size:84px;line-height:1.02;letter-spacing:-.03em}
h1.md{font-size:70px}h1.sm{font-size:58px}
h1 .hl{color:#31777A}.dark h1 .hl{color:#7FB8BA}.teal h1 .hl{color:#CFE7E8}
p.lead{font-size:33px;line-height:1.42;color:#3F3B33;margin-top:34px;max-width:880px}
.dark p.lead{color:#C9C4B8}.teal p.lead{color:rgba(255,255,255,.88)}
.big{font-family:Archivo,sans-serif;font-weight:900;font-size:220px;line-height:.95;letter-spacing:-.05em;color:#31777A}
.dark .big{color:#fff}.teal .big{color:#fff}
.big.md{font-size:150px}
.grow{flex:1}
.foot{display:flex;justify-content:space-between;align-items:flex-end;font-family:'JetBrains Mono',monospace;font-size:20px;color:#6F6A5C}
.dark .foot,.teal .foot{color:rgba(255,255,255,.6)}
.foot .pg{font-weight:600}
.card{background:#fff;border:2px solid #E6E0D0;border-radius:28px;padding:38px 42px}
.dark .card{background:#1E242B;border-color:#2C343D}
.list{display:flex;flex-direction:column;gap:30px;margin-top:52px}
.item{display:flex;gap:26px;align-items:flex-start}
.item .n{font-family:Archivo,sans-serif;font-weight:900;font-size:34px;color:#31777A;min-width:56px;line-height:1.2}
.dark .item .n{color:#7FB8BA}.teal .item .n{color:#CFE7E8}.teal .item span{color:rgba(255,255,255,.8)}
.item b{font-size:36px;display:block;margin-bottom:6px;letter-spacing:-.01em;font-family:Archivo,sans-serif;font-weight:800}
.item span{font-size:28px;line-height:1.4;color:#55524A}
.dark .item span{color:#B8B3A6}
.stat{display:flex;flex-direction:column;gap:6px}
.stat .n{font-family:Archivo,sans-serif;font-weight:900;font-size:128px;letter-spacing:-.04em;color:#31777A;line-height:1}
.dark .stat .n{color:#fff}.teal .stat .n{color:#fff}.teal .stat .l{color:rgba(255,255,255,.85)}
.stat .l{font-size:27px;color:#55524A;line-height:1.35}
.dark .stat .l{color:#B8B3A6}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:48px 34px;margin-top:56px}
.row{display:flex;gap:22px;align-items:flex-start;padding:32px 0;border-top:2px solid #E6E0D0}
.row:last-child{border-bottom:2px solid #E6E0D0}
.row .date{font-family:'JetBrains Mono',monospace;font-size:20px;color:#6F6A5C;min-width:150px;line-height:1.4;padding-top:6px}
.row .what{font-size:29px;line-height:1.35}
.row .what b{font-family:Archivo,sans-serif;font-weight:800}
.row .meta{font-family:'JetBrains Mono',monospace;font-size:19px;color:#31777A;margin-top:6px}
.badge{display:inline-block;font-family:'JetBrains Mono',monospace;font-size:16px;font-weight:600;padding:5px 12px;border-radius:9px;background:#E3F0F0;color:#31777A;margin-left:10px;vertical-align:middle}
.phone{display:inline-block;background:#14181D;color:#fff;border-radius:16px;padding:14px 22px;font-family:'JetBrains Mono',monospace;font-size:30px;letter-spacing:.06em}
.vs{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:40px}
.vs .col{border-radius:28px;padding:44px 38px}
.vs .col.a{background:#fff;border:2px solid #E6E0D0}
.vs .col.b{background:#31777A;color:#fff}
.vs h3{font-family:Archivo,sans-serif;font-size:30px;font-weight:800;margin-bottom:22px;letter-spacing:-.01em}
.vs li{list-style:none;font-size:27px;line-height:1.4;padding:16px 0;border-top:1px solid rgba(0,0,0,.08)}
.vs .col.b li{border-top-color:rgba(255,255,255,.2)}
.quote{font-family:Archivo,sans-serif;font-weight:800;font-size:56px;line-height:1.15;letter-spacing:-.02em}
.cta{margin-top:46px;display:inline-block;background:#31777A;color:#fff;font-family:Archivo,sans-serif;font-weight:800;font-size:30px;padding:24px 40px;border-radius:18px;align-self:flex-start}
.dark .cta{background:#fff;color:#14181D}.teal .cta{background:#fff;color:#31777A}
.url{font-family:'JetBrains Mono',monospace;font-size:24px;color:#31777A;margin-top:22px;font-weight:600}
.dark .url,.teal .url{color:#fff}
.tick{position:absolute;right:88px;top:96px;font-family:'JetBrains Mono',monospace;font-size:20px;color:#6F6A5C}
.dark .tick,.teal .tick{color:rgba(255,255,255,.55)}
.bar{height:26px;border-radius:13px;background:#E6E0D0;overflow:hidden;margin-top:14px}
.bar i{display:block;height:100%;background:#31777A;border-radius:13px}
.k{font-family:'JetBrains Mono',monospace;font-size:20px;color:#6F6A5C;margin-top:10px}
"""
MARK = '<div class="mark"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="color:#fff"><path d="M12 2v20M5 9l7-7 7 7"/></svg></div>'
MARK_D = MARK.replace("color:#fff", "color:#31777A")

def brand(dark=False):
    return f'<div class="brand">{MARK_D if dark else MARK}LeBonProspect</div>'

def slide(body, cls="", n=None, total=None, tag=""):
    foot = f'<div class="foot"><span>{tag}</span><span class="pg">{n} / {total}</span></div>' if n else f'<div class="foot"><span>{tag}</span><span class="pg">lebonprospect.fr</span></div>'
    return f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body><div class="slide {cls}">{brand(cls in ("dark","teal"))}<div class="body">{body}</div>{foot}</div></body></html>'

def render_sq(post, slides):
    """Variante LinkedIn 1080x1080 : meme DA, viewport carre."""
    d = os.path.join(OUT, post); os.makedirs(d, exist_ok=True)
    for i, html_doc in enumerate(slides, 1):
        html_doc = html_doc.replace("html,body{width:1080px;height:1350px;overflow:hidden}", "html,body{width:1080px;height:1080px;overflow:hidden}").replace(".slide{width:1080px;height:1350px;", ".slide{width:1080px;height:1080px;")
        hp = os.path.join(d, f"{i:02d}.html"); png = os.path.join(d, f"{i:02d}.png")
        open(hp, "w", encoding="utf-8").write(html_doc)
        subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars", "--window-size=1080,1080",
                        "--virtual-time-budget=6000", f"--screenshot={png}", f"file://{hp}"], capture_output=True)
        os.remove(hp)
    print(f"{post}: {len(slides)} visuel(s) 1080x1080")

def render(post, slides):
    d = os.path.join(OUT, post); os.makedirs(d, exist_ok=True)
    for i, html_doc in enumerate(slides, 1):
        hp = os.path.join(d, f"{i:02d}.html"); png = os.path.join(d, f"{i:02d}.png")
        open(hp, "w", encoding="utf-8").write(html_doc)
        subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars", "--window-size=1080,1350",
                        "--virtual-time-budget=6000", f"--screenshot={png}", f"file://{hp}"], capture_output=True)
        os.remove(hp)
    print(f"{post}: {len(slides)} slides")

if __name__ == "__main__":
    from ig_posts import POSTS
    for name, slides in POSTS.items():
        render(name, slides)
