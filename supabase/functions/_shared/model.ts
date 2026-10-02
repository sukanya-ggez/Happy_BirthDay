export type Media = {
  id: string;
  path: string;
  kind: "image" | "audio";
  mime: string;
  x: number;
  y: number;
};
export type Photo = {
  id: string;
  media: Media | null;
  caption: string;
  category: "single" | "couple";
};
export type Song = {
  id: string;
  title: string;
  artist: string;
  source: "youtube" | "audio";
  url: string;
  media: Media | null;
};
export type Gift = {
  recipient: string;
  sender: string;
  age: number;
  birthDate: string;
  celebrationDate: string;
  envelope: string;
  wish: string;
  candleWish: string;
  musicNote: string;
  letter: string;
  hero: Media | null;
  photos: Photo[];
  songs: Song[];
  theme: {
    cream: string;
    pink: string;
    rose: string;
    sage: string;
    background: "paper" | "plain";
    effects: boolean;
  };
};
export type Gate = { enabled: boolean; hasCode: boolean };
export type Draft = {
  content: Gift;
  gate: Gate;
  version: number;
  publishedAt: string | null;
};
export type GateChange = { enabled: boolean; newCode?: string };
export const defaultGift: Gift = {
  recipient: "",
  sender: "",
  age: 19,
  birthDate: "2007-10-03",
  celebrationDate: "2026-10-03",
  envelope: "ถึงคนโปรดของเค้า",
  wish: "สุขสันต์วันเกิดนะ ขอให้ปีนี้เต็มไปด้วยรอยยิ้มและสิ่งดี ๆ 💗",
  candleWish: "ขอให้ทุกคำอธิษฐานของเธอค่อย ๆ เป็นจริง",
  musicNote: "พื้นที่เล็ก ๆ สำหรับเพลงที่อยากมอบให้เธอ",
  letter:
    "ถึงคนโปรดของเค้า\n\n[เขียนคำอวยพรและความรู้สึกที่อยากบอกเธอตรงนี้]\n\n[เพิ่มเรื่องราวของเราที่อยากเก็บไว้ได้อีกหลายย่อหน้า]\n\nสุขสันต์วันเกิดนะ ♡",
  hero: null,
  photos: Array.from({ length: 8 }, (_, i) => ({
    id: `photo-${i + 1}`,
    media: null,
    caption: "",
    category: i % 2 ? "couple" : "single",
  })),
  songs: Array.from({ length: 3 }, (_, i) => ({
    id: `song-${i + 1}`,
    title: "",
    artist: "",
    source: "youtube",
    url: "",
    media: null,
  })),
  theme: {
    cream: "#fbf5eb",
    pink: "#efd2d3",
    rose: "#a44c63",
    sage: "#63765e",
    background: "paper",
    effects: false,
  },
};
export function youtubeId(input: string): string | null {
  try {
    const u = new URL(input);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.split("/")[1];
    else if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
      ].includes(host)
    ) {
      id =
        u.pathname === "/watch"
          ? u.searchParams.get("v")
          : /^\/(embed|shorts)\//.test(u.pathname)
            ? u.pathname.split("/")[2]
            : null;
    }
    return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
