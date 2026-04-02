"use client";
import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "../../../styles/Affirmations.module.css";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Affirmation {
    id: string;
    text: string;
    isUniversal?: boolean;
}

interface AffirmationPool {
    opening: Affirmation[];
    closing: Affirmation[];
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const UNIVERSAL_OPENING =
    "I am becoming the best version of myself — day by day, listen by listen.";
const UNIVERSAL_CLOSING =
    "Everything I need is already within me. I am ready.";

const MIN_SEL = 3;
const MAX_SEL = 5;

/* ─── Icons ──────────────────────────────────────────────────────────────── */
/* ─── Icons ──────────────────────────────────────────────────────────────── */
const StarIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...props}>
        <path d="M12 3l1.9 5.8H20l-4.95 3.6 1.9 5.8L12 14.6l-4.95 3.6 1.9-5.8L4 8.8h6.1z" />
    </svg>
);
const CheckIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" {...props}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);
const EditIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
);
const SparkleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
        <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
        <path d="M19 15l.75 2.25L22 18l-2.25.75L19 21l-.75-2.25L16 18l2.25-.75z" />
    </svg>
);
const ArrowIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
        <polyline points="9 18 15 12 9 6" />
    </svg>
);

/* ─── AffirmationRow ────────────────────────────────────────────────────── */
interface AffirmationRowProps {
    aff: Affirmation;
    selected: boolean;
    onToggle: () => void;
    onSave: (text: string) => void;
    storyId: string;
}

