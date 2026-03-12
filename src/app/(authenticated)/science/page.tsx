"use client";
import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../../styles/Science.module.css";
import {
    ArrowIcon,
    CheckIcon,
    ClockIcon,
    EyeIcon,
    BrainIcon,
    HeartIcon,
    BookIcon,
    UsersIcon,
    InfoIcon,
} from "../../components/icons/ScienceIcons";
import type {
    ScienceCard as IScienceCard,
    ResearchItem as IResearchItem,
    HowItWorksStep as IHowItWorksStep,
} from "../../types/science";


// Pull Quote Component
interface PullQuoteProps {
    text: string;
    cite?: string;
}

const PullQuote: React.FC<PullQuoteProps> = ({ text, cite }) => (
    <div className={styles.pullQuote}>
        <p>{text}</p>
        {cite && <cite>{cite}</cite>}
    </div>
);

// Science Card Component
const ScienceCard: React.FC<IScienceCard> = ({ icon, title, body, gold }) => (
    <div className={`${styles.sciCard} ${gold ? styles.gold : ""}`}>
        <div className={styles.sciCardIcon}>{icon}</div>
        <div className={styles.sciCardTitle}>{title}</div>
        <div className={styles.sciCardBody}>{body}</div>
    </div>
);

// Research Item Component
const ResearchItem: React.FC<IResearchItem> = ({ icon, title, body }) => (
    <div className={styles.researchItem}>
        <div className={styles.researchIcon}>{icon}</div>
        <div>
            <div className={styles.researchTitle}>{title}</div>
            <div className={styles.researchBody}>{body}</div>
        </div>
    </div>
);

// How It Works Step Component
const HowItWorksStep: React.FC<IHowItWorksStep> = ({ number, title, text }) => (
    <div className={styles.howStep}>
        <div className={styles.howStepNum}>{number}</div>
        <div className={styles.howStepBody}>
            <div className={styles.howStepTitle}>{title}</div>
            <div className={styles.howStepText}>{text}</div>
        </div>
    </div>
);

