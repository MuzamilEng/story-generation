'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import styles from '../styles/PremiumExploration.module.css';

export default function SciencePage() {
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add(styles.revealVisible);
      });
    }, { threshold: 0.08 });
    document.querySelectorAll(`.${styles.reveal}`).forEach(r => observer.observe(r));
    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.mainContainer}>
      <Header />
      <Sidebar isLandingPage />

      {/* HERO */}
      <section className={styles.hero}>
        <svg className={styles.heroGeo} viewBox="0 0 520 520" fill="none">
          <circle cx="260" cy="260" r="245" stroke="#1A2A1F" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
          <circle cx="260" cy="260" r="228" stroke="#0C140F" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
          <circle cx="260" cy="260" r="162" stroke="#3D6B4A" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          <path d="M260 98 Q300 98 335 125 M260 98 Q220 98 185 125" stroke="#5A9968" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          <path d="M260 422 Q300 422 335 395 M260 422 Q220 422 185 395" stroke="#5A9968" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          <circle cx="260" cy="260" r="82" stroke="#8DBF7A" strokeWidth="0.4" opacity="0.4" vectorEffect="non-scaling-stroke" />
        </svg>

        <p className={styles.heroEyebrow}>THE BIOLOGY OF BELIEF</p>
        <div className={styles.heroBadge}>NEUROSCIENCE · PSYCHOLOGY · REWIRING</div>
        <h1 className={styles.heroH1}>
          You are not just imagining your future.<br />
          <span className={styles.accent}>You are physically rewiring<br />your brain to create it.</span>
        </h1>
        <p className={styles.heroSub}>
          Manifesting is often dismissed as mystical. But behind the practice lies a precise neurological mechanism. Your brain is a filtering machine, and through specific, repeated practice, you can change what it allows you to see, hear, and experience.
        </p>
        <div className={styles.heroActions}>
          <Link href="/user/goal-intake-ai" className={styles.btnPrimary}>BEGIN MY STORY — FREE</Link>
          <Link href="/mystical" className={styles.btnGhost}>ANCIENT WISDOM →</Link>
        </div>
        <p className={styles.heroProof}>RAS · THETA WAVES · NEURAL COUPLING · HEBBIAN LEARNING</p>
      </section>

      {/* DIVIDER */}
      <div className={styles.dividerWrap}>
        <div className={styles.dividerLine}></div>
        <div className={styles.dividerMark}>
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <circle cx="15" cy="15" r="13" stroke="#1A2A1F" strokeWidth="0.7" vectorEffect="non-scaling-stroke" />
            <path d="M15 6V24M6 15H24" stroke="#3D6B4A" strokeWidth="0.5" />
            <circle cx="15" cy="15" r="4" fill="#8DBF7A" opacity="0.2" />
            <circle cx="15" cy="15" r="1.5" fill="#C9A84C" />
          </svg>
        </div>
        <div className={styles.dividerLine}></div>
      </div>

      {/* SECTION 1 — THE RAS */}
      <section className={styles.pageSection}>
        <div className={`${styles.inner} ${styles.reveal}`}>
          <span className={styles.sectionLabel}>The Core Mechanism</span>
          <h2 className={styles.sectionH2}>The Reticular Activating System: <span className={styles.accent}>Your Brain&apos;s Filter.</span></h2>
          <p className={styles.sectionBody}>At any given second, your brain is bombarded by millions of bits of data. If you processed all of it, you would cease to function. To survive, your brain uses a filter called the Reticular Activating System (RAS).</p>
          <p className={styles.sectionBody}>The RAS determines what data makes it to your conscious mind and what gets discarded. It looks for what you have programmed it to find. If you think the world is a dangerous place, your RAS will find every piece of evidence to prove you right. If you program it with a specific vision of success, it begins surfacing the opportunities, people, and resources you previously would have walked right past.</p>

          <div className={styles.mechanismGrid}>
            <div className={styles.mechanismCard}>
              <span className={styles.mechanismNum}>01</span>
              <h3 className={styles.mechanismTitle}>The <span className={styles.accent}>Selective</span> Filter</h3>
              <p className={styles.mechanismBody}>The RAS is why you suddenly see your specific car everywhere after you buy it. The car was always there; your brain simply wasn&apos;t letting the data through. Manifesting is the process of intentionally choosing what car you want the brain to find.</p>
              <div className={styles.mechanismApply}>
                <span className={styles.mechanismApplyLabel}>HOW MANIFESTMYSTORY APPLIES THIS</span>
                By describing your vision in high-definition sensory detail, you give the RAS a precise &quot;search term&quot; to look for in the real world.
              </div>
            </div>
            <div className={styles.mechanismCard}>
              <span className={styles.mechanismNum}>02</span>
              <h3 className={styles.mechanismTitle}>Confirmation <span className={styles.accent}>Bias</span></h3>
              <p className={styles.mechanismBody}>The brain seeks to be right. Once the RAS is programmed, it forces focus on details that confirm your new identity. You don&apos;t just think differently; you literally observe a different world because your filter has changed.</p>
              <div className={styles.mechanismApply}>
                <span className={styles.mechanismApplyLabel}>HOW MANIFESTMYSTORY APPLIES THIS</span>
                First-person, present-tense narratives trick the RAS into believing the vision is already your reality, accelerating the filter shift.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2 — THETA STATE */}
      <section className={styles.pageSection}>
        <div className={`${styles.inner} ${styles.reveal}`}>
          <span className={styles.sectionLabel}>The Delivery Mechanism</span>
          <h2 className={styles.sectionH2}>The Theta Threshold: <span className={styles.accent}>Direct Access to the Subconscious.</span></h2>
          <p className={styles.sectionBody}>The biggest obstacle to change is the Critical Analytical Mind — the part of your brain that rejects new ideas that don&apos;t match your current reality. To bypass it, we must deliver information when that filter is down.</p>
          <p className={styles.sectionBody}>This happens during the Theta state. Theta is the brainwave frequency (4-8Hz) of deep relaxation, meditation, and the &quot;hypnagogic&quot; state just before sleep and just after waking. In Theta, the subconscious is wide open and highly suggestible. New beliefs can be planted without the conscious mind arguing back.</p>

          <div className={styles.brainStates}>
            <div className={styles.brainState}>
              <span className={styles.stateWave}>β</span>
              <span className={styles.stateName}>BETA</span>
              <span className={styles.stateHz}>13-30 Hz</span>
              <p className={styles.stateBody}>Normal waking state. Analytical, critical, focused on the external world.</p>
            </div>
            <div className={styles.brainState}>
              <span className={styles.stateWave}>α</span>
              <span className={styles.stateName}>ALPHA</span>
              <span className={styles.stateHz}>8-13 Hz</span>
              <p className={styles.stateBody}>Light relaxation. Gateway to the inner world. Flow states.</p>
            </div>
            <div className={styles.brainState} style={{ background: '#0A110C' }}>
              <span className={`${styles.stateWave} ${styles.activeWave}`}>θ</span>
              <span className={`${styles.stateName} ${styles.activeName}`}>THETA</span>
              <span className={styles.stateHz}>4-8 Hz</span>
              <p className={`${styles.stateBody} ${styles.activeBody}`}>Deep relaxation, REM, hypnagogic state. Subconscious is open to change.</p>
              <span className={styles.stateBadge}>OUR WINDOW</span>
            </div>
            <div className={styles.brainState}>
              <span className={styles.stateWave}>δ</span>
              <span className={styles.stateName}>DELTA</span>
              <span className={styles.stateHz}>0.5-4 Hz</span>
              <p className={styles.stateBody}>Deep, dreamless sleep. Physical healing and regeneration.</p>
            </div>
          </div>

          <div className={styles.mechanismCardFull}>
            <h3 className={styles.newTitle}>Why hearing it twice a day <span className={styles.accent}>works.</span></h3>
            <p className={styles.newBody}>By listening to your story in the morning and evening, you are delivering your new programming at the exact moments your brain transitions through the Theta state. This is why our system doesn&apos;t just ask you to read; it asks you to listen during the bookends of your day.</p>
          </div>
        </div>
      </section>

      {/* SECTION 3 — THE VOICE */}
      <section className={styles.pageSection}>
        <div className={`${styles.inner} ${styles.reveal}`}>
          <span className={styles.sectionLabel}>The Power of You</span>
          <h2 className={styles.sectionH2}>The Voice Effect: <span className={styles.accent}>Why your own voice is the key.</span></h2>
          <p className={styles.sectionBody}>Research into &quot;Self-Concept Activation&quot; shows that your brain responds to your own voice differently than to any other sound. When you hear another person speak, your brain processes it as external information. When you hear YOUR voice, the brain processes it as internal truth.</p>
          <p className={styles.sectionBody}>Hearing your goals described as a present reality in your own cloned voice triggers a phenomenon called Neural Coupling. Your brain literally cannot tell the difference between the memory of a real success and the vivid narration of a future success in your voice. To your nervous system, it becomes a memory of the future.</p>

          <div className={styles.voiceCard}>
            <div className={styles.voiceStats}>
              <div className={styles.voiceStat}>
                <span className={styles.voiceStatNum}>3x</span>
                <span className={styles.voiceStatLabel}>Higher retention<br />for self-voice data</span>
              </div>
              <div className={styles.voiceStat}>
                <span className={styles.voiceStatNum}>85%</span>
                <span className={styles.voiceStatLabel}>Lower subconscious<br />resistance</span>
              </div>
              <div className={styles.voiceStat}>
                <span className={styles.voiceStatNum}>01</span>
                <span className={styles.voiceStatLabel}>Most trusted signal<br />to your nervous system</span>
              </div>
            </div>
            <p className={styles.sectionBody} style={{ fontSize: '13px', textAlign: 'center', marginBottom: 0 }}>Neuroscience shows that self-affirmation in one&apos;s own voice activates the reward centers of the brain far more than affirmations read or heard in a stranger&apos;s voice.</p>
          </div>
        </div>
      </section>

      {/* SECTION 4 — NLP */}
      <section className={styles.pageSection}>
        <div className={`${styles.inner} ${styles.reveal}`}>
          <span className={styles.sectionLabel}>Linguistic Precision</span>
          <h2 className={styles.sectionH2}>Language Patterns that <span className={styles.accent}>Hack Identity.</span></h2>
          <p className={styles.sectionBody}>We don&apos;t just write a story; we utilize specific NLP (Neuro-Linguistic Programming) techniques to ensure the brain accepts the new data without friction.</p>

          <div className={styles.nlpGrid}>
            <div className={styles.nlpCard}>
              <span className={styles.nlpName}>PATTERN 01</span>
              <h3 className={styles.nlpTitle}>Sensory Predicates</h3>
              <p className={styles.nlpBody}>We use &quot;see,&quot; &quot;hear,&quot; &quot;touch,&quot; and &quot;feel&quot; language to engage the entire cortex. A goal moves from an idea to a sensory experience.</p>
            </div>
            <div className={styles.nlpCard}>
              <span className={styles.nlpName}>PATTERN 02</span>
              <h3 className={styles.nlpTitle}>Temporal Shifting</h3>
              <p className={styles.nlpBody}>By writing in the first-person present tense (&quot;I am walking...&quot; rather than &quot;I will walk...&quot;), we remove the concept of time, making the goal a current truth.</p>
            </div>
            <div className={styles.nlpCard}>
              <span className={styles.nlpName}>PATTERN 03</span>
              <h3 className={styles.nlpTitle}>Identity Bridges</h3>
              <p className={styles.nlpBody}>We use your specific &quot;proof actions&quot; as markers. When you hear yourself doing the things you really do, the brain accepts the new success as part of that same reality.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 5 — HEBBIAN LEARNING */}
      <section className={styles.pageSection}>
        <div className={`${styles.inner} ${styles.reveal}`}>
          <span className={styles.sectionLabel}>The Final Result</span>
          <h2 className={styles.sectionH2}>Neurons that fire together, <span className={styles.accent}>wire together.</span></h2>
          <p className={styles.sectionBody}>This is Hebb&apos;s Law, the foundation of neuroplasticity. Every time you listen to your story, you are firing a specific sequence of neurons — the ones associated with your desired identity and actions. Repeated enough times, these firing patterns become permanent physical pathways in the brain.</p>

          <div className={styles.stepsList}>
            <div className={styles.stepItem}>
              <span className={styles.stepNumLg}>01</span>
              <div>
                <h3 className={styles.stepContentTitle}>Neural <span className={styles.accent}>Firing</span></h3>
                <p className={styles.stepContentBody}>Listening once triggers the neural sequence. It&apos;s a temporary electrical event.</p>
                <span className={styles.stepScienceTag}>Potential State</span>
              </div>
            </div>
            <div className={styles.stepItem}>
              <span className={styles.stepNumLg}>02</span>
              <div>
                <h3 className={styles.stepContentTitle}>Long-Term Potential (<span className={styles.accent}>LTP</span>)</h3>
                <p className={styles.stepContentBody}>Repeated listening strengthens the synapses between these neurons. They become more likely to fire again.</p>
                <span className={styles.stepScienceTag}>Strengthening State</span>
              </div>
            </div>
            <div className={styles.stepItem}>
              <span className={styles.stepNumLg}>03</span>
              <div>
                <h3 className={styles.stepContentTitle}>Physical <span className={styles.accent}>Rewiring</span></h3>
                <p className={styles.stepContentBody}>Myelination occurs. Your brain builds a physical &quot;superhighway&quot; for your new identity. Success becomes your new default setting.</p>
                <span className={styles.stepScienceTag}>Fixed State</span>
              </div>
            </div>
          </div>

          <div className={styles.quoteBlock}>
            <p className={styles.quoteText}>&quot;The brain cannot distinguish between a real event and one that is vividly imagined in the first person with emotional engagement.&quot;</p>
            <p className={styles.quoteAttr}>— DR. JOE DISPENZA, NEUROSCIENCE RESEARCHER</p>
          </div>
        </div>
      </section>

      {/* CONVERGENCE */}
      <section className={styles.pageSection} style={{ borderTop: 'none' }}>
        <div className={`${styles.inner} ${styles.reveal}`}>
          <div className={styles.convergence}>
            <span className={styles.convergenceLabel}>THE INTERSECTION OF ALL PATHS</span>
            <h2 className={styles.convergenceH}>Whether you come through science,<br />tradition, or the quantum field —<br />the destination is <span className={styles.accent}>the same.</span></h2>
            <p className={styles.convergenceBody}>ManifestMyStory is the bridge between these worlds. Ancient intention. Modern precision. Your voice. Wherever you begin, the practice leads to the same place — the life you are building, heard every day in the voice you already trust completely.</p>
            <div className={styles.threePaths}>
              <Link href="/science" className={`${styles.pathCard} ${styles.active}`}>
                <span className={`${styles.pathIcon} ${styles.activeIcon}`}>THE SCIENCE</span>
                <div className={styles.pathTitle}>The Biology of Belief</div>
                <p className={styles.pathBody}>Neuroplasticity, the RAS, theta brain waves, neural coupling, and the neuroscience of why this practice rewires the brain.</p>
              </Link>
              <Link href="/quantum" className={styles.pathCard}>
                <span className={styles.pathIcon}>THE QUANTUM FIELD</span>
                <div className={styles.pathTitle}>The Physics of Possibility</div>
                <p className={styles.pathBody}>Observer effect, quantum resonance, and the mechanics of collapsing potential into physical reality.</p>
              </Link>
              <Link href="/mystical" className={styles.pathCard}>
                <span className={styles.pathIcon}>ANCIENT WISDOM & SPIRITUALITY</span>
                <div className={styles.pathTitle}>What Ancient Traditions Practiced</div>
                <p className={styles.pathBody}>Five thousand years of mystical practice, across every culture, all pointing to the same truth.</p>
              </Link>
            </div>
            <Link href="/user/goal-intake-ai" className={styles.btnPrimary}>BEGIN MY STORY — FREE →</Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <span className={styles.footerLogo}>MANIFEST MY STORY</span>
        <ul className={styles.footerLinks}>
          <li><Link href="/">HOME</Link></li>
          <li><Link href="/science">THE SCIENCE</Link></li>
          <li><Link href="/quantum">THE QUANTUM FIELD</Link></li>
          <li><Link href="/mystical">ANCIENT WISDOM</Link></li>
          <li><Link href="/#pricing">PRICING</Link></li>
        </ul>
        <span className={styles.footerTagline}>Your future is already speaking. We help you listen.</span>
      </footer>
    </div>
  );
}