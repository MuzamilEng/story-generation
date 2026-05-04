"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAudioPlayerStore } from "@/store/useAudioPlayerStore";

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export default function GlobalAudioPlayer() {
  const pathname = usePathname();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  const {
    story,
    isPlaying,
    currentTime,
    duration,
    volume,
    isBuffering,
    bufferedPct,
    pendingAutoplay,
    registerControls,
    setStory,
    setPendingAutoplay,
    _setIsPlaying,
    _setCurrentTime,
    _setDuration,
    _setIsBuffering,
    _setBufferedPct,
  } = useAudioPlayerStore();

  // Keep a ref to store actions so imperative controls registered once stay fresh
  const sa = useRef({
    _setIsPlaying,
    _setCurrentTime,
    _setDuration,
    _setIsBuffering,
    _setBufferedPct,
    setPendingAutoplay,
  });
  useEffect(() => {
    sa.current = {
      _setIsPlaying,
      _setCurrentTime,
      _setDuration,
      _setIsBuffering,
      _setBufferedPct,
      setPendingAutoplay,
    };
  });

  const shouldResumeAfterSeek = useRef(false);
  const displayDurationRef = useRef(0);
  const [audioError, setAudioError] = useState(false);
  const retryCount = useRef(0);
  const MAX_AUTO_RETRIES = 2;

  const retryAudio = useCallback(() => {
    if (!audioRef.current || !story?.audio_url) return;
    setAudioError(false);
    sa.current._setIsBuffering(true);
    // Force reload by resetting src with a cache-busting param
    const sep = story.audio_url.includes("?") ? "&" : "?";
    audioRef.current.src = `${story.audio_url}${sep}_r=${Date.now()}`;
    audioRef.current.load();
  }, [story?.audio_url]);

  const displayDuration =
    (story?.audio_duration_secs ?? 0) > 0
      ? story!.audio_duration_secs!
      : duration > 0 && isFinite(duration)
        ? duration
        : 0;

  useEffect(() => {
    displayDurationRef.current = displayDuration;
  }, [displayDuration]);

  // Register imperative controls once on mount
  useEffect(() => {
    registerControls({
      play: () => {
        if (!audioRef.current) return;
        sa.current._setIsBuffering(true);
        audioRef.current.play().catch(() => sa.current._setIsBuffering(false));
      },
      pause: () => audioRef.current?.pause(),
      seek: (t: number, resume = false) => {
        if (!audioRef.current) return;
        shouldResumeAfterSeek.current = resume;
        audioRef.current.pause();
        audioRef.current.currentTime = t;
        sa.current._setIsBuffering(true);
        sa.current._setCurrentTime(t);
      },
      setVolume: (v: number) => {
        if (audioRef.current) audioRef.current.volume = v / 100;
      },
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync volume from store
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  // --- Drag logic ---
  // pos === null means "use default anchoring (bottom-right)"
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const hasDragged = useRef(false);

  const startDrag = (clientX: number, clientY: number) => {
    if (!playerRef.current) return;
    dragging.current = true;
    hasDragged.current = false;
    const rect = playerRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      hasDragged.current = true;
      const x = e.clientX - dragOffset.current.x;
      const y = e.clientY - dragOffset.current.y;
      setPos({ x: Math.max(0, x), y: Math.max(0, y) });
    };
    const onMouseUp = () => {
      dragging.current = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current) return;
      hasDragged.current = true;
      const touch = e.touches[0];
      setPos({
        x: Math.max(0, touch.clientX - dragOffset.current.x),
        y: Math.max(0, touch.clientY - dragOffset.current.y),
      });
      e.preventDefault();
    };
    const onTouchEnd = () => {
      dragging.current = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  const updateBuffered = () => {
    if (!audioRef.current) return;
    const buf = audioRef.current.buffered;
    if (buf.length > 0 && displayDurationRef.current > 0) {
      const end = buf.end(buf.length - 1);
      sa.current._setBufferedPct(
        Math.min(100, (end / displayDurationRef.current) * 100),
      );
    }
  };

  const isOnPlayerPage = pathname?.includes("/audio-download");

  if (!story) return null;

  const positionStyle: React.CSSProperties =
    pos !== null ? { left: pos.x, top: pos.y } : { right: 20, bottom: 80 };

  const handleClosePlayer = () => {
    audioRef.current?.pause();
    setPendingAutoplay(false);
    setStory(null);
    setPos(null);
  };

  return (
    <>
      {/* Persistent hidden audio element — stays mounted across navigation */}
      <audio
        key={story.audio_url}
        ref={audioRef}
        src={story.audio_url}
        preload="auto"
        onPlay={() => sa.current._setIsPlaying(true)}
        onPause={() => sa.current._setIsPlaying(false)}
        onLoadedMetadata={() => {
          if (!audioRef.current) return;
          const d = audioRef.current.duration;
          if (d && isFinite(d) && d > 0) sa.current._setDuration(d);
          updateBuffered();
          // Auto-play after mix/unmix swapped the source
          if (useAudioPlayerStore.getState().pendingAutoplay) {
            sa.current.setPendingAutoplay(false);
            audioRef.current.play().catch(() => {});
            sa.current._setIsPlaying(true);
            sa.current._setIsBuffering(false);
          }
        }}
        onDurationChange={() => {
          if (!audioRef.current) return;
          const d = audioRef.current.duration;
          if (d && isFinite(d) && d > 0) sa.current._setDuration(d);
        }}
        onTimeUpdate={() => {
          if (!audioRef.current) return;
          const raw = audioRef.current.currentTime;
          const dur = displayDurationRef.current;
          sa.current._setCurrentTime(dur > 0 ? Math.min(raw, dur) : raw);
          updateBuffered();
        }}
        onProgress={updateBuffered}
        onCanPlay={() => {
          sa.current._setIsBuffering(false);
          setAudioError(false);
          retryCount.current = 0;
        }}
        onWaiting={() => sa.current._setIsBuffering(true)}
        onSeeking={() => sa.current._setIsBuffering(true)}
        onSeeked={() => {
          sa.current._setIsBuffering(false);
          if (shouldResumeAfterSeek.current) {
            shouldResumeAfterSeek.current = false;
            if (audioRef.current) {
              sa.current._setIsBuffering(true);
              audioRef.current
                .play()
                .catch(() => sa.current._setIsBuffering(false));
            }
          }
        }}
        onPlaying={() => sa.current._setIsBuffering(false)}
        onEnded={() => {
          sa.current._setIsPlaying(false);
          sa.current._setIsBuffering(false);
        }}
        onError={() => {
          sa.current._setIsBuffering(false);
          sa.current._setIsPlaying(false);
          console.warn("[audio] Playback error for:", story.audio_url);
          // Auto-retry a couple of times (handles transient R2/network issues)
          if (retryCount.current < MAX_AUTO_RETRIES) {
            retryCount.current++;
            console.log(
              `[audio] Auto-retry ${retryCount.current}/${MAX_AUTO_RETRIES}...`,
            );
            setTimeout(() => retryAudio(), 1500 * retryCount.current);
          } else {
            setAudioError(true);
          }
        }}
        crossOrigin="anonymous"
        playsInline
        style={{ display: "none" }}
      />

      {/* Draggable mini-player — hidden on the full audio-download page */}
      {!isOnPlayerPage && (
        <div
          ref={playerRef}
          style={{
            position: "fixed",
            ...positionStyle,
            zIndex: 9990,
            width: 310,
            background: "rgba(14, 19, 14, 0.97)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14,
            boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            userSelect: "none",
            fontFamily: "var(--sans, sans-serif)",
            overflow: "hidden",
          }}
        >
          {/* Drag handle — title row */}
          <div
            onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
            onTouchStart={(e) =>
              startDrag(e.touches[0].clientX, e.touches[0].clientY)
            }
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 12px 6px",
              gap: 8,
              cursor: "grab",
            }}
          >
            {/* Drag dots */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 3,
                flexShrink: 0,
                opacity: 0.3,
              }}
            >
              {[0, 1].map((i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 3,
                  }}
                >
                  {[0, 1].map((j) => (
                    <div
                      key={j}
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: "50%",
                        background: "rgba(255,255,255,0.6)",
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "0.58rem",
                  color: "rgba(255,255,255,0.35)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: 2,
                }}
              >
                Now Playing
              </div>
              <div
                style={{
                  fontSize: "0.76rem",
                  fontWeight: 500,
                  color: "var(--ink, #e8e8e4)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {story.title || "Your Audio Story"}
              </div>
            </div>

            {/* Open full player */}
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() =>
                router.push(`/user/audio-download?storyId=${story.id}`)
              }
              title="Open full player"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                fontSize: "0.65rem",
                padding: "3px 7px",
                borderRadius: 6,
                flexShrink: 0,
                fontFamily: "var(--sans)",
              }}
            >
              Open ↗
            </button>

            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={handleClosePlayer}
              title="Close player"
              aria-label="Close player"
              style={{
                width: 28,
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.6)",
                cursor: "pointer",
                borderRadius: 999,
                flexShrink: 0,
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {/* Progress bar — clickable */}
          <div
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.max(
                0,
                Math.min(1, (e.clientX - rect.left) / rect.width),
              );
              const t = pct * displayDuration;
              useAudioPlayerStore
                .getState()
                .seek(t, useAudioPlayerStore.getState().isPlaying);
            }}
            style={{ padding: "0 12px", cursor: "pointer" }}
          >
            <div
              style={{
                height: 4,
                background: "rgba(255,255,255,0.07)",
                borderRadius: 3,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Buffered */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  height: "100%",
                  width: `${bufferedPct}%`,
                  background: "rgba(255,255,255,0.07)",
                  borderRadius: 3,
                  transition: "width 0.3s ease",
                }}
              />
              {/* Played */}
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  height: "100%",
                  width: `${displayDuration > 0 ? (currentTime / displayDuration) * 100 : 0}%`,
                  background: "linear-gradient(90deg, #6ECF7A, #A8E6A1)",
                  borderRadius: 3,
                  transition: "width 0.5s linear",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.58rem",
                color: "rgba(255,255,255,0.3)",
                marginTop: 4,
              }}
            >
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(displayDuration)}</span>
            </div>
          </div>

          {/* Playback controls */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px 12px 12px",
              gap: 10,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {audioError ? (
              /* Error recovery UI */
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: "0.68rem",
                    color: "rgba(255,100,100,0.85)",
                  }}
                >
                  Failed to load audio
                </span>
                <button
                  onClick={() => {
                    retryCount.current = 0;
                    retryAudio();
                  }}
                  style={{
                    ...miniBtnStyle,
                    padding: "4px 10px",
                    fontSize: "0.65rem",
                    background: "rgba(110,207,122,0.15)",
                    border: "1px solid rgba(110,207,122,0.3)",
                    borderRadius: 6,
                    color: "#6ECF7A",
                  }}
                >
                  Retry
                </button>
              </div>
            ) : (
              <>
                {/* Skip back 15s */}
                <button
                  onClick={() => {
                    const s = useAudioPlayerStore.getState();
                    s.seek(Math.max(0, s.currentTime - 15), s.isPlaying);
                  }}
                  style={miniBtnStyle}
                  title="Rewind 15s"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 .49-4.95" />
                    <text
                      x="8"
                      y="16"
                      fontSize="7"
                      fill="currentColor"
                      stroke="none"
                    >
                      15
                    </text>
                  </svg>
                </button>

                {/* Play / Pause */}
                <button
                  onClick={() => useAudioPlayerStore.getState().togglePlay()}
                  style={{
                    ...miniBtnStyle,
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #6ECF7A, #A8E6A1)",
                    color: "#111",
                    flexShrink: 0,
                  }}
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isBuffering ? (
                    <span
                      style={{
                        display: "inline-block",
                        width: 14,
                        height: 14,
                        border: "2px solid rgba(0,0,0,0.15)",
                        borderTop: "2px solid #111",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                  ) : isPlaying ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </svg>
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                  )}
                </button>

                {/* Skip forward 15s */}
                <button
                  onClick={() => {
                    const s = useAudioPlayerStore.getState();
                    const dur =
                      displayDuration ||
                      s.story?.audio_duration_secs ||
                      s.duration ||
                      9999;
                    s.seek(Math.min(dur, s.currentTime + 15), s.isPlaying);
                  }}
                  style={miniBtnStyle}
                  title="Forward 15s"
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-.49-4.95" />
                    <text
                      x="8"
                      y="16"
                      fontSize="7"
                      fill="currentColor"
                      stroke="none"
                    >
                      15
                    </text>
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Spin keyframe for buffering indicator */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

const miniBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "rgba(255,255,255,0.65)",
  cursor: "pointer",
  width: 34,
  height: 34,
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  transition: "all 0.15s",
  flexShrink: 0,
};
