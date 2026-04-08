'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import styles from '../styles/PremiumExploration.module.css';

export default function MysticalPage() {
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
          <circle cx="260" cy="260" r="245" stroke="#2A3D2F" strokeWidth="0.8" vectorEffect="non-scaling-stroke"/>
          <circle cx="260" cy="260" r="228" stroke="#1A2A1F" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
          <circle cx="260" cy="167" r="167" stroke="#3D6B4A" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
          <circle cx="260" cy="353" r="167" stroke="#3D6B4A" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
          <circle cx="404.7" cy="218" r="167" stroke="#3D6B4A" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
          <circle cx="115.3" cy="218" r="167" stroke="#3D6B4A" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
          <circle cx="404.7" cy="302" r="167" stroke="#3D6B4A" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
          <circle cx="115.3" cy="302" r="167" stroke="#3D6B4A" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
          <circle cx="260" cy="260" r="167" stroke="#5A9968" strokeWidth="0.8" vectorEffect="non-scaling-stroke"/>
          <line x1="260" y1="298" x2="260" y2="240" stroke="#4A8038" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M260 268 Q242 258 236 242 Q248 242 257 254 Z" fill="#4A8038"/>
          <path d="M260 268 Q278 258 284 242 Q272 242 263 254 Z" fill="#6AAB54"/>
          <path d="M260 248 Q254 232 256 222 Q264 230 262 246 Z" fill="#8DBF7A"/>
        </svg>

        <p className={styles.heroEyebrow}>ANCIENT WISDOM & SPIRITUALITY</p>
        <div className={styles.heroBadge}>TRADITION · INTENTION · UNIVERSAL LAW</div>
        <h1 className={styles.heroH1}>
          What ancient traditions practiced,<br />
          <span className={styles.accent}>science is only now beginning<br />to prove.</span>
        </h1>
        <p className={styles.heroSub}>For thousands of years, across every culture and tradition, human beings practiced the art of intention — using the mind to shape reality. They didn&apos;t have neuroscience. They had something else: direct experience of what happens when a person truly, deeply, repeatedly holds a vision of their desired future as already real.</p>
        <div className={styles.heroActions}>
          <Link href="/user/goal-intake-ai" className={styles.btnPrimary}>BEGIN MY STORY — FREE</Link>
          <Link href="/science" className={styles.btnGhost}>READ THE SCIENCE →</Link>
        </div>
        <p className={styles.heroProof}>AS WITHIN · SO WITHOUT · AS ABOVE · SO BELOW</p>
      </section>

      {/* DIVIDER */}
      <div className={styles.dividerWrap}>
        <div className={styles.dividerLine}></div>
        <div className={styles.dividerMark}>
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <circle cx="15" cy="15" r="13" stroke="#2A3D2F" strokeWidth="0.7" vectorEffect="non-scaling-stroke"/>
            <circle cx="15" cy="9.5" r="8.5" stroke="#3D6B4A" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
            <circle cx="15" cy="20.5" r="8.5" stroke="#3D6B4A" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
            <circle cx="22.4" cy="12.2" r="8.5" stroke="#3D6B4A" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
            <circle cx="7.6" cy="12.2" r="8.5" stroke="#3D6B4A" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
            <circle cx="22.4" cy="17.8" r="8.5" stroke="#3D6B4A" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
            <circle cx="7.6" cy="17.8" r="8.5" stroke="#3D6B4A" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
            <circle cx="15" cy="15" r="8.5" stroke="#5A9968" strokeWidth="0.7" vectorEffect="non-scaling-stroke"/>
            <line x1="15" y1="19" x2="15" y2="12.5" stroke="#4A8038" strokeWidth="1" strokeLinecap="round"/>
            <path d="M15 16 Q12 14.5 11 12 Q13.5 12 14.5 14.5 Z" fill="#4A8038"/>
            <path d="M15 16 Q18 14.5 19 12 Q16.5 12 15.5 14.5 Z" fill="#6AAB54"/>
            <path d="M15 13 Q13.5 10.5 14 9 Q16.5 10.5 16 13 Z" fill="#8DBF7A"/>
          </svg>
        </div>
        <div className={styles.dividerLine}></div>
      </div>

      {/* EVERY TRADITION */}
      <section className={styles.pageSection} id="tradition">
        <div className={`${styles.inner} ${styles.reveal}`}>
          <span className={styles.sectionLabel}>A Practice as Old as Humanity</span>
          <h2 className={styles.sectionH2}>Every great tradition has known <span className={styles.accent}>this.</span></h2>
          <p className={styles.sectionBody}>The practice at the heart of ManifestMyStory is not new. It has been called many things across time and culture — prayer, visualization, intention-setting, mental rehearsal, creative imagination, the law of assumption, scripting. The language has changed. The practice has not.</p>
          <p className={styles.sectionBody}>Across every lineage and tradition, the same essential truth kept re-emerging: the mind that fully inhabits a vision, treats it as present, and returns to it with discipline — tends to draw that vision into being. For centuries this was understood as mystical. And then neuroscience arrived — and began confirming, with remarkable precision, what the mystics had always described.</p>

          <div className={styles.traditionGrid}>
            <div className={styles.traditionCard}>
              <span className={styles.traditionIcon}>𓂀</span>
              <span className={styles.traditionName}>ANCIENT EGYPT</span>
              <div className={styles.traditionTitle}>Sacred texts & ritual repetition</div>
              <p className={styles.traditionBody}>Sacred texts and ritual repetition were used to anchor desired realities in the mind. The Egyptians understood that repeated inner rehearsal of a future state was the mechanism through which intention became form.</p>
            </div>
            <div className={styles.traditionCard}>
              <span className={styles.traditionIcon}>☸</span>
              <span className={styles.traditionName}>HINDU & BUDDHIST</span>
              <div className={styles.traditionTitle}>Dharana — vivid, sustained visualization</div>
              <p className={styles.traditionBody}>Dharana — vivid, sustained visualization — was a core tool for transformation and liberation. Practitioners spent hours holding a precise inner image as a path to becoming what they envisioned.</p>
            </div>
            <div className={styles.traditionCard}>
              <span className={styles.traditionIcon}>Σ</span>
              <span className={styles.traditionName}>STOIC PHILOSOPHY</span>
              <div className={styles.traditionTitle}>Premeditatio — vivid mental rehearsal</div>
              <p className={styles.traditionBody}>The philosophers of ancient Greece and Rome practiced premeditatio — rehearsing outcomes vividly in the mind before they occurred. Marcus Aurelius and Seneca all described this as foundational.</p>
            </div>
            <div className={styles.traditionCard}>
              <span className={styles.traditionIcon}>✡</span>
              <span className={styles.traditionName}>KABBALISTIC TRADITION</span>
              <div className={styles.traditionTitle}>Dabar — the word that is also the thing</div>
              <p className={styles.traditionBody}>The Kabbalists described consciousness as the creative fabric of reality. The Hebrew word Dabar reflects their understanding that spoken intention and physical reality are not separate.</p>
            </div>
            <div className={styles.traditionCard}>
              <span className={styles.traditionIcon}>☽</span>
              <span className={styles.traditionName}>SUFI & MYSTICISM</span>
              <div className={styles.traditionTitle}>The longing that draws the desired</div>
              <p className={styles.traditionBody}>Sufi poets like Rumi described the longing of the inner self as the very force that draws the desired into being. &quot;What you seek is seeking you&quot; is a description of reality.</p>
            </div>
            <div className={styles.traditionCard}>
              <span className={styles.traditionIcon}>✝</span>
              <span className={styles.traditionName}>CHRISTIAN MYSTICISM</span>
              <div className={styles.traditionTitle}>The feeling of the wish fulfilled</div>
              <p className={styles.traditionBody}>Medieval mystics described holding a vision of the desired state as already received, not as hope, but as a present reality experienced inwardly first.</p>
            </div>
          </div>

          <div className={styles.quoteBlockGreen}>
            <div className={styles.quoteText}>&quot;Imagination is more important than knowledge. For knowledge is limited, whereas imagination embraces the entire world, stimulating progress, giving birth to evolution.&quot;</div>
            <div className={styles.quoteAttr}>— ALBERT EINSTEIN</div>
          </div>
        </div>
      </section>

      {/* EASTERN TRADITIONS */}
      <section className={styles.pageSection} id="eastern">
        <div className={`${styles.inner} ${styles.reveal}`}>
          <span className={styles.sectionLabel}>The Contemplative East</span>
          <h2 className={styles.sectionH2}>The Eastern traditions went <span className={styles.accent}>deepest of all.</span></h2>
          <p className={styles.sectionBody}>While every major tradition discovered the power of intentional inner practice, the Eastern contemplative traditions developed it with a precision and depth that is remarkable by any standard.</p>

          <div className={styles.easternGrid}>
            <div className={styles.easternCard}>
              <span className={styles.easternTag}>TIBETAN BUDDHISM</span>
              <span className={styles.easternTitle}>DEITY VISUALIZATION PRACTICE</span>
              <div className={styles.easternH}>Precision in the vision is the mechanism — not the aesthetic</div>
              <p className={styles.easternBody}>Tibetan monks spend years visualizing mandalas and enlightened states with extraordinary sensory precision — color, texture, light. A fully inhabited vision begins to reorganize consciousness.</p>
              <div className={styles.easternScience}>Neuroscience parallel: identical to submodality engineering — precision determines neural encoding strength</div>
            </div>
            <div className={styles.easternCard}>
              <span className={styles.easternTag}>HINDU YOGA TRADITION</span>
              <span className={styles.easternTitle}>YOGA NIDRA — YOGIC SLEEP</span>
              <div className={styles.easternH}>Delivering intention at the moment the subconscious is most open</div>
              <p className={styles.easternBody}>In this state, practitioners receive intentions called Sankalpa — heartfelt vows stated in the present tense — at the precise moment the subconscious is most open. Structural to our method.</p>
              <div className={styles.easternScience}>Neuroscience parallel: theta state practice — documented elevated receptivity at hypnagogic threshold</div>
            </div>
            <div className={styles.easternCard}>
              <span className={styles.easternTag}>HINDU & YOGA PHILOSOPHY</span>
              <span className={styles.easternTitle}>SANKALPA — THE HEARTFELT INTENTION</span>
              <div className={styles.easternH}>Not a wish for the future — a declaration of present reality</div>
              <p className={styles.easternBody}>Sankalpa is always stated in the present tense: &quot;I am whole.&quot; This is identical to how every ManifestMyStory narrative is written — first person, present tense, already done.</p>
              <div className={styles.easternScience}>Neuroscience parallel: present-tense language activates different neural patterns than future-tense aspiration</div>
            </div>
            <div className={styles.easternCard}>
              <span className={styles.easternTag}>ZEN BUDDHISM</span>
              <span className={styles.easternTitle}>MUSHIN — THE NATURAL STATE OF MASTERY</span>
              <div className={styles.easternH}>When identity and intention align, action becomes effortless</div>
              <p className={styles.easternBody}>Mushin describes the state of effortless action that emerges when identity shifted so completely that aligned action flows naturally, without resistance.</p>
              <div className={styles.easternScience}>Neuroscience parallel: identity-level change — behavior flows from identity, not from effort</div>
            </div>
          </div>
        </div>
      </section>

      {/* BRIDGE: WHERE THEY MEET */}
      <section className={styles.pageSection} id="bridge">
        <div className={`${styles.inner} ${styles.reveal}`}>
          <span className={styles.sectionLabel}>Where They Meet</span>
          <h2 className={styles.sectionH2}>The mystics were right. <span className={styles.accent}>Here is exactly why.</span></h2>
          <p className={styles.sectionBody}>The bridge between mysticism and neuroscience is not a compromise of either. It is a recognition that both were pointing at the same truth from different directions.</p>

          <div className={styles.bridgeGrid}>
            <div className={`${styles.bridgeCell} ${styles.header}`}><span className={`${styles.bridgeLabel} ${styles.mystic}`}>THE MYSTIC SAID</span></div>
            <div className={`${styles.bridgeCell} ${styles.header}`}><span className={`${styles.bridgeLabel} ${styles.neuro}`}>THE NEUROSCIENTIST SAYS</span></div>
            <div className={styles.bridgeCell}>
              <div className={styles.bridgeQuote}>As within, so without.</div>
              <p className={styles.bridgeBody}>What you hold in consciousness with feeling and discipline becomes the reality you inhabit.</p>
            </div>
            <div className={styles.bridgeCell}>
              <div className={styles.bridgeQuote}>The brain filters reality to match its dominant programming.</div>
              <p className={styles.bridgeBody}>The RAS surfaces what it has been trained to find. Change the programming to change what you create.</p>
            </div>
            <div className={styles.bridgeCell}>
              <div className={styles.bridgeQuote}>Assume the feeling of the wish fulfilled.</div>
              <p className={styles.bridgeBody}>Do not wish for the future. Inhabit it inwardly, completely, as if it is already so. — Neville Goddard</p>
            </div>
            <div className={styles.bridgeCell}>
              <div className={styles.bridgeQuote}>Vivid imagination activates the same neural pathways as real experience.</div>
              <p className={styles.bridgeBody}>The brain cannot reliably distinguish between a deeply inhabited vision and an actual memory.</p>
            </div>
          </div>
        </div>
      </section>

      {/* VIBRATION SECTION */}
      <section className={styles.pageSection}>
        <div className={`${styles.inner} ${styles.reveal}`}>
          <span className={styles.sectionLabel}>The Hermetic Principle</span>
          <h2 className={styles.sectionH2}>Nothing rests. Everything moves. <span className={styles.accent}>Everything vibrates.</span></h2>
          <p className={styles.sectionBody}>ManifestMyStory calibrates your most powerful vibrational instrument — your voice — to the frequency of your desired life. You are not sending a wish into the universe. You are becoming the tuning fork that calls it forward.</p>

          <div className={styles.vibrationCard}>
            <span className={styles.sectionLabel} style={{ marginBottom: '14px' }}>THE SEED OF LIFE AS VIBRATIONAL GEOMETRY</span>
            <h3 className={styles.sectionH2} style={{ fontSize: 'clamp(24px, 3vw, 38px)', marginBottom: '16px' }}>The geometry at the center of our mark is not decoration. <span className={styles.accent}>It is the expression of frequency.</span></h3>
            <p className={styles.sectionBody} style={{ marginBottom: 0 }}>The Seed of Life is the geometric expression of resonance and the emergence of form from pure pattern. The sprout at its center is the point at which vibrational potential becomes living reality.</p>
          </div>
        </div>
      </section>

      {/* FOUR PRINCIPLES */}
      <section className={styles.pageSection}>
        <div className={`${styles.inner} ${styles.reveal}`}>
          <span className={styles.sectionLabel}>Ancient Wisdom · Modern Confirmation</span>
          <h2 className={styles.sectionH2}>Four principles every tradition discovered — <span className={styles.accent}>and science confirmed.</span></h2>

          <div className={styles.principlesGrid}>
            <div className={styles.principleCard}>
              <span className={styles.principleNum}>01</span>
              <div className={styles.principleTitle}>The Law of Assumption</div>
              <span className={styles.principleSubtitle}>Inhabit the wish as already fulfilled</span>
              <p className={styles.principleBody}>Inhabit the feeling of your wish fulfilled completely, as if it is already done. The outer world must rearrange itself to reflect your inner state.</p>
              <span className={styles.principleConfirmLabel}>NEUROSCIENCE CONFIRMS</span>
              <div className={styles.principleConfirm}>Vividly imagined experiences activate the same neural pathways as real ones. Rewiring happens through first-person rehearsal.</div>
            </div>
            <div className={styles.principleCard}>
              <span className={styles.principleNum}>02</span>
              <div className={styles.principleTitle}>The Power of the Word</div>
              <span className={styles.principleSubtitle}>Your voice is the instrument of creation</span>
              <p className={styles.principleBody}>From Dabar to Mantra to sacred song — spoken words repeated with intention were understood to carry creative power across every culture.</p>
              <span className={styles.principleConfirmLabel}>NEUROSCIENCE CONFIRMS</span>
              <div className={styles.principleConfirm}>Hearing positive statements in your own voice activates self-relevance centers more powerfully than any other input.</div>
            </div>
            <div className={styles.principleCard}>
              <span className={styles.principleNum}>03</span>
              <div className={styles.principleTitle}>The Hypnagogic Gateway</div>
              <span className={styles.principleSubtitle}>The threshold between waking and sleep</span>
              <p className={styles.principleBody}>Identifying the threshold between waking and sleep as the most powerful time for inner work. The veil between conscious and subconscious is thinnest here.</p>
              <span className={styles.principleConfirmLabel}>NEUROSCIENCE CONFIRMS</span>
              <div className={styles.principleConfirm}>Elevated theta wave activity creates a measurable period of heightened neurological receptivity to new belief formation.</div>
            </div>
            <div className={styles.principleCard}>
              <span className={styles.principleNum}>04</span>
              <div className={styles.principleTitle}>Repetition as Ritual</div>
              <span className={styles.principleSubtitle}>A vision held once is a wish. Returned to daily, it becomes belief.</span>
              <p className={styles.principleBody}>Every tradition uses repetition — daily prayer, mantra, Zen return to the cushion. A vision returned to every day with feeling becomes lived reality.</p>
              <span className={styles.principleConfirmLabel}>NEUROSCIENCE CONFIRMS</span>
              <div className={styles.principleConfirm}>Neurons that fire together, wire together. Repeated rehearsal physically strengthens neural pathways and defaults.</div>
            </div>
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
              <Link href="/science" className={styles.pathCard}>
                <span className={styles.pathIcon}>THE SCIENCE</span>
                <div className={styles.pathTitle}>The Biology of Belief</div>
                <p className={styles.pathBody}>Neuroplasticity, the RAS, theta brain waves, neural coupling, and the neuroscience of why this practice rewires the brain.</p>
              </Link>
              <Link href="/quantum" className={styles.pathCard}>
                <span className={styles.pathIcon}>THE QUANTUM FIELD</span>
                <div className={styles.pathTitle}>The Physics of Possibility</div>
                <p className={styles.pathBody}>Observer effect, quantum resonance, and the mechanics of collapsing potential into physical reality.</p>
              </Link>
              <Link href="/mystical" className={`${styles.pathCard} ${styles.active}`}>
                <span className={`${styles.pathIcon} ${styles.activeIcon}`}>ANCIENT WISDOM & SPIRITUALITY</span>
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