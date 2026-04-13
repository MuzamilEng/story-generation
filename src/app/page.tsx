"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import s from "./styles/SplashV6.module.css";

/* ── WAITLIST FORM (reusable) ─────────────────────────────── */
const WaitlistForm: React.FC<{
  variant?: "hero" | "invite";
}> = ({ variant = "hero" }) => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: "Founding Member", email: email.trim() }),
      });
      if (res.ok) setSubmitted(true);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  };

  const formClass = variant === "hero" ? s.emailForm : s.inviteForm;
  const inputClass = variant === "hero" ? s.emailInput : s.inviteInput;
  const btnClass = variant === "hero" ? s.emailBtn : s.inviteBtn;
  const successClass = variant === "hero" ? s.emailBtnSuccess : s.inviteBtnSuccess;

  return (
    <form className={formClass} onSubmit={handleSubmit}>
      <input
        type="email"
        className={inputClass}
        placeholder="Your email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        disabled={submitted}
      />
      <button
        type="submit"
        className={`${btnClass} ${submitted ? successClass : ""}`}
        disabled={!email.includes("@") || isLoading || submitted}
      >
        {isLoading ? (
          <span className={s.spinner} />
        ) : submitted ? (
          variant === "hero" ? "Invitation requested" : "Spot claimed"
        ) : variant === "hero" ? (
          "Request my invitation"
        ) : (
          "Claim my spot"
        )}
      </button>
    </form>
  );
};

/* ── SCROLL REVEAL HOOK ───────────────────────────────────── */
const useScrollReveal = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(s.fadeInVisible);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.09 },
    );
    document.querySelectorAll(`.${s.fadeIn}`).forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
};

