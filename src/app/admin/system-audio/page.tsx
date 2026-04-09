"use client";
import React, { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import styles from "../../styles/SystemAudioAdmin.module.css";
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
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>
                        System <em>Audio</em>
                    </h1>
                    <p className={styles.subtitle}>
                        Configure the global audio segments that frame every manifestation story, ensuring a consistent premium experience.
                    </p>
                </div>
            </div>

            <div className={styles.card} style={{ maxWidth: '600px' }}>
                <div className={styles.tabs}>
                    <button
                        onClick={() => setMode('upload')}
                        className={`${styles.tabBtn} ${mode === 'upload' ? styles.tabBtnActive : ''}`}
                    >
                        File Upload
                    </button>
                    <button
                        onClick={() => setMode('record')}
                        className={`${styles.tabBtn} ${mode === 'record' ? styles.tabBtnActive : ''}`}
                    >
                        Live Recording
                    </button>
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>
                        Audio Segment
                    </label>
                    <select
                        value={selectedKey}
                        onChange={(e) => setSelectedKey(e.target.value)}
                        className={styles.select}
                    >
                        {KEYS.map((k) => (
                            <option key={k.key} value={k.key} style={{ background: '#1c1a16' }}>{k.label}</option>
                        ))}
                    </select>
                </div>

                {mode === 'upload' ? (
                    <div className={styles.uploadArea}>
                        <div style={{ position: 'relative' }}>
                            <label className={styles.label}>
                                Audio Source
                            </label>
                            <label className={styles.fileLabel}>
                                <input
                                    type="file"
                                    accept="audio/*"
                                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                    className={styles.fileInput}
                                />
                                <span>{file ? `✓ ${file.name}` : "Select any audio file (MP3, WAV, M4A, etc.)"}</span>
                            </label>
                        </div>
                        <button
                            onClick={() => handleUpload()}
                            disabled={!file || uploading}
                            className={styles.primaryButton}
                        >
                            {uploading ? "Deploying..." : <><CheckIcon /> Save to Cloud</>}
                        </button>
                    </div>
                ) : (
                    <div style={{ marginBottom: "16px" }}>
                        <div className={styles.recordBox}>
                            {!audioBlob ? (
                                <>
                                    <div className={`${styles.timer} ${isRecording ? styles.timerRecording : ''}`}>
                                        {formatTime(seconds)}
                                    </div>
                                    <div className={styles.controlRow}>
                                        <button
                                            onClick={isRecording ? stopRecording : startRecording}
                                            className={`${styles.micBtn} ${isRecording ? styles.micBtnRecording : ''}`}
                                        >
                                            {isRecording ? <StopIcon /> : <MicIcon />}
                                        </button>
                                        <div className={styles.visualizer}>
                                            <div className={styles.visualizerBar} style={{ width: `${volume * 100}%` }} />
                                        </div>
                                    </div>
                                    <p className={styles.recordStatus}>
                                        {isRecording ? 'Capturing high-fidelity audio...' : 'Ready to capture studio-grade audio'}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className={styles.previewBox}>
                                        <div style={{ textAlign: 'left' }}>
                                            <div className={styles.label} style={{ marginBottom: 0 }}>Duration</div>
                                            <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>{formatTime(seconds)}</div>
                                        </div>
                                        <audio src={recordedUrl!} controls style={{ height: "36px" }} />
                                    </div>
                                    <div className={styles.btnGroup}>
                                        <button
                                            onClick={handleResetRecording}
                                            className={styles.secondaryBtn}
                                        >
                                            <RefreshIcon /> Discard
                                        </button>
                                        <button
                                            onClick={() => handleUpload(audioBlob)}
                                            disabled={uploading}
                                            className={styles.primaryButton}
                                            style={{ flex: 1 }}
                                        >
                                            {uploading ? 'Deploying...' : <><CheckIcon /> Save to Cloud</>}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {msg && (
                    <p className={`${styles.message} ${msg.startsWith("✓") ? styles.messageSuccess : styles.messageError}`}>
                        {msg}
                    </p>
                )}
            </div>

            <div className={styles.card}>
                <h2 style={{ fontSize: "1.4rem", fontWeight: 600, marginBottom: "24px", fontFamily: "'Fraunces', serif" }}>
                    Active <em>Registry</em>
                </h2>
                {isLoading ? (
                    <p style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: "0.9rem" }}>Fetching registry data...</p>
                ) : assets.length === 0 ? (
                    <p style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: "0.9rem" }}>Registry is currently empty.</p>
                ) : (
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Asset Key</th>
                                    <th>Internal Label</th>
                                    <th>Duration</th>
                                    <th>Last Updated</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assets.map((a: any) => (
                                    <tr key={a.id}>
                                        <td className={styles.assetKey}>{a.key}</td>
                                        <td className={styles.assetLabel}>{a.label}</td>
                                        <td className={styles.assetMeta}>
                                            {a.duration_s ? `${Math.round(a.duration_s)}s` : "—"}
                                        </td>
                                        <td className={styles.assetMeta}>
                                            {format(new Date(a.uploaded_at), "MMM d, yyyy HH:mm")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SystemAudioPage;