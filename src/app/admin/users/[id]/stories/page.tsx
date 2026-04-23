"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";

interface Story {
  id: string;
  title: string;
  status: string;
  story_type: string;
  createdAt: string;
  updatedAt: string;
  word_count: number | null;
  story_text_approved: string | null;
  story_text_draft: string | null;
  audioKey: string | null;
}

type ToastType = "success" | "error" | "info";

interface ToastState {
  type: ToastType;
  message: string;
}

export default function AdminUserStoriesPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const userId = params.id;

  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);
  const [playingStoryId, setPlayingStoryId] = useState<string | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: ToastType = "info") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3000);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const fetchStories = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/users/${userId}/stories?limit=100`);
        if (!response.ok) {
          throw new Error("Failed to load stories");
        }

        const data = await response.json();
        setStories(data.stories || []);
      } catch (error) {
        console.error("Failed to fetch stories:", error);
          showToast("Could not load stories right now. Please refresh and try again.", "error");
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchStories();
    }
  }, [userId]);

  const openDeleteConfirmation = (story: Story) => {
    setStoryToDelete(story);
  };

  const closeDeleteConfirmation = () => {
    if (deletingStoryId) {
      return;
    }
    setStoryToDelete(null);
  };

  const deleteStory = async () => {
    if (!storyToDelete) {
      return;
    }

    setDeletingStoryId(storyToDelete.id);
    try {
      const response = await fetch(`/api/admin/users/${userId}/stories/${storyToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete story");
      }

      setStories((prev) => prev.filter((story) => story.id !== storyToDelete.id));
      if (selectedStory?.id === storyToDelete.id) {
        setSelectedStory(null);
      }
      showToast("Story deleted successfully.", "success");
      setStoryToDelete(null);
    } catch (error) {
      console.error("Failed to delete story:", error);
      showToast("Could not delete this story. Please try again.", "error");
    } finally {
      setDeletingStoryId(null);
    }
  };

  const selectedText = useMemo(() => {
    if (!selectedStory) {
      return "";
    }
    return selectedStory.story_text_approved || selectedStory.story_text_draft || "No story content available.";
  }, [selectedStory]);

  const getAudioUrl = (story: Story) => {
    if (!story.audioKey) {
      return null;
    }
    return `/api/user/audio/stream?key=${encodeURIComponent(story.audioKey)}`;
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "64px", color: "rgba(255,255,255,0.45)" }}>
        Loading user stories...
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: "24px", color: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: "clamp(1.3rem, 4vw, 2.2rem)" }}>
            Completed Audio Stories
          </h2>
          <p style={{ margin: "8px 0 0 0", color: "rgba(255,255,255,0.58)", fontSize: "0.92rem" }}>
            User ID: {userId} • {stories.length} audio-ready stor{stories.length === 1 ? "y" : "ies"}
          </p>
        </div>

        <button
          onClick={() => router.push("/admin/users")}
          style={{
            padding: "8px 14px",
            borderRadius: "10px",
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.85)",
            cursor: "pointer",
          }}
        >
          Back to Users
        </button>
      </div>

      {stories.length === 0 ? (
          <div
          style={{
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "16px",
              padding: "30px",
              color: "rgba(255,255,255,0.6)",
              background: "linear-gradient(140deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015))",
          }}
        >
            No completed audio stories found for this user.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
          }}
        >
          {stories.map((story) => {
            const previewText = story.story_text_approved || story.story_text_draft || "No story content available.";

            return (
              <article
                key={story.id}
                onClick={() => setSelectedStory(story)}
                style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "16px",
                    padding: "16px",
                    background: "linear-gradient(150deg, rgba(82, 183, 136, 0.14), rgba(255,255,255,0.03) 42%, rgba(255,255,255,0.015))",
                  cursor: "pointer",
                  display: "grid",
                    gap: "12px",
                    minHeight: "230px",
                    boxShadow: "0 12px 24px rgba(0,0,0,0.14)",
                }}
              >
                <header style={{ display: "grid", gap: "6px" }}>
                  <h3 style={{ margin: 0, fontSize: "1rem", lineHeight: 1.3, color: "#fff" }}>
                    {story.title}
                  </h3>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "0.74rem", color: "rgba(255,255,255,0.6)" }}>
                      <span style={{ color: "#73d9a3", fontWeight: 700 }}>AUDIO READY</span>
                    <span>{story.story_type}</span>
                    <span>{story.word_count ?? "n/a"} words</span>
                  </div>
                </header>

                <p style={{ margin: 0, color: "rgba(255,255,255,0.75)", fontSize: "0.86rem", lineHeight: 1.45 }}>
                  {previewText.length > 180 ? `${previewText.slice(0, 180)}...` : previewText}
                </p>

                <footer style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>
                    {format(new Date(story.createdAt), "MMM dd, yyyy")}
                  </span>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      {getAudioUrl(story) && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedStory(story);
                            setPlayingStoryId(story.id);
                          }}
                          style={{
                            padding: "6px 10px",
                            borderRadius: "8px",
                            border: "1px solid rgba(115, 217, 163, 0.5)",
                            backgroundColor: "rgba(115, 217, 163, 0.1)",
                            color: "#8af0bb",
                            fontSize: "0.74rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Play
                        </button>
                      )}
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                            openDeleteConfirmation(story);
                        }}
                        disabled={deletingStoryId === story.id}
                        style={{
                          padding: "6px 10px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255, 107, 107, 0.5)",
                          backgroundColor: "rgba(255, 107, 107, 0.06)",
                          color: "rgba(255, 107, 107, 0.92)",
                          fontSize: "0.74rem",
                          fontWeight: 600,
                          cursor: deletingStoryId === story.id ? "wait" : "pointer",
                        }}
                      >
                        {deletingStoryId === story.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {selectedStory && (
        <div
          onClick={() => setSelectedStory(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.68)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
            zIndex: 60,
          }}
        >
          <section
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(920px, 100%)",
              maxHeight: "86vh",
              overflowY: "auto",
              borderRadius: "18px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "linear-gradient(160deg, rgba(15,20,24,0.96), rgba(10,14,18,0.98))",
              boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
              padding: "20px",
              color: "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "start" }}>
              <div style={{ display: "grid", gap: "8px" }}>
                <h3 style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: "1.45rem" }}>{selectedStory.title}</h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", fontSize: "0.78rem", color: "rgba(255,255,255,0.62)" }}>
                    <span style={{ color: "#73d9a3", fontWeight: 700 }}>AUDIO READY</span>
                  <span>Type: {selectedStory.story_type}</span>
                  <span>Words: {selectedStory.word_count ?? "n/a"}</span>
                  <span>Updated: {format(new Date(selectedStory.updatedAt), "MMM dd, yyyy")}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedStory(null)}
                style={{
                  padding: "6px 10px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.85)",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

              {getAudioUrl(selectedStory) ? (
                <div style={{ marginTop: "14px" }}>
                  <audio
                    controls
                    autoPlay={playingStoryId === selectedStory.id}
                    onPlay={() => setPlayingStoryId(selectedStory.id)}
                    onPause={() => setPlayingStoryId((prev) => (prev === selectedStory.id ? null : prev))}
                    src={getAudioUrl(selectedStory) || undefined}
                    style={{ width: "100%" }}
                  />
                </div>
              ) : (
                <div style={{ marginTop: "14px", color: "rgba(255,255,255,0.55)", fontSize: "0.86rem" }}>
                  Audio file is not available for this story.
                </div>
              )}

            <div
              style={{
                marginTop: "18px",
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid rgba(255,255,255,0.08)",
                backgroundColor: "rgba(255,255,255,0.02)",
                whiteSpace: "pre-wrap",
                lineHeight: 1.7,
                fontSize: "0.96rem",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              {selectedText}
            </div>
          </section>
        </div>
      )}

      {storyToDelete && (
        <div
          onClick={closeDeleteConfirmation}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.72)",
            display: "grid",
            placeItems: "center",
            padding: "20px",
            zIndex: 70,
          }}
        >
          <section
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(520px, 100%)",
              borderRadius: "16px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "linear-gradient(155deg, rgba(16,20,24,0.97), rgba(10,14,18,0.99))",
              padding: "18px",
              color: "#fff",
              boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
              display: "grid",
              gap: "12px",
            }}
          >
            <h3 style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: "1.2rem" }}>
              Delete Story?
            </h3>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.7)", lineHeight: 1.5, fontSize: "0.92rem" }}>
              You are about to delete "{storyToDelete.title}". This cannot be undone.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "6px" }}>
              <button
                onClick={closeDeleteConfirmation}
                disabled={Boolean(deletingStoryId)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.88)",
                  cursor: deletingStoryId ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => void deleteStory()}
                disabled={Boolean(deletingStoryId)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 107, 107, 0.5)",
                  backgroundColor: "rgba(255, 107, 107, 0.08)",
                  color: "rgba(255, 107, 107, 0.94)",
                  fontWeight: 600,
                  cursor: deletingStoryId ? "wait" : "pointer",
                }}
              >
                {deletingStoryId ? "Deleting..." : "Delete Story"}
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div
          style={{
            position: "fixed",
            right: "20px",
            bottom: "20px",
            zIndex: 90,
            maxWidth: "360px",
            borderRadius: "12px",
            border: "1px solid",
            borderColor:
              toast.type === "success"
                ? "rgba(115,217,163,0.45)"
                : toast.type === "error"
                  ? "rgba(255,107,107,0.45)"
                  : "rgba(255,255,255,0.2)",
            background:
              toast.type === "success"
                ? "rgba(18, 42, 31, 0.96)"
                : toast.type === "error"
                  ? "rgba(52, 22, 22, 0.96)"
                  : "rgba(22, 26, 31, 0.96)",
            color: "#fff",
            padding: "12px 14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            fontSize: "0.88rem",
            lineHeight: 1.45,
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
