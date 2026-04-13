'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import PublicNav from '../components/PublicNav';
import styles from '../styles/PremiumExploration.module.css';

export default function QuantumPage() {
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
      <PublicNav />

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

        <p className={styles.heroEyebrow}>THE PHYSICS OF POSSIBILITY</p>
        <div className={styles.heroBadge}>QUANTUM FIELD · OBSERVER EFFECT · ENTANGLEMENT</div>
        <h1 className={styles.heroH1}>
          Reality is not solid.<br />
          <span className={styles.accent}>It is a field of potentiality<br />waiting for your focus.</span>
        </h1>
        <p className={styles.heroSub}>
          At the subatomic level, matter does not exist as &quot;things&quot; but as waves of probability. Quantum physics has shown that the act of observation — the focused attention of the conscious mind — is the mechanism that collapses these waves into physical experience.
        </p>
        <div className={styles.heroActions}>
          <Link href="/user/goal-intake-ai" className={styles.btnPrimary}>BEGIN MY STORY — FREE</Link>
          <Link href="/mystical" className={styles.btnGhost}>ANCIENT WISDOM →</Link>
        </div>
        <p className={styles.heroProof}>WAVE COLLAPSE · RESONANCE · SUPERPOSITION · FIELD THEORY</p>
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

      {/* SECTION 1 — POTENTIALITY */}
      <section className={styles.pageSection}>
        <div className={`${styles.inner} ${styles.reveal}`}>
          <span className={styles.sectionLabel}>The Nature of Reality</span>
          <h2 className={styles.sectionH2}>Everything exists in <span className={styles.accent}>Superposition.</span></h2>
          <p className={styles.sectionBody}>In quantum mechanics, particles can exist in multiple states simultaneously until they are measured. This is known as superposition. Every version of your future — the one where you achieve your vision and the one where nothing changes — currently exists as a wave of probability in the quantum field.</p>
          <p className={styles.sectionBody}>Manifesting is not making something happen; it is the process of selecting the specific probability that you wish to experience. The field already contains the &quot;you&quot; who has succeeded. Your vision is the coordinate that identifies it.</p>

          <div className={styles.mechanismCardFull}>
            <h3 className={styles.newTitle}>The <span className={styles.accent}>Quantum</span> Choice.</h3>
            <p className={styles.newBody}>By returning to your story every day, you are repeatedly &quot;measuring&quot; the same potentiality. You are signaling to the quantum field which version of reality you are aligned with, gradually shifting the probability of its occurrence into physical manifestation.</p>
          </div>
        </div>
      </section>

      {/* SECTION 2 — THE OBSERVER */}
      <section className={styles.pageSection}>
        <div className={`${styles.inner} ${styles.reveal}`}>
          <span className={styles.sectionLabel}>The Human Influence</span>
          <h2 className={styles.sectionH2}>The Observer Effect: <span className={styles.accent}>Thought is a Measurement.</span></h2>
          <p className={styles.sectionBody}>The famous Double-Slit Experiment proved that subatomic particles behave like waves of potential — until they are observed. Under observation, they instantly collapse into physical &quot;particles&quot; in a fixed position. The observer was not separate from the experiment; their focus was the determining factor.</p>
          <p className={styles.sectionBody}>Your conscious focus is a continuous act of quantum measurement. When you focus on lack, the field collapses into more of the same. When you use your ManifestMyStory narrative to hold a vivid, felt experience of success, your focus begins to collapse those waves into your lived reality.</p>

          <div className={styles.twoCol}>
            <div className={styles.colCard}>
              <span className={styles.colLabel}>THE WAVE STATE</span>
              <h3 className={styles.colTitle}>Undefined Potential</h3>
              <p className={styles.colBody}>At this level, reality is fluid, non-local, and contains every possibility for your life simultaneously.</p>
            </div>
            <div className={`${styles.colCard} ${styles.goldCard}`}>
              <span className={styles.colLabel}>THE PARTICLE STATE</span>
              <h3 className={styles.colTitle}>Defined Reality</h3>
              <p className={styles.colBody}>Through the act of observation (focus), potential collapses into fixed physical form and experience.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — ENTANGLEMENT */}
      <section className={styles.pageSection}>
        <div className={`${styles.inner} ${styles.reveal}`}>
          <span className={styles.sectionLabel}>Quantum Connection</span>
          <h2 className={styles.sectionH2}>Entanglement & Resonance: <span className={styles.accent}>Beyond Space and Time.</span></h2>
          <p className={styles.sectionBody}>Quantum entanglement shows that particles that have once interacted remain &quot;entangled&quot; — even across vast distances, a change in one instantly affects the other. This implies an underlying field of connection where nothing is truly separate.</p>
          <p className={styles.sectionBody}>When you deeply inhabit your vision, you are creating a resonance with the &quot;you&quot; in the quantum field who is already living it. Your current self and your future self become entangled. This resonance begins drawing relevant people, opportunities, and &quot;synchronicities&quot; toward you that are of the same frequency as your vision.</p>

          <div className={styles.mechanismGrid}>
            <div className={styles.mechanismCard}>
              <span className={styles.mechanismNum}>01</span>
              <h3 className={styles.mechanismTitle}>Coherent <span className={styles.accent}>Focus</span></h3>
              <p className={styles.mechanismBody}>Quantum coherence is the state where waves are in perfect synchronization. A focused narrative in your own voice creates internal coherence, a clear signal that the field can respond to.</p>
              <p className={styles.mechanismBody}>The emotional inflection of the AI-enhanced voice clone amplifies coherence further. A narrative delivered without emotional precision creates information — a signal the field receives weakly. A narrative delivered with the exact emotional tone of the reality it describes creates resonance — a signal the field responds to with force. Quantum coherence is not achieved by thinking clearly about the future. It is achieved by feeling it as already present. The voice that delivers that feeling with precision is not incidental to the system. It is the system.</p>
            </div>
            <div className={styles.mechanismCard}>
              <span className={styles.mechanismNum}>02</span>
              <h3 className={styles.mechanismTitle}>Non-Local <span className={styles.accent}>Change</span></h3>
              <p className={styles.mechanismBody}>Because the field is non-local, changes you make in your internal state ripple out to the external world, manifesting in ways you could not have planned or forced through effort alone.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — FREQUENCY */}
      <section className={styles.pageSection}>
        <div className={`${styles.inner} ${styles.reveal}`}>
          <span className={styles.sectionLabel}>The Law of Vibration</span>
          <h2 className={styles.sectionH2}>Nothing rests. Everything moves. <span className={styles.accent}>Everything vibrates.</span></h2>
          <p className={styles.sectionBody}>The principle is old, and quantum physics has proven it true: matter is 99.9999% empty space — fields of energy vibrating at different frequencies. What we perceive as &quot;solid&quot; is actually vibrational resonance.</p>
          <p className={styles.sectionBody}>Your voice is a physical vibration. By using your own voice to narrate your future as already real, you are literally &quot;tuning&quot; your internal field to the frequency of that reality. You aren&apos;t just hoping it comes true; you are becoming the vibrational match for it today.</p>
          <p className={styles.sectionBody}>The six layers of ManifestMyStory are each calibrated to a different dimension of that alignment. The induction tunes the brain to theta — the frequency at which the field is most receptive. The story programs the field with a vivid, emotionally precise signal. The emotional inflection of the voice clone amplifies that signal with feeling, because feeling is the language the field responds to most powerfully. The NLP anchor trains the body to hold the resonance physically. The binaural beats sustain the state from start to finish. And the identity affirmations close the session with a declaration the subconscious accepts as already true. Together, they do not just describe the desired frequency. They become it.</p>

          <div className={styles.vibrationCard}>
            <div className={styles.voiceStats}>
              <div className={styles.voiceStat}>
                <span className={styles.voiceStatNum} style={{ color: 'var(--gold)' }}>f</span>
                <span className={styles.voiceStatLabel}>Frequency<br />of Intention</span>
              </div>
              <div className={styles.voiceStat}>
                <span className={styles.voiceStatNum} style={{ color: 'var(--gold)' }}>R</span>
                <span className={styles.voiceStatLabel}>Resonance<br />Adjustment</span>
              </div>
              <div className={styles.voiceStat}>
                <span className={styles.voiceStatNum} style={{ color: 'var(--gold)' }}>ψ</span>
                <span className={styles.voiceStatLabel}>Wave Function<br />Collapse</span>
              </div>
            </div>
            <p className={styles.sectionBody} style={{ fontSize: '13px', textAlign: 'center', marginBottom: 0 }}>ManifestMyStory uses your voice to emit the specific frequency of your desired reality, collapsing the potentiality into manifest form.</p>
          </div>
        </div>
      </section>

      {/* CONVERGENCE */}
      <section className={styles.pageSection} style={{ borderTop: 'none' }}>
        <div className={`${styles.inner} ${styles.reveal}`}>
          <div className={styles.convergence}>
            <span className={styles.convergenceLabel}>THE INTERSECTION OF ALL PATHS</span>
            <h2 className={styles.convergenceH}>Whether you come through science,<br />tradition, or the quantum field —<br />the destination is <span className={styles.accent}>the same.</span></h2>
            <p className={styles.convergenceBody}>ManifestMyStory is the bridge between these worlds. Ancient intention. Modern precision. Your voice. Wherever you begin, the practice leads to the same place — delivered to you across six precisely engineered layers, in the only voice your subconscious accepts without resistance.</p>
            <div className={styles.threePaths}>
              <Link href="/science" className={styles.pathCard}>
                <span className={styles.pathIcon}>THE SCIENCE</span>
                <div className={styles.pathTitle}>The Biology of Belief</div>
                <p className={styles.pathBody}>Neuroplasticity, the RAS, theta brain waves, neural coupling, and the neuroscience of why this practice rewires the brain.</p>
              </Link>
              <Link href="/quantum" className={`${styles.pathCard} ${styles.active}`}>
                <span className={`${styles.pathIcon} ${styles.activeIcon}`}>THE QUANTUM FIELD</span>
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