/* ── NAV ACTIVE SECTION TRACKER ───────────────────────────── */
const useActiveSection = () => {
  const [active, setActive] = useState("");
  useEffect(() => {
    const handleScroll = () => {
      const sections = document.querySelectorAll("[id]");
      let cur = "";
      sections.forEach((sec) => {
        if (window.scrollY >= (sec as HTMLElement).offsetTop - 100) {
          cur = sec.id;
        }
      });
      setActive(cur);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  return active;
};

/* ── MAIN PAGE ────────────────────────────────────────────── */
export default function Home() {
  useScrollReveal();
  const router = useRouter();
  const { data: session } = useSession();
  const activeSection = useActiveSection();
  const scarcityRef = useRef<HTMLDivElement>(null);
  const [betaCode, setBetaCode] = useState("");
  const [gateMsg, setGateMsg] = useState<"success" | "error" | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Redirect logged-in users
  useEffect(() => {
    if (session?.user) {
      if (session.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/user/dashboard");
      }
    }
  }, [session, router]);

  // Scarcity bar animation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (scarcityRef.current) scarcityRef.current.style.width = "33.6%";
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Beta code check
  const checkCode = useCallback(async () => {
    const val = betaCode.trim().toUpperCase();
    if (!val) return;
    try {
      const res = await fetch("/api/beta/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: val }),
      });
      if (res.ok) {
        setGateMsg("success");
        setTimeout(() => {
          router.push(`/auth/signup?betaCode=${encodeURIComponent(val)}`);
        }, 1500);
      } else {
        setGateMsg("error");
      }
    } catch {
      setGateMsg("error");
    }
  }, [betaCode, router]);

  const tabLink = (href: string, label: string, isMobile = false) => {
    const id = href.replace("#", "");
    const active = activeSection === id;
    const baseClass = isMobile ? s.mobileNavTabLink : s.navTabLink;
    const activeClass = isMobile ? s.mobileNavTabLinkActive : s.navTabLinkActive;

    return (
      <li key={id}>
        <a
          href={href}
          className={`${baseClass} ${active ? activeClass : ""}`}
          onClick={() => isMobile && setIsMenuOpen(false)}
        >
          {label}
        </a>
      </li>
    );
  };

  return (
    <>
      {/* NAV */}
      <nav className={s.nav}>
        <a href="#" className={s.navLogo}>Manifest My Story</a>
        <ul className={s.navTabs}>
          {tabLink("#how", "How it works")}
          {tabLink("#voice", "The voice")}
          {tabLink("#features", "The science")}
          <li>
            <Link href="/why-it-works" className={s.navTabLink}>Why it works</Link>
          </li>
          <li>
            <Link href="/our-story" className={s.navTabLink}>Our story</Link>
          </li>
        </ul>
        <div className={s.navRight}>
          <Link href="/auth/signin" className={s.navSignIn}>Sign In</Link>
          <a href="#invite" className={s.navInvite}>Request invitation</a>
        </div>

        {/* Hamburger */}
        <button 
          className={s.navMobileBtn} 
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
        className={`${s.mobileMenuOverlay} ${isMenuOpen ? s.mobileMenuOverlayOpen : ""}`} 
        onClick={() => setIsMenuOpen(false)}
      />
      <div className={`${s.mobileMenu} ${isMenuOpen ? s.mobileMenuOpen : ""}`}>
        <ul className={s.mobileNavTabs}>
          {tabLink("#how", "How it works", true)}
          {tabLink("#voice", "The voice", true)}
          {tabLink("#features", "The science", true)}
          <li>
            <Link 
              href="/why-it-works" 
              className={s.mobileNavTabLink} 
              onClick={() => setIsMenuOpen(false)}
            >
              Why it works
            </Link>
          </li>
          <li>
            <Link 
              href="/our-story" 
              className={s.mobileNavTabLink} 
              onClick={() => setIsMenuOpen(false)}
            >
              Our story
            </Link>
          </li>
        </ul>
        <div className={s.mobileNavRight}>
          <Link href="/auth/signin" className={s.mobileNavSignIn} onClick={() => setIsMenuOpen(false)}>Sign In</Link>
          <a href="#invite" className={s.mobileNavInvite} onClick={() => setIsMenuOpen(false)}>Request invitation</a>
        </div>
      </div>

      {/* HERO */}
      <div className={s.hero}>
        <div className={s.heroGlow} />
        <div className={s.heroGlow2} />
        <div className={s.heroEyebrow}>Founding invitations — 500 spots only</div>
        <h1 className={s.heroHeadline}>
          Hear your future.<br />In <em className={s.heroHeadlineEm}>your own voice.</em>
        </h1>
        <p className={s.heroKicker}>The most powerful manifestation tool ever built.</p>

        <div className={s.scarcityWrap}>
          <div className={s.scarcityTop}>
            <span className={s.scarcityTopSpan}>Founding spots claimed</span>
            <strong className={s.scarcityTopStrong}>168 of 500</strong>
          </div>
          <div className={s.scarcityTrack}>
            <div className={s.scarcityFill} ref={scarcityRef} />
          </div>
          <p className={s.scarcityNote}>When 500 spots are filled, founding access closes permanently.</p>
        </div>

        <WaitlistForm variant="hero" />
        <p className={s.heroMicro}>
          <strong className={s.heroMicroStrong}>Founding members receive early access before public launch</strong> + 50% off for life.
        </p>

        <div className={s.scrollHint}>
          <span className={s.scrollHintText}>Discover</span>
          <div className={s.scrollLine} />
        </div>
      </div>

      {/* SYNCHRONICITY STRIP */}
      <div className={`${s.syncStrip} ${s.fadeIn}`}>
        <div className={s.syncInner}>
          <span className={s.syncEyebrow}>What begins to happen</span>
          <p className={s.syncText}>
            The goals arrive differently than you expect.<br />
            <em className={s.syncTextEm}>Doors open that you did not knock on.</em><br />
            A quiet intuition develops — and starts directing your next move.
          </p>
          <p className={s.syncSub}>
            Ancient traditions called it alignment. Quantum physicists call it field resonance. Neuroscientists call it reticular activation.
            Whatever name you give it — once you experience it, you will never question the process again.
          </p>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className={s.section} id="how">
        <div className={s.fadeIn}>
          <div className={s.sectionEyebrow}>How it works</div>
          <h2 className={s.sectionHeadline}>Three steps to a story that changes you</h2>
          <p className={s.sectionBody}>
            ManifestMyStory is the tool. The practice is showing up for it — listening consistently, taking the actions that arise,
            and doing the work of becoming the person in your story. The tool builds the path. You walk it.
          </p>
        </div>
        <div className={`${s.howGrid} ${s.fadeIn} ${s.delay1}`}>
          <div className={s.howStep}>
            <span className={s.stepNum}>01</span>
            <h3 className={s.stepTitle}>Define your goals and proof actions</h3>
            <p className={s.stepBody}>
              Our intake goes deeper than goals. You define what you want — and the sensory proof that it has already arrived.
              Not what you are doing now, but what you are experiencing once the goal is real. Waking up in the dream house.
              Walking into the business. Feeling the freedom. The AI builds your story around that future evidence — giving your
              subconscious something vivid and specific to move toward.
            </p>
            <span className={s.stepLine} />
          </div>
          <div className={s.howStep}>
            <span className={s.stepNum}>02</span>
            <h3 className={s.stepTitle}>Clone your voice in under a minute</h3>
            <p className={s.stepBody}>
              Record a short voice sample. Our AI captures your unique vocal signature — tone, cadence, emotional resonance — and
              recreates it with striking accuracy. Then enhances it with the emotional inflection your story deserves.
            </p>
            <span className={s.stepLine} />
          </div>
          <div className={s.howStep}>
            <span className={s.stepNum}>03</span>
            <h3 className={s.stepTitle}>Listen every night in theta state</h3>
            <p className={s.stepBody}>
              Your personalized story plays each night as you drift toward sleep — when the subconscious is most open and most
              receptive. The programming is delivered at depth. The subconscious hears the one voice it cannot argue with.
            </p>
            <span className={s.stepLine} />
          </div>
        </div>
      </section>

      <div className={s.divider} />

      {/* THE VOICE */}
      <div className={s.voiceSection} id="voice">
        <div className={s.voiceInner}>
          <div className={`${s.voiceHeader} ${s.fadeIn}`}>
            <div className={s.voiceHeaderEyebrow}>What makes this tool different from everything else</div>
            <h2 className={s.voiceHeadline}>Your voice is the key that opens the subconscious door.</h2>
            <p className={s.voiceBody}>
              Every other manifestation tool uses someone else&rsquo;s voice. A stranger&rsquo;s voice — however calming — triggers the
              brain&rsquo;s critical filter. Your own voice bypasses it entirely. This is not a design choice. It is neuroscience. Built for
              individuals. Designed to scale with coaches and practitioners.
            </p>
          </div>

          {/* Audio stack */}
          <div className={`${s.audioStack} ${s.fadeIn} ${s.delay1}`}>
            {[
              { cls: s.audioLayer1, tag: "Layer 1 — Opens the door", name: "Hypnotic induction", desc: "A guided audio sequence walks the brain from alert beta down to theta — 4 to 8 Hz. The subconscious recognizes a familiar, trusted source and the critical filter drops. The door opens before the story and its programming begin.", badge: "voice" },
              { cls: s.audioLayer2, tag: "Layer 2 — Builds the narrative", name: "AI-written personalized story", desc: "A sensory-rich, emotionally vivid story built around your specific goals and proof actions. Not a template. Shaped by clinical NLP architecture and designed to make the subconscious feel the future as something already underway.", badge: "voice" },
              { cls: s.audioLayer3, tag: "Layer 3 — Deepens the delivery", name: "Emotional inflection in the clone", desc: "The AI-enhanced clone does not read flatly. It rises at moments of aspiration, softens at moments of truth, and speaks with the conviction of someone who already knows the outcome. The emotional tone matches the moment — making every word land at depth rather than surface level.", badge: "voice" },
              { cls: s.audioLayer4, tag: "Layer 4 — Anchors the emotion", name: "NLP emotional anchoring", desc: "A physical cue woven into the story trains the body to access the emotional state of the desired future on demand. Based on proven Neuro-Linguistic Programming technique used by elite performers and practitioners worldwide. The body begins to feel the goal before it arrives.", badge: "beats" },
              { cls: s.audioLayer5, tag: "Layer 5 — Sustains the state", name: "Binaural theta beats", desc: "Theta-frequency binaural beats at 4–8 Hz run beneath the story from start to close — sustaining and deepening the brain state throughout. The induction opens the door. The beats hold it open. Nothing pulls the mind back to beta during the experience.", badge: "beats" },
              { cls: s.audioLayer6, tag: "Layer 6 — Seals with identity", name: "Identity affirmations", desc: "The experience closes with identity-level affirmations — spoken by the one voice the subconscious cannot dismiss. The last thing heard before sleep is a declaration of becoming. Not aspiration. Not hope. The voice that has always known what you are capable of, confirming it at the moment of deepest receptivity.", badge: "voice" },
            ].map((layer, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className={s.layerConnector}>↓</div>}
                <div className={`${s.audioLayer} ${layer.cls}`}>
                  <div className={s.layerLabel}>
                    <span className={s.layerTag}>{layer.tag}</span>
                    <span className={s.layerName}>{layer.name}</span>
                  </div>
                  <div className={s.layerDesc}>{layer.desc}</div>
                  <div className={s.layerBadge}>
                    <span className={`${s.layerBadgeSpan} ${layer.badge === "voice" ? s.badgeVoice : s.badgeBeats}`}>
                      {layer.badge === "voice" ? "Your voice" : layer.name.includes("NLP") ? "NLP layer" : "Audio layer"}
                    </span>
                  </div>
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Voice mechanism cards */}
          <div className={`${s.voiceCards} ${s.fadeIn} ${s.delay2}`}>
            <div className={s.voiceCard}>
              <div className={s.voiceCardNum}>01</div>
              <h3 className={s.voiceCardTitle}><em className={s.voiceCardTitleEm}>Induces</em> — the door opens</h3>
              <p className={s.voiceCardBody}>
                When the subconscious hears a familiar, trusted source, it does not raise its defenses. The critical filter drops before a
                single word of programming is delivered. No external voice — however calming — produces this response. This is the
                mechanism that makes everything else possible.
              </p>
            </div>
            <div className={s.voiceCard}>
              <div className={s.voiceCardNum}>02</div>
              <h3 className={s.voiceCardTitle}><em className={s.voiceCardTitleEm}>Delivers</em> — six layers, one architecture</h3>
              <p className={s.voiceCardBody}>
                With the subconscious fully open, all six layers work simultaneously. The story programs. The inflection makes it land. The
                anchor trains the body. The beats sustain the state. Each layer serves a distinct neurological function. Together they create
                conditions for genuine subconscious change.
              </p>
            </div>
            <div className={s.voiceCard}>
              <div className={s.voiceCardNum}>03</div>
              <h3 className={s.voiceCardTitle}><em className={s.voiceCardTitleEm}>Seals</em> — identity closes the loop</h3>
              <p className={s.voiceCardBody}>
                The last input the subconscious receives before sleep is not a goal. It is a statement of identity. Spoken at the moment of
                deepest receptivity — at the threshold of sleep — by the one voice it cannot argue with. The subconscious accepts it as
                already true. That is where transformation begins.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES / THE SCIENCE */}
      <section className={s.section} id="features">
        <div className={s.featuresWrap}>
          <div className={s.fadeIn}>
            <div className={s.sectionEyebrow}>What is inside every story</div>
            <h2 className={s.sectionHeadline}>Six layers. One tool. Nothing like it.</h2>
            <p className={s.sectionBody}>
              What once took years of coaching and thousands of hours to develop — we can now build for you in minutes. Not because we
              simplified the method. Because AI finally made the full method available to everyone. This is the tool. The practice is
              showing up for it.
            </p>
          </div>
          <div className={`${s.featureList} ${s.fadeIn} ${s.delay1}`}>
            {[
              { icon: <><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></>, name: "Theta state hypnotic induction", desc: "A guided sequence walks the brain to 4–8 Hz before the story and programming begin. The subconscious recognizes a trusted source and the critical filter drops — the door opens before a single goal is spoken." },
              { icon: <><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></>, name: "AI-written personalized story", desc: "Not a template. A sensory-rich, emotionally vivid story built around your specific goals and proof actions — shaped by clinical NLP architecture, specific to you alone." },
              { icon: <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>, name: "AI voice cloning with emotional inflection", desc: "Not a flat clone — an emotionally expressive recreation that rises, grounds, and lands with precision. The tone matches the moment. The subconscious receives something it recognizes as intimately its own." },
              { icon: <><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></>, name: "NLP emotional anchoring", desc: "A physical cue woven into your story trains your body to access the emotional state of your desired future on demand. Used by elite performers and therapeutic practitioners worldwide." },
              { icon: <><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></>, name: "Identity-level affirmations", desc: "Not what you want — who you are. Statements of becoming, delivered at the moment of deepest receptivity. The voice that has always known what you are capable of, saying it directly to the part of you that listens." },
              { icon: <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>, name: "Binaural theta audio layer", desc: "Theta-frequency binaural beats sustain the brain state from induction to close — deepening receptivity across every minute of your practice. The door stays open the whole time." },
            ].map((f, i) => (
              <div key={i} className={s.featureItem}>
                <div className={s.featureIcon}>
                  <svg viewBox="0 0 24 24">{f.icon}</svg>
                </div>
                <div>
                  <div className={s.featureName}>{f.name}</div>
                  <div className={s.featureDesc}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY IT WORKS */}
      <div className={s.whyFull} id="why">
        <div className={s.whyInner}>
          <div className={s.fadeIn}>
            <div className={s.sectionEyebrow}>Why it works</div>
            <h2 className={s.sectionHeadline} style={{ maxWidth: 680 }}>
              Three truths. Three completely different paths to the same conclusion.
            </h2>
            <p className={s.sectionBody}>
              Modern neuroscience, quantum physics, and ancient wisdom each arrived here independently.
              ManifestMyStory is built at that intersection.
            </p>
          </div>
          <div className={`${s.whyCards} ${s.fadeIn} ${s.delay1}`}>
            <div className={s.whyCard}>
              <span className={s.whyTag}>Neuroscience</span>
              <h3 className={s.whyTitle}>Neuroplasticity and subconscious reprogramming</h3>
              <p className={s.whyBody}>
                Your brain rewires itself through consistent, emotionally-charged repetition. The theta state before sleep is when this
                process is most efficient. New neural pathways form that change how you filter and respond to every opportunity around you.
              </p>
              <Link href="/why-it-works#voice" className={s.whyLink}>Explore the method →</Link>
            </div>
            <div className={s.whyCard}>
              <span className={s.whyTag}>Quantum Theory</span>
              <h3 className={s.whyTitle}>The quantum field and energy alignment</h3>
              <p className={s.whyBody}>
                Your thoughts and emotions generate measurable electromagnetic fields. Quantum coherence research suggests that aligning your
                internal state with your desired reality is not metaphor — it is mechanism. The observer shapes what is observed.
              </p>
              <Link href="/quantum" className={s.whyLink}>Explore the field →</Link>
            </div>
            <div className={s.whyCard}>
              <span className={s.whyTag}>Ancient Wisdom</span>
              <h3 className={s.whyTitle}>What every tradition already knew</h3>
              <p className={s.whyBody}>
                From Vedic meditation to Stoic visualization, from ancient Egypt to the monasteries of Tibet — every enduring wisdom
                tradition built practices around the same truth. Your inner world shapes your outer world. Modern science is catching up.
              </p>
              <Link href="/why-it-works#why" className={s.whyLink}>Ancient meets modern →</Link>
            </div>
          </div>
        </div>
      </div>


      {/* FOUNDER ORIGIN */}
      <div className={s.originSection} id="story">
        <div className={s.originInner}>
          <div className={`${s.originHeader} ${s.fadeIn}`}>
            <div className={s.sectionEyebrow}>Why this exists</div>
            <h2 className={s.sectionHeadline} style={{ maxWidth: 760 }}>
              I built this for myself and my team. Then I programmed a bigger purpose into it.
            </h2>
          </div>
          <div className={`${s.originGrid} ${s.fadeIn} ${s.delay1}`}>
            <div className={s.originCard}>
              <span className={s.originNum}>The beginning</span>
              <h3 className={s.originTitle}>Started with a notebook and a business goal</h3>
              <p className={s.originBody}>
                I started with a notebook, a voice recorder, and a business goal I had no idea how to reach.{" "}
                <em className={s.originBodyEm}>Six years later I had hit every goal I programmed</em> — and built this platform so you
                could start where I am now, not where I began.
              </p>
            </div>
            <div className={s.originCard}>
              <span className={s.originNum}>The refinement</span>
              <h3 className={s.originTitle}>Continuously learned, refined, and made it more powerful</h3>
              <p className={s.originBody}>
                The timing is not always yours to control. Twice, the goal arrived a year late. I used to call that failure. Now I
                understand it as the process completing on its own schedule — and I have{" "}
                <em className={s.originBodyEm}>learned to program with that in mind.</em> The method grew more powerful every year.
              </p>
            </div>
            <div className={s.originCard}>
              <span className={s.originNum}>The expansion</span>
              <h3 className={s.originTitle}>Then I programmed a bigger purpose into the practice itself</h3>
              <p className={s.originBody}>
                This year I programmed into my own story that I wanted to make a life-changing impact for 100,000 lives over the coming
                years. <em className={s.originBodyEm}>The method I am asking you to trust is the same method I used to build this platform.</em>{" "}
                I am a living demonstration of the practice. The tool works. The work is yours.
              </p>
            </div>
          </div>
          <div className={`${s.originMission} ${s.fadeIn} ${s.delay2}`}>
            <div>
              <span className={s.originMissionLabel}>The goal inside the practice</span>
              <div className={s.originMissionNum}>
                100,000<span className={s.originMissionNumSub}>lives transformed</span>
              </div>
            </div>
            <div>
              <p className={s.originMissionText}>
                Bringing ManifestMyStory to the public is itself an act of manifestation in progress.{" "}
                <em className={s.originMissionTextEm}>Your decision to sign up is part of something larger than a wellness app.</em>
              </p>
              <p className={s.originMissionSub}>
                My philanthropy work — including sponsoring a water treatment plant currently serving 11,500 people in Tanzania — showed me
                what becomes possible when you program a purpose-driven goal and commit to the practice. This platform is the next
                expression of that same intention.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* INVITE */}
      <div className={s.inviteSection} id="invite">
        <div className={`${s.inviteInner} ${s.fadeIn}`}>
          <div className={s.inviteEyebrow}>Your founding invitation</div>
          <h2 className={s.inviteHeadline}>Your story is waiting.</h2>
          <p className={s.inviteBody}>
            We are opening ManifestMyStory to a <strong className={s.inviteBodyStrong}>founding group of 500 people only.</strong>{" "}
            When those spots are claimed, this invitation closes permanently.
          </p>
          <p className={s.inviteBody} style={{ marginBottom: 16 }}>
            This is not a waitlist. <strong className={s.inviteBodyStrong}>This is an invitation to be first.</strong>
          </p>
          <p className={s.inviteBody} style={{ fontSize: 14, marginBottom: 28 }}>
            The tool does the building. The practice is showing up — listening consistently, taking the actions that surface, and doing the
            inner work when your ego resists. Sometimes you will know exactly what the story is directing you toward and not want to do it.
            That is where the real transformation happens.
          </p>

          <div className={s.earlyAccessBanner}>
            <div className={s.earlyAccessHead}>What founding members receive</div>
            <ul className={s.earlyAccessList}>
              <li className={s.earlyAccessItem}>Early access to the platform before public launch</li>
              <li className={s.earlyAccessItem}>First to experience the full product and shape its future</li>
              <li className={s.earlyAccessItem}>50% off your subscription — locked in for life</li>
              <li className={s.earlyAccessItem}>Direct line to the founding team during beta</li>
            </ul>
          </div>

          <div className={s.inviteScarcity}>
            <div className={s.inviteDot} />
            <p className={s.inviteScarcityText}>
              168 of 500 founding spots claimed <span className={s.inviteScarcitySpan}>— when filled, this closes permanently</span>
            </p>
          </div>

          <WaitlistForm variant="invite" />
          <p className={s.inviteMicro}>
            <strong className={s.inviteMicroStrong}>Early access + 50% off for life, locked in.</strong> No credit card. No commitment. Just first.
          </p>

          <div className={s.betaDivider}>
            <span className={s.betaDividerText}>Already have a beta access code?</span>
          </div>
          <div className={s.betaCodeRow}>
            <input
              className={s.betaCodeInput}
              type="text"
              placeholder="Enter your code"
              value={betaCode}
              onChange={(e) => {
                setBetaCode(e.target.value);
                setGateMsg(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && checkCode()}
            />
            <button className={s.betaCodeBtn} onClick={checkCode}>
              Access beta
            </button>
          </div>
          {gateMsg === "success" && (
            <p className={s.gateSuccess}>Access granted — taking you in now...</p>
          )}
          {gateMsg === "error" && (
            <p className={s.gateError}>That code does not look right. Reach out if you need help.</p>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer className={s.footer}>
        <div className={s.footerLogo}>Manifest My Story</div>
        <p className={s.footerCopy}>Copyright © 2026 Manifest My Story. All rights reserved.</p>
      </footer>
    </>
  );
}
