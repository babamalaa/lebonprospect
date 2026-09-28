import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

const TEAL = "#31777A", INK = "#14181D", CREAM = "#F6F2EA", MUTED = "#6F6A5C", LINE = "#E6E0D0";

async function font(name, weight) {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${name}:wght@${weight}`, { headers: { "User-Agent": "Mozilla/5.0" } }).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\) format\('(woff2|truetype|opentype)'\)/)?.[1];
  if (!url) throw new Error("font " + name);
  return fetch(url).then((r) => r.arrayBuffer());
}

// Une slide = { kind, eyebrow, title, hl, lead, big, items[], stats[], quote, cta, tag, bg }
function Slide({ s, w, h, page, total }) {
  const dark = s.bg === "dark", teal = s.bg === "teal";
  const bg = dark ? INK : teal ? TEAL : CREAM;
  const fg = dark || teal ? "#F6F2EA" : INK;
  const accent = dark ? "#7FB8BA" : teal ? "#CFE7E8" : TEAL;
  const sub = dark ? "#C9C4B8" : teal ? "rgba(255,255,255,.88)" : "#3F3B33";
  const eyebrowColor = dark ? "#7FB8BA" : teal ? "rgba(255,255,255,.75)" : TEAL;
  const pad = 88;
  const titleSize = s.big ? 58 : s.kind === "list" || s.kind === "stats" ? 58 : 76;
  return (
    <div style={{ width: w, height: h, background: bg, color: fg, display: "flex", flexDirection: "column", padding: `96px ${pad}px 80px`, fontFamily: "Inter", position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: "Archivo", fontWeight: 800, fontSize: 26 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: dark || teal ? "#fff" : TEAL, display: "flex", alignItems: "center", justifyContent: "center", color: dark || teal ? TEAL : "#fff", fontSize: 24, fontWeight: 900 }}>↑</div>
        LeBonProspect
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBottom: 40 }}>
        {s.eyebrow && <div style={{ fontFamily: "JetBrains Mono", fontSize: 20, letterSpacing: 3, textTransform: "uppercase", color: eyebrowColor, fontWeight: 600, marginBottom: 26 }}>{s.eyebrow}</div>}
        {s.big && <div style={{ fontFamily: "Archivo", fontWeight: 900, fontSize: 200, lineHeight: 0.95, letterSpacing: -10, color: dark || teal ? "#fff" : TEAL }}>{s.big}</div>}
        {s.title && (
          <div style={{ fontFamily: "Archivo", fontWeight: 900, fontSize: titleSize, lineHeight: 1.04, letterSpacing: -2, marginTop: s.big ? 26 : 0, display: "flex", flexWrap: "wrap" }}>
            <span>{s.title}{s.hl ? " " : ""}</span>{s.hl && <span style={{ color: accent }}>{s.hl}</span>}
          </div>
        )}
        {s.quote && <div style={{ fontFamily: "Archivo", fontWeight: 800, fontSize: 54, lineHeight: 1.15, letterSpacing: -1 }}>{s.quote}</div>}
        {s.lead && <div style={{ fontSize: 31, lineHeight: 1.42, color: sub, marginTop: 32, maxWidth: 880 }}>{s.lead}</div>}
        {s.items && s.items.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 48 }}>
            {s.items.map((it, i) => (
              <div key={i} style={{ display: "flex", gap: 26, alignItems: "flex-start" }}>
                <div style={{ fontFamily: "Archivo", fontWeight: 900, fontSize: 34, color: accent, minWidth: 56, lineHeight: 1.2 }}>{String(i + 1).padStart(2, "0")}</div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ fontFamily: "Archivo", fontWeight: 800, fontSize: 34 }}>{it.b}</div>
                  {it.s && <div style={{ fontSize: 27, color: sub, marginTop: 6, lineHeight: 1.4 }}>{it.s}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
        {s.stats && s.stats.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 52 }}>
            {s.stats.map((st, i) => (
              <div key={i} style={{ width: "50%", display: "flex", flexDirection: "column", paddingRight: 20, marginBottom: 44 }}>
                <div style={{ fontFamily: "Archivo", fontWeight: 900, fontSize: 116, letterSpacing: -5, color: dark || teal ? "#fff" : TEAL, lineHeight: 1 }}>{st.n}</div>
                <div style={{ fontSize: 26, color: sub, lineHeight: 1.35, marginTop: 6 }}>{st.l}</div>
              </div>
            ))}
          </div>
        )}
        {s.cta && (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 46 }}>
            <div style={{ background: dark ? "#fff" : teal ? "#fff" : TEAL, color: dark ? INK : teal ? TEAL : "#fff", fontFamily: "Archivo", fontWeight: 800, fontSize: 30, padding: "24px 40px", borderRadius: 18, alignSelf: "flex-start" }}>{s.cta}</div>
            <div style={{ fontFamily: "JetBrains Mono", fontSize: 24, color: dark || teal ? "#fff" : TEAL, marginTop: 22, fontWeight: 600 }}>lebonprospect.fr</div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "JetBrains Mono", fontSize: 20, color: dark || teal ? "rgba(255,255,255,.6)" : MUTED }}>
        <span>{s.tag || ""}</span><span>{total > 1 ? `${page} / ${total}` : "lebonprospect.fr"}</span>
      </div>
    </div>
  );
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  let s; try { s = JSON.parse(searchParams.get("s") || "{}"); } catch { s = {}; }
  const format = searchParams.get("f") === "li" ? [1080, 1080] : [1080, 1350];
  const page = Number(searchParams.get("p") || 1), total = Number(searchParams.get("n") || 1);
  const [archivo, inter, mono] = await Promise.all([font("Archivo", 900), font("Inter", 500), font("JetBrains+Mono", 600)]);
  return new ImageResponse(<Slide s={s} w={format[0]} h={format[1]} page={page} total={total} />, {
    width: format[0], height: format[1],
    fonts: [
      { name: "Archivo", data: archivo, weight: 900 },
      { name: "Inter", data: inter, weight: 500 },
      { name: "JetBrains Mono", data: mono, weight: 600 },
    ],
  });
}
