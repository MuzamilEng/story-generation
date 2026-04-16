"use client";
import React, { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import styles from "../../styles/AdminLayout.module.css";
import {
    PlayIcon,
    PauseIcon,
    CheckIcon,
    RefreshIcon
} from "../../components/icons/VoiceIcons";
import { Music, Image as ImageIcon, Plus, Trash2, Upload, X } from "lucide-react";
import { useGlobalUI } from "@/components/ui/global-ui-context";

const SoundscapesPage: React.FC = () => {
    const { showConfirm } = useGlobalUI();
    const qc = useQueryClient();
    const [title, setTitle] = useState("");
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [msg, setMsg] = useState("");
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const { data: assets = [], isLoading } = useQuery({
        queryKey: ["soundscape-assets"],
        queryFn: async () => {
            const res = await fetch("/api/admin/soundscapes");
            if (!res.ok) throw new Error("Failed to fetch soundscapes");
            return res.json();
        },
    });

    const handleUpload = async () => {
        if (!title || !audioFile) {
            setMsg("Title and Audio file are required.");
            return;
        }

        setUploading(true);
        setMsg("");
        try {
            const fd = new FormData();
            fd.append("title", title);
            fd.append("audio", audioFile);
            if (imageFile) fd.append("image", imageFile);

            const res = await fetch("/api/admin/soundscapes", { method: "POST", body: fd });
            const data = await res.json();
            if (data.success) {
                setMsg(`✓ Saved successfully: ${data.asset.title}`);
                setTitle("");
                setAudioFile(null);
                setImageFile(null);
                qc.invalidateQueries({ queryKey: ["soundscape-assets"] });
            } else {
                setMsg(`✗ Error: ${data.error}`);
            }
        } catch (e: any) {
            setMsg(`✗ Network Error: ${e.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handlePlayPause = (asset: any) => {
        if (playingId === asset.id) {
            audioRef.current?.pause();
            setPlayingId(null);
        } else {
            if (audioRef.current) {
                audioRef.current.pause();
            }
            const audioUrl = `/api/user/audio/stream?key=${encodeURIComponent(asset.r2_key)}`;
            const audio = new Audio(audioUrl);
            audioRef.current = audio;
            audio.play();
            audio.onended = () => setPlayingId(null);
            setPlayingId(asset.id);
        }
    };

    const handleDelete = (id: string, r2Key: string) => {
        showConfirm({
            title: "Delete Soundscape",
            message: "Are you sure you want to delete this soundscape?",
            confirmText: "Delete",
            danger: true,
            onConfirm: async () => {
                try {
                    const res = await fetch("/api/admin/soundscapes", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id, r2Key }),
                    });
                    const data = await res.json();
                    if (data.success) {
                        qc.invalidateQueries({ queryKey: ["soundscape-assets"] });
                        setMsg("✓ Deleted successfully");
                    } else {
                        setMsg(`✗ Error: ${data.error}`);
                    }
                } catch (e: any) {
                    setMsg(`✗ Network Error: ${e.message}`);
                }
            },
        });
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "32px", color: "#fff" }}>
            <div>
                <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "2.4rem", fontWeight: 700, color: "#fff", marginBottom: "8px" }}>
                    Background <em>Sounds</em>
                </h1>
                <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.55)" }}>
                    Manage ambient soundscapes and binaural layers for the manifestation experience.
                </p>
            </div>

            <div style={{
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "20px",
                padding: "32px",
                maxWidth: "700px"
            }}>
                <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "24px", fontFamily: "'Fraunces', serif", color: "#fff" }}>
                    Register New Asset
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                    <div>
                        <label style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.4)", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Sound Title
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Tropical Rain, Theta Waves"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            style={{
                                width: "100%", padding: "12px 16px", borderRadius: "10px",
                                border: "1px solid rgba(255, 255, 255, 0.1)",
                                background: "rgba(255, 255, 255, 0.05)", color: "#fff",
                                fontSize: "0.9rem", outline: "none"
                            }}
                        />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                        <div>
                            <label style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.4)", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Audio File (.mp3)
                            </label>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                <label style={{
                                    background: "rgba(255, 255, 255, 0.05)",
                                    padding: "8px 16px",
                                    borderRadius: "99px",
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    border: "1px solid rgba(255, 255, 255, 0.1)"
                                }}>
                                    <Upload size={14} />
                                    Choose File
                                    <input
                                        type="file"
                                        accept=".mp3"
                                        onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                                        style={{ display: "none" }}
                                    />
                                </label>
                                {audioFile && (
                                    <span style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.6)" }}>
                                        {audioFile.name}
                                        <button onClick={() => setAudioFile(null)} style={{ marginLeft: "8px", background: "none", border: "none", color: "#ff6b6b", cursor: "pointer" }}>
                                            <X size={14} />
                                        </button>
                                    </span>
                                )}
                            </div>
                        </div>
                        <div>
                            <label style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.4)", display: "block", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Artwork (Optional)
                            </label>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                                <label style={{
                                    background: "rgba(255, 255, 255, 0.05)",
                                    padding: "8px 16px",
                                    borderRadius: "99px",
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    border: "1px solid rgba(255, 255, 255, 0.1)"
                                }}>
                                    <ImageIcon size={14} />
                                    Choose Image
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                                        style={{ display: "none" }}
                                    />
                                </label>
                                {imageFile && (
                                    <span style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.6)" }}>
                                        {imageFile.name}
                                        <button onClick={() => setImageFile(null)} style={{ marginLeft: "8px", background: "none", border: "none", color: "#ff6b6b", cursor: "pointer" }}>
                                            <X size={14} />
                                        </button>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleUpload}
                        disabled={uploading || !title || !audioFile}
                        style={{
                            marginTop: "12px",
                            background: uploading ? "rgba(82, 183, 136, 0.2)" : "#52b788",
                            color: "#fff", border: "none", borderRadius: "12px",
                            padding: "14px 28px", fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer",
                            fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                            transition: "background-color 0.2s"
                        }}
                    >
                        {uploading ? "Uploading to R2..." : <><Plus size={20} /> Deploy Soundscape</>}
                    </button>

                    {msg && (
                        <p style={{
                            fontSize: "0.9rem",
                            color: msg.startsWith("✓") ? "#52b788" : "#ff6b6b",
                            textAlign: "center",
                            marginTop: "8px",
                            backgroundColor: msg.startsWith("✓") ? "rgba(82, 183, 136, 0.1)" : "rgba(255, 107, 107, 0.1)",
                            padding: "10px",
                            borderRadius: "8px"
                        }}>
                            {msg}
                        </p>
                    )}
                </div>
            </div>

            <div>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "24px", fontFamily: "'Fraunces', serif" }}>
                    Library <em>Inventory</em>
                </h2>

                {isLoading ? (
                    <p style={{ color: "rgba(255, 255, 255, 0.3)" }}>Synchronizing with R2...</p>
                ) : assets.length === 0 ? (
                    <p style={{ color: "rgba(255, 255, 255, 0.3)" }}>No soundscapes registered yet.</p>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
                        {assets.map((asset: any) => (
                            <div key={asset.id} style={{
                                background: "rgba(255, 255, 255, 0.04)", borderRadius: "20px", overflow: "hidden",
                                border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", flexDirection: "column",
                                transition: "transform 0.2s"
                            }}>
                                <div style={{ height: "160px", background: "rgba(255, 255, 255, 0.02)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    {asset.image_url ? (
                                        <img src={asset.image_url} alt={asset.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    ) : (
                                        <Music size={48} style={{ color: "rgba(255, 255, 255, 0.1)" }} />
                                    )}
                                    <div style={{ position: "absolute", bottom: "12px", right: "12px", background: "rgba(0,0,0,0.7)", padding: "4px 10px", borderRadius: "99px", fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(4px)" }}>
                                        {asset.duration_s ? `${Math.round(asset.duration_s)}s` : "—"}
                                    </div>
                                </div>
                                <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
                                    <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#fff", margin: 0 }}>{asset.title}</h3>
                                    <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.3)", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis" }}>
                                        {asset.r2_key}
                                    </div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "12px", borderTop: "1px solid rgba(255, 255, 255, 0.04)" }}>
                                        <span style={{ fontSize: "0.8rem", color: "rgba(255, 255, 255, 0.45)" }}>
                                            {format(new Date(asset.uploaded_at), "MMM d, yyyy")}
                                        </span>
                                        <div style={{ display: "flex", gap: "12px" }}>
                                            <button
                                                onClick={() => handlePlayPause(asset)}
                                                style={{ background: "rgba(255, 255, 255, 0.05)", border: "none", color: "#fff", cursor: "pointer", width: "36px", height: "36px", borderRadius: "50%", display: "grid", placeItems: "center" }}
                                            >
                                                {playingId === asset.id ? <PauseIcon /> : <PlayIcon />}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(asset.id, asset.r2_key)}
                                                style={{ background: "rgba(255, 107, 107, 0.1)", border: "none", color: "#ff6b6b", cursor: "pointer", width: "36px", height: "36px", borderRadius: "50%", display: "grid", placeItems: "center" }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};


export default SoundscapesPage;