import { useEffect, useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Music2,
  ExternalLink,
  Maximize,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { youtubeId } from "../../shared/model";
import type { Gift } from "../../shared/model";
import { useMedia } from "./MediaImage";
let apiPromise: Promise<void> | null = null;
function youtubeAPI() {
  if (window.YT?.Player) return Promise.resolve();
  if (!apiPromise)
    apiPromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        apiPromise = null;
        reject(
          new Error(
            "เชื่อมต่อ YouTube ไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่",
          ),
        );
      }, 12000);
      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timer);
        resolve();
      };
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.onerror = () => {
        clearTimeout(timer);
        apiPromise = null;
        reject(new Error("โหลด YouTube ไม่สำเร็จ"));
      };
      document.head.append(s);
    });
  return apiPromise;
}
export function MusicPlayer({
  gift,
  admin = false,
}: {
  gift: Gift;
  admin?: boolean;
}) {
  const [selected, setSelected] = useState(0),
    [playing, setPlaying] = useState(false),
    [ready, setReady] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [volume, setVolume] = useState(70),
    [muted, setMuted] = useState(false);
  const player = useRef<YT.Player | null>(null),
    mount = useRef<HTMLDivElement>(null),
    audio = useRef<HTMLAudioElement>(null);
  const song = gift.songs[selected];
  const id = song?.source === "youtube" ? youtubeId(song.url) : null;
  const media = useMedia(song?.source === "audio" ? song.media : null, admin);
  const vol = useRef({ volume, muted });
  vol.current = { volume, muted };
  useEffect(() => {
    let cancelled = false;
    setPlaying(false);
    setReady(false);
    setError("");
    setLoading(!!id);
    if (!id || !mount.current) return;
    const node = document.createElement("div");
    mount.current.replaceChildren(node);
    youtubeAPI()
      .then(() => {
        if (cancelled) return;
        player.current = new window.YT.Player(node, {
          videoId: id,
          width: "100%",
          height: "100%",
          playerVars: {
            playsinline: 1,
            autoplay: 0,
            origin: window.location.origin,
            rel: 0,
          },
          events: {
            onReady: (e) => {
              if (cancelled) return;
              const iframe = e.target.getIframe();
              iframe.title = "วิดีโอเพลงจาก YouTube";
              iframe.setAttribute(
                "allow",
                "autoplay; encrypted-media; fullscreen",
              );
              iframe.setAttribute("allowfullscreen", "");
              e.target.setVolume(vol.current.volume);
              if (vol.current.muted) e.target.mute();
              setReady(true);
              setLoading(false);
            },
            onStateChange: (e) => {
              if (!cancelled) {
                setPlaying(e.data === 1);
                setLoading(e.data === 3);
              }
            },
            onError: (e) => {
              if (!cancelled) {
                setPlaying(false);
                setLoading(false);
                setError(
                  [101, 150].includes(e.data)
                    ? "เพลงนี้ไม่อนุญาตให้เล่นบนเว็บไซต์ เปิดฟังบน YouTube ได้เลยนะ"
                    : "วิดีโอนี้เล่นไม่ได้ ลองเปิดบน YouTube ดูนะ",
                );
              }
            },
            onAutoplayBlocked: () => {
              if (!cancelled) {
                setPlaying(false);
                setLoading(false);
                setError(
                  "เบราว์เซอร์หยุดการเล่น กรุณาแตะปุ่มเล่นในวิดีโออีกครั้ง",
                );
              }
            },
          },
        });
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      player.current?.destroy();
      player.current = null;
    };
  }, [id]);
  useEffect(() => {
    if (audio.current) {
      audio.current.volume = volume / 100;
      audio.current.muted = muted;
    }
    if (player.current && ready) {
      player.current.setVolume(volume);
      muted ? player.current.mute() : player.current.unMute();
    }
  }, [volume, muted, ready]);
  useEffect(() => {
    if (!ready || !id) return;
    const timer = setInterval(() => {
      const p = player.current;
      if (!p) return;
      const actual = p.isMuted();
      const actualVol = Math.round(p.getVolume());
      setMuted(actual);
      setVolume(actualVol);
    }, 600);
    return () => clearInterval(timer);
  }, [ready, id]);
  async function toggle() {
    setError("");
    if (song?.source === "audio") {
      if (!audio.current || !media.url) return;
      if (!audio.current.paused) {
        audio.current.pause();
        return;
      }
      try {
        await audio.current.play();
      } catch {
        setError("เล่นเสียงไม่ได้ กรุณาแตะเล่นอีกครั้งหรือตรวจไฟล์เสียง");
      }
    } else if (player.current && ready) {
      playing ? player.current.pauseVideo() : player.current.playVideo();
    }
  }
  function choose(i: number) {
    audio.current?.pause();
    player.current?.pauseVideo();
    setPlaying(false);
    setSelected(i);
  }
  useEffect(
    () => () => {
      audio.current?.pause();
    },
    [],
  );
  const usable = song?.source === "audio" ? !!media.url : !!id && ready;
  return (
    <div className="music-layout">
      <section className="music-deck">
        <div
          className={`cassette ${playing ? "is-playing" : ""}`}
          aria-label="เครื่องเล่นเทป"
        >
          <div className="cassette-label">
            <span>FOR YOU · VOL. 01</span>
            <HeartLabel />
            <div className="tape-title">
              {song?.title || "Your favourite songs"}
            </div>
            <small>{song?.artist || "a little mixtape, with love"}</small>
          </div>
          <div className="reel-window">
            <div className="reel" />
            <span className="tape-bridge" />
            <div className="reel" />
          </div>
          <div className="cassette-bottom">
            <span>A</span>
            <div />
            <span>♡</span>
          </div>
        </div>
        <div className="play-controls">
          <button
            className="icon-button"
            aria-label="เพลงก่อนหน้า"
            disabled={!selected}
            onClick={() => choose(selected - 1)}
          >
            <SkipBack />
          </button>
          <button
            className="play-button"
            aria-label={playing ? "หยุดเพลง" : "เล่นเพลง"}
            disabled={!usable || !!error}
            onClick={toggle}
          >
            {playing ? (
              <Pause fill="currentColor" />
            ) : (
              <Play fill="currentColor" />
            )}
          </button>
          <button
            className="icon-button"
            aria-label="เพลงถัดไป"
            disabled={selected >= gift.songs.length - 1}
            onClick={() => choose(selected + 1)}
          >
            <SkipForward />
          </button>
        </div>
        <p className="player-status" aria-live="polite">
          {loading
            ? "กำลังเตรียมเพลง…"
            : playing
              ? `กำลังเล่น · ${song?.title}`
              : song?.title
                ? `เลือกแล้ว · ${song.title}`
                : "เลือกเพลงที่อยากฟัง"}
        </p>
        <div className="volume-control">
          <button
            className="icon-button"
            aria-label={muted ? "เปิดเสียง" : "ปิดเสียง"}
            onClick={() => setMuted(!muted)}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </button>
          <label className="sr-only" htmlFor="volume">
            ระดับเสียง
          </label>
          <input
            id="volume"
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(+e.target.value)}
          />
          <span>{muted ? "ปิด" : `${volume}%`}</span>
        </div>
        {song?.source === "youtube" && id && (
          <>
            <div className="youtube-frame" ref={mount} />
            <button
              className="text-button"
              onClick={() => {
                const frame = player.current?.getIframe();
                if (frame?.requestFullscreen)
                  frame
                    .requestFullscreen()
                    .catch(() =>
                      setError(
                        "อุปกรณ์นี้ไม่รองรับเต็มจอ ใช้ปุ่มเต็มจอในวิดีโอได้",
                      ),
                    );
              }}
            >
              <Maximize size={16} />
              เต็มจอ
            </button>
          </>
        )}
        {song?.source === "audio" && (
          <audio
            ref={audio}
            src={media.url || undefined}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onWaiting={() => {
              setLoading(true);
              setPlaying(false);
            }}
            onPlaying={() => {
              setLoading(false);
              setPlaying(true);
            }}
            onError={() => {
              setPlaying(false);
              setLoading(false);
              setError("ไฟล์เสียงนี้เล่นไม่ได้ กรุณาเปลี่ยนไฟล์ในหน้าจัดการ");
            }}
          />
        )}
        {(error || media.error) && (
          <div className="notice error" role="alert">
            {error || media.error}
            {id && (
              <a
                href={`https://www.youtube.com/watch?v=${id}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} /> เปิดบน YouTube
              </a>
            )}
          </div>
        )}
        {!usable && !loading && !error && !media.loading && (
          <p className="muted">เพลงนี้ยังรอใส่ลิงก์หรือไฟล์เสียง ♡</p>
        )}
      </section>
      <section className="track-section">
        <p className="eyebrow">A MIXTAPE FROM ME TO YOU</p>
        <h2 className="handwriting">Every song, a little love.</h2>
        <p className="music-note">{gift.musicNote}</p>
        <div className="track-list">
          {gift.songs.length ? (
            gift.songs.map((s, i) => (
              <button
                key={s.id}
                className={`track ${selected === i ? "selected" : ""}`}
                onClick={() => choose(i)}
                aria-pressed={selected === i}
              >
                <span className="track-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <strong>{s.title || `เพลงที่ ${i + 1}`}</strong>
                  <small>{s.artist || "รอเพลงที่อยากมอบให้เธอ"}</small>
                </span>
                {selected === i && playing ? (
                  <span className="equalizer">▂▆▃</span>
                ) : (
                  <Music2 size={18} />
                )}
              </button>
            ))
          ) : (
            <p>พื้นที่สำหรับเพลงของเธอ</p>
          )}
        </div>
      </section>
    </div>
  );
}
function HeartLabel() {
  return <span className="tape-heart">♡</span>;
}
