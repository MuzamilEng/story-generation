"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "../app/styles/Home.module.css";
import Header from "../app/components/Header";
import Sidebar from "../app/components/Sidebar";

/* ── SVG ICONS ─────────────────────────────────────────── */
const PlayIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);
const PauseIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
  </svg>
);

/* ── DIVIDER ─────────────────────────────────────────────── */
const Divider: React.FC = () => (
  <div className={styles.dividerWrap}>
    <div className={styles.dividerLine} />
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
    <div className={styles.dividerLine} />
  </div>
);

/* ── HERO ─────────────────────────────────────────────────── */
const Hero: React.FC = () => {
  const geoRef = useRef<SVGSVGElement>(null);

  // Parallax: Seed of Life shifts at 25% scroll speed
  useEffect(() => {
    const handleScroll = () => {
      if (geoRef.current) {
        const y = window.scrollY;
        geoRef.current.style.transform = `translate(-50%, calc(-55% + ${y * 0.25}px))`;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className={styles.hero}>
      {/* Seed of Life geometry — blooms on load, parallax on scroll */}
      <svg
        ref={geoRef}
        className={styles.heroGeo}
        viewBox="0 0 520 520"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
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

      <div className={styles.heroInner}>
        <p className={styles.heroEyebrow}>YOUR FUTURE IS ALREADY SPEAKING</p>
        <div className={styles.heroBadge}>VOICE · AI · MANIFESTATION</div>

        <h1 className={styles.heroTitle}>
          <span className={styles.linePlain}>This is the life</span>
          <span className={styles.linePlain}>you are building.</span>
          <span className={styles.lineAccent}>Hear it.</span>
        </h1>

        <p className={styles.heroSub}>
          A guided conversation draws out your deepest vision. We turn it into a
          rich, sensory story — then narrate it back to you in your own voice.
          Listen every morning. Watch your life follow.
        </p>

        <div className={styles.heroActions}>
          <Link href="/user/goal-intake-ai" className={styles.btnPrimary}>
            CREATE MY STORY — FREE
          </Link>
          <Link href="/science" className={styles.btnGhost}>
            THE SCIENCE BEHIND IT
          </Link>
        </div>

        <p className={styles.heroTruths}>YOUR VOICE · YOUR STORY · YOUR FUTURE</p>
      </div>
    </section>
  );
};

/* ── AUDIO PLAYER ─────────────────────────────────────────── */
const AudioPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(32);
  const [currentTime, setCurrentTime] = useState("2:02");
  const [litBars, setLitBars] = useState(14);
  const heights = [8,12,18,14,22,16,10,24,18,12,20,15,8,19,23,11,16,20,14,9,21,17,13,25,18,10,22,15,19,12,16,8,20,14,24,18];
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const togglePlay = () => setIsPlaying((p) => !p);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          const next = Math.min(100, prev + 0.15);
          if (next >= 100) { setIsPlaying(false); return 100; }
          return next;
        });
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying]);

  useEffect(() => {
    const totalSec = 384; // 6:24
    const sec = Math.round((progress * totalSec) / 100);
    const m = Math.floor(sec / 60), s = sec % 60;
    setCurrentTime(`${m}:${s.toString().padStart(2, "0")}`);
    setLitBars(Math.round((progress * heights.length) / 100));
  }, [progress, heights.length]);

  return (
    <div className={styles.audioWrap}>
      <div className={styles.audioCard}>
        <span className={styles.acEyebrow}>SAMPLE AUDIO</span>
        <p className={styles.acTitle}>
          A Day in the Life of My Highest Self — Personal story · 6 min 24 sec · Generated in your voice
        </p>

        {/* Progress bar */}
        <div className={styles.acProg} style={{ marginBottom: 14 }}>
          <div className={styles.acFill} style={{ width: progress + "%" }} />
        </div>

        <div className={styles.acControls}>
          <button className={styles.playBtn} onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <div className={styles.waveform}>
            {heights.map((h, i) => (
              <div
                key={i}
                className={`${styles.wb} ${i < litBars ? styles.lit : ""}`}
                style={{ height: h + "px" }}
              />
            ))}
          </div>

          <span className={styles.acTime}>{currentTime} / 6:24</span>
        </div>

        <p className={styles.acCaption}>
          This is what your finished audio sounds like — except narrated in your voice, about your life.
        </p>
      </div>
    </div>
  );
};