// Gorilla Experiment Component
const GorillaExperiment: React.FC = () => {
    const [step, setStep] = useState(1);
    const [showInsight, setShowInsight] = useState(false);
    const [didSeeGorilla, setDidSeeGorilla] = useState<boolean | null>(null);

    const handleGorillaAnswer = (didSee: boolean) => {
        setDidSeeGorilla(didSee);
        setStep(3);
    };

    const handleShowInsight = () => {
        setShowInsight(true);
        setTimeout(() => {
            document
                .getElementById("insightBanner")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
    };

    return (
        <div className={styles.exerciseWrap}>
            <div className={styles.exHeader}>
                <div className={styles.exBadge}>
                    <ClockIcon />
                    Interactive Exercise · ~2 minutes
                </div>
                <h3 className={styles.exTitle}>
                    The Selective
                    <br />
                    <em>Attention Test</em>
                </h3>
                <p className={styles.exSub}>
                    Watch the video. Follow the instruction at the start. Don't read ahead
                    — the experiment only works once.
                </p>
            </div>

            <div className={styles.exSteps}>
                {/* STEP 1: WATCH THE VIDEO */}
                <div className={`${styles.exStep} ${step === 1 ? styles.active : ""}`}>
                    <div className={styles.exInstruction}>
                        <div className={styles.exInstructionNum}>
                            Your task — read this first
                        </div>
                        <div className={styles.exInstructionText}>
                            Count how many times the players in <strong>white shirts</strong>{" "}
                            pass the basketball. Focus only on the white team. Press play when
                            ready.
                        </div>
                    </div>

                    {/* YouTube Embed */}
                    <div className={styles.videoWrapper}>
                        <iframe
                            src="https://www.youtube.com/embed/vJG698U2Mvo?rel=0&modestbranding=1&color=white"
                            title="Selective Attention Test — Daniel Simons & Christopher Chabris"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>

                    <p className={styles.videoCredit}>
                        Video by{" "}
                        <a href="https://www.dansimons.com" target="_blank" rel="noopener">
                            Daniel Simons
                        </a>{" "}
                        & Christopher Chabris · Used with permission
                    </p>

                    <div className={styles.exNav}>
                        <div className={styles.exDots}>
                            <div
                                className={`${styles.exDot} ${step === 1 ? styles.active : ""}`}
                            />
                            <div
                                className={`${styles.exDot} ${step === 2 ? styles.active : ""}`}
                            />
                            <div
                                className={`${styles.exDot} ${step === 3 ? styles.active : ""}`}
                            />
                        </div>
                        <button className={styles.exBtnPrimary} onClick={() => setStep(2)}>
                            I finished watching
                            <ArrowIcon />
                        </button>
                    </div>
                </div>

                {/* STEP 2: DID YOU SEE IT? */}
                <div className={`${styles.exStep} ${step === 2 ? styles.active : ""}`}>
                    <div className={styles.eyesClosedCard}>
                        <span className={styles.eyesIcon}>🦍</span>
                        <div className={styles.eyesTitle}>Before the reveal —</div>
                        <div className={styles.eyesSub}>
                            While counting passes, did you notice anything unusual in the
                            video?
                        </div>
                    </div>

                    <div className={styles.gorillaActions}>
                        <button
                            className={styles.exBtnPrimary}
                            onClick={() => handleGorillaAnswer(true)}
                        >
                            Yes, I noticed something
                        </button>
                        <button
                            className={styles.exBtnGhost}
                            onClick={() => handleGorillaAnswer(false)}
                        >
                            No, nothing unusual
                        </button>
                    </div>
                </div>

                {/* STEP 3: REVEAL */}
                <div className={`${styles.exStep} ${step === 3 ? styles.active : ""}`}>
                    <div
                        className={`${styles.revealCard} ${styles.red}`}
                        style={
                            didSeeGorilla
                                ? {
                                    background: "rgba(45,160,80,0.15)",
                                    borderColor: "rgba(45,160,80,0.4)",
                                }
                                : {}
                        }
                    >
                        <div
                            className={styles.revealNum}
                            style={didSeeGorilla ? { color: "#2da050" } : {}}
                        >
                            {didSeeGorilla ? "✓" : "🦍"}
                        </div>
                        <div className={styles.revealLabelText}>
                            {didSeeGorilla
                                ? "YOU SAW THE GORILLA — GREAT AWARENESS"
                                : "A GORILLA WALKED THROUGH THE SCENE"}
                        </div>
                        <div className={styles.revealInsight}>
                            {didSeeGorilla
                                ? "You were in the minority. Roughly half of all first-time viewers, focused on counting passes, never notice the gorilla at all. Even knowing this, many people still don't see it a second time. This is inattentional blindness — the same mechanism that filters out the opportunities and people your RAS hasn't been programmed to find yet."
                                : "Midway through the video, a person in a full gorilla suit walked into the middle of the frame, stopped, beat their chest, and walked out. They were visible for 9 full seconds. About half of all people who watch this video — focused on counting passes — never see it. Your brain erased it completely. Not because you weren't paying attention. Because you were paying attention to the wrong thing."}
                        </div>
                    </div>

                    <div className={styles.exNav} style={{ marginTop: "1.25rem" }}>
                        <div className={styles.exDots}>
                            <div className={styles.exDot} />
                            <div className={styles.exDot} />
                            <div className={`${styles.exDot} ${styles.active}`} />
                        </div>
                        <button className={styles.exBtnPrimary} onClick={handleShowInsight}>
                            What this means for you
                            <ArrowIcon />
                        </button>
                    </div>
                </div>
            </div>

            {/* KEY INSIGHT */}
            {showInsight && (
                <div className={styles.insightBanner} id="insightBanner">
                    <div className={styles.insightIcon}>🧠</div>
                    <h3 className={styles.insightTitle}>
                        This is happening
                        <br />
                        <em>in your life right now.</em>
                    </h3>
                    <p className={styles.insightBody}>
                        The gorilla was always there. Obvious, large, beating its chest. But
                        your brain had a task — and it deleted everything else. The
                        opportunities, connections, and moments that could build your ideal
                        life work exactly the same way. They're present in your world right
                        now. Your brain just isn't programmed to notice them yet. When you
                        listen to your story every day, you're giving your brain a new task.
                        And suddenly, what was invisible becomes impossible to miss.
                    </p>
                    <Link href="/user/goal-intake-ai" className={styles.insightCta}>
                        Start Programming My Brain
                        <ArrowIcon />
                    </Link>
                </div>
            )}
        </div>
    );
};

// Rubin's Vase Illusion Component
const RubinVase: React.FC = () => {
    const [revealed, setRevealed] = useState(false);

    return (
        <div className={styles.illusionCard}>
            <div className={styles.illusionLabel}>Illusion 1 of 2</div>
            <h3 className={styles.illusionTitle}>The Vase & The Faces</h3>
            <p className={styles.illusionDesc}>
                Most people immediately see the <strong>black shapes</strong>. But look
                at the white space between them — there is a second image hiding in
                plain sight.
            </p>

            <div className={styles.illusionWrap}>
                <svg className={styles.illusionSvg} viewBox="0 0 300 320">
                    {/* White background */}
                    <rect width="300" height="320" fill="white" />

                    {/* Left face (black silhouette) */}
                    <path
                        d="M 0,0 L 0,320 L 75,320 L 75,295 Q 78,280 82,265 Q 86,248 84,235 Q 82,220 78,210 Q 72,195 70,178 Q 67,158 72,140 Q 78,118 88,100 Q 98,82 108,68 Q 118,54 124,42 Q 130,28 130,10 L 130,0 Z"
                        fill="#1c1a16"
                    />

                    {/* Right face (black silhouette) */}
                    <path
                        d="M 300,0 L 300,320 L 225,320 L 225,295 Q 222,280 218,265 Q 214,248 216,235 Q 218,220 222,210 Q 228,195 230,178 Q 233,158 228,140 Q 222,118 212,100 Q 202,82 192,68 Q 182,54 176,42 Q 170,28 170,10 L 170,0 Z"
                        fill="#1c1a16"
                    />

                    {/* Face highlights */}
                    <path
                        className={styles.faceHighlight}
                        d="M 0,0 L 0,320 L 75,320 L 75,295 Q 78,280 82,265 Q 86,248 84,235 Q 82,220 78,210 Q 72,195 70,178 Q 67,158 72,140 Q 78,118 88,100 Q 98,82 108,68 Q 118,54 124,42 Q 130,28 130,10 L 130,0 Z"
                        fill="rgba(192,57,43,0.25)"
                        style={{ opacity: revealed ? 1 : 0 }}
                    />
                    <path
                        className={styles.faceHighlight}
                        d="M 300,0 L 300,320 L 225,320 L 225,295 Q 222,280 218,265 Q 214,248 216,235 Q 218,220 222,210 Q 228,195 230,178 Q 233,158 228,140 Q 222,118 212,100 Q 202,82 192,68 Q 182,54 176,42 Q 170,28 170,0 Z"
                        fill="rgba(192,57,43,0.25)"
                        style={{ opacity: revealed ? 1 : 0 }}
                    />

                    {/* Vase highlight */}
                    <path
                        className={styles.vaseHighlight}
                        d="M 130,0 Q 130,28 124,42 Q 118,54 108,68 Q 98,82 88,100 Q 78,118 72,140 Q 67,158 70,178 Q 72,195 78,210 Q 82,220 84,235 Q 86,248 82,265 Q 78,280 75,295 L 75,320 L 225,320 L 225,295 Q 222,280 218,265 Q 214,248 216,235 Q 218,220 222,210 Q 228,195 230,178 Q 233,158 228,140 Q 222,118 212,100 Q 202,82 192,68 Q 182,54 176,42 Q 170,28 170,0 Z"
                        fill="rgba(45,106,79,0.3)"
                        style={{ opacity: revealed ? 1 : 0 }}
                    />

                    {/* Labels */}
                    {revealed && (
                        <>
                            <text
                                x="38"
                                y="160"
                                textAnchor="middle"
                                className={styles.revealLabelFace}
                            >
                                Face
                            </text>
                            <text
                                x="262"
                                y="160"
                                textAnchor="middle"
                                className={styles.revealLabelFace}
                            >
                                Face
                            </text>
                            <text
                                x="150"
                                y="200"
                                textAnchor="middle"
                                className={styles.revealLabelVase}
                            >
                                Vase
                            </text>
                        </>
                    )}
                </svg>
            </div>

            <div className={styles.illusionToggleRow}>
                <button
                    className={`${styles.illusionBtn} ${revealed ? styles.revealed : ""}`}
                    onClick={() => setRevealed(true)}
                    disabled={revealed}
                >
                    {!revealed ? (
                        <>
                            <EyeIcon />
                            Reveal the hidden image
                        </>
                    ) : (
                        <>
                            <CheckIcon />
                            Both images revealed
                        </>
                    )}
                </button>
            </div>

            {revealed && (
                <div className={`${styles.illusionAnswer} ${styles.show}`}>
                    <div className={styles.answerWhat}>
                        <span className={`${styles.answerDot} ${styles.black}`} />
                        Black = Two human faces looking at each other
                    </div>
                    <div className={styles.answerWhat}>
                        <span className={`${styles.answerDot} ${styles.green}`} />
                        White = A symmetrical vase or goblet
                    </div>
                    <div className={styles.answerInsight}>
                        Once you see both, you can never un-see them. Your brain will now
                        alternate. This is exactly what happens when you reprogram your RAS
                        — what was invisible becomes obvious.
                    </div>
                </div>
            )}
        </div>
    );
};

// Duck/Rabbit Illusion Component
const DuckRabbit: React.FC = () => {
    const [revealed, setRevealed] = useState(false);

    return (
        <div className={styles.illusionCard}>
            <div className={styles.illusionLabel}>Illusion 2 of 2</div>
            <h3 className={styles.illusionTitle}>The Duck & The Rabbit</h3>
            <p className={styles.illusionDesc}>
                This classic illusion — published in 1892 — shows the same outline can
                produce two completely different animals depending on what your brain is
                primed to find.
            </p>

            <div className={styles.illusionWrap}>
                <svg className={styles.illusionSvg} viewBox="0 0 300 220">
                    <rect width="300" height="220" fill="white" />

                    {/* Main body */}
                    <ellipse cx="155" cy="130" rx="85" ry="62" fill="#1c1a16" />
                    {/* Head */}
                    <ellipse cx="90" cy="88" rx="52" ry="46" fill="#1c1a16" />
                    {/* Duck bill / Rabbit ears base */}
                    <path
                        d="M 42,72 Q 18,68 8,78 Q 0,88 8,100 Q 18,110 42,106 Q 55,102 62,95 Q 55,84 42,72 Z"
                        fill="#1c1a16"
                    />
                    {/* Rabbit ears */}
                    <path
                        d="M 108,48 Q 112,20 118,4 Q 122,0 126,2 Q 130,6 128,22 Q 124,42 120,58 Q 114,54 108,48 Z"
                        fill="#1c1a16"
                    />
                    <path
                        d="M 122,52 Q 130,24 138,8 Q 142,2 146,4 Q 150,8 148,24 Q 144,46 136,62 Q 130,58 122,52 Z"
                        fill="#1c1a16"
                    />
                    {/* Eye */}
                    <circle cx="78" cy="82" r="7" fill="white" />
                    <circle cx="78" cy="82" r="3.5" fill="#1c1a16" />

                    {/* Highlights */}
                    <ellipse
                        className={styles.duckHighlight}
                        cx="155"
                        cy="130"
                        rx="85"
                        ry="62"
                        fill="rgba(45,106,79,0.2)"
                        style={{ opacity: revealed ? 1 : 0 }}
                    />
                    <ellipse
                        className={styles.duckHighlight}
                        cx="90"
                        cy="88"
                        rx="52"
                        ry="46"
                        fill="rgba(45,106,79,0.2)"
                        style={{ opacity: revealed ? 1 : 0 }}
                    />
                    <path
                        className={styles.duckHighlight}
                        d="M 42,72 Q 18,68 8,78 Q 0,88 8,100 Q 18,110 42,106 Q 55,102 62,95 Q 55,84 42,72 Z"
                        fill="rgba(45,106,79,0.35)"
                        style={{ opacity: revealed ? 1 : 0 }}
                    />
                    <path
                        className={styles.rabbitHighlight}
                        d="M 108,48 Q 112,20 118,4 Q 122,0 126,2 Q 130,6 128,22 Q 124,42 120,58 Q 114,54 108,48 Z"
                        fill="rgba(154,111,10,0.3)"
                        style={{ opacity: revealed ? 1 : 0 }}
                    />
                    <path
                        className={styles.rabbitHighlight}
                        d="M 122,52 Q 130,24 138,8 Q 142,2 146,4 Q 150,8 148,24 Q 144,46 136,62 Q 130,58 122,52 Z"
                        fill="rgba(154,111,10,0.3)"
                        style={{ opacity: revealed ? 1 : 0 }}
                    />

                    {/* Labels */}
                    {revealed && (
                        <>
                            <text
                                x="195"
                                y="135"
                                textAnchor="middle"
                                className={styles.revealDuck}
                            >
                                Duck body
                            </text>
                            <text
                                x="32"
                                y="88"
                                textAnchor="middle"
                                className={styles.revealDuck}
                            >
                                Bill →
                            </text>
                            <text
                                x="148"
                                y="30"
                                textAnchor="middle"
                                className={styles.revealRabbit}
                            >
                                ↑ Ears
                            </text>
                        </>
                    )}
                </svg>
            </div>

            <div className={styles.illusionToggleRow}>
                <button
                    className={`${styles.illusionBtn} ${revealed ? styles.revealed : ""}`}
                    onClick={() => setRevealed(true)}
                    disabled={revealed}
                >
                    {!revealed ? (
                        <>
                            <EyeIcon />
                            Reveal both animals
                        </>
                    ) : (
                        <>
                            <CheckIcon />
                            Both animals revealed
                        </>
                    )}
                </button>
            </div>

            {revealed && (
                <div className={`${styles.illusionAnswer} ${styles.show}`}>
                    <div className={styles.answerWhat}>
                        <span className={`${styles.answerDot} ${styles.green}`} />
                        Facing left = A duck (bill on the left)
                    </div>
                    <div className={styles.answerWhat}>
                        <span className={`${styles.answerDot} ${styles.gold}`} />
                        Facing right = A rabbit (ears pointing up)
                    </div>
                    <div className={styles.answerInsight}>
                        In 1899, psychologist Joseph Jastrow used this to prove that
                        perception is not passive — it is shaped entirely by what the mind
                        expects to find.
                    </div>
                </div>
            )}
        </div>
    );
};

const Science: React.FC = () => {
    const router = useRouter();

    useEffect(() => {
        document.title = "ManifestMyStory — The Science";
        const link = document.createElement("link");
        link.href =
            "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital,wght@0,400;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Lora:ital,wght@0,400;1,400&display=swap";
        link.rel = "stylesheet";
        document.head.appendChild(link);

        return () => {
            if (document.head.contains(link)) {
                document.head.removeChild(link);
            }
        };
    }, []);

    const howItWorksSteps: IHowItWorksStep[] = [
        {
            number: 1,
            title: "You describe your future in vivid detail",
            text: "The goal discovery conversation extracts not just what you want, but where you are, how you feel, who surrounds you, what your mornings smell like. Sensory specificity is critical — the brain processes rich imagery differently from abstract goals.",
        },
        {
            number: 2,
            title: "Your story is written in first person, present tense",
            text: 'Research in cognitive psychology shows the brain responds most strongly to first-person, present-tense language. "I wake up feeling at peace" activates different neural patterns than "I want to feel at peace someday." The story is written as if your future is already your reality.',
        },
        {
            number: 3,
            title: "You hear it in your own voice",
            text: "Studies on self-affirmation show that hearing positive statements in your own voice produces significantly stronger neurological activation than hearing them in a stranger's voice. Your brain recognizes and trusts your own voice at a biological level — making the audio more effective than any professionally narrated recording.",
        },
        {
            number: 4,
            title: "You listen at the two most receptive moments of your day",
            text: "The hypnagogic state just before sleep and the hypnopompic state just after waking are periods of elevated neuroplasticity — your brain is literally more receptive to new programming during these windows. Listening at these moments is not a preference, it's a neurological strategy.",
        },
        {
            number: 5,
            title: "Repetition builds new neural pathways",
            text: "Neurons that fire together wire together. Each listening session strengthens the neural patterns associated with your vision. Over 21–30 days, what began as imagination starts to feel familiar, possible, and eventually inevitable. Your RAS begins filtering reality to surface what you've been programming it to find.",
        },
    ];

    const researchItems: IResearchItem[] = [
        {
            icon: <BookIcon />,
            title: "Mental Simulation & Neuroplasticity",
            body: "Research by neuroscientist Alvaro Pascual-Leone demonstrated that mental rehearsal of piano sequences produced the same cortical changes as physical practice. The brain does not fully distinguish between a vividly imagined experience and a real one — a finding replicated across dozens of studies in sports psychology and motor learning.",
        },
        {
            icon: <InfoIcon />,
            title: "The Reticular Activating System",
            body: 'The RAS, a network of neurons in the brainstem, is well-documented as the brain\'s attentional filter. Research in selective attention — including the famous "invisible gorilla" studies by Simons & Chabris — demonstrates how profoundly our prior programming shapes what we literally see in the world around us.',
        },
        {
            icon: <HeartIcon />,
            title: "Self-Affirmation & Voice Recognition",
            body: "Studies published in Psychological Science show that self-affirmations — particularly those heard in one's own voice — activate the ventromedial prefrontal cortex, a region associated with self-relevance and positive valuation. This effect is substantially stronger when the voice is recognized as one's own.",
        },
        {
            icon: <UsersIcon />,
            title: "Sleep-State Neurological Receptivity",
            body: "Research on sleep architecture shows that the hypnagogic (pre-sleep) and hypnopompic (post-waking) states are associated with elevated theta wave activity — a brain state linked to heightened suggestibility, memory consolidation, and the integration of new beliefs. These windows are neurologically distinct from normal waking consciousness.",
        },
    ];

    return (
        <div className={styles.container}>
            {/* HERO */}
            <div className={styles.hero}>
                <div className={styles.heroEyebrow}>Neuroscience & Manifestation</div>
                <h1 className={styles.heroTitle}>
                    Your brain only finds
                    <br />
                    <em>what it's looking for.</em>
                </h1>
                <p className={styles.heroSub}>
                    There is a system in your brain that acts as a filter for all of
                    reality — deciding what you notice, what you ignore, and ultimately
                    what you believe is possible. Understanding it changes everything.
                </p>
                <div className={styles.heroDivider} />
            </div>

            {/* SECTION 1: RAS INTRO */}
            <section className={styles.section}>
                <div className={styles.sectionEyebrow}>The Filter in Your Brain</div>
                <h2 className={styles.sectionTitle}>
                    You are surrounded by more
                    <br />
                    than you can possibly <em>see.</em>
                </h2>
                <p className={styles.prose}>
                    Right now, your five senses are receiving approximately{" "}
                    <strong>11 million bits of information per second</strong>. The sounds
                    in the room, the feeling of your clothes, the temperature of the air,
                    the light hitting objects at the edge of your vision. Your conscious
                    mind can process roughly <strong>40 to 50 bits</strong> of that per
                    second.
                </p>
                <p className={styles.prose}>
                    Something has to decide what makes the cut. That something is the{" "}
                    <strong>Reticular Activating System</strong> — a network of neurons at
                    the base of your brainstem that acts as your brain's filter,
                    gatekeeper, and priority engine. It scans the flood of incoming
                    information and passes through only what it has been programmed to
                    consider relevant.
                </p>

                <PullQuote
                    text="The RAS is essentially your brain's search engine. It only surfaces results that match your existing beliefs and focus — everything else is invisible to you, even when it's right in front of your eyes."
                    cite="— Neuroscience research on selective attention and the reticular activating system"
                />

                <p className={styles.prose}>
                    This is not a flaw. It's a remarkable efficiency system — your brain
                    cannot consciously process everything, so it filters based on what it
                    believes matters. The profound implication is this:{" "}
                    <strong>
                        change what you're programmed to look for, and you change what you
                        see in the world around you.
                    </strong>
                </p>
            </section>

            <div className={styles.sectionRule}>
                <hr />
            </div>

            {/* INTERACTIVE EXERCISE */}
            <section className={styles.section} id="exercise">
                <div className={styles.sectionEyebrow}>Try It Yourself</div>
                <h2 className={styles.sectionTitle}>
                    Your brain deletes things
                    <br />
                    <em>right in front of you.</em>
                </h2>
                <p className={styles.prose}>
                    This isn't subtle filtering. This is your brain completely erasing
                    something obvious — a large, moving creature — while you're focused on
                    something else. This is one of the most famous experiments in the
                    history of cognitive science. It will happen to most of you right now.
                </p>

                <GorillaExperiment />
            </section>

            <div className={styles.sectionRule}>
                <hr />
            </div>

            {/* FIGURE-GROUND SECTION */}
            <section className={styles.section} id="figure-ground">
                <div className={styles.sectionEyebrow}>Figure-Ground Perception</div>
                <h2 className={styles.sectionTitle}>
                    What you see depends entirely
                    <br />
                    on <em>what you're looking for.</em>
                </h2>
                <p className={styles.prose}>
                    The gorilla experiment showed you how your brain can erase something
                    completely obvious. This next example shows something equally striking
                    — two completely different realities existing in the exact same image,
                    simultaneously. Which one you see first depends entirely on your prior
                    programming.
                </p>
                <p className={styles.prose}>
                    This phenomenon is called <strong>figure-ground perception</strong> —
                    the brain's tendency to separate a scene into a dominant "figure" and
                    a background. Most people default to seeing the same thing. But the
                    other picture was always there.
                </p>

                <div className={styles.illusionGrid}>
                    <RubinVase />
                    <DuckRabbit />
                </div>

                {/* THE CONNECTION */}
                <div className={styles.figgroundInsight}>
                    <div className={styles.fgiIcon}>🔑</div>
                    <div className={styles.fgiBody}>
                        <h3 className={styles.fgiTitle}>This is why your story matters.</h3>
                        <p className={styles.fgiText}>
                            The opportunities, connections, and moments that will build your
                            ideal life are already present in your world — just like the vase
                            was always in the image. Your brain simply isn't programmed to
                            notice them yet. When you listen to your story every day, you're
                            not wishing for things to appear. You're training your brain to
                            finally <em>see</em> what was always there.
                        </p>
                    </div>
                </div>
            </section>

            {/* HOW MANIFESTMYSTORY WORKS */}
            <section className={styles.section} id="how">
                <div className={styles.sectionEyebrow}>The Mechanism</div>
                <h2 className={styles.sectionTitle}>
                    How listening to your story
                    <br />
                    <em>reprograms your RAS.</em>
                </h2>
                <p className={styles.prose}>
                    Understanding the exercise above makes the ManifestMyStory method easy
                    to understand. It isn't magic — it's applied neuroscience. Here is
                    exactly what happens when you listen to your story every morning and
                    night.
                </p>

                <div className={styles.howSteps}>
                    {howItWorksSteps.map((step) => (
                        <HowItWorksStep key={step.number} {...step} />
                    ))}
                </div>
            </section>

            <div className={styles.sectionRule}>
                <hr />
            </div>

            {/* RESEARCH */}
            <section className={styles.section} id="research">
                <div className={styles.sectionEyebrow}>Supporting Research</div>
                <h2 className={styles.sectionTitle}>
                    The science this
                    <br />
                    <em>practice is built on.</em>
                </h2>
                <p className={styles.prose}>
                    ManifestMyStory is grounded in several well-established areas of
                    neuroscience and cognitive psychology research.
                </p>

                <div className={styles.researchGrid}>
                    {researchItems.map((item, index) => (
                        <ResearchItem key={index} {...item} />
                    ))}
                </div>

                <PullQuote text="We are what we repeatedly think. And what we repeatedly think, we begin to see. And what we see, we act upon. Neuroscience is simply confirming what philosophers have known for centuries." />
            </section>

            {/* FINAL CTA */}
            <div className={styles.finalCta}>
                <h2 className={styles.finalCtaTitle}>
                    Ready to program your
                    <br />
                    <em>brain for your future?</em>
                </h2>
                <p className={styles.finalCtaSub}>
                    Your manifestation story takes 15 minutes to create and a lifetime to
                    benefit from. Start with your goals — the rest follows.
                </p>
                <Link href="/user/goal-intake-ai" className={styles.finalCtaBtn}>
                    Create My Story — It's Free
                    <ArrowIcon />
                </Link>
            </div>

            <footer className={styles.footer}>
                <p>
                    © 2026 ManifestMyStory · <a href="#">Privacy</a> ·{" "}
                    <a href="#">Terms</a> · <Link href="/">Home</Link>
                </p>
            </footer>
        </div>
    );
};

export default Science;
