import { useEffect, useRef, useState } from "react";
import { Image as ImageIcon, Heart } from "lucide-react";
import { service } from "../lib/service";
import type { Media } from "../../shared/model";
export function useMedia(media: Media | null, admin = false, enabled = true) {
  const [result, setResult] = useState<{
    url: string;
    error: string;
    loading: boolean;
  }>({ url: "", error: "", loading: !!media });
  useEffect(() => {
    let cancelled = false,
      url = "";
    setResult({ url: "", error: "", loading: !!media });
    if (media && enabled)
      service
        .blob(media, admin)
        .then((b) => {
          if (cancelled) return;
          url = URL.createObjectURL(b);
          setResult({ url, error: "", loading: false });
        })
        .catch((e) => {
          if (!cancelled)
            setResult({ url: "", error: e.message, loading: false });
        });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [media?.path, admin, enabled]);
  return result;
}
export function MediaImage({
  media,
  alt,
  admin = false,
  full = false,
}: {
  media: Media | null;
  alt: string;
  admin?: boolean;
  full?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null),
    [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "250px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const { url, error, loading } = useMedia(media, admin, visible);
  return (
    <div className="media-container" ref={ref}>
      {url ? (
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          style={{
            objectFit: full ? "contain" : "cover",
            objectPosition: `${media?.x ?? 50}% ${media?.y ?? 50}%`,
          }}
        />
      ) : (
        <div className="photo-empty">
          {loading ? (
            <span className="spinner" />
          ) : error ? (
            <>
              <ImageIcon size={30} />
              <span role="alert">{error}</span>
            </>
          ) : (
            <>
              <Heart size={28} strokeWidth={1} />
              <span>{alt}</span>
              <small>♡</small>
            </>
          )}
        </div>
      )}
    </div>
  );
}