const AffirmationRow: React.FC<AffirmationRowProps> = ({
    aff,
    selected,
    onToggle,
    onSave,
    storyId,
}) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(aff.text);
    const [refining, setRefining] = useState(false);
    const [refined, setRefined] = useState<string | null>(null);

    const handleEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditing(true);
        setDraft(aff.text);
        setRefined(null);
    };

    const handleSaveDraft = () => {
        onSave(draft);
        setEditing(false);
    };

    const handleRefine = async () => {
        setRefining(true);
        try {
            const res = await fetch("/api/user/affirmations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ storyId, action: "refine", affirmation: draft }),
            });
            const data = await res.json();
            if (data.refined) setRefined(data.refined);
        } finally {
            setRefining(false);
        }
    };

    const handleKeepRefined = () => {
        if (refined) {
            onSave(refined);
            setEditing(false);
            setRefined(null);
        }
    };

    return (
        <div
            className={`${styles.affItem} ${selected ? styles.selected : ""} ${aff.isUniversal ? styles.universal : ""}`}
            onClick={!editing ? onToggle : undefined}
        >
            {/* Checkbox */}
            <div className={styles.checkbox}>
                <CheckIcon />
            </div>

            {/* Text or edit area */}
            {editing ? (
                <div className={styles.affEditWrap} onClick={(e) => e.stopPropagation()}>
                    <textarea
                        className={styles.affTextarea}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        rows={2}
                        autoFocus
                    />

                    {refined && (
                        <div className={styles.refineBox}>
                            <div className={styles.refineLabel}>
                                <SparkleIcon style={{ width: 14, height: 14 }} /> AI Refinement
                            </div>
                            <div className={styles.refineText}>&ldquo;{refined}&rdquo;</div>
                            <div className={styles.refineActions}>
                                <button className={styles.btnKeepRefined} onClick={handleKeepRefined}>
                                    Use this version
                                </button>
                                <button className={styles.btnKeepOriginal} onClick={() => setRefined(null)}>
                                    Keep mine
                                </button>
                            </div>
                        </div>
                    )}

                    {!refined && (
                        <div className={styles.editActions}>
                            <button
                                className={styles.btnRefine}
                                onClick={handleRefine}
                                disabled={refining || !draft.trim()}
                                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                            >
                                {refining ? <span className={styles.spin} /> : <SparkleIcon />}
                                {refining ? "Refining…" : "Refine with AI"}
                            </button>
                            <button className={styles.btnSave} onClick={handleSaveDraft}>
                                Save
                            </button>
                            <button className={styles.btnCancel} onClick={() => setEditing(false)}>
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className={styles.affTextWrap}>
                    <div className={styles.affText}>
                        &ldquo;{aff.text}&rdquo;
                        {aff.isUniversal && <span className={styles.universalBadge}>Suggestion</span>}
                    </div>
                </div>
            )}

            {/* Edit button (only when not editing) */}
            {!editing && (
                <button className={styles.editBtn} onClick={handleEdit} title="Edit Affirmation">
                    <EditIcon />
                </button>
            )}
        </div>
    );
};

/* ─── Main Content ──────────────────────────────────────────────────────── */
const AffirmationsContent: React.FC = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const storyId = searchParams.get("storyId");
    const { data: session } = useSession();

    const [pool, setPool] = useState<AffirmationPool | null>(null);
    const [openingSel, setOpeningSel] = useState<Set<string>>(new Set());
    const [closingSel, setClosingSel] = useState<Set<string>>(new Set());
    const [generating, setGenerating] = useState(true); // start loading immediately
    const [submitting, setSubmitting] = useState(false);
    const [addOwn, setAddOwn] = useState({ opening: "", closing: "" });
    const [refiningOwn, setRefiningOwn] = useState({ opening: false, closing: false });
    const [ownRefined, setOwnRefined] = useState<{ opening: string | null; closing: string | null }>({
        opening: null,
        closing: null,
    });
    const hasFetched = React.useRef(false);

    const plan = (session?.user as any)?.plan ?? "free";
    const isAmplifier = plan === "amplifier";

    /* ── Generate affirmations on mount ───────────────────────────────────── */
    useEffect(() => {
        if (!storyId || hasFetched.current) return;
        hasFetched.current = true;
        setGenerating(true);

        fetch("/api/user/affirmations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ storyId, action: "generate" }),
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.affirmations) {
                    // Build pool with ids + add universal suggestions
                    const opening: Affirmation[] = [
                        ...data.affirmations.opening.map((t: string, i: number) => ({
                            id: `o-${i}`,
                            text: t,
                        })),
                        { id: "u-open", text: UNIVERSAL_OPENING, isUniversal: true },
                    ];
                    const closing: Affirmation[] = [
                        ...data.affirmations.closing.map((t: string, i: number) => ({
                            id: `c-${i}`,
                            text: t,
                        })),
                        { id: "u-close", text: UNIVERSAL_CLOSING, isUniversal: true },
                    ];
                    setPool({ opening, closing });
                }
            })
            .catch(console.error)
            .finally(() => setGenerating(false));
    }, [storyId]);

    /* ── Toggle selection ─────────────────────────────────────────────────── */
    const toggleOpening = (id: string) => {
        setOpeningSel((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else if (next.size < MAX_SEL) {
                next.add(id);
            }
            return next;
        });
    };

    const toggleClosing = (id: string) => {
        setClosingSel((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else if (next.size < MAX_SEL) {
                next.add(id);
            }
            return next;
        });
    };

    /* ── Inline save ──────────────────────────────────────────────────────── */
    const saveOpeningText = useCallback((id: string, newText: string) => {
        setPool((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                opening: prev.opening.map((a) => (a.id === id ? { ...a, text: newText } : a)),
            };
        });
    }, []);

    const saveClosingText = useCallback((id: string, newText: string) => {
        setPool((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                closing: prev.closing.map((a) => (a.id === id ? { ...a, text: newText } : a)),
            };
        });
    }, []);

    /* ── Add own custom affirmation ──────────────────────────────────────── */
    const handleRefineOwn = async (type: "opening" | "closing") => {
        const text = addOwn[type];
        if (!text.trim() || !storyId) return;
        setRefiningOwn((p) => ({ ...p, [type]: true }));
        try {
            const res = await fetch("/api/user/affirmations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ storyId, action: "refine", affirmation: text }),
            });
            const data = await res.json();
            if (data.refined) setOwnRefined((p) => ({ ...p, [type]: data.refined }));
        } finally {
            setRefiningOwn((p) => ({ ...p, [type]: false }));
        }
    };

    const handleAddOwn = (type: "opening" | "closing", useRefined: boolean) => {
        const text = useRefined ? ownRefined[type] || addOwn[type] : addOwn[type];
        if (!text.trim()) return;
        const id = `custom-${type}-${Date.now()}`;
        const newAff: Affirmation = { id, text };
        setPool((prev) => {
            if (!prev) return prev;
            return { ...prev, [type]: [...prev[type], newAff] };
        });
        if (type === "opening") {
            setOpeningSel((s) => {
                if (s.size < MAX_SEL) return new Set([...s, id]);
                return s;
            });
        } else {
            setClosingSel((s) => {
                if (s.size < MAX_SEL) return new Set([...s, id]);
                return s;
            });
        }
        setAddOwn((p) => ({ ...p, [type]: "" }));
        setOwnRefined((p) => ({ ...p, [type]: null }));
    };

    /* ── Submit ──────────────────────────────────────────────────────────── */
    const isValid =
        openingSel.size >= MIN_SEL &&
        openingSel.size <= MAX_SEL &&
        closingSel.size >= MIN_SEL &&
        closingSel.size <= MAX_SEL;

    const handleSubmit = async () => {
        if (!storyId || !isValid || !pool) return;
        setSubmitting(true);
        try {
            const opening = pool.opening.filter((a) => openingSel.has(a.id)).map((a) => a.text);
            const closing = pool.closing.filter((a) => closingSel.has(a.id)).map((a) => a.text);

            // Save affirmations to story
            await fetch("/api/user/affirmations", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ storyId, opening, closing }),
            });

            // Navigate to voice recording (which will use the new assemble API)
            router.push(`/user/voice-recording?storyId=${storyId}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSkip = () => {
        router.push(`/user/voice-recording?storyId=${storyId}`);
    };

    /* ─── Render ─────────────────────────────────────────────────────────── */
    /* ─── Render ─────────────────────────────────────────────────────────── */
    return (
        <div className={styles.page}>
            {/* Background Orbs */}
            <div className={`${styles.orb} ${styles.orb1}`} />
            <div className={`${styles.orb} ${styles.orb2}`} />

            {generating && (
                <div className={styles.generatingOverlay}>
                    <div className={styles.genCircle}>
                        <div className={styles.genSpinner} />
                        <div className={styles.genSparkles}>
                            <SparkleIcon />
                        </div>
                    </div>
                    <div className={styles.genText}>Building Your New Identity</div>
                    <div className={styles.genSub}>
                        AI is crafting 13 personal affirmations from your vision...
                    </div>
                </div>
            )}

            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerIcon}>
                    <StarIcon />
                </div>
                <h1 className={styles.headerTitle}>Build Your New Identity</h1>
                <p className={styles.headerSub}>
                    Select 3–5 opening affirmations and 3–5 closing affirmations. These
                    will be spoken by your cloned voice{" "}
                    {isAmplifier ? "wrapped around your story with binaural support." : "wrapped around your story."}
                </p>
            </div>

            <div className={styles.body}>
                {/* ── OPENING AFFIRMATIONS ── */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>Opening Affirmations</span>
                        <div className={styles.sectionCount}>
                            {openingSel.size}/{MAX_SEL} selected
                            <span className={styles.selectionNote}> (aim for {MIN_SEL}–{MAX_SEL})</span>
                        </div>
                    </div>

                    <div className={styles.affList}>
                        {generating || !pool ? (
                            <div className={styles.loadingState}>
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className={styles.skeletonRow} />
                                ))}
                            </div>
                        ) : (
                            pool.opening.map((aff) => (
                                <AffirmationRow
                                    key={aff.id}
                                    aff={aff}
                                    selected={openingSel.has(aff.id)}
                                    onToggle={() => toggleOpening(aff.id)}
                                    onSave={(text) => saveOpeningText(aff.id, text)}
                                    storyId={storyId ?? ""}
                                />
                            ))
                        )}
                    </div>

                    {/* Add your own */}
                    {!generating && pool && (
                        <div className={styles.addOwnSection}>
                            <div className={styles.addOwnLabel}>✦ Write your own opening affirmation</div>
                            <div className={styles.addOwnRow}>
                                <input
                                    className={styles.addOwnInput}
                                    placeholder="I am becoming…"
                                    value={addOwn.opening}
                                    onChange={(e) => setAddOwn((p) => ({ ...p, opening: e.target.value }))}
                                />
                                <button
                                    className={styles.btnRefine}
                                    onClick={() => handleRefineOwn("opening")}
                                    disabled={refiningOwn.opening || !addOwn.opening.trim()}
                                >
                                    {refiningOwn.opening ? <span className={styles.spin} /> : <SparkleIcon />}
                                    {refiningOwn.opening ? "Refining…" : "Refine & Add"}
                                </button>
                            </div>
                            {ownRefined.opening && (
                                <div className={styles.refineBox}>
                                    <div className={styles.refineLabel}>✦ AI Refined</div>
                                    <div className={styles.refineText}>&ldquo;{ownRefined.opening}&rdquo;</div>
                                    <div className={styles.refineActions}>
                                        <button
                                            className={styles.btnKeepRefined}
                                            onClick={() => handleAddOwn("opening", true)}
                                        >
                                            Use refined
                                        </button>
                                        <button
                                            className={styles.btnKeepOriginal}
                                            onClick={() => handleAddOwn("opening", false)}
                                        >
                                            Use original
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── CLOSING AFFIRMATIONS ── */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <span className={styles.sectionTitle}>Closing Affirmations</span>
                        <div className={styles.sectionCount}>
                            {closingSel.size}/{MAX_SEL} selected
                            <span className={styles.selectionNote}> (aim for {MIN_SEL}–{MAX_SEL})</span>
                        </div>
                    </div>

                    <div className={styles.affList}>
                        {generating || !pool ? (
                            <div className={styles.loadingState}>
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className={styles.skeletonRow} />
                                ))}
                            </div>
                        ) : (
                            pool.closing.map((aff) => (
                                <AffirmationRow
                                    key={aff.id}
                                    aff={aff}
                                    selected={closingSel.has(aff.id)}
                                    onToggle={() => toggleClosing(aff.id)}
                                    onSave={(text) => saveClosingText(aff.id, text)}
                                    storyId={storyId ?? ""}
                                />
                            ))
                        )}
                    </div>

                    {/* Add your own */}
                    {!generating && pool && (
                        <div className={styles.addOwnSection}>
                            <div className={styles.addOwnLabel}>✦ Write your own closing affirmation</div>
                            <div className={styles.addOwnRow}>
                                <input
                                    className={styles.addOwnInput}
                                    placeholder="I am grateful for…"
                                    value={addOwn.closing}
                                    onChange={(e) => setAddOwn((p) => ({ ...p, closing: e.target.value }))}
                                />
                                <button
                                    className={styles.btnRefine}
                                    onClick={() => handleRefineOwn("closing")}
                                    disabled={refiningOwn.closing || !addOwn.closing.trim()}
                                >
                                    {refiningOwn.closing ? <span className={styles.spin} /> : <SparkleIcon />}
                                    {refiningOwn.closing ? "Refining…" : "Refine & Add"}
                                </button>
                            </div>
                            {ownRefined.closing && (
                                <div className={styles.refineBox}>
                                    <div className={styles.refineLabel}>✦ AI Refined</div>
                                    <div className={styles.refineText}>&ldquo;{ownRefined.closing}&rdquo;</div>
                                    <div className={styles.refineActions}>
                                        <button
                                            className={styles.btnKeepRefined}
                                            onClick={() => handleAddOwn("closing", true)}
                                        >
                                            Use refined
                                        </button>
                                        <button
                                            className={styles.btnKeepOriginal}
                                            onClick={() => handleAddOwn("closing", false)}
                                        >
                                            Use original
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── CTA ── */}
                <div className={styles.ctaSection}>
                    <h2 className={styles.ctaTitle}>Ready to begin your transition?</h2>
                    <div className={styles.ctaSub}>
                        Your selected affirmations will be woven into your audio session,
                        anchoring your vision at the start and end of your story.
                        {!isValid && !generating && (
                            <div style={{ color: "#e07070", marginTop: "12px", fontWeight: 500 }}>
                                Please select {MIN_SEL}–{MAX_SEL} for both sections to continue.
                            </div>
                        )}
                    </div>
                    <button
                        className={styles.ctaBtn}
                        onClick={handleSubmit}
                        disabled={!isValid || submitting || generating}
                    >
                        {submitting ? (
                            <>
                                <span className={styles.spin} /> Preparing Session…
                            </>
                        ) : (
                            <>
                                Continue to Voice Recording <ArrowIcon />
                            </>
                        )}
                    </button>
                    <button className={styles.skipLink} onClick={handleSkip}>
                        Skip affirmations and proceed to recording
                    </button>
                </div>
            </div>
        </div>
    );
};

const AffirmationsPage: React.FC = () => (
    <Suspense
        fallback={
            <div
                style={{ minHeight: "100vh", background: "#08070f", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontFamily: "DM Sans" }}
            >
                <div className={styles.spin} style={{ width: 40, height: 40, borderWidth: 4 }} />
            </div>
        }
    >
        <AffirmationsContent />
    </Suspense>
);

export default AffirmationsPage;
