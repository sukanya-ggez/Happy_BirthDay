import { allMedia, detectMime, validateFile, validateGift } from "../../shared/model";
import type { Draft, GateChange, Gift, Media } from "../../shared/model";

export const MAX_BACKUP_BYTES = 128 * 1024 * 1024;
type BackupApi = {
  draft(): Promise<Draft>;
  upload(file: File, kind: "image" | "audio"): Promise<Media>;
  save(gift: Gift, gate: GateChange, version: number): Promise<Draft>;
};

// Validate every required file before uploading or changing the current draft.
export function prepareBackup(input: unknown) {
  if (!input || typeof input !== "object") throw new Error("ไฟล์สำรองไม่ถูกต้อง");
  const b = input as { format?: unknown; draft?: { content?: unknown }; files?: unknown };
  if (b.format !== "happy-birthday-backup-v1") throw new Error("ไม่รองรับรูปแบบไฟล์สำรองนี้");
  const errors = validateGift(b.draft?.content);
  if (errors.length) throw new Error(errors.join("\n"));
  if (!b.files || typeof b.files !== "object" || Array.isArray(b.files))
    throw new Error("ไม่พบรายการไฟล์ในสำรอง");
  const gift = structuredClone(b.draft!.content) as Gift;
  const values = b.files as Record<string, unknown>;
  const files = new Map<string, { file: File; media: Media }>();
  for (const media of allMedia(gift)) {
    const existing = files.get(media.path);
    if (existing) {
      if (existing.media.kind !== media.kind || existing.media.mime !== media.mime)
        throw new Error("ชนิดไฟล์อ้างอิงในสำรองไม่ตรงกัน");
      continue;
    }
    const value = values[media.path];
    if (typeof value !== "string") throw new Error(`ไฟล์สำรองขาดรูปหรือเสียง: ${media.path}`);
    const match = /^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/.exec(value);
    if (!match || match[1] !== media.mime || match[2].length % 4 !== 0)
      throw new Error("ข้อมูลไฟล์ในสำรองไม่ถูกต้อง");
    const maxBytes = (media.kind === "image" ? 8 : 20) * 1024 * 1024;
    if (match[2].length > Math.ceil(maxBytes / 3) * 4)
      throw new Error("ไฟล์ในสำรองใหญ่เกินกำหนด");
    let raw: string;
    try { raw = atob(match[2]); } catch { throw new Error("ข้อมูลไฟล์ในสำรองเสียหาย"); }
    const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    if (detectMime(bytes.subarray(0, 64)) !== media.mime)
      throw new Error("เนื้อหาไฟล์ในสำรองไม่ตรงกับชนิดที่ระบุ");
    const file = new File([bytes], media.path.split("/").at(-1)!, { type: media.mime });
    const error = validateFile(file, media.kind);
    if (error) throw new Error(error);
    files.set(media.path, { file, media });
  }
  return { gift, files };
}

export async function restoreBackup(
  input: unknown,
  api: BackupApi,
  progress?: (done: number, total: number) => void,
): Promise<Draft> {
  const { gift, files } = prepareBackup(input);
  const current = await api.draft();
  const uploaded = new Map<string, Media>();
  progress?.(0, files.size);
  for (const [path, { file, media }] of files) {
    uploaded.set(path, await api.upload(file, media.kind));
    progress?.(uploaded.size, files.size);
  }
  const replace = (m: Media | null): Media | null =>
    m ? { ...uploaded.get(m.path)!, x: m.x, y: m.y } : null;
  gift.hero = replace(gift.hero);
  gift.photos = gift.photos.map((p) => ({ ...p, media: replace(p.media) }));
  gift.songs = gift.songs.map((s) => ({ ...s, media: replace(s.media) }));
  // Keep the current access code. Backups intentionally contain no passwords.
  // Saving uses the original version so concurrent edits are never overwritten.
  return api.save(gift, { enabled: current.gate.enabled }, current.version);
}
