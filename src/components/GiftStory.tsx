import { useEffect, useRef, useState } from "react";
import {
  Heart,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  LockKeyhole,
  Mail,
  Sparkles,
  Image as ImageIcon,
  Music2,
  CakeSlice,
  Volume2,
  VolumeX,
} from "lucide-react";
import { service, configurationError } from "../lib/service";
import type { Gift } from "../../shared/model";
import { MediaImage } from "./MediaImage";
import { MusicPlayer } from "./MusicPlayer";
import { Modal } from "./Modal";
const steps = [
  "ซองจดหมาย",
  "วันเกิดของเธอ",
  "คำอธิษฐาน",
  "อัลบั้มของเรา",
  "Songs for you",
  "จดหมายถึงเธอ",
];
const icons = [Mail, Sparkles, CakeSlice, ImageIcon, Music2, Heart];
function dateText(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date + "T00:00:00Z"));
}
function ordinal(n: number) {
  return `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`;
}
export function GiftStory({
  preview,
  onExit,
}: {
  preview?: Gift;
  onExit?: () => void;
}) {
  const [gift, setGift] = useState<Gift | null>(preview ?? null),
    [locked, setLocked] = useState(false),
    [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(!preview),
    [step, setStep] = useState(0),
    [opening, setOpening] = useState(false),
    [blown, setBlown] = useState(false),
    [lightbox, setLightbox] = useState<number | null>(null),
    [effectsMuted, setEffectsMuted] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    sound = useRef<AudioContext | null>(null);
  async function load() {
    if (preview) return;
    setLoading(true);
    setError("");
    try {
      if (configurationError) throw new Error(configurationError);
      const cfg = await service.config();
      if (cfg.enabled) {
        setLocked(true);
      } else setGift(await service.published());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      void sound.current?.close();
    };
  }, []);
  useEffect(() => {
    heading.current?.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [step]);
  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await service.unlock(code);
      setGift(await service.published());
      setCode("");
      setLocked(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  function chime() {
    if (!gift?.theme.effects || effectsMuted) return;
    const c = sound.current ?? new AudioContext();
    sound.current = c;
    void c.resume();
    [523.25, 659.25, 783.99].forEach((f, i) => {
      const o = c.createOscillator(),
        g = c.createGain();
      o.type = "sine";
      o.frequency.value = f;
      o.connect(g);
      g.connect(c.destination);
      g.gain.setValueAtTime(0, c.currentTime + i * 0.14);
      g.gain.linearRampToValueAtTime(0.055, c.currentTime + i * 0.14 + 0.01);
      g.gain.exponentialRampToValueAtTime(
        0.001,
        c.currentTime + i * 0.14 + 0.4,
      );
      o.start(c.currentTime + i * 0.14);
      o.stop(c.currentTime + i * 0.14 + 0.45);
    });
  }
  function go(n: number) {
    if (timer.current) clearTimeout(timer.current);
    setOpening(false);
    setStep(Math.max(0, Math.min(5, n)));
  }
  function openEnvelope() {
    chime();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      go(1);
      return;
    }
    setOpening(true);
    timer.current = setTimeout(() => go(1), 2300);
  }
  if (loading && !gift)
    return (
      <div className="state-page">
        <span className="spinner" />
        <p>กำลังเตรียมของขวัญ…</p>
      </div>
    );
  if (locked)
    return (
      <div className="gate-page">
        <img className="gate-flower" src="/bouquet.webp" alt="" />
        <form className="paper gate-card" onSubmit={unlock}>
          <LockKeyhole size={26} />
          <p className="eyebrow">A LITTLE SECRET</p>
          <h1 className="handwriting">Only for you.</h1>
          <p>
            ของขวัญนี้รอเธออยู่นะ
            <br />
            ใส่รหัสที่เราให้ไว้เพื่อเปิดซอง ♡
          </p>
          <label htmlFor="gift-code">รหัสเปิดของขวัญ</label>
          <input
            id="gift-code"
            autoFocus
            type="password"
            autoComplete="off"
            value={code}
            maxLength={128}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <button className="primary" disabled={loading}>
            {loading ? "กำลังตรวจรหัส…" : "เปิดของขวัญ"}
          </button>
        </form>
      </div>
    );
  if (!gift)
    return (
      <div className="state-page">
        <Mail />
        <h1>ยังเปิดของขวัญไม่ได้</h1>
        <p className="error-text" role="alert">
          {error}
        </p>
        <button className="primary" onClick={() => void load()}>
          ลองอีกครั้ง
        </button>
        <a href="/admin">หน้าจัดการ</a>
      </div>
    );
  const Icon = icons[step];
  const usablePhotos = gift.photos
    .map((p, i) => (p.media ? i : -1))
    .filter((i) => i >= 0);
  function shiftPhoto(direction: number) {
    if (lightbox === null) return;
    const current = usablePhotos.indexOf(lightbox);
    setLightbox(
      usablePhotos[
        (current + direction + usablePhotos.length) % usablePhotos.length
      ],
    );
  }
  return (
    <div
      className={`gift-app ${gift.theme.background}`}
      style={
        {
          "--cream": gift.theme.cream,
          "--pink": gift.theme.pink,
          "--rose": gift.theme.rose,
          "--sage": gift.theme.sage,
        } as React.CSSProperties
      }
    >
      <header className="gift-header">
        <a className="wordmark" href="/" aria-label="กลับไปเปิดของขวัญ">
          a little love <Heart size={17} />
        </a>
        <div className="header-right">
          {preview ? (
            <button className="text-button" onClick={onExit}>
              กลับไปแก้ไข
            </button>
          ) : (
            <span className="header-date">
              {dateText(gift.celebrationDate)}
            </span>
          )}
          {gift.theme.effects && (
            <button
              className="icon-button"
              aria-label={effectsMuted ? "เปิดเสียงประกอบ" : "ปิดเสียงประกอบ"}
              aria-pressed={effectsMuted}
              onClick={() => {
                setEffectsMuted(!effectsMuted);
                if (!effectsMuted) void sound.current?.suspend();
              }}
            >
              {effectsMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          )}
        </div>
      </header>
      {preview && (
        <div className="preview-banner">
          ตัวอย่างฉบับร่าง · ผู้รับยังไม่เห็นการแก้ไขนี้
        </div>
      )}
      <main className={`story story-${step}`}>
        <div className="section-kicker">
          <Icon size={15} />
          <span>
            {String(step + 1).padStart(2, "0")} / 06 · {steps[step]}
          </span>
        </div>
        {step === 0 && (
          <section className="envelope-scene">
            <img className="flower flower-left" src="/bouquet.webp" alt="" />
            <img className="flower flower-right" src="/bouquet.webp" alt="" />
            <p className="eyebrow">SEALED WITH LOVE, JUST FOR YOU</p>
            <h1 ref={heading} tabIndex={-1} className="handwriting huge">
              Something special
              <br />
              <span>for my favourite person.</span>
            </h1>
            <p className="intro-thai">มีจดหมายหนึ่งฉบับ… ที่อยากให้เธอเปิด</p>
            <button
              className={`envelope ${opening ? "opened" : ""}`}
              aria-label="แตะเปิดซองจดหมาย"
              disabled={opening}
              onClick={openEnvelope}
            >
              <span className="envelope-letter">
                Happy {ordinal(gift.age)}
                <br />
                Birthday ♡
              </span>
              <span className="envelope-back" />
              <span className="envelope-flap" />
              <span className="envelope-front" />
              <span className="envelope-address">{gift.envelope}</span>
              <span className="wax-seal">
                <Heart size={26} fill="currentColor" />
              </span>
            </button>
            <p className="tap-hint">
              {opening
                ? "ดอกไม้และความรักกำลังเดินทางไปหาเธอ…"
                : "แตะที่ซอง เพื่อเปิดของขวัญ ♡"}
            </p>
            {opening && (
              <>
                <div className="flower-transition" aria-hidden="true">
                  {Array.from({ length: 7 }, (_, i) => (
                    <img
                      src="/bouquet.webp"
                      key={i}
                      style={{ "--i": i } as React.CSSProperties}
                      alt=""
                    />
                  ))}
                </div>
                <button className="skip-button" onClick={() => go(1)}>
                  ข้ามภาพเคลื่อนไหว
                </button>
              </>
            )}
          </section>
        )}
        {step === 1 && (
          <section className="birthday-scene">
            <div className="birthday-copy">
              <p className="eyebrow">TODAY IS ALL ABOUT YOU</p>
              <h1 ref={heading} tabIndex={-1} className="handwriting huge">
                Happy {ordinal(gift.age)}
                <br />
                <span>Birthday</span>
              </h1>
              {gift.recipient ? (
                <h2 className="recipient-name">{gift.recipient}</h2>
              ) : (
                <p className="recipient-name">ถึงคนโปรดของเค้า ♡</p>
              )}
              <p className="birthday-wish">{gift.wish}</p>
              <div className="dates">
                <div>
                  <small>วันฉลองวันเกิด</small>
                  <strong>{dateText(gift.celebrationDate)}</strong>
                </div>
                <div>
                  <small>วันเกิดของเธอ</small>
                  <span>{dateText(gift.birthDate)}</span>
                </div>
              </div>
            </div>
            <div className="hero-polaroid polaroid">
              <div className="tape" />
              <div className="hero-image">
                <MediaImage
                  media={gift.hero}
                  alt="รูปคนโปรดของเค้า"
                  admin={!!preview}
                />
              </div>
              <p className="handwriting">
                you make the world a little sweeter ♡
              </p>
              <img className="polaroid-flower" src="/bouquet.webp" alt="" />
            </div>
          </section>
        )}
        {step === 2 && (
          <section className="cake-scene">
            <p className="eyebrow">MAKE A WISH</p>
            <h1 ref={heading} tabIndex={-1} className="handwriting huge">
              A wish, just for you.
            </h1>
            <p>
              {blown
                ? "คำอธิษฐานถูกส่งไปแล้ว ♡"
                : "หลับตา อธิษฐาน แล้วเป่าเทียนไปด้วยกัน"}
            </p>
            <div
              className={`cake-display ${blown ? "blown" : ""}`}
              aria-label={`เค้กกับเทียนเลข ${gift.age} ${blown ? "เทียนดับแล้ว" : "เทียนกำลังสว่าง"}`}
            >
              <div className="candles">
                {String(gift.age)
                  .split("")
                  .map((n, i) => (
                    <div className="number-candle" key={i}>
                      <span className="flame" />
                      <span>{n}</span>
                    </div>
                  ))}
              </div>
              <div className="cake-top">♡</div>
              <div className="cake-layer">
                <span className="cake-icing" />
                <span className="cake-ribbon">with love</span>
              </div>
              <div className="cake-base" />
            </div>
            {blown && (
              <>
                <div className="confetti" aria-hidden="true">
                  {Array.from({ length: 30 }, (_, i) => (
                    <i
                      key={i}
                      style={
                        {
                          left: `${(i * 37) % 100}%`,
                          "--delay": `${(i % 6) * 0.09}s`,
                          "--rotation": `${i * 73}deg`,
                          background: i % 3 ? "var(--pink)" : "var(--sage)",
                        } as React.CSSProperties
                      }
                    />
                  ))}
                </div>
                <p className="candle-wish" role="status">
                  {gift.candleWish}
                </p>
                <button className="text-button" onClick={() => setBlown(false)}>
                  <RotateCcw size={17} />
                  เล่นใหม่
                </button>
              </>
            )}
            {!blown && (
              <button
                className="primary"
                onClick={() => {
                  setBlown(true);
                  chime();
                }}
              >
                อธิษฐานแล้วเป่าเทียน
              </button>
            )}
          </section>
        )}
        {step === 3 && (
          <section className="album-scene">
            <p className="eyebrow">LITTLE MOMENTS, BIG FEELINGS</p>
            <h1 ref={heading} tabIndex={-1} className="handwriting huge">
              Our little album.
            </h1>
            <p>เก็บรอยยิ้มไว้ในหน้ากระดาษนี้ ♡</p>
            <div className="album-grid">
              {gift.photos.map((p, i) => (
                <button
                  className={`polaroid album-photo photo-${i % 3}`}
                  key={p.id}
                  aria-label={
                    p.media
                      ? `เปิดรูป ${p.caption || i + 1}`
                      : `ช่องรูปที่ ${i + 1} ยังไม่มีรูป`
                  }
                  disabled={!p.media}
                  onClick={() => setLightbox(i)}
                >
                  <div className="tape" />
                  <div className="album-image">
                    <MediaImage
                      media={p.media}
                      alt={
                        p.caption ||
                        `พื้นที่สำหรับ${p.category === "couple" ? "รูปคู่" : "รูปของเธอ"}`
                      }
                      admin={!!preview}
                    />
                  </div>
                  <span className="photo-caption">
                    {p.caption || (
                      <span className="handwriting">a moment to keep ♡</span>
                    )}
                  </span>
                  <small className="photo-index">
                    {String(i + 1).padStart(2, "0")}
                  </small>
                </button>
              ))}
            </div>
            {gift.photos.length === 0 && (
              <div className="paper empty-album">
                <ImageIcon />
                <p>พื้นที่สำหรับรูปที่อยากเก็บไว้ด้วยกัน</p>
              </div>
            )}
          </section>
        )}
        {step === 4 && (
          <section className="songs-scene">
            <p className="eyebrow">PRESS PLAY, FEEL THE LOVE</p>
            <h1 ref={heading} tabIndex={-1} className="handwriting huge">
              Songs for you.
            </h1>
            <MusicPlayer gift={gift} admin={!!preview} />
          </section>
        )}
        {step === 5 && (
          <section className="letter-scene">
            <div className="letter-paper paper">
              <img className="letter-flower" src="/bouquet.webp" alt="" />
              <p className="eyebrow">A LETTER FROM MY HEART</p>
              <h1 ref={heading} tabIndex={-1} className="handwriting huge">
                With all my love.
              </h1>
              <div className="letter-body">
                {gift.letter.split(/\n\s*\n/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              <div className="signature">
                <span>ด้วยรัก</span>
                <strong className="handwriting">
                  {gift.sender || "[ชื่อผู้ส่ง]"}
                </strong>
                <Heart size={20} />
              </div>
            </div>
            <button
              className="primary restart"
              onClick={() => {
                setBlown(false);
                go(0);
              }}
            >
              เปิดของขวัญอีกครั้ง
            </button>
          </section>
        )}
      </main>
      <footer className="story-footer">
        <button
          className="text-button"
          disabled={step === 0}
          onClick={() => go(step - 1)}
        >
          <ArrowLeft size={16} />
          ย้อนกลับ
        </button>
        <div className="story-dots" aria-label={`ตอนที่ ${step + 1} จาก 6`}>
          {steps.map((s, i) => (
            <span key={s} className={i === step ? "active" : ""} title={s} />
          ))}
        </div>
        {step < 5 ? (
          <button
            className="text-button next"
            onClick={() => (step === 0 ? openEnvelope() : go(step + 1))}
            disabled={opening}
          >
            {step === 0 ? "เปิดจดหมาย" : "ถัดไป"}
            <ArrowRight size={16} />
          </button>
        ) : (
          <button className="text-button" onClick={() => go(0)}>
            เริ่มใหม่
            <RotateCcw size={16} />
          </button>
        )}
      </footer>
      <div className="love-footer">
        made with love, for you <Heart size={12} />
      </div>
      {lightbox !== null && (
        <Modal
          title={gift.photos[lightbox].caption || `รูปที่ ${lightbox + 1}`}
          wide
          onClose={() => setLightbox(null)}
        >
          <div className="lightbox-image">
            <MediaImage
              media={gift.photos[lightbox].media}
              alt={gift.photos[lightbox].caption || "รูปในอัลบั้ม"}
              admin={!!preview}
              full
            />
          </div>
          <div className="lightbox-controls">
            <button className="secondary" onClick={() => shiftPhoto(-1)}>
              <ArrowLeft size={18} />
              ก่อนหน้า
            </button>
            <span>
              {usablePhotos.indexOf(lightbox) + 1} / {usablePhotos.length}
            </span>
            <button className="secondary" onClick={() => shiftPhoto(1)}>
              ถัดไป
              <ArrowRight size={18} />
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
