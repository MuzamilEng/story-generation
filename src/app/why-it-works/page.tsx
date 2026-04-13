"use client";
import React from "react";
import Link from "next/link";
import s from "../styles/WhyItWorks.module.css";
import splash from "../styles/SplashV6.module.css";

// Local hook for scroll reveal
function useLocalScrollReveal() {
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(s.fadeInVisible);
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(`.${s.fadeIn}`).forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

export default function WhyItWorks() {
  useLocalScrollReveal();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const tabLink = (href: string, label: string, isMobile = false) => {
    const isCurrent = label === "Why it works";
    const baseClass = isMobile ? splash.mobileNavTabLink : splash.navTabLink;
    const activeClass = isMobile ? splash.mobileNavTabLinkActive : splash.navTabLinkActive;

    return (
      <li key={label}>
        {href.startsWith("/") ? (
          <Link 
            href={href} 
            className={`${baseClass} ${isCurrent ? activeClass : ""}`}
            onClick={() => isMobile && setIsMenuOpen(false)}
          >
            {label}
          </Link>
        ) : (
          <a 
            href={href} 
            className={`${baseClass} ${isCurrent ? activeClass : ""}`}
            onClick={() => isMobile && setIsMenuOpen(false)}
          >
            {label}
          </a>
        )}
      </li>
    );
  };

  return (
    <div className={s.container}>
      {/* NAV — SHARED WITH HOME */}
      <nav className={splash.nav}>
        <Link href="/" className={splash.navLogo}>Manifest My Story</Link>
        <ul className={splash.navTabs}>
          {tabLink("/#how", "How it works")}
          {tabLink("/#voice", "The voice")}
          {tabLink("/#features", "The science")}
          {tabLink("/why-it-works", "Why it works")}
          {tabLink("/our-story", "Our story")}
        </ul>
        <div className={splash.navRight}>
          <Link href="/auth/signin" className={splash.navSignIn}>Sign In</Link>
          <Link href="/#invite" className={splash.navInvite}>Request invitation</Link>
        </div>

        {/* Hamburger */}
        <button 
          className={splash.navMobileBtn} 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          )}
        </button>
      </nav>

      {/* MOBILE SIDEBAR */}
      <div 
        className={`${splash.mobileMenuOverlay} ${isMenuOpen ? splash.mobileMenuOverlayOpen : ""}`} 
        onClick={() => setIsMenuOpen(false)}
      />
      <div className={`${splash.mobileMenu} ${isMenuOpen ? splash.mobileMenuOpen : ""}`}>
        <ul className={splash.mobileNavTabs}>
          {tabLink("/#how", "How it works", true)}
          {tabLink("/#voice", "The voice", true)}
          {tabLink("/#features", "The science", true)}
          {tabLink("/why-it-works", "Why it works", true)}
          {tabLink("/our-story", "Our story", true)}
        </ul>
        <div className={splash.mobileNavRight}>
          <Link href="/auth/signin" className={splash.mobileNavSignIn} onClick={() => setIsMenuOpen(false)}>Sign In</Link>
          <Link href="/#invite" className={splash.mobileNavInvite} onClick={() => setIsMenuOpen(false)}>Request invitation</Link>
        </div>
      </div>

      {/* HERO */}
      <div className={s.hero}>
        <div className={s.heroGlow}></div>
        <div className={s.heroGlow2}></div>

        <div className={s.heroEyebrow}>Why it changes everything</div>
        <h1 className={s.heroHeadline}>Your voice is the key that opens the <em>subconscious door.</em></h1>
        <p className={s.heroSub}>Visualization exercises, guided meditations, and voice-recorded affirmations all have real value. But they share one ceiling — they reach the subconscious through a brain that may still be evaluating, filtering, and pushing back. ManifestMyStory was built around a different truth: the voice is not the differentiator. The architecture around it is.</p>

        <div className={s.heroStatement}>
          <div className={s.statementCell}>
            <span className={s.statementWord}>Induces</span>
            <p className={s.statementDesc}>Your own voice guides you into a deep hypnotic state — meeting your brain exactly at the threshold it is already crossing.</p>
          </div>
          <div className={s.statementCell}>
            <span className={s.statementWord}>Delivers</span>
            <p className={s.statementDesc}>With the critical mind disengaged, six precisely engineered layers reach the subconscious without resistance.</p>
          </div>
          <div className={s.statementCell}>
            <span className={s.statementWord}>Seals</span>
            <p className={s.statementDesc}>The last voice you hear before sleep is yours — declaring who you are becoming as if it is already decided.</p>
          </div>
        </div>

        <div className={s.heroCta}>
          <Link href="/auth/signup" className={s.ctaBtn}>Begin my story — free</Link>
          <a href="#the-science" className={s.ctaGhost}>Read the science ↓</a>
        </div>

        <div className={s.scrollHint}><div className={s.scrollLine}></div></div>
      </div>

      {/* THE NEUROLOGICAL TRUTH */}
      <div className={`${s.fullSection} ${s.bg2} ${s.fadeIn}`} id="the-science">
        <div className={s.fullSectionInner}>
          <div className={s.sectionEyebrow}>The neurological truth</div>
          <h2 className={s.sectionHeadline}>The voice is where it starts. The architecture is what makes it work.</h2>
          <p className={s.sectionBody}>Recording your own affirmations is a meaningful step. But an affirmation played back to a fully conscious, evaluating brain is one layer. ManifestMyStory is six — and the most important thing it does happens before your story even begins.</p>

          <div className={`${s.truthGrid} ${s.fadeIn} ${s.delay1}`}>
            <div className={s.truthCell}>
              <span className={s.truthLabel}>Existing practices — the ceiling they share</span>
              <h3 className={s.truthHeadline}>One layer, delivered to a brain that is still evaluating</h3>
              <p className={s.truthBody}>Visualization exercises build mental images. Guided meditations bring calm. Some apps even invite you to record your own affirmations and play them back. Each of these has genuine value — and each shares the same ceiling. They deliver their content to a brain that may still be in a conscious, evaluative state. When new beliefs conflict with existing self-image, the critical filter pushes back. The programming lands at the surface. It is stored as an idea rather than accepted as truth.</p>
            </div>
            <div className={`${s.truthCell} ${s.truthCellHighlight}`}>
              <span className={`${s.truthLabel} ${s.truthLabelGreen}`}>ManifestMyStory — a category that did not exist before</span>
              <h3 className={s.truthHeadline}>Six layers operating simultaneously — <em>opening the window first</em></h3>
              <p className={s.truthBody}>ManifestMyStory opens the theta window before the programming begins. By the time your voice delivers the story, the critical filter is already disengaged. What follows — the NLP-structured narrative, the emotional inflection, the physical anchor, the binaural beats, the identity affirmations — arrives in a subconscious that is fully receptive. The voice is not the differentiator. It is the architecture around the voice that makes this something that did not exist before.</p>
            </div>
          </div>
        </div>
      </div>

      {/* STAT ROW */}
      <div className={`${s.fullSection} ${s.fadeIn}`}>
        <div className={s.fullSectionInner}>
          <div className={s.statRow}>
            <div className={s.statCard}>
              <span className={s.statNum}>3×</span>
              <p className={s.statLabel}>Higher retention for self-voice data versus externally narrated content</p>
            </div>
            <div className={s.statCard}>
              <span className={s.statNum}>85%</span>
              <p className={s.statLabel}>Lower subconscious resistance when the voice is recognized as self</p>
            </div>
            <div className={s.statCard}>
              <span className={s.statNum}>01</span>
              <p className={s.statLabel}>Most trusted signal to your nervous system — your own voice, above all others</p>
            </div>
          </div>
        </div>
      </div>

      {/* THE THREE MOMENTS */}
      <div className={`${s.fullSection} ${s.bg2} ${s.fadeIn}`}>
        <div className={s.fullSectionInner}>
          <div className={s.sectionEyebrow}>What the subconscious hears</div>
          <h2 className={s.sectionHeadline}>The three moments of conversion.</h2>
          <div className={s.momentsGrid}>
            <div className={s.momentCard}>
              <div className={s.momentNum}>01</div>
              <span className={s.momentAction}>Induces</span>
              <h3 className={s.momentTitle}>The door <em>opens</em></h3>
              <p className={s.momentBody}>When the subconscious hears a familiar, trusted source, it does not raise its defenses. The induction walks the brain from alert beta down to theta — 4 to 8 Hz. The door opens before the story and its programming begin.</p>
            </div>
            <div className={s.momentCard}>
              <div className={s.momentNum}>02</div>
              <span className={s.momentAction}>Delivers</span>
              <h3 className={s.momentTitle}>The story <em>arrives</em></h3>
              <p className={s.momentBody}>With the subconscious fully open, all six layers work simultaneously. The story programs. The inflection makes it land. The anchor trains the body. The beats sustain the state. Together they create conditions for genuine change.</p>
            </div>
            <div className={s.momentCard}>
              <div className={s.momentNum}>03</div>
              <span className={s.momentAction}>Seals</span>
              <h3 className={s.momentTitle}>Identity <em>sets</em></h3>
              <p className={s.momentBody}>The last input the subconscious receives before sleep is not a goal. It is a statement of identity. Spoken at the threshold of sleep by the one voice it cannot argue with. The subconscious accepts it as already true.</p>
            </div>
          </div>
        </div>
      </div>

      {/* INFLECTION */}
      <div className={`${s.fullSection} ${s.fadeIn}`}>
        <div className={s.fullSectionInner}>
          <div className={s.inflectionWrap}>
            <div className={s.inflectionLeft}>
              <div className={s.sectionEyebrow}>Audio stack layer 3</div>
              <h2 className={s.sectionHeadline}>Emotional inflection. Precision at the speed of sound.</h2>
              <p className={s.sectionBody}>Your voice does not just read a script. It carries intention. Our architecture models the AI-enhanced clone to match the narrative intent of the scene — rising, softening, and grounding with clinical precision.</p>
            </div>
            <div className={s.inflectionRight}>
              <div className={s.inflectionItem}>
                <div className={s.inflectionMoment}>At moments of aspiration</div>
                <p className={s.inflectionDesc}>The voice <strong>rises</strong> — carrying the energy of possibility and certainty.</p>
              </div>
              <div className={s.inflectionItem}>
                <div className={s.inflectionMoment}>At moments of identity</div>
                <p className={s.inflectionDesc}>The voice <strong>grounds</strong> — speaking with settled authority. Not wishing. Declaring.</p>
              </div>
              <div className={s.inflectionItem}>
                <div className={s.inflectionMoment}>At moments of proof</div>
                <p className={s.inflectionDesc}>The voice <strong>confirms</strong> — narrating sensory evidence as a recalled memory.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* THE SIX LAYERS */}
      <div className={`${s.fullSection} ${s.bg2} ${s.fadeIn}`}>
        <div className={s.fullSectionInner}>
          <div className={s.sectionEyebrow}>The complete architecture</div>
          <h2 className={s.sectionHeadline}>Six layers. Your voice runs through all of them.</h2>
          <div className={s.layersStack}>
            {[
              { n: "01", type: "voice", name: "Hypnotic induction", desc: "Your cloned voice guides the brain to theta state (4-8 Hz) before the story begins." },
              { n: "02", type: "voice", name: "AI-written personalized story", desc: "Sensory-rich, emotionally vivid narrative built around your specific goals and proof actions." },
              { n: "03", type: "voice", name: "Emotional inflection", desc: "The clone rises, grounds, and lands with precision to match the narrative intent." },
              { n: "04", type: "other", name: "NLP emotional anchoring", desc: "A physical cue woven into the story trains the body to access the future state on demand." },
              { n: "05", type: "other", name: "Binaural theta beats", desc: "Frequency-specific audio beneath the story sustains and deepens the brain state throughout." },
              { n: "06", type: "voice", name: "Identity affirmations", desc: "Closing declarations of becoming, accepted as truth at the moment of deepest receptivity." },
            ].map((l, i) => (
              <div key={i} className={`${s.layerRow} ${l.type === 'voice' ? s.layerRowVoice : s.layerRowOther}`}>
                <div className={s.layerN}>{l.n}</div>
                <div className={s.layerInfo}>
                  <div className={s.layerName}>{l.name}</div>
                  <div className={s.layerDescShort}>{l.desc}</div>
                </div>
                <div className={s.layerTag}>
                  <span className={`${s.layerTag} ${l.type === 'voice' ? s.tagVoice : s.tagOther}`}>
                    {l.type === 'voice' ? "Your voice" : "Audio layer"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ANCIENT WISDOM */}
      <div className={`${s.fullSection} ${s.fadeIn}`}>
        <div className={s.fullSectionInner}>
          <div className={s.sectionEyebrow}>Ancient Wisdom</div>
          <h2 className={s.sectionHeadline}>Every tradition already knew this.</h2>
          <p className={s.sectionBody}>Neuroscience discovered the mechanics through research. Ancient traditions discovered them through thousands of years of observation. They arrived at the same truth.</p>
          <div className={s.traditionsGrid}>
            <div className={s.traditionCard}>
              <span className={s.traditionTag}>Vedic Tradition</span>
              <h3 className={s.traditionTitle}>Mantra — instrument of the mind</h3>
              <p className={s.traditionBody}>The Sanskrit word mantra translates to 'instrument of the mind.' Historically, mantras were spoken in the practitioner's own voice until the vibration rewired their inner state.</p>
            </div>
            <div className={s.traditionCard}>
              <span className={s.traditionTag}>Egyptian Heka</span>
              <h3 className={s.traditionTitle}>Sacred speech as creation</h3>
              <p className={s.traditionBody}>In ancient Egypt, Heka was the magic of creation. To name something in the first person was to call it into existence. They spoke the reality into being themselves.</p>
            </div>
            <div className={s.traditionCard}>
              <span className={s.traditionTag}>Tibetan Buddhism</span>
              <h3 className={s.traditionTitle}>Visualization & voiced intention</h3>
              <p className={s.traditionBody}>Vajrayana practices combine intense mental imagery with chanted intention — creating a resonance between the inner image and the outer world.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CLOSING */}
      <div className={`${s.closingSection} ${s.fadeIn}`}>
        <div className={s.closingInner}>
          <span className={s.closingMark}>"</span>
          <p className={s.closingText}>What every tradition practiced intuitively, ManifestMyStory delivers with precision. The voice that has always known what you are capable of — <em>now delivering it with the architecture the ancients could only approximate.</em></p>
          <p className={s.closingSub}>Built for individuals. Designed to scale with coaches and practitioners.</p>
        </div>
      </div>

      <div className={`${s.fullSection} ${s.bg2}`}>
        <div className={s.pageLinks}>
          <Link href="/science" className={s.pageLinkCard}>
            <span className={s.pageLinkTag}>Neurology</span>
            <h4 className={s.pageLinkTitle}>The Science</h4>
            <p className={s.pageLinkDesc}>Deep dive into neuroplasticity, theta waves, and NLP.</p>
          </Link>
          <Link href="/quantum" className={s.pageLinkCard}>
            <span className={s.pageLinkTag}>Physics</span>
            <h4 className={s.pageLinkTitle}>The Quantum Field</h4>
            <p className={s.pageLinkDesc}>The intersection of focused intention and physical reality.</p>
          </Link>
          <Link href="/mystical" className={s.pageLinkCard}>
            <span className={s.pageLinkTag}>Tradition</span>
            <h4 className={s.pageLinkTitle}>Ancient Wisdom</h4>
            <p className={s.pageLinkDesc}>Timeless spiritual practices meeting modern technology.</p>
          </Link>
        </div>
      </div>

      {/* INVITE STRIP */}
      <div className={s.inviteStrip}>
        <div className={s.fullSectionInner}>
          <h2 className={s.inviteStripHead}>Ready to hear your future?</h2>
          <p className={s.inviteStripSub}>Claim one of the remaining founding member spots.</p>
          <div className={s.heroCta}>
            <Link href="/auth/signup" className={s.ctaBtn}>Get Started — Free</Link>
          </div>
        </div>
      </div>

      <footer className={s.footer}>
        <div className={s.footerLogo}>Manifest My Story</div>
        <div className={s.footerCopy}>© 2026 ManifestMyStory. Your voice is the differentiator.</div>
      </footer>
    </div>
  );
}
