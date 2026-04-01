"use client";
import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import styles from "../../styles/AdminLayout.module.css";
import {
    MicIcon,
    StopIcon,
    RefreshIcon,
    PlayIcon,
    PauseIcon,
    CheckIcon
} from "../../components/icons/VoiceIcons";

const KEYS = [
    { key: "induction", label: "Intro / Guided NLP Induction (~90 sec)" },
    { key: "guide_close", label: "Guide Close / Outro" },
] as const;

const SystemAudioPage: React.FC = () => {
    const qc = useQueryClient();
    const [mode, setMode] = useState<'upload' | 'record'>('upload');
    const [selectedKey, setSelectedKey] = useState<string>(KEYS[0].key);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [msg, setMsg] = useState("");

    // Recording state
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
    const [seconds, setSeconds] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    // Visualization
    const [volume, setVolume] = useState(0);
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const animationRef = useRef<number | null>(null);

    const { data: assets = [], isLoading } = useQuery({
        queryKey: ["system-audio"],
        queryFn: async () => {
            const res = await fetch("/api/admin/system-audio");
            if (!res.ok) throw new Error("Failed to fetch system audio");
            return res.json();
        },
    });

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyzer = audioContext.createAnalyser();
            analyzer.fftSize = 256;
            source.connect(analyzer);
            analyzerRef.current = analyzer;

            const dataArray = new Uint8Array(analyzer.frequencyBinCount);
            const updateVolume = () => {
                analyzer.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                setVolume(average / 128);
                animationRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/mpeg' });
                const url = URL.createObjectURL(blob);
                setAudioBlob(blob);
                setRecordedUrl(url);
                audioContext.close();
            };

            mediaRecorder.start();
            setIsRecording(true);
            setSeconds(0);
            timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
            setMsg("");
        } catch (err) {
            console.error("Recording error:", err);
            setMsg("✗ Microphone error. Ensure permissions are granted.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        setIsRecording(false);
        setVolume(0);
    };

    const handleResetRecording = () => {
        setAudioBlob(null);
        setRecordedUrl(null);
        setSeconds(0);
        setMsg("");
    };

    const handleUpload = async (blobToUpload?: Blob) => {
        const fileToUse = blobToUpload || file;
        if (!fileToUse) return;

        setUploading(true);
        setMsg("");
        try {
            const label = KEYS.find((k) => k.key === selectedKey)?.label ?? selectedKey;
            const fd = new FormData();
            fd.append("key", selectedKey);
            fd.append("label", label);
            fd.append("audio", fileToUse, `system_${selectedKey}.mp3`);

            const res = await fetch("/api/admin/system-audio", { method: "POST", body: fd });
            const data = await res.json();
            if (data.success) {
                setMsg(`✓ Saved successfully (${data.asset.key})`);
                setFile(null);
                setAudioBlob(null);
                setRecordedUrl(null);
                qc.invalidateQueries({ queryKey: ["system-audio"] });
            } else {
                setMsg(`✗ Error: ${data.error}`);
            }
        } catch (e: any) {
            setMsg(`✗ Network Error: ${e.message}`);
        } finally {
            setUploading(false);
        }
    };

    const formatTime = (s: number) => {
        const mins = Math.floor(s / 60);
        const secs = s % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={styles.page}>
            <h1 className={styles.pageTitle}>System Audio</h1>
            <p className={styles.pageSub}>
                Upload or record the guided induction and guide-close outro. These
                are prepended / appended to user story audio.
            </p>

            <div className={styles.card} style={{ maxWidth: 560, marginBottom: 32 }}>
                <div style={{ display: 'flex', gap: 16, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 8 }}>
                    <button
                        onClick={() => setMode('upload')}
                        style={{
                            background: 'none', border: 'none', color: mode === 'upload' ? '#c9a84c' : '#8a8476',
                            fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', padding: '4px 8px',
                            borderBottom: mode === 'upload' ? '2px solid #c9a84c' : '2px solid transparent'
                        }}
                    >
                        Upload MP3
                    </button>
                    <button
                        onClick={() => setMode('record')}
                        style={{
                            background: 'none', border: 'none', color: mode === 'record' ? '#c9a84c' : '#8a8476',
                            fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem', padding: '4px 8px',
                            borderBottom: mode === 'record' ? '2px solid #c9a84c' : '2px solid transparent'
                        }}
                    >
                        Record Live
                    </button>
                </div>

                <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: "0.82rem", color: "#8a8476", display: "block", marginBottom: 6 }}>
                        Segment
                    </label>
                    <select
                        value={selectedKey}
                        onChange={(e) => setSelectedKey(e.target.value)}
                        style={{
                            width: "100%", padding: "10px 12px", borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.12)",
                            background: "rgba(255,255,255,0.05)", color: "#e8e3d8",
                            fontSize: "0.9rem",
                        }}
                    >
                        {KEYS.map((k) => (
                            <option key={k.key} value={k.key}>{k.label}</option>
                        ))}
                    </select>
                </div>

                {mode === 'upload' ? (
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ fontSize: "0.82rem", color: "#8a8476", display: "block", marginBottom: 6 }}>
                            MP3 file
                        </label>
                        <input
                            type="file"
                            accept="audio/mpeg,audio/mp3,.mp3"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                            style={{ color: "#e8e3d8", fontSize: "0.88rem", marginBottom: 16 }}
                        />
                        <button
                            onClick={() => handleUpload()}
                            disabled={!file || uploading}
                            style={{
                                width: '100%',
                                background: uploading ? "rgba(201,168,76,0.4)" : "#c9a84c",
                                color: "#0a0a12", border: "none", borderRadius: 8,
                                padding: "10px 24px", fontWeight: 700, cursor: uploading ? "not-allowed" : "pointer",
                                fontSize: "0.9rem",
                            }}
                        >
                            {uploading ? "Uploading…" : "Upload to R2"}
                        </button>
                    </div>
                ) : (
                    <div style={{ marginBottom: 16 }}>
                        <div style={{
                            background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 20, textAlign: 'center',
                            border: '1px dashed rgba(255,255,255,0.1)', marginBottom: 16
                        }}>
                            {!audioBlob ? (
                                <>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: isRecording ? '#e07070' : '#e8e3d8', marginBottom: 8 }}>
                                        {formatTime(seconds)}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, alignItems: 'center' }}>
                                        {isRecording ? (
                                            <button
                                                onClick={stopRecording}
                                                style={{ background: '#e07070', color: 'white', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                            >
                                                <StopIcon />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={startRecording}
                                                style={{ background: '#c9a84c', color: '#0a0a12', border: 'none', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                            >
                                                <MicIcon />
                                            </button>
                                        )}
                                        <div style={{
                                            width: 100, height: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', borderRadius: 1
                                        }}>
                                            <div style={{
                                                height: '100%', background: '#c9a84c', width: `${volume * 100}%`, transition: 'width 0.1s'
                                            }} />
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '0.75rem', color: '#8a8476', marginTop: 12 }}>
                                        {isRecording ? 'Recording in progress...' : 'Click mic to start recording'}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontSize: '0.8rem', color: '#8a8476' }}>Recorded</div>
                                            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#e8e3d8' }}>{formatTime(seconds)}</div>
                                        </div>
                                        <audio src={recordedUrl!} controls style={{ height: 32, borderRadius: 16 }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: 12 }}>
                                        <button
                                            onClick={handleResetRecording}
                                            style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#e8e3d8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                        >
                                            <RefreshIcon /> Re-record
                                        </button>
                                        <button
                                            onClick={() => handleUpload(audioBlob)}
                                            disabled={uploading}
                                            style={{ flex: 1, background: '#c9a84c', color: '#0a0a12', border: 'none', borderRadius: 8, padding: '10px', fontSize: '0.85rem', fontWeight: 700, cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                                        >
                                            {uploading ? 'Saving...' : <><CheckIcon /> Save to Cloud</>}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {msg && (
                    <p style={{ marginTop: 12, fontSize: "0.84rem", color: msg.startsWith("✓") ? "#6dbf7f" : "#e07070" }}>
                        {msg}
                    </p>
                )}
            </div>

            {/* Current assets */}
            <div className={styles.card}>
                <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>
                    Uploaded assets
                </h2>
                {isLoading ? (
                    <p style={{ color: "#5a5650", fontSize: "0.88rem" }}>Loading…</p>
                ) : assets.length === 0 ? (
                    <p style={{ color: "#5a5650", fontSize: "0.88rem" }}>No assets uploaded yet.</p>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
                        <thead>
                            <tr style={{ color: "#5a5650", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                                <th style={{ textAlign: "left", padding: "6px 10px" }}>Key</th>
                                <th style={{ textAlign: "left", padding: "6px 10px" }}>Label</th>
                                <th style={{ textAlign: "left", padding: "6px 10px" }}>~Duration</th>
                                <th style={{ textAlign: "left", padding: "6px 10px" }}>Uploaded</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assets.map((a: any) => (
                                <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                                    <td style={{ padding: "10px 10px", color: "#c9a84c", fontFamily: "monospace" }}>{a.key}</td>
                                    <td style={{ padding: "10px 10px", color: "#ccc8bf" }}>{a.label}</td>
                                    <td style={{ padding: "10px 10px", color: "#8a8476" }}>
                                        {a.duration_s ? `~${Math.round(a.duration_s)}s` : "—"}
                                    </td>
                                    <td style={{ padding: "10px 10px", color: "#8a8476" }}>
                                        {format(new Date(a.uploaded_at), "MMM d, yyyy HH:mm")}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default SystemAudioPage;