/* ── HOW IT WORKS ─────────────────────────────────────────── */
const HowItWorks: React.FC = () => (
  <section className={styles.fullSection} id="how">
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div className="reveal">
        <span className={styles.eyebrow}>THE PROCESS</span>
        <h2 className={styles.secTitle}>
          Four steps to <span className={styles.secTitle === "" ? "" : "accent"} style={{ color: "var(--accent)" }}>a new reality.</span>
        </h2>
        <p className={styles.secSub}>What follows can last a lifetime. This takes 10–20 minutes and is worth every one of them.</p>
      </div>
      <div className={`${styles.steps} reveal`}>
        <div className={styles.stepCard}>
          <span className={styles.stepNum}>01</span>
          <div className={styles.stepIcon}>
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <circle cx="15" cy="11" r="5" stroke="#5A9968" strokeWidth="0.8" vectorEffect="non-scaling-stroke"/>
              <path d="M6 25 Q15 19 24 25" stroke="#5A9968" strokeWidth="0.8" fill="none" strokeLinecap="round"/>
              <circle cx="15" cy="15" r="13" stroke="#2A3D2F" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
            </svg>
          </div>
          <h3 className={styles.stepTitle}>Tell us what your <span style={{ color: "var(--accent)" }}>best life</span> looks like</h3>
          <p className={styles.stepText}>A guided AI conversation draws out your real vision — where you live, how you feel, who surrounds you, and what your perfect day actually looks like.</p>
        </div>
        <div className={styles.stepCard}>
          <span className={styles.stepNum}>02</span>
          <div className={styles.stepIcon}>
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <rect x="3" y="5" width="24" height="20" rx="2" stroke="#2A3D2F" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
              <path d="M8 13 L13 17 L22 10" stroke="#5A9968" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3 className={styles.stepTitle}>We write <span style={{ color: "var(--accent)" }}>your story</span></h3>
          <p className={styles.stepText}>AI crafts a rich, sensory, first-person narrative set in your future — written as if everything you want has already come true. Because in this story, it has.</p>
        </div>
        <div className={styles.stepCard}>
          <span className={styles.stepNum}>03</span>
          <div className={styles.stepIcon}>
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <circle cx="15" cy="15" r="8" stroke="#2A3D2F" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
              <circle cx="15" cy="15" r="3" fill="#3D6B4A"/>
              <path d="M15 3.5 L15 1" stroke="#5A9968" strokeWidth="1" strokeLinecap="round"/>
              <path d="M15 29 L15 26.5" stroke="#5A9968" strokeWidth="1" strokeLinecap="round"/>
              <path d="M3.5 15 L1 15" stroke="#5A9968" strokeWidth="1" strokeLinecap="round"/>
              <path d="M29 15 L26.5 15" stroke="#5A9968" strokeWidth="1" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 className={styles.stepTitle}>Hear it in <span style={{ color: "var(--accent)" }}>your voice</span></h3>
          <p className={styles.stepText}>Record a 60-second sample. We clone your voice and deliver your story as audio — narrated by you, for you. Nobody else sounds like you.</p>
        </div>
        <div className={styles.stepCard}>
          <span className={styles.stepNum}>04</span>
          <div className={styles.stepIcon}>
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
              <circle cx="15" cy="15" r="13" stroke="#2A3D2F" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
              <path d="M7 15 Q11 7 15 15 Q19 23 23 15" stroke="#5A9968" strokeWidth="1" fill="none" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 className={styles.stepTitle}>Listen <span style={{ color: "var(--accent)" }}>every day</span></h3>
          <p className={styles.stepText}>Every morning and every night, your story reprograms your subconscious to notice and attract the people, actions, and opportunities that build your life.</p>
        </div>
      </div>
    </div>
  </section>
);

/* ── STORY SHOWCASE ───────────────────────────────────────── */
const StoryShowcase: React.FC = () => (
  <section className={styles.storySection} id="story">
    <div className={styles.storyGrid}>
      {/* Left: label + audio player */}
      <div className="reveal">
        <span className={styles.eyebrow}>YOUR STORY</span>
        <h2 className={styles.secTitle}>
          Not a generic script.<br/>
          <span style={{ color: "var(--accent)" }}>Your life. Your words.</span>
        </h2>
        <p className={styles.secSub}>Every story is written from scratch based on your conversation. No two are ever the same.</p>
        <AudioPlayer />
      </div>

      {/* Right: story card */}
      <div className={`${styles.storyDemo} reveal`}>
        <div className={styles.sdEyebrow}>
          PERSONAL MANIFESTATION STORY
          <span className={styles.sdBadge}>✓ APPROVED</span>
        </div>
        <div className={styles.sdTitle}>A Day in the Life of My Highest Self</div>
        <div className={styles.sdMeta}>1,740 WORDS · ~13 MIN AUDIO · GENERATED FROM YOUR GOALS</div>
        <div className={styles.sdBody}>
          <div className={styles.sdText}>
            I open my eyes before my alarm has a chance to sound. The room is quiet except for the low hum of the sea beyond the open window — that familiar rhythm that has become the backdrop of my whole life here. Pale morning light falls across the terracotta floor in long, warm strips...<br/><br/>
            I rise without effort, the way I always do now. There is no resistance in the morning anymore, no heaviness I used to carry. I walk barefoot across the cool tiles and step onto the terrace, and there it is — the Atlantic stretching wide and silver under the early sun…
          </div>
          <div className={styles.sdFade} />
        </div>
        <div className={styles.sdFooter}>
          <span className={styles.sdNote}>Your story continues for 1,700+ more words</span>
          <Link href="/user/goal-intake-ai" className={styles.sdCta}>WRITE MINE →</Link>
        </div>
      </div>
    </div>
  </section>
);

