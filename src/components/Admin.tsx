import { appUrl } from "../lib/paths";
import {
  useEffect,
  useState,
  Children,
  isValidElement,
  cloneElement,
} from "react";
import type { ReactNode } from "react";
import {
  Heart,
  Mail,
  Image as ImageIcon,
  Music2,
  Palette,
  Shield,
  Save,
  Eye,
  Send,
  LogOut,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Crop,
  Upload,
  Download,
  Check,
  Menu,
  X,
} from "lucide-react";
import type { Gift, Draft, Media, Song } from "../../shared/model";
import { validateGift, validateFile, youtubeId } from "../../shared/model";
import { service, isDemo, configurationError } from "../lib/service";
import { MediaImage } from "./MediaImage";
import { Modal } from "./Modal";
import { GiftStory } from "./GiftStory";
const tabs = [
  { id: "letter", label: "ข้อความและวันเกิด", icon: Mail },
  { id: "photos", label: "รูปและอัลบั้ม", icon: ImageIcon },
  { id: "songs", label: "เพลงของเธอ", icon: Music2 },
  { id: "theme", label: "สีและบรรยากาศ", icon: Palette },
  { id: "access", label: "การเข้าถึงและสำรอง", icon: Shield },
];
function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {Children.map(children, (child) =>
        isValidElement(child) &&
        ["input", "textarea", "select"].includes(child.type as string)
          ? cloneElement(child as React.ReactElement<Record<string, unknown>>, {
              "aria-label": label,
            })
          : child,
      )}
      {hint && <small>{hint}</small>}
    </label>
  );
}
function move<T>(arr: T[], i: number, d: number): T[] {
  const next = [...arr];
  if (i + d < 0 || i + d >= arr.length) return arr;
  [next[i], next[i + d]] = [next[i + d], next[i]];
  return next;
}
async function optimizeImage(file: File): Promise<File> {
  const error = validateFile(file, "image");
  if (error) throw new Error(error);
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, "image/webp", 0.88),
  );
  return blob ? new File([blob], "photo.webp", { type: "image/webp" }) : file;
}
export function Admin() {
  const [checking, setChecking] = useState(true),
    [authenticated, setAuthenticated] = useState(false),
    [setup, setSetup] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [draft, setDraft] = useState<Draft | null>(null),
    [gift, setGift] = useState<Gift | null>(null),
    [gateEnabled, setGateEnabled] = useState(false),
    [newCode, setNewCode] = useState(""),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(""),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [tab, setTab] = useState("letter"),
    [preview, setPreview] = useState(false),
    [mobileNav, setMobileNav] = useState(false),
    [confirm, setConfirm] = useState<{
      title: string;
      message: string;
      action: () => void;
    } | null>(null),
    [crop, setCrop] = useState<{
      media: Media;
      apply: (m: Media) => void;
    } | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        if (configurationError) throw new Error(configurationError);
        const has = await service.hasOwner();
        if (live) setSetup(!has);
        if (await service.isOwner()) {
          const d = await service.draft();
          if (live) {
            applyDraft(d);
            setAuthenticated(true);
          }
        }
      } catch (e) {
        if (live) setError((e as Error).message);
      } finally {
        if (live) setChecking(false);
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  function applyDraft(d: Draft) {
    setDraft(d);
    setGift(structuredClone(d.content));
    setGateEnabled(d.gate.enabled);
    setNewCode("");
    setDirty(false);
  }
  function change(partial: Partial<Gift>) {
    setGift((prev) => (prev ? { ...prev, ...partial } : prev));
    setDirty(true);
    setStatus("");
    setError("");
  }
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy("กำลังเข้าสู่ระบบ…");
    setError("");
    try {
      await service.login(email, password, setup);
      applyDraft(await service.draft());
      setAuthenticated(true);
      setPassword("");
      setSetup(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function save(): Promise<Draft | null> {
    if (!gift || !draft) return null;
    const errors = validateGift(gift);
    if (errors.length) {
      setError(errors.join("\n"));
      return null;
    }
    setBusy("กำลังบันทึกฉบับร่าง…");
    setError("");
    try {
      const d = await service.save(
        gift,
        { enabled: gateEnabled, newCode: newCode || undefined },
        draft.version,
      );
      applyDraft(d);
      setStatus("บันทึกฉบับร่างแล้ว");
      return d;
    } catch (e) {
      setError((e as Error).message);
      return null;
    } finally {
      setBusy("");
    }
  }
  async function publish() {
    let d = draft;
    if (dirty) d = await save();
    if (!d) return;
    setBusy("กำลังเผยแพร่เนื้อหา…");
    setError("");
    try {
      const next = await service.publish(d.version);
      applyDraft(next);
      setStatus(
        isDemo
          ? "เผยแพร่ฉบับ Demo ในอุปกรณ์นี้แล้ว"
          : "เผยแพร่เนื้อหาแล้ว ผู้รับจะเห็นฉบับใหม่เมื่อเปิดเว็บอีกครั้ง",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  async function upload(
    file: File | undefined,
    kind: "image" | "audio",
    apply: (m: Media) => void,
  ) {
    if (!file) return;
    const err = validateFile(file, kind);
    if (err) {
      setError(err);
      return;
    }
    setBusy(
      `กำลัง${kind === "image" ? "เตรียมและอัปโหลดรูป" : "อัปโหลดเสียง"}…`,
    );
    setError("");
    try {
      const m = await service.upload(
        kind === "image" ? await optimizeImage(file) : file,
        kind,
      );
      if (kind === "image") setCrop({ media: m, apply });
      else apply(m);
      setStatus("อัปโหลดแล้ว กรุณาบันทึกฉบับร่าง");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  function remove(title: string, action: () => void) {
    setConfirm({
      title: `ลบ${title}`,
      message: `ต้องการลบ${title}ออกจากฉบับร่างใช่ไหม? ฉบับที่เผยแพร่จะยังเหมือนเดิมจนกว่าจะเผยแพร่อีกครั้ง`,
      action,
    });
  }
  async function logout() {
    await service.logout();
    setAuthenticated(false);
    setGift(null);
    setDraft(null);
    setDirty(false);
  }
  async function backup() {
    setBusy("กำลังรวบรวมไฟล์สำรอง…");
    setError("");
    try {
      const data = await service.backup();
      const u = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = u;
      a.download = "happy-birthday-backup.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 1000);
      setStatus("ดาวน์โหลดสำรองฉบับร่างพร้อมไฟล์แล้ว");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  if (checking)
    return (
      <div className="state-page">
        <span className="spinner" />
        <p>กำลังเปิดหน้าจัดการ…</p>
      </div>
    );
  if (!authenticated || !gift || !draft)
    return (
      <div className="admin-login">
        <a href={appUrl()} className="wordmark">
          a little love <Heart size={17} />
        </a>
        <form className="paper login-card" onSubmit={login}>
          <div className="login-emblem">
            <Mail size={30} />
          </div>
          <p className="eyebrow">THE PERSON BEHIND THE SURPRISE</p>
          <h1 className="handwriting">A little love studio.</h1>
          <p>
            {setup
              ? "ตั้งบัญชีเจ้าของสำหรับทดลองในอุปกรณ์นี้"
              : "เข้าสู่ระบบเพื่อเตรียมของขวัญของเธอ"}
          </p>
          {isDemo && (
            <div className="notice demo">
              Demo · บัญชีและข้อมูลอยู่ในเบราว์เซอร์นี้เท่านั้น
              ไม่ใช่การรักษาความปลอดภัยออนไลน์
            </div>
          )}
          <Field label="อีเมลเจ้าของ">
            <input
              type="email"
              value={email}
              autoComplete="username"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field
            label="รหัสผ่านเจ้าของ"
            hint={
              setup ? "อย่างน้อย 8 ตัวอักษร · แยกจากรหัสเปิดของขวัญ" : undefined
            }
          >
            <input
              type="password"
              value={password}
              autoComplete={setup ? "new-password" : "current-password"}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={setup ? 8 : 1}
            />
          </Field>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={!!busy || !!configurationError}>
            {busy || (setup ? "ตั้งบัญชี Demo และเริ่มจัดการ" : "เข้าสู่ระบบ")}
          </button>
          <a className="text-button" href={appUrl()}>
            กลับไปหน้าของขวัญ
          </a>
        </form>
      </div>
    );
  if (preview)
    return <GiftStory preview={gift} onExit={() => setPreview(false)} />;
  const textField = (
    key: keyof Gift,
    label: string,
    large = false,
    maxLength = 1000,
  ) => (
    <Field label={label}>
      {large ? (
        <textarea
          rows={key === "letter" ? 12 : 3}
          value={gift[key] as string}
          maxLength={maxLength}
          onChange={(e) => change({ [key]: e.target.value })}
        />
      ) : (
        <input
          value={gift[key] as string}
          maxLength={maxLength}
          onChange={(e) => change({ [key]: e.target.value })}
        />
      )}
    </Field>
  );
  function photoChange(index: number, patch: Partial<Gift["photos"][number]>) {
    change({
      photos: gift!.photos.map((p, i) =>
        i === index ? { ...p, ...patch } : p,
      ),
    });
  }
  function songChange(index: number, patch: Partial<Song>) {
    change({
      songs: gift!.songs.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    });
  }
  return (
    <div className="admin-app">
      <aside className={`admin-sidebar ${mobileNav ? "visible" : ""}`}>
        <a
          className="wordmark"
          href={appUrl()}
          onClick={(e) => {
            e.preventDefault();
            if (dirty)
              setConfirm({
                title: "เปิดหน้าของขวัญ",
                message: "การแก้ไขยังไม่ได้บันทึก ต้องการออกจากหน้าจัดการไหม?",
                action: () => {
                  location.href = appUrl();
                },
              });
            else location.href = appUrl();
          }}
        >
          a little love <Heart size={17} />
        </a>
        <span className="studio-tag">BIRTHDAY STUDIO</span>
        <button
          className="mobile-close icon-button"
          aria-label="ปิดเมนู"
          onClick={() => setMobileNav(false)}
        >
          <X />
        </button>
        <nav aria-label="เมนูจัดการ">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "active" : ""}
              onClick={() => {
                setTab(t.id);
                setMobileNav(false);
              }}
            >
              <t.icon size={20} />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Heart size={21} />
            <p>
              ของขวัญที่เธอเปิดได้
              <br />
              ทุกครั้งที่คิดถึงกัน
            </p>
          </div>
          <button
            className="text-button"
            onClick={() =>
              dirty
                ? setConfirm({
                    title: "ออกจากระบบ",
                    message:
                      "ยังมีการแก้ไขที่ไม่ได้บันทึก ต้องการออกจากระบบไหม?",
                    action: () => void logout(),
                  })
                : void logout()
            }
          >
            <LogOut size={17} />
            ออกจากระบบ
          </button>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <button
              className="mobile-menu icon-button"
              aria-label="เปิดเมนู"
              onClick={() => setMobileNav(true)}
            >
              <Menu />
            </button>
            <span className="draft-pill">ฉบับร่าง</span>
            <span className="save-indicator">
              {busy || (dirty ? "มีการแก้ไขที่ยังไม่บันทึก" : "บันทึกแล้ว")}
            </span>
          </div>
          <div className="admin-actions">
            <button
              className="secondary"
              disabled={!!busy}
              onClick={() => setPreview(true)}
            >
              <Eye size={17} />
              <span>ดูตัวอย่าง</span>
            </button>
            <button
              className="secondary"
              disabled={!!busy || !dirty}
              onClick={() => void save()}
            >
              <Save size={17} />
              <span>บันทึกฉบับร่าง</span>
            </button>
            <button
              className="primary"
              disabled={!!busy}
              onClick={() =>
                setConfirm({
                  title: "เผยแพร่ของขวัญ",
                  message: isDemo
                    ? "เผยแพร่เฉพาะในอุปกรณ์นี้ ผู้เปิดลิงก์จากอุปกรณ์อื่นจะยังไม่เห็นข้อมูลนี้"
                    : "ผู้รับจะเห็นเนื้อหานี้เมื่อเปิดเว็บใหม่ การเผยแพร่จะยกเลิก session รหัสเดิม หากมีการแก้ไขที่ยังไม่บันทึก ระบบจะบันทึกก่อน",
                  action: () => void publish(),
                })
              }
            >
              <Send size={17} />
              <span>เผยแพร่เนื้อหา</span>
            </button>
          </div>
        </header>
        <div className="admin-content">
          {isDemo && (
            <div className="notice demo">
              <strong>กำลังใช้โหมด Demo</strong>
              <span>
                ข้อมูลบันทึกเฉพาะอุปกรณ์และเบราว์เซอร์นี้
                ยังไม่ส่งถึงผู้เปิดลิงก์คนอื่น ·
                ล้างข้อมูลเบราว์เซอร์แล้วข้อมูลจะหาย
              </span>
            </div>
          )}
          {busy && (
            <div className="notice progress" role="status">
              <span className="spinner" />
              {busy}
            </div>
          )}
          {status && (
            <div className="notice success" role="status">
              <Check size={18} />
              {status}
            </div>
          )}
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          <div className="admin-page-heading">
            <p className="eyebrow">MAKE IT PERSONAL</p>
            <h1>{tabs.find((t) => t.id === tab)?.label}</h1>
            <p>ค่อย ๆ เติมสิ่งที่อยากมอบให้เธอ แล้วเผยแพร่เมื่อพร้อม</p>
          </div>
          {tab === "letter" && (
            <>
              <section className="editor-card">
                <div className="card-heading">
                  <span className="card-number">01</span>
                  <div>
                    <h2>วันพิเศษของเธอ</h2>
                    <p>ชื่อจริงยังเว้นว่างได้ จนกว่าจะพร้อม</p>
                  </div>
                </div>
                <div className="field-grid">
                  {textField("recipient", "ชื่อแฟน", false, 100)}
                  {textField("sender", "ชื่อผู้ส่ง", false, 100)}
                  <Field label="อายุที่ฉลอง">
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={gift.age}
                      onChange={(e) => change({ age: +e.target.value })}
                      required
                    />
                  </Field>
                  <Field label="วันเกิด">
                    <input
                      type="date"
                      value={gift.birthDate}
                      onChange={(e) => change({ birthDate: e.target.value })}
                    />
                  </Field>
                  <Field label="วันฉลอง">
                    <input
                      type="date"
                      value={gift.celebrationDate}
                      onChange={(e) =>
                        change({ celebrationDate: e.target.value })
                      }
                    />
                  </Field>
                </div>
              </section>
              <section className="editor-card">
                <div className="card-heading">
                  <span className="card-number">02</span>
                  <div>
                    <h2>คำเล็ก ๆ ที่มีความหมาย</h2>
                    <p>จากหน้าซอง ไปจนถึงคำอธิษฐาน</p>
                  </div>
                </div>
                {textField("envelope", "ข้อความบนซอง", false, 200)}
                {textField("wish", "คำอวยพรวันเกิด", true)}
                {textField("candleWish", "คำอวยพรหลังเป่าเทียน", true, 500)}
                {textField("musicNote", "ข้อความข้างเครื่องเล่นเพลง", true)}
              </section>
              <section className="editor-card">
                <div className="card-heading">
                  <span className="card-number">03</span>
                  <div>
                    <h2>จดหมายรัก</h2>
                    <p>เว้นบรรทัดว่างเพื่อเริ่มย่อหน้าใหม่ รองรับภาษาไทย</p>
                  </div>
                </div>
                {textField("letter", "ข้อความในจดหมาย", true, 15000)}
              </section>
            </>
          )}
          {tab === "photos" && (
            <>
              <section className="editor-card">
                <div className="card-heading">
                  <span className="card-number">01</span>
                  <div>
                    <h2>รูปหลักในหน้าวันเกิด</h2>
                    <p>
                      JPG, PNG, WebP ไม่เกิน 8 MB ·
                      ปรับขนาดภาพให้เหมาะกับมือถือก่อนอัปโหลด
                    </p>
                  </div>
                </div>
                <div className="hero-editor">
                  <div className="editor-hero-image">
                    <MediaImage media={gift.hero} alt="รูปหลัก" admin />
                  </div>
                  <div className="media-actions">
                    <label
                      className={`secondary upload-label ${busy ? "disabled" : ""}`}
                    >
                      <Upload size={17} />
                      อัปโหลดรูปหลัก
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={!!busy}
                        onChange={(e) => {
                          void upload(e.target.files?.[0], "image", (m) =>
                            change({ hero: m }),
                          );
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {gift.hero && (
                      <>
                        <button
                          className="secondary"
                          onClick={() =>
                            setCrop({
                              media: gift.hero!,
                              apply: (m) => change({ hero: m }),
                            })
                          }
                        >
                          <Crop size={17} />
                          ปรับตำแหน่งครอป
                        </button>
                        <button
                          className="text-button danger"
                          onClick={() =>
                            remove("รูปหลัก", () => change({ hero: null }))
                          }
                        >
                          <Trash2 size={17} />
                          ลบรูปหลัก
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </section>
              <section className="editor-card">
                <div className="card-heading">
                  <span className="card-number">02</span>
                  <div>
                    <h2>
                      อัลบั้มรูป <small>{gift.photos.length} / 30</small>
                    </h2>
                    <p>ใส่รูปเดี่ยวหรือรูปคู่ แล้วเรียงลำดับได้ตามใจ</p>
                  </div>
                  <button
                    className="secondary"
                    disabled={gift.photos.length >= 30 || !!busy}
                    onClick={() =>
                      change({
                        photos: [
                          ...gift.photos,
                          {
                            id: crypto.randomUUID(),
                            media: null,
                            caption: "",
                            category: "single",
                          },
                        ],
                      })
                    }
                  >
                    <Plus size={17} />
                    เพิ่มช่องรูป
                  </button>
                </div>
                <div className="photo-edit-grid">
                  {gift.photos.map((p, i) => (
                    <article className="photo-editor" key={p.id}>
                      <div className="photo-editor-preview">
                        <MediaImage
                          media={p.media}
                          alt={`ช่องรูปที่ ${i + 1}`}
                          admin
                        />
                        <label
                          className={`upload-overlay ${busy ? "disabled" : ""}`}
                          aria-label={`อัปโหลดรูปที่ ${i + 1}`}
                        >
                          <Upload size={20} />
                          <span>{p.media ? "เปลี่ยนรูป" : "เพิ่มรูป"}</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            disabled={!!busy}
                            onChange={(e) => {
                              void upload(e.target.files?.[0], "image", (m) =>
                                photoChange(i, { media: m }),
                              );
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                      <Field label={`คำบรรยายรูปที่ ${i + 1}`}>
                        <input
                          value={p.caption}
                          maxLength={500}
                          placeholder="เขียนคำบรรยายรูป"
                          onChange={(e) =>
                            photoChange(i, { caption: e.target.value })
                          }
                        />
                      </Field>
                      <Field label="ประเภทรูป">
                        <select
                          value={p.category}
                          onChange={(e) =>
                            photoChange(i, {
                              category: e.target.value as "single" | "couple",
                            })
                          }
                        >
                          <option value="single">รูปเดี่ยว</option>
                          <option value="couple">รูปคู่</option>
                        </select>
                      </Field>
                      <div className="row-tools">
                        <span>{String(i + 1).padStart(2, "0")}</span>
                        <button
                          className="icon-button"
                          aria-label={`เลื่อนรูปที่ ${i + 1} ขึ้น`}
                          disabled={!i}
                          onClick={() =>
                            change({ photos: move(gift.photos, i, -1) })
                          }
                        >
                          <ArrowUp size={17} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`เลื่อนรูปที่ ${i + 1} ลง`}
                          disabled={i === gift.photos.length - 1}
                          onClick={() =>
                            change({ photos: move(gift.photos, i, 1) })
                          }
                        >
                          <ArrowDown size={17} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`ครอปรูปที่ ${i + 1}`}
                          disabled={!p.media}
                          onClick={() =>
                            setCrop({
                              media: p.media!,
                              apply: (m) => photoChange(i, { media: m }),
                            })
                          }
                        >
                          <Crop size={17} />
                        </button>
                        <button
                          className="icon-button danger"
                          aria-label={`ลบช่องรูปที่ ${i + 1}`}
                          onClick={() =>
                            remove(`ช่องรูปที่ ${i + 1}`, () =>
                              change({
                                photos: gift.photos.filter(
                                  (x) => x.id !== p.id,
                                ),
                              }),
                            )
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </>
          )}
          {tab === "songs" && (
            <section className="editor-card">
              <div className="card-heading">
                <span className="card-number">01</span>
                <div>
                  <h2>
                    เพลงที่อยากให้เธอฟัง <small>{gift.songs.length} / 15</small>
                  </h2>
                  <p>
                    ลิงก์ YouTube หรือไฟล์เสียงที่คุณมีสิทธิ์ใช้ · ไฟล์ไม่เกิน
                    20 MB
                  </p>
                </div>
                <button
                  className="secondary"
                  disabled={gift.songs.length >= 15 || !!busy}
                  onClick={() =>
                    change({
                      songs: [
                        ...gift.songs,
                        {
                          id: crypto.randomUUID(),
                          title: "",
                          artist: "",
                          source: "youtube",
                          url: "",
                          media: null,
                        },
                      ],
                    })
                  }
                >
                  <Plus size={17} />
                  เพิ่มเพลง
                </button>
              </div>
              <div className="song-edit-list">
                {gift.songs.map((s, i) => (
                  <article className="song-editor" key={s.id}>
                    <div className="song-editor-head">
                      <span className="card-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3>{s.title || "เพลงที่รอเลือก"}</h3>
                      <div className="row-tools">
                        <button
                          className="icon-button"
                          aria-label={`เลื่อนเพลงที่ ${i + 1} ขึ้น`}
                          disabled={!i}
                          onClick={() =>
                            change({ songs: move(gift.songs, i, -1) })
                          }
                        >
                          <ArrowUp size={17} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`เลื่อนเพลงที่ ${i + 1} ลง`}
                          disabled={i === gift.songs.length - 1}
                          onClick={() =>
                            change({ songs: move(gift.songs, i, 1) })
                          }
                        >
                          <ArrowDown size={17} />
                        </button>
                        <button
                          className="icon-button danger"
                          aria-label={`ลบเพลงที่ ${i + 1}`}
                          onClick={() =>
                            remove(`เพลงที่ ${i + 1}`, () =>
                              change({
                                songs: gift.songs.filter((x) => x.id !== s.id),
                              }),
                            )
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </div>
                    <div className="field-grid">
                      <Field label={`ชื่อเพลงที่ ${i + 1}`}>
                        <input
                          value={s.title}
                          maxLength={200}
                          onChange={(e) =>
                            songChange(i, { title: e.target.value })
                          }
                        />
                      </Field>
                      <Field label={`ศิลปินเพลงที่ ${i + 1}`}>
                        <input
                          value={s.artist}
                          maxLength={200}
                          onChange={(e) =>
                            songChange(i, { artist: e.target.value })
                          }
                        />
                      </Field>
                      <Field label={`แหล่งเสียงเพลงที่ ${i + 1}`}>
                        <select
                          value={s.source}
                          onChange={(e) =>
                            songChange(i, {
                              source: e.target.value as Song["source"],
                            })
                          }
                        >
                          <option value="youtube">YouTube</option>
                          <option value="audio">ไฟล์เสียง</option>
                        </select>
                      </Field>
                      {s.source === "youtube" ? (
                        <Field label={`ลิงก์ YouTube เพลงที่ ${i + 1}`}>
                          <input
                            type="url"
                            value={s.url}
                            placeholder="https://www.youtube.com/watch?v=…"
                            onChange={(e) =>
                              songChange(i, { url: e.target.value })
                            }
                            aria-invalid={!!s.url && !youtubeId(s.url)}
                          />
                          {!!s.url && !youtubeId(s.url) && (
                            <small className="error-text">
                              ลิงก์ YouTube ยังไม่ถูกต้อง
                            </small>
                          )}
                        </Field>
                      ) : (
                        <div className="field">
                          <span>ไฟล์เสียงเพลงที่ {i + 1}</span>
                          <label
                            className={`secondary upload-label ${busy ? "disabled" : ""}`}
                          >
                            <Upload size={17} />
                            {s.media ? "เปลี่ยนไฟล์เสียง" : "อัปโหลดไฟล์เสียง"}
                            <input
                              type="file"
                              accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4,.m4a"
                              disabled={!!busy}
                              onChange={(e) => {
                                void upload(e.target.files?.[0], "audio", (m) =>
                                  songChange(i, { media: m }),
                                );
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <small>
                            {s.media
                              ? "มีไฟล์เสียงแล้ว · ดูตัวอย่างเพื่อทดลองฟัง"
                              : "MP3, WAV, OGG หรือ M4A"}
                          </small>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {gift.songs.length === 0 && (
                <p className="muted">
                  ยังไม่มีเพลง กดเพิ่มเพลงเพื่อเริ่มจัดมิกซ์เทป
                </p>
              )}
            </section>
          )}
          {tab === "theme" && (
            <section className="editor-card">
              <div className="card-heading">
                <span className="card-number">01</span>
                <div>
                  <h2>สีของของขวัญ</h2>
                  <p>ครีม ชมพู กุหลาบ และสีเขียวอ่อน</p>
                </div>
              </div>
              <div className="color-grid">
                {(
                  [
                    { key: "cream", label: "พื้นหลังครีม" },
                    { key: "pink", label: "ชมพูอ่อน" },
                    { key: "rose", label: "สีหลักกุหลาบ" },
                    { key: "sage", label: "เขียวใบไม้" },
                  ] as const
                ).map((c) => (
                  <Field key={c.key} label={c.label}>
                    <div className="color-field">
                      <input
                        type="color"
                        value={gift.theme[c.key]}
                        onChange={(e) =>
                          change({
                            theme: { ...gift.theme, [c.key]: e.target.value },
                          })
                        }
                      />
                      <span>{gift.theme[c.key]}</span>
                    </div>
                  </Field>
                ))}
              </div>
              <Field label="พื้นหลัง">
                <select
                  value={gift.theme.background}
                  onChange={(e) =>
                    change({
                      theme: {
                        ...gift.theme,
                        background: e.target
                          .value as Gift["theme"]["background"],
                      },
                    })
                  }
                >
                  <option value="paper">กระดาษวินเทจ</option>
                  <option value="plain">สีเรียบ</option>
                </select>
              </Field>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={gift.theme.effects}
                  onChange={(e) =>
                    change({
                      theme: { ...gift.theme, effects: e.target.checked },
                    })
                  }
                />
                <span>
                  <strong>เสียงประกอบตอนเปิดซองและเป่าเทียน</strong>
                  <small>
                    เสียงสั้นหลังผู้รับแตะเท่านั้น · ปิดได้จากหน้าของขวัญ
                  </small>
                </span>
              </label>
              <div
                className="theme-sample"
                style={{
                  background: gift.theme.cream,
                  color: gift.theme.rose,
                  borderColor: gift.theme.pink,
                }}
              >
                <span className="handwriting">
                  Happy {gift.age}th Birthday ♡
                </span>
                <span style={{ color: gift.theme.sage }}>
                  a little love, just for you.
                </span>
              </div>
            </section>
          )}
          {tab === "access" && (
            <>
              <section className="editor-card">
                <div className="card-heading">
                  <span className="card-number">01</span>
                  <div>
                    <h2>รหัสสำหรับผู้รับ</h2>
                    <p>แยกจากบัญชีเจ้าของ และเริ่มมีผลเมื่อเผยแพร่</p>
                  </div>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={gateEnabled}
                    onChange={(e) => {
                      setGateEnabled(e.target.checked);
                      setDirty(true);
                    }}
                  />
                  <span>
                    <strong>ให้ใส่รหัสก่อนเปิดของขวัญ</strong>
                    <small>
                      {draft.gate.hasCode
                        ? "มีรหัสตั้งไว้แล้ว · เว้นว่างเพื่อใช้รหัสเดิม"
                        : "ยังไม่มีรหัส"}
                    </small>
                  </span>
                </label>
                <Field
                  label="ตั้งหรือเปลี่ยนรหัสผู้รับ"
                  hint="อย่างน้อย 4 ตัวอักษร ไม่เกิน 72 ไบต์ UTF-8 · ระบบไม่แสดงรหัสเดิม"
                >
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newCode}
                    minLength={4}
                    maxLength={128}
                    placeholder="ใส่รหัสใหม่"
                    onChange={(e) => {
                      setNewCode(e.target.value);
                      setDirty(true);
                    }}
                  />
                </Field>
                {isDemo && (
                  <div className="notice demo">
                    รหัสใน Demo ใช้ทดลองขั้นตอนเท่านั้น
                    ผู้ใช้เครื่องนี้ยังตรวจข้อมูลในเบราว์เซอร์ได้
                    การป้องกันข้อความและรูปจริงต้องเชื่อม Supabase
                  </div>
                )}
              </section>
              <section className="editor-card">
                <div className="card-heading">
                  <span className="card-number">02</span>
                  <div>
                    <h2>สำรองและสถานะเผยแพร่</h2>
                    <p>เก็บสำเนาไว้ก่อนล้างข้อมูลเบราว์เซอร์</p>
                  </div>
                </div>
                <dl className="publish-info">
                  <dt>โหมด</dt>
                  <dd>
                    {isDemo
                      ? "Demo · อุปกรณ์นี้เท่านั้น"
                      : "Supabase · ออนไลน์"}
                  </dd>
                  <dt>เผยแพร่ล่าสุด</dt>
                  <dd>
                    {draft.publishedAt
                      ? new Date(draft.publishedAt).toLocaleString("th-TH")
                      : "ยังไม่ได้เผยแพร่การแก้ไข · ใช้เนื้อหาเริ่มต้น"}
                  </dd>
                </dl>
                <button
                  className="secondary"
                  disabled={!!busy}
                  onClick={() => void backup()}
                >
                  <Download size={17} />
                  ดาวน์โหลดสำรองฉบับร่าง
                </button>
                <p className="muted">
                  ไฟล์ JSON รวมฉบับร่างที่บันทึกแล้วและไฟล์รูป/เสียงที่ใช้
                  รหัสผู้รับไม่รวมในไฟล์นี้
                  สำหรับสำรองฉบับเผยแพร่และฐานข้อมูลออนไลน์ ดู README
                </p>
              </section>
            </>
          )}
        </div>
      </div>
      {confirm && (
        <Modal title={confirm.title} onClose={() => setConfirm(null)}>
          <p>{confirm.message}</p>
          <div className="modal-actions">
            <button className="secondary" onClick={() => setConfirm(null)}>
              ยกเลิก
            </button>
            <button
              className="primary"
              onClick={() => {
                const action = confirm.action;
                setConfirm(null);
                action();
              }}
            >
              ยืนยัน
            </button>
          </div>
        </Modal>
      )}
      {crop && (
        <CropDialog
          media={crop.media}
          onClose={() => setCrop(null)}
          onApply={(m) => {
            crop.apply(m);
            setCrop(null);
          }}
        />
      )}
    </div>
  );
}
function CropDialog({
  media,
  onClose,
  onApply,
}: {
  media: Media;
  onClose: () => void;
  onApply: (m: Media) => void;
}) {
  const [position, setPosition] = useState(media);
  return (
    <Modal title="เลือกตำแหน่งรูปในกรอบ" onClose={onClose}>
      <p className="muted">
        เลื่อนแนวนอนและแนวตั้งเพื่อเลือกส่วนที่อยากให้เห็น รูปเต็มยังคงอยู่
      </p>
      <div className="crop-preview">
        <MediaImage media={position} alt="ตัวอย่างตำแหน่งครอป" admin />
      </div>
      <Field label="ตำแหน่งแนวนอน">
        <input
          type="range"
          min={0}
          max={100}
          value={position.x}
          onChange={(e) => setPosition({ ...position, x: +e.target.value })}
        />
      </Field>
      <Field label="ตำแหน่งแนวตั้ง">
        <input
          type="range"
          min={0}
          max={100}
          value={position.y}
          onChange={(e) => setPosition({ ...position, y: +e.target.value })}
        />
      </Field>
      <div className="modal-actions">
        <button className="secondary" onClick={onClose}>
          ยกเลิก
        </button>
        <button className="primary" onClick={() => onApply(position)}>
          ใช้ตำแหน่งนี้
        </button>
      </div>
    </Modal>
  );
}