export function allMedia(g: Gift): Media[] {
  return [
    g.hero,
    ...g.photos.map((p) => p.media),
    ...g.songs.map((s) => s.media),
  ].filter((m): m is Media => !!m);
}
export function validateGift(input: unknown): string[] {
  const errors: string[] = [];
  if (!input || typeof input !== "object" || Array.isArray(input))
    return ["รูปแบบเนื้อหาไม่ถูกต้อง"];
  const g = input as Gift;
  for (const [key, max] of Object.entries({
    recipient: 100,
    sender: 100,
    envelope: 200,
    wish: 1000,
    candleWish: 500,
    musicNote: 1000,
    letter: 15000,
  })) {
    if (
      typeof g[key as keyof Gift] !== "string" ||
      (g[key as keyof Gift] as string).length > max
    )
      errors.push(`${key}: ข้อความยาวเกินไปหรือรูปแบบไม่ถูกต้อง`);
  }
  if (!Number.isInteger(g.age) || g.age < 1 || g.age > 120)
    errors.push("อายุต้องเป็นเลข 1–120");
  for (const k of ["birthDate", "celebrationDate"] as const) {
    const d = g[k];
    if (
      typeof d !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(d) ||
      Number.isNaN(Date.parse(d)) ||
      new Date(d).toISOString().slice(0, 10) !== d
    )
      errors.push("วันที่ไม่ถูกต้อง");
  }
  const t = g.theme;
  if (
    !t ||
    !["paper", "plain"].includes(t.background) ||
    typeof t.effects !== "boolean" ||
    ["cream", "pink", "rose", "sage"].some(
      (k) => !/^#[0-9a-f]{6}$/i.test(t[k as keyof typeof t] as string),
    )
  )
    errors.push("ธีมไม่ถูกต้อง");
  if (
    !Array.isArray(g.photos) ||
    g.photos.length > 30 ||
    !Array.isArray(g.songs) ||
    g.songs.length > 15
  )
    return [...errors, "เพิ่มได้สูงสุด 30 รูป และ 15 เพลง"];
  const mediaValid = (m: Media | null, kind: string) =>
    m === null ||
    !!(
      m &&
      typeof m.id === "string" &&
      /^[a-zA-Z0-9_-]{1,80}$/.test(m.id) &&
      typeof m.path === "string" &&
      /^media\/[a-zA-Z0-9_-]+\.(jpg|png|webp|mp3|wav|ogg|m4a)$/.test(m.path) &&
      m.kind === kind &&
      typeof m.mime === "string" &&
      m.mime.length < 60 &&
      Number.isFinite(m.x) &&
      Number.isFinite(m.y) &&
      m.x >= 0 &&
      m.x <= 100 &&
      m.y >= 0 &&
      m.y <= 100
    );
  if (!mediaValid(g.hero, "image")) errors.push("รูปหลักไม่ถูกต้อง");
  const validId = (id: unknown) =>
    typeof id === "string" && /^[a-zA-Z0-9_-]{1,80}$/.test(id);
  const ids = new Set<string>();
  for (const p of g.photos) {
    if (
      !p ||
      !validId(p.id) ||
      ids.has(p.id) ||
      typeof p.caption !== "string" ||
      p.caption.length > 500 ||
      !["single", "couple"].includes(p.category) ||
      !mediaValid(p.media, "image")
    )
      errors.push("รูปหรือคำบรรยายไม่ถูกต้อง");
    if (p) ids.add(p.id);
  }
  ids.clear();
  for (const s of g.songs) {
    if (
      !s ||
      !validId(s.id) ||
      ids.has(s.id) ||
      typeof s.title !== "string" ||
      s.title.length > 200 ||
      typeof s.artist !== "string" ||
      s.artist.length > 200 ||
      typeof s.url !== "string" ||
      !["youtube", "audio"].includes(s.source) ||
      !mediaValid(s.media, "audio")
    ) {
      errors.push("ข้อมูลเพลงไม่ถูกต้อง");
      continue;
    }
    ids.add(s.id);
    if (s.source === "youtube" && s.url && !youtubeId(s.url))
      errors.push("ใช้ลิงก์ HTTPS ของ YouTube ที่มีรหัสวิดีโอถูกต้อง");
    if ((s.url || s.media) && !s.title.trim())
      errors.push("กรุณาใส่ชื่อเพลงที่เพิ่มแหล่งเสียงแล้ว");
  }
  return [...new Set(errors)];
}
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const AUDIO_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/mp4",
  "audio/x-m4a",
];
export function validateFile(
  file: { type: string; size: number },
  kind: "image" | "audio",
): string | null {
  if (!(kind === "image" ? IMAGE_TYPES : AUDIO_TYPES).includes(file.type))
    return kind === "image"
      ? "ใช้รูป JPG, PNG หรือ WebP เท่านั้น"
      : "ใช้ไฟล์ MP3, WAV, OGG หรือ M4A เท่านั้น";
  if (file.size <= 0 || file.size > (kind === "image" ? 8 : 20) * 1024 * 1024)
    return `ไฟล์ต้องไม่เกิน ${kind === "image" ? 8 : 20} MB และไม่เป็นไฟล์ว่าง`;
  return null;
}
export function detectMime(bytes: Uint8Array): string | null {
  const text = (a: number, b: number) =>
    String.fromCharCode(...bytes.slice(a, b));
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255)
    return "image/jpeg";
  if (
    bytes[0] === 137 &&
    text(1, 4) === "PNG" &&
    bytes[4] === 13 &&
    bytes[5] === 10
  )
    return "image/png";
  if (text(0, 4) === "RIFF" && text(8, 12) === "WEBP") return "image/webp";
  if (text(0, 4) === "RIFF" && text(8, 12) === "WAVE") return "audio/wav";
  if (text(0, 3) === "ID3" || (bytes[0] === 255 && (bytes[1] & 224) === 224))
    return "audio/mpeg";
  if (text(0, 4) === "OggS") return "audio/ogg";
  if (text(4, 8) === "ftyp" && /M4A|isom|mp42|M4B/.test(text(8, 32)))
    return "audio/mp4";
  return null;
}