/* ── TESTIMONIALS ─────────────────────────────────────────── */
const TestiCard: React.FC<{ initials: string; name: string; role: string; text: string }> = ({
  initials, name, role, text,
}) => (
  <div className={styles.testiCard}>
    <p className={styles.testiText}>{text}</p>
    <div className={styles.testiAuthor}>
      <div className={styles.testiAvatar}>{initials}</div>
      <div>
        <div className={styles.testiName}>{name}</div>
        <div className={styles.testiRole}>{role}</div>
      </div>
    </div>
  </div>
);

const Testimonials: React.FC = () => (
  <section className={styles.testimonialsSection}>
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div className="reveal">
        <span className={styles.eyebrow}>EARLY USERS</span>
        <h2 className={styles.secTitle}>What people are <span style={{ color: "var(--accent)" }}>experiencing.</span></h2>
      </div>
      <div className={`${styles.testiGrid} reveal`}>
        <TestiCard
          initials="SM"
          name="Sarah M."
          role="Entrepreneur, 34"
          text="I've tried journaling, vision boards, affirmations. Nothing hit like hearing my own voice describe the life I'm building. It feels different — personal."
        />
        <TestiCard
          initials="JK"
          name="James K."
          role="Marketing Director, 41"
          text="I was skeptical. Three weeks of listening and it changed something in me. I applied for the role I'd been putting off for two years — and got the job."
        />
        <TestiCard
          initials="AT"
          name="Amara T."
          role="Teacher, 29"
          text="The conversation to create my story made me cry. I hadn't let myself think about what I actually wanted in years. The process is transformative."
        />
      </div>
    </div>
  </section>
);

/* ── FINAL CTA ────────────────────────────────────────────── */
const FinalCTA: React.FC = () => (
  <section className={styles.finalCta} id="start">
    {/* Ghost Seed of Life geometry */}
    <svg className={styles.ctaGeo} viewBox="0 0 420 420" fill="none" aria-hidden="true">
      <circle cx="210" cy="210" r="198" stroke="#8DBF7A" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
      <circle cx="210" cy="75" r="135" stroke="#8DBF7A" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
      <circle cx="210" cy="345" r="135" stroke="#8DBF7A" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
      <circle cx="327" cy="142" r="135" stroke="#8DBF7A" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
      <circle cx="93" cy="142" r="135" stroke="#8DBF7A" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
      <circle cx="327" cy="278" r="135" stroke="#8DBF7A" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
      <circle cx="93" cy="278" r="135" stroke="#8DBF7A" strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
      <circle cx="210" cy="210" r="135" stroke="#8DBF7A" strokeWidth="0.6" vectorEffect="non-scaling-stroke"/>
    </svg>

    <div className={`${styles.finalInner} reveal`}>
      <span className={styles.finalEyebrow}>YOUR FUTURE IS WAITING</span>
      <h2 className={styles.finalTitle}>
        The life you're building<br/>deserves to be <span style={{ color: "var(--accent)" }}>heard.</span>
      </h2>
      <p className={styles.finalSub}>
        A conversation about your real vision. A story written in your voice. A practice that returns to you every morning and every night — until the life you imagined becomes the life you live.
      </p>
      <div className={styles.finalActions}>
        <Link href="/user/goal-intake-ai" className={styles.btnPrimary}>
          BEGIN MY STORY — FREE
        </Link>
        <p className={styles.finalProof}>NO CREDIT CARD REQUIRED · TAKES 10–20 MINUTES</p>
      </div>
    </div>
  </section>
);

/* ── FOOTER ───────────────────────────────────────────────── */
const Footer: React.FC = () => (
  <footer className={styles.footer}>
    <span className={styles.footLogo}>MANIFEST<span>MY</span>STORY</span>
    <div className={styles.footLinks}>
      <Link href="#how">HOW IT WORKS</Link>
      <Link href="/pricing">PRICING</Link>
      <Link href="/science">THE SCIENCE</Link>
      <Link href="/mystical">ANCIENT WISDOM</Link>
      <Link href="#">PRIVACY</Link>
      <Link href="#">TERMS</Link>
    </div>
    <span className={styles.footCopy}>Your future is already speaking. We help you listen.</span>
  </footer>
);

/* ── SCROLL REVEAL HOOK ───────────────────────────────────── */
const useScrollReveal = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
};

/* ── MAIN PAGE ────────────────────────────────────────────── */
export default function Home() {
  useScrollReveal();
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      router.push("/admin");
    }
  }, [session, router]);

  return (
    <div className={styles.container}>
      <Header />
      <Sidebar isLandingPage />
      <Hero />
      <Divider />
      <HowItWorks />
      <Divider />
      <StoryShowcase />
      <Divider />
      <Testimonials />
      <Divider />
      <FinalCTA />
      <Footer />
    </div>
  );
}
