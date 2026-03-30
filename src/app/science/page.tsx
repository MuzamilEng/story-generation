'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import styles from '../styles/Science.module.css';
import Sidebar from '../components/Sidebar';

export default function SciencePage() {
    const [step, setStep] = useState(1);
    const exerciseRef = useRef<HTMLDivElement>(null);

    const goStep = (n: number) => {
        setStep(n);
        if (exerciseRef.current) {
            exerciseRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    };

    useEffect(() => {
        document.title = "ManifestMyStory — The Science";
    }, []);

    return (
        <div className={styles.mainContainer}>
            <nav className={styles.nav}>
                <Link href="/" className={styles.logo}>
                    Manifest<span>MyStory</span>
                </Link>

                <div className={styles.navLinks}>
                    <Link href="/">&larr; Home</Link>
                    <a href="#how">How It Works</a>
                    <a href="#nlp">The NLP Layer</a>
                    <a href="#emotion">The Practice</a>
                    <a href="#research">Research</a>
                    <Link href="/mystical">The Ancient Side &rarr;</Link>
                </div>

                <Link href="/user/goal-intake-ai" className={styles.navCta}>
                    Create My Story — Free
                </Link>
            </nav>

            <Sidebar isLandingPage />

            {/* HERO */}
            <div className={styles.hero}>
                <div className={styles.heroEyebrow}>Neuroscience &middot; NLP &middot; Applied Psychology</div>
                <h1 className={styles.heroTitle}>
                    Your brain is always building<br />
                    <em>the life it expects.</em>
                </h1>
                <p className={styles.heroSub}>
                    There is a precise, well-documented mechanism by which the mind shapes the reality you perceive — and ultimately the life you live. ManifestMyStory is built entirely on that mechanism.
                </p>
                <div className={styles.heroDivider}></div>
            </div>

            {/* SECTION 1 — NEUROPLASTICITY */}
            <div className={styles.section}>
                <div className={styles.sectionEyebrow}>The Foundation</div>
                <h2 className={styles.sectionTitle}>
                    Your brain is far more<br />
                    <em>changeable than once believed.</em>
                </h2>
                <p className={styles.prose}>
                    The human brain contains approximately <strong>86 billion neurons</strong> forming trillions of synaptic connections. For much of the twentieth century, the prevailing view was that these connections were largely fixed after childhood — that the adult brain was a relatively stable structure.
                </p>
                <p className={styles.prose}>
                    More recent research has significantly revised that picture. <strong>Neuroplasticity</strong> — the brain&apos;s capacity to reorganize itself by forming and strengthening new neural connections — is now understood to be an ongoing property of the adult brain, not just a feature of early development. Every thought you repeatedly think, every emotion you repeatedly feel, and every scene you repeatedly visualize has the potential to influence the structure and function of your neural pathways.
                </p>
                <p className={styles.prose}>
                    This is not metaphor. It is measurable, observable biology. And it is the foundation on which ManifestMyStory is built.
                </p>

                <div className={styles.pullQuote}>
                    <p>
                        &quot;Neurons that fire together wire together. The brain is not a fixed structure — it is a living system that reorganizes itself around what you repeatedly think, feel, and imagine.&quot;
                    </p>
                    <cite>— Donald Hebb, neuropsychologist, foundational principle of Hebbian learning</cite>
                </div>

                <p className={styles.prose}>
                    What ManifestMyStory is designed to do is leverage a specific and powerful application of this principle: <strong>repeated, emotionally charged, first-person audio immersion.</strong> Each time you listen to your story, you are running a rehearsal program — strengthening the neural pathways associated with your goals until those pathways become your brain&apos;s default operating mode.
                </p>
            </div>

            <div className={styles.sectionRule}>
                <hr />
            </div>

            {/* SECTION 2 — SUBCONSCIOUS */}
            <div className={styles.section}>
                <div className={styles.sectionEyebrow}>The 95% Problem</div>
                <h2 className={styles.sectionTitle}>
                    Willpower works on <em>5%.</em><br />
                    Your story works on the rest.
                </h2>
                <p className={styles.prose}>
                    Neuroscientists estimate that roughly <strong>95% of brain activity is unconscious.</strong> Your conscious mind — the part reading these words — governs about 5% of your cognitive function. The remaining 95% operates below awareness, running automated programs built from years of repeated experience, emotion, and belief.
                </p>
                <p className={styles.prose}>
                    Here is the critical implication: your behavior, your decisions, your emotional responses, and your results in life are overwhelmingly generated by your <strong>subconscious programming</strong> — not your conscious intentions. This is why willpower alone tends to fall short. You can consciously intend to feel confident, abundant, or free — but if your subconscious is running an older program, the subconscious wins. Not because you are weak, but because 95% consistently overrides 5%.
                </p>
                <p className={styles.prose}>
                    The only way to produce lasting change is to update the subconscious program directly. And the subconscious is most receptive to new programming in one very specific state.
                </p>

                <div className={styles.sciGrid}>
                    <div className={styles.sciCard}>
                        <div className={styles.sciCardIcon}>🧠</div>
                        <div className={styles.sciCardTitle}>Conscious mind</div>
                        <div className={styles.sciCardBody}>
                            ~5% of cognitive activity. Responsible for analysis, reasoning, willpower, and decision-making. Works hard but is easily overridden by deeper programming.
                        </div>
                    </div>
                    <div className={`${styles.sciCard} ${styles.gold}`}>
                        <div className={styles.sciCardIcon}>⚡</div>
                        <div className={styles.sciCardTitle}>Subconscious mind</div>
                        <div className={styles.sciCardBody}>
                            ~95% of cognitive activity. Runs automated belief programs, emotional responses, and behavioral patterns — generating most of your real-world results.
                        </div>
                    </div>
                    <div className={`${styles.sciCard} ${styles.green}`}>
                        <div className={styles.sciCardIcon}>🌙</div>
                        <div className={styles.sciCardTitle}>Theta state gateway</div>
                        <div className={styles.sciCardBody}>
                            The precise neurological window — just before sleep and just after waking — where the subconscious is most open to receiving new programming.
                        </div>
                    </div>
                    <div className={styles.sciCard}>
                        <div className={styles.sciCardIcon}>🎙️</div>
                        <div className={styles.sciCardTitle}>Your own voice</div>
                        <div className={styles.sciCardBody}>
                            The most trusted signal your nervous system receives. When you hear your own voice narrate your future, the brain registers it as memory, not aspiration.
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.sectionRule}>
                <hr />
            </div>

            {/* SECTION 3 — THETA */}
            <div className={styles.section}>
                <div className={styles.sectionEyebrow}>The Subconscious Gateway</div>
                <h2 className={styles.sectionTitle}>
                    You enter the most receptive<br />
                    state of your brain <em>twice a day.</em>
                </h2>
                <p className={styles.prose}>
                    Your brain operates at different electrical frequencies depending on your state of consciousness. These frequencies are well-documented and measurable — and one of them is particularly important for what ManifestMyStory does.
                </p>

                <div className={styles.brainwaveWrap}>
                    <div className={styles.bwBadge}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                        Brain Wave States
                    </div>
                    <div className={styles.brainwaveTitle}>The Five Brain Wave Frequencies</div>
                    <div className={styles.brainwaveSub}>
                        Your brain shifts between these states constantly — and the timing of your story matters precisely because of this.
                    </div>

                    <div className={styles.bwRow}>
                        <div className={styles.bwLabel}>Beta</div>
                        <div className={styles.bwBarWrap}>
                            <div className={styles.bwBar} style={{ width: '90%', background: 'rgba(255,255,255,0.25)' }}></div>
                        </div>
                        <div className={styles.bwHz}>13–30 Hz</div>
                    </div>
                    <div className={styles.bwDesc}>Active thinking, problem-solving, stress. Normal waking consciousness.</div>

                    <div className={styles.bwRow}>
                        <div className={styles.bwLabel}>Alpha</div>
                        <div className={styles.bwBarWrap}>
                            <div className={styles.bwBar} style={{ width: '65%', background: 'rgba(255,255,255,0.2)' }}></div>
                        </div>
                        <div className={styles.bwHz}>8–13 Hz</div>
                    </div>
                    <div className={styles.bwDesc}>Relaxed alertness, light meditation, creative flow.</div>

                    <div className={`${styles.bwRow} ${styles.highlight}`}>
                        <div className={styles.bwLabel}>Theta ✦</div>
                        <div className={styles.bwBarWrap}>
                            <div className={styles.bwBar} style={{ width: '44%', background: 'var(--accent-mid)' }}></div>
                        </div>
                        <div className={styles.bwHz}>4–8 Hz</div>
                    </div>
                    <div className={styles.bwDesc} style={{ color: 'rgba(82,183,136,0.85)', fontWeight: 500 }}>
                        Deep relaxation, hypnagogic state. The subconscious gateway — where new beliefs enter with the least resistance. Naturally occurring just before sleep and just after waking.
                    </div>

                    <div className={styles.bwRow}>
                        <div className={styles.bwLabel}>Delta</div>
                        <div className={styles.bwBarWrap}>
                            <div className={styles.bwBar} style={{ width: '22%', background: 'rgba(255,255,255,0.12)' }}></div>
                        </div>
                        <div className={styles.bwHz}>0.5–4 Hz</div>
                    </div>
                    <div className={styles.bwDesc}>Deep dreamless sleep. Memory consolidation.</div>
                </div>

                <p className={styles.prose}>
                    <strong>Theta is the most important frequency for subconscious reprogramming.</strong> In the theta state, the brain&apos;s critical analytical filter is significantly reduced — the same state a hypnotherapist induces before delivering therapeutic suggestions. It is also the state children are in for their first seven years of life, which is why early experiences imprint so deeply.
                </p>
                <p className={styles.prose}>
                    Here is the precise mechanism: <strong>you naturally enter theta twice every single day</strong> — in the minutes just before sleep and just after waking. During these windows, the gate between conscious and subconscious is open. New programming passes through with dramatically less resistance than during normal waking hours.
                </p>
                <p className={styles.prose}>
                    Listening to your story at these two moments is not a suggestion. It is a deliberate neurological strategy — delivering emotionally charged, first-person programming directly to your subconscious at the exact moment it is most receptive to receive it.
                </p>
            </div>

            <div className={styles.sectionRule}>
                <hr />
            </div>

            {/* SECTION 4 — YOUR VOICE */}
            <div className={styles.section}>
                <div className={styles.sectionEyebrow}>The Voice Effect</div>
                <h2 className={styles.sectionTitle}>
                    Your brain treats your own voice<br />
                    as something <em>fundamentally different.</em>
                </h2>
                <p className={styles.prose}>
                    The brain processes self-generated speech differently from externally generated speech. Research in auditory neuroscience demonstrates that hearing your own voice activates a distinct and stronger pattern of neural engagement than hearing another person&apos;s voice — particularly in regions associated with <strong>self-concept, autobiographical memory, and identity formation.</strong>
                </p>
                <p className={styles.prose}>
                    When you hear a stranger narrate your future, your brain registers it as external information — interesting, perhaps inspiring, but external. When you hear yourself narrate your future, your brain begins to register it as something closer to a memory. The subconscious mind cannot fully distinguish between a vividly imagined first-person experience and a real one — particularly in the theta state.
                </p>

                <div className={styles.pullQuote}>
                    <p>
                        &quot;Self-affirmations heard in one&apos;s own voice activate the brain&apos;s self-relevance centers — the ventromedial prefrontal cortex — far more powerfully than the same content heard in another voice or read silently.&quot;
                    </p>
                    <cite>— Self-affirmation research, Psychological Science</cite>
                </div>

                <p className={styles.prose}>
                    This is the mechanism behind visualization used by elite athletes, surgeons, and military units worldwide. Your voice, narrating your future, in the theta state, returned to every day — is the most direct subconscious reprogramming protocol available outside of clinical hypnotherapy.
                </p>
            </div>

            <div className={styles.sectionRule}>
                <hr />
            </div>

            {/* SECTION 5 — NLP */}
            <div className={styles.section} id="nlp">
                <div className={styles.sectionEyebrow}>The Language Layer</div>
                <h2 className={styles.sectionTitle}>
                    Every story is engineered<br />
                    in the <em>language of the subconscious.</em>
                </h2>
                <p className={styles.prose}>
                    Neuro-Linguistic Programming, developed by Richard Bandler and John Grinder in the 1970s based on the work of hypnotherapist Milton Erickson, provides a precise toolkit for communicating with the subconscious mind through language structure. Several key NLP mechanisms are built directly into every ManifestMyStory narrative.
                </p>

                <div className={styles.nlpGrid}>
                    <div className={styles.nlpCard}>
                        <div className={styles.nlpTag}>Submodality Engineering</div>
                        <div className={styles.nlpTitle}>Make it feel real to the brain</div>
                        <div className={styles.nlpBody}>
                            The subconscious encodes emotional weight through sensory qualities — how bright, how close, how vivid an internal image is. Every story is written to be immersive and close, so the subconscious encodes it as a high-reality, high-priority experience.
                        </div>
                    </div>
                    <div className={styles.nlpCard}>
                        <div className={styles.nlpTag}>Milton Model Patterns</div>
                        <div className={styles.nlpTitle}>Bypass the critical mind</div>
                        <div className={styles.nlpBody}>
                            Ericksonian language structures — embedded commands, presuppositions, universal quantifiers — are woven throughout your story. They deliver programming directly to the subconscious with less analytical resistance than direct statements.
                        </div>
                    </div>
                    <div className={styles.nlpCard}>
                        <div className={styles.nlpTag}>Identity-Level Change</div>
                        <div className={styles.nlpTitle}>Shift who you believe you are</div>
                        <div className={styles.nlpBody}>
                            The most durable change happens at the identity level. Not &quot;I want to be successful&quot; but &quot;I am someone who succeeds.&quot; Every story contains quiet recognitions of who you are — not declarations of what you want. Identity drives behavior, which produces results.
                        </div>
                    </div>
                    <div className={styles.nlpCard}>
                        <div className={styles.nlpTag}>Future Pacing</div>
                        <div className={styles.nlpTitle}>Rehearse until it feels familiar</div>
                        <div className={styles.nlpBody}>
                            A clinical NLP technique where the mind rehearses a desired future with enough sensory detail that the nervous system begins to treat it as a past event. Daily listening is future pacing at scale — until the imagined becomes expected.
                        </div>
                    </div>
                </div>

                <div className={styles.pullQuoteGold}>
                    <p>
                        &quot;Language is not merely a tool for describing experience. It is a tool for creating it. The patterns of language you inhabit become the patterns of reality you perceive.&quot;
                    </p>
                    <cite>— Richard Bandler, co-founder of Neuro-Linguistic Programming</cite>
                </div>
            </div>

            <div className={styles.sectionRule}>
                <hr />
            </div>

            {/* SECTION 6 — HOW IT WORKS */}
            <div className={styles.section} id="how">
                <div className={styles.sectionEyebrow}>The Mechanism</div>
                <h2 className={styles.sectionTitle}>
                    Exactly what happens when<br />
                    you listen to your story <em>every day.</em>
                </h2>
                <p className={styles.prose}>
                    This is not magic and it is not mystery. Here is the precise sequence of what ManifestMyStory produces neurologically with each listening session.
                </p>

                <div className={styles.howSteps}>
                    <div className={styles.howStep}>
                        <div className={styles.howStepNum}>1</div>
                        <div>
                            <div className={styles.howStepClaim}>Your goals and proof actions are captured in vivid, specific detail</div>
                            <div className={styles.howStepText}>
                                The conversation extracts not just what you want, but what you will do once you have it — the specific purchase, trip, experience, or moment that proves the goal is real. These proof actions become the emotional centerpiece of your story. Specificity is critical — the more precise the details, the more precisely the brain can build the neural target.
                            </div>
                        </div>
                    </div>
                    <div className={styles.howStep}>
                        <div className={styles.howStepNum}>2</div>
                        <div>
                            <div className={styles.howStepClaim}>Your story is written in first person, present tense — as if it is already done</div>
                            <div className={styles.howStepText}>
                                Research in cognitive psychology shows the brain responds most strongly to first-person, present-tense language. &quot;I walk through the door of my new home&quot; activates different neural patterns than &quot;I hope to own a home someday.&quot; The story is written as a memory of a day that has not happened yet — because that is how the subconscious accepts it as real.
                            </div>
                        </div>
                    </div>
                    <div className={styles.howStep}>
                        <div className={styles.howStepNum}>3</div>
                        <div>
                            <div className={styles.howStepClaim}>Your own voice narrates it — the most trusted signal your brain receives</div>
                            <div className={styles.howStepText}>
                                Voice cloning creates a narration that sounds exactly like you. When your own voice delivers your vision, your brain does not process it as content. It processes it as self-generated — activating regions associated with identity and autobiographical memory in a way no professional narrator ever could.
                            </div>
                        </div>
                    </div>
                    <div className={styles.howStep}>
                        <div className={styles.howStepNum}>4</div>
                        <div>
                            <div className={styles.howStepClaim}>You listen at the two moments your brain is most receptive</div>
                            <div className={styles.howStepText}>
                                The theta state just before sleep and just after waking is when the subconscious gate is open. Listening at these windows is not a preference — it is a neurological strategy. This is the same principle used in clinical hypnotherapy and the same windows that spiritual traditions across thousands of years identified as the most powerful times for inner work.
                            </div>
                        </div>
                    </div>
                    <div className={styles.howStep}>
                        <div className={styles.howStepNum}>5</div>
                        <div>
                            <div className={styles.howStepClaim}>Repetition builds new neural pathways — until the future feels inevitable</div>
                            <div className={styles.howStepText}>
                                Neurons that fire together wire together. Each listening session strengthens the neural patterns associated with your vision. Over 21–30 days, what began as imagination starts to feel familiar, then expected, then natural. Your RAS begins filtering reality to surface what you have been programming it to find. Behavior follows identity — and your identity is shifting.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.sectionRule}>
                <hr />
            </div>

            {/* SECTION 7 — GORILLA */}
            <div className={styles.section} ref={exerciseRef}>
                <div className={styles.sectionEyebrow}>See It For Yourself</div>
                <h2 className={styles.sectionTitle}>
                    Your brain erases things<br />
                    <em>right in front of you.</em>
                </h2>
                <p className={styles.prose}>
                    The RAS — your brain&apos;s filter — is not subtle. It can erase something large, obvious, and moving from your awareness entirely while you are focused on something else. This is one of the most replicated experiments in the history of cognitive science. It demonstrates in 90 seconds what takes paragraphs to explain.
                </p>

                <div className={styles.exerciseWrap}>
                    <div className={styles.exHeader}>
                        <div className={styles.exBadge}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                            Interactive &middot; ~2 minutes
                        </div>
                        <h3 className={styles.exTitle}>
                            The Selective<br />
                            <em>Attention Test</em>
                        </h3>
                        <p className={styles.exSub}>Watch the video. Follow the one instruction at the start. Do not read ahead — the demonstration only works once.</p>
                    </div>
                    <div className={styles.exBody}>
                        <div className={`${styles.exStep} ${step === 1 ? styles.active : ''}`}>
                            <div className={styles.exInstruction}>
                                <div className={styles.exInstructionNum}>Your task — read before pressing play</div>
                                <div className={styles.exInstructionText}>
                                    Count how many times the players in <strong>white shirts</strong> pass the basketball. Focus only on the white team.
                                </div>
                            </div>
                            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, borderRadius: '12px', overflow: 'hidden', margin: '1rem 0', background: '#000' }}>
                                <iframe
                                    src="https://www.youtube.com/embed/vJG698U2Mvo?rel=0&modestbranding=1&color=white"
                                    title="Selective Attention Test"
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                ></iframe>
                            </div>
                            <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginBottom: '1rem' }}>
                                Video by Daniel Simons &amp; Christopher Chabris &middot; dansimons.com
                            </p>
                            <div className={styles.exNav}>
                                <span></span>
                                <button className={`${styles.exBtn} ${styles.primary}`} onClick={() => goStep(2)}>
                                    I finished watching &rarr;
                                </button>
                            </div>
                        </div>

                        <div className={`${styles.exStep} ${step === 2 ? styles.active : ''}`}>
                            <div className={styles.gorillaReveal} style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                <div className={styles.gorillaEmoji}>🦍</div>
                                <div className={styles.gorillaHead}>Did you notice anything unusual?</div>
                                <div className={styles.gorillaBody}>While you were counting passes — did anything unexpected appear in the video?</div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.25rem' }}>
                                <button className={`${styles.exBtn} ${styles.primary}`} style={{ justifyContent: 'center' }} onClick={() => goStep(3)}>
                                    Yes, I noticed something
                                </button>
                                <button className={`${styles.exBtn} ${styles.ghost}`} style={{ justifyContent: 'center' }} onClick={() => goStep(3)}>
                                    No, nothing unusual
                                </button>
                            </div>
                        </div>

                        <div className={`${styles.exStep} ${step === 3 ? styles.active : ''}`}>
                            <div className={styles.gorillaReveal}>
                                <div className={styles.gorillaEmoji}>🦍</div>
                                <div className={styles.gorillaHead}>A gorilla walked through the scene</div>
                                <div className={styles.gorillaBody}>
                                    Midway through the video, a person in a full gorilla suit walked into frame, stopped, beat their chest, and walked out. Visible for 9 full seconds. About half of all viewers — focused on counting passes — never see it. Your brain erased it completely. Not because you weren&apos;t paying attention — because you were paying attention to the wrong thing.
                                </div>
                            </div>
                            <div className={styles.insightBanner}>
                                <div className={styles.insightIcon}>🔑</div>
                                <h3 className={styles.insightTitle}>
                                    This is happening in<br />
                                    <em>your life right now.</em>
                                </h3>
                                <p className={styles.insightBody}>
                                    The gorilla was always there. The opportunities, relationships, and moments that could build your ideal life are present in your world right now — just as obvious, just as real. Your RAS simply isn&apos;t programmed to surface them yet. When you listen to your story every day, you give your brain a new task. What was invisible becomes impossible to miss.
                                </p>
                                <Link href="/user/goal-intake-ai" className={styles.insightCta}>
                                    Start programming my brain &rarr;
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.sectionRule}>
                <hr />
            </div>

            {/* SECTION 8 — EMOTION PROTOCOL */}
            <div className={styles.section} id="emotion">
                <div className={styles.sectionEyebrow}>The Practice</div>
                <h2 className={styles.sectionTitle}>
                    The story is the vehicle.<br />
                    <em>Emotion is the fuel.</em>
                </h2>
                <p className={styles.prose}>
                    Without genuine emotional activation, the story is just words — interesting but not transformative. With genuine emotional activation, each listen is a neurochemical and electromagnetic event that physically changes your brain. The emotion protocol is what separates a practice that works from one that merely sounds good.
                </p>

                <div className={styles.protocolWrap}>
                    <div className={styles.protocolHeader}>
                        <div className={styles.protocolBadge}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                            The Emotion Protocol — 5 Steps
                        </div>
                        <h3 className={styles.protocolTitle}>
                            How to listen so your<br />
                            <em>subconscious actually changes.</em>
                        </h3>
                        <p className={styles.protocolSub}>Follow these five steps every time you listen — morning and night. The difference in results is not subtle.</p>
                    </div>
                    <div className={styles.protocolSteps}>
                        <div className={styles.pStep}>
                            <div className={styles.pNum}>1</div>
                            <div>
                                <div className={styles.pTitle}>Prime before you press play</div>
                                <div className={styles.pBody}>
                                    Take three slow, deep breaths. On each exhale, consciously release the tension of the current moment. You are relaxing the critical filter so the story goes deeper — not relaxing into passivity, but opening the subconscious gate intentionally.
                                </div>
                            </div>
                        </div>
                        <div className={styles.pStep}>
                            <div className={styles.pNum}>2</div>
                            <div>
                                <div className={styles.pTitle}>Enter the scene — do not observe it</div>
                                <div className={styles.pBody}>
                                    The story is first person, present tense. Your job is not to listen to it like a podcast. Your job is to be inside it. See what you would see. Feel the temperature, the light, the texture. You are not imagining a future — you are remembering a past that has not happened yet.
                                </div>
                            </div>
                        </div>
                        <div className={styles.pStep}>
                            <div className={styles.pNum}>3</div>
                            <div>
                                <div className={styles.pTitle}>Generate the feeling of already having received</div>
                                <div className={styles.pBody}>
                                    The key emotion is not excitement about receiving. Not hope. The settled, quiet satisfaction of someone for whom this is already done. This specific emotional state — gratitude for what is already real — sends the clearest subconscious signal. Generate it deliberately, even if you have to reach for it.
                                </div>
                            </div>
                        </div>
                        <div className={styles.pStep}>
                            <div className={styles.pNum}>4</div>
                            <div>
                                <div className={styles.pTitle}>Anchor the peak moment</div>
                                <div className={styles.pBody}>
                                    When you feel the strongest emotional resonance — usually during a proof action scene — press your thumb and index finger together. Do this every listen. After 15–20 repetitions, that physical touch will trigger the emotional state on its own. This is classical NLP anchoring: a physical shortcut to your most powerful frequency.
                                </div>
                            </div>
                        </div>
                        <div className={styles.pStep}>
                            <div className={styles.pNum}>5</div>
                            <div>
                                <div className={styles.pTitle}>Linger in the feeling after the story ends</div>
                                <div className={styles.pBody}>
                                    Do not immediately reach for your phone. Stay in the emotional state for 60–90 seconds after the story ends. This is when neurological consolidation is most active. Let the feeling be the last thing your brain registers before sleep or the first thing it carries into your day.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.sectionRule}>
                <hr />
            </div>

            {/* SECTION 9 — THE FREQUENCY EQUATION */}
            <div className={styles.section}>
                <div className={styles.sectionEyebrow}>The Variables</div>
                <h2 className={styles.sectionTitle}>
                    Three things determine<br />
                    <em>how fast this works.</em>
                </h2>
                <p className={styles.prose}>
                    The speed at which your vision becomes your reality is proportional to three variables. Understanding them helps you work with the process rather than against it.
                </p>

                <div className={styles.freqGrid}>
                    <div className={styles.freqCard}>
                        <div className={styles.freqSymbol}>A</div>
                        <div className={styles.freqLabel}>Amplitude</div>
                        <div className={styles.freqDesc}>
                            How strongly you feel the target emotion during each session. A story that produces a physical response is working. A story listened to half-engaged is not. Quality of presence matters more than length of session.
                        </div>
                    </div>
                    <div className={styles.freqCard}>
                        <div className={styles.freqSymbol}>C</div>
                        <div className={styles.freqLabel}>Consistency</div>
                        <div className={styles.freqDesc}>
                            How many consecutive days you maintain the practice. The subconscious is reprogrammed by repetition, not intensity alone. Daily practice for 60 days produces more durable change than 10 intense sessions with gaps.
                        </div>
                    </div>
                    <div className={styles.freqCard}>
                        <div className={styles.freqSymbol}>S</div>
                        <div className={styles.freqLabel}>Specificity</div>
                        <div className={styles.freqDesc}>
                            How precisely your story matches your actual goals and proof actions. Specific numbers, places, people, and scenes create a precise neurological target. Vague goals produce vague results.
                        </div>
                    </div>
                </div>

                <div className={styles.pullQuote}>
                    <p>&quot;The story is the blueprint. The emotion is the energy. The repetition is the construction.&quot;</p>
                </div>
            </div>

            <div className={styles.sectionRule}>
                <hr />
            </div>

            {/* SECTION 10 — SIGNS IT IS WORKING */}
            <div className={styles.section}>
                <div className={styles.sectionEyebrow}>How You&apos;ll Know</div>
                <h2 className={styles.sectionTitle}>
                    Signs your subconscious<br />
                    <em>is being reprogrammed.</em>
                </h2>
                <p className={styles.prose}>
                    You will know the practice is working when you notice these shifts — not because reality changed, but because your perception, receptivity, and identity are changing.
                </p>

                <div className={styles.signsGrid}>
                    <div className={styles.signItem}>
                        <div className={styles.signDot}></div>
                        <div className={styles.signText}>
                            <strong>Effortless decisions</strong>You make choices you wouldn&apos;t have made before — without forcing yourself. Behavior is following the new identity.
                        </div>
                    </div>
                    <div className={styles.signItem}>
                        <div className={styles.signDot}></div>
                        <div className={styles.signText}>
                            <strong>Relevant opportunities appear</strong>Conversations, resources, and connections relevant to your goals begin surfacing — because your RAS is now programmed to notice them.
                        </div>
                    </div>
                    <div className={styles.signItem}>
                        <div className={styles.signDot}></div>
                        <div className={styles.signText}>
                            <strong>The story starts to feel familiar</strong>What was once aspirational begins to feel natural. This is the subconscious accepting the vision as identity — the most important transition.
                        </div>
                    </div>
                    <div className={styles.signItem}>
                        <div className={styles.signDot}></div>
                        <div className={styles.signText}>
                            <strong>Natural aligned action</strong>You find yourself taking steps toward your goals without mental effort — because the subconscious is now oriented toward the same destination as your conscious intention.
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.sectionRule}>
                <hr />
            </div>

            {/* SECTION 11 — RESEARCH */}
            <div className={styles.section} id="research">
                <div className={styles.sectionEyebrow}>Supporting Research</div>
                <h2 className={styles.sectionTitle}>
                    The science this<br />
                    <em>practice is built on.</em>
                </h2>
                <p className={styles.prose}>
                    ManifestMyStory is grounded in several well-established areas of neuroscience, cognitive psychology, and applied research.
                </p>

                <div className={styles.researchGrid}>
                    <div className={styles.researchItem}>
                        <div className={styles.researchIcon}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                            </svg>
                        </div>
                        <div>
                            <div className={styles.researchTitle}>Mental Simulation &amp; Neuroplasticity (Pascual-Leone et al.)</div>
                            <div className={styles.researchBody}>
                                Research by neuroscientist Alvaro Pascual-Leone demonstrated that mental rehearsal of piano sequences produced the same cortical changes as physical practice. The brain does not fully distinguish between a vividly imagined experience and a real one — a finding replicated across dozens of studies in sports psychology and motor learning.
                            </div>
                        </div>
                    </div>
                    <div className={styles.researchItem}>
                        <div className={styles.researchIcon}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <div>
                            <div className={styles.researchTitle}>The Reticular Activating System (Simons &amp; Chabris)</div>
                            <div className={styles.researchBody}>
                                The RAS is well-documented as the brain&apos;s attentional filter. Research in selective attention — including the gorilla experiment above — demonstrates how profoundly prior programming shapes what we literally perceive in the world around us. Reprogramming the RAS changes what you notice, pursue, and ultimately create.
                            </div>
                        </div>
                    </div>
                    <div className={styles.researchItem}>
                        <div className={styles.researchIcon}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                            </svg>
                        </div>
                        <div>
                            <div className={styles.researchTitle}>Self-Affirmation &amp; Voice Recognition (Psychological Science)</div>
                            <div className={styles.researchBody}>
                                Studies show that self-affirmations heard in one&apos;s own voice activate the ventromedial prefrontal cortex — the brain&apos;s self-relevance and positive valuation center — substantially more than the same content heard in another voice. Your voice is uniquely trusted by your own nervous system.
                            </div>
                        </div>
                    </div>
                    <div className={styles.researchItem}>
                        <div className={styles.researchIcon}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg>
                        </div>
                        <div>
                            <div className={styles.researchTitle}>Theta Wave Receptivity &amp; Sleep Architecture</div>
                            <div className={styles.researchBody}>
                                Research on sleep architecture confirms that the hypnagogic and hypnopompic states are associated with elevated theta wave activity — a measurable period of heightened neurological receptivity, memory consolidation, and openness to new belief formation. These windows are neurologically distinct from normal waking consciousness.
                            </div>
                        </div>
                    </div>
                    <div className={styles.researchItem}>
                        <div className={styles.researchIcon}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                            </svg>
                        </div>
                        <div>
                            <div className={styles.researchTitle}>Electromagnetic Coherence &amp; Emotion (HeartMath Institute)</div>
                            <div className={styles.researchBody}>
                                The HeartMath Institute has published peer-reviewed research showing that the human heart generates a measurable electromagnetic field that extends beyond the body and changes significantly based on emotional state. Coherent, positive emotional states produce a fundamentally different signal than incoherent states — providing a biophysical basis for the role of emotion in the practice.
                            </div>
                        </div>
                    </div>
                    <div className={styles.researchItem}>
                        <div className={styles.researchIcon}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polyline points="12 6 12 12 16 14" />
                            </svg>
                        </div>
                        <div>
                            <div className={styles.researchTitle}>NLP &amp; Identity-Level Change (Dilts&apos; Neurological Levels)</div>
                            <div className={styles.researchBody}>
                                Robert Dilts&apos; neurological levels model demonstrates that change is most durable when it occurs at the identity level — not at the level of behavior or environment. Identity beliefs drive values, which drive behavior, which produce results. ManifestMyStory targets the identity level directly through deliberate story architecture.
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.sectionRule}>
                <hr />
            </div>

            {/* BRIDGE TO MYSTICAL PAGE */}
            <div className={styles.section}>
                <div className={styles.bridgeBanner}>
                    <div className={styles.bridgeEyebrow}>Ancient Wisdom &middot; Modern Method</div>
                    <h2 className={styles.bridgeTitle}>
                        This isn&apos;t new.<br />
                        <em>The mystics knew it first.</em>
                    </h2>
                    <p className={styles.bridgeBody}>
                        For thousands of years — across Hindu, Buddhist, Stoic, Kabbalistic, and Sufi traditions — human beings practiced the art of holding a vision so completely it became more real than the present moment. Neuroscience now has names for what they were doing. But they discovered it first.
                    </p>
                    <Link href="/mystical" className={styles.bridgeCta}>
                        Explore the spiritual connection &rarr;
                    </Link>
                </div>
            </div>

            {/* FINAL CTA */}
            <div className={styles.finalCta}>
                <h2 className={styles.finalCtaTitle}>
                    Ready to program your<br />
                    <em>brain for your future?</em>
                </h2>
                <p className={styles.finalCtaSub}>
                    Your manifestation story takes 15 minutes to create and a lifetime to benefit from. Begin with your goals — the science does the rest.
                </p>
                <Link href="/user/goal-intake-ai" className={styles.finalCtaBtn}>
                    Create My Story — It&apos;s Free
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15" style={{ marginLeft: '10px' }}>
                        <polyline points="9 18 15 12 9 6" />
                    </svg>
                </Link>
            </div>

            <footer className={styles.footer}>
                <p>
                    &copy; 2026 ManifestMyStory &middot; <a href="#">Privacy</a> &middot; <a href="#">Terms</a> &middot; <Link href="/">Home</Link> &middot; <Link href="/mystical">The Ancient Side</Link>
                </p>
            </footer>
        </div>
    );
}
