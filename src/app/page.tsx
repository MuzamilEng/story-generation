"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "../app/styles/Home.module.css";
import Header from "../app/components/Header";
import Sidebar from "../app/components/Sidebar";
import {
  ArrowIcon,
  ExternalIcon,
  CheckIcon,
  ChatIcon,
  StarIcon,
  MicIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
} from "../app/components/icons/HomeIcons";

// Hero Section

// Hero Section
const Hero: React.FC = () => {
  const { data: session } = useSession();

  useEffect(() => {
    const starsEl = document.getElementById('stars');
    if (starsEl && starsEl.children.length === 0) {
      for (let i = 0; i < 80; i++) {
        const s = document.createElement('div');
        const size = Math.random() > 0.85 ? 2 : 1;
        s.style.cssText = `position:absolute;border-radius:50%;background:#fff;width:${size}px;height:${size}px;left:${Math.random() * 100}%;top:${Math.random() * 100}%;opacity:${0.15 + Math.random() * 0.5};`;
        starsEl.appendChild(s);
      }
    }
  }, []);

  return (
    <section className={styles.hero}>
      <div className={styles.atmLayers}>
        <div className={styles.atmLayer1} />
        <div className={styles.atmLayer2} />
        <div className={styles.atmLayer3} />
        <div className={styles.atmLayer4} />
      </div>
      <div className={styles.horizon} />
      <div className={styles.stars} id="stars"></div>

      {/* Floating ambient words */}
      <span className={styles.floatWord} style={{ top: '14%', left: '5%' }}>abundance</span>
      <span className={styles.floatWord} style={{ top: '22%', right: '7%' }}>freedom</span>
      <span className={styles.floatWord} style={{ top: '42%', left: '3%' }}>purpose</span>
      <span className={styles.floatWord} style={{ top: '58%', right: '4%' }}>connection</span>
      <span className={styles.floatWord} style={{ bottom: '25%', left: '9%' }}>peace</span>
      <span className={styles.floatWord} style={{ bottom: '18%', right: '10%' }}>clarity</span>

      <div className={styles.heroInner}>
        <div className={`${styles.heroBadge} ${styles.fadeUp}`}>
          <div className={styles.badgePulse}></div>
          Your future is already speaking
        </div>

        <h1 className={`${styles.heroTitle} ${styles.fadeUp} ${styles.d1}`}>
          <span className={styles.linePlain}>This is the life</span>
          <span className={styles.linePlain}>you are building.</span>
          <span className={styles.lineItalic}>Hear it.</span>
        </h1>

        <p className={`${styles.heroSub} ${styles.fadeUp} ${styles.d2}`}>
          A guided conversation draws out your deepest wishes, desires, and the areas of your life you're ready to elevate — your relationships, your career, your health, your vision of a life fully lived. We turn them into a rich, sensory story set in your future, then narrate it back to you <strong>in your own voice.</strong>
        </p>

        <div className={`${styles.heroActions} ${styles.fadeUp} ${styles.d3}`}>
          <Link href="/user/goal-intake-ai" className={styles.btnPrimary}>
            <StarIcon />
            Create my story — it's free
          </Link>
          <Link href="/science" className={styles.btnGhost}>
            <ClockIcon />
            The science behind it
          </Link>
        </div>

        <div className={`${styles.heroTruths} ${styles.fadeUp} ${styles.d3}`} style={{ animationDelay: '0.45s' }}>
          Your voice. Your story. Your future.
        </div>
      </div>
    </section>
  );
};

// Audio Player Component
const AudioPlayer: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(32);
  const [currentTime, setCurrentTime] = useState("2:02");
  const [litBars, setLitBars] = useState(22);
  const heights = [10, 16, 22, 28, 20, 32, 24, 18, 36, 28, 22, 16, 30, 24, 20, 28, 34, 22, 16, 28, 20, 26, 32, 18, 24, 30, 20, 16, 28, 24, 18, 32, 26, 20, 28, 16, 22, 30, 24, 18, 34, 22, 28, 20, 16, 26, 30, 22, 18, 28, 24, 20, 32, 16, 26, 22, 28, 18];
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          const next = Math.min(100, prev + 0.15);
          if (next >= 100) {
            setIsPlaying(false);
            return 100;
          }
          return next;
        });
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying]);

  useEffect(() => {
    const totalSec = 384; // 6:24
    const sec = Math.round(progress * totalSec / 100);
    const m = Math.floor(sec / 60), s = sec % 60;
    setCurrentTime(`${m}:${s.toString().padStart(2, '0')}`);
    setLitBars(Math.round(progress * heights.length / 100));
  }, [progress, heights.length]);

  return (
    <div className={styles.audioWrap}>
      <div className={`${styles.audioCard} ${styles.fadeUp}`} style={{ animationDelay: '0.55s' }}>
        <div className={styles.acHeader}>
          <div className={styles.acInfo}>
            <div className={styles.acEyebrow}>Sample story</div>
            <div className={styles.acTitle}>A Day in the Life of My Highest Self</div>
            <div className={styles.acMeta}>Personal story · 6 min 24 sec · Generated in your voice</div>
          </div>
          <div className={styles.acBadge}><div className={styles.acBadgeDot}></div>Free sample</div>
        </div>
        <div className={styles.waveform}>
          {heights.map((h, i) => (
            <div
              key={i}
              className={`${styles.wb} ${i < litBars ? styles.lit : ''}`}
              style={{ height: h + 'px' }}
            />
          ))}
        </div>
        <div className={styles.acControls}>
          <button className={styles.playBtn} onClick={togglePlay}>
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <div className={styles.acProg}>
            <div className={styles.acFill} style={{ width: progress + '%' }} />
          </div>
          <div className={styles.acTime}>{currentTime} / 6:24</div>
        </div>
        <div className={styles.acCaption}>
          This is what your finished audio sounds like — except narrated in <em style={{ color: 'var(--accent)', fontStyle: 'normal' }}>your</em> voice, about <em style={{ color: 'var(--accent)', fontStyle: 'normal' }}>your</em> life.
        </div>
      </div>
    </div>
  );
};

// How It Works Section
const HowItWorks: React.FC = () => {
  return (
    <section className={`${styles.section} ${styles.sectionCenter}`} id="how">
      <div className={styles.eyebrow}>How it works</div>
      <h2 className={styles.secTitle}>Four steps to <em>a new reality.</em></h2>
      <p className={styles.secSub}>What follows can last a lifetime.</p>
      <div className={styles.stepsWrap}>
        <div className={styles.steps}>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>01</div>
            <div className={styles.stepIcon}><ChatIcon /></div>
            <div className={styles.stepTitle}>Tell us what your best life looks like</div>
            <div className={styles.stepText}>A guided AI conversation draws out your real vision — where you live, how you feel, who surrounds you, and what your perfect day actually looks like.</div>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>02</div>
            <div className={styles.stepIcon}><StarIcon /></div>
            <div className={styles.stepTitle}>We write your story</div>
            <div className={styles.stepText}>AI crafts a rich, sensory, first-person narrative set in your future — written as if everything you want has already come true. Because in this story, it has.</div>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>03</div>
            <div className={styles.stepIcon}><MicIcon /></div>
            <div className={styles.stepTitle}>Hear it in your voice</div>
            <div className={styles.stepText}>Record a 60-second sample. We clone your voice and deliver your story as audio — narrated by you, for you. Nobody else sounds like you.</div>
          </div>
          <div className={styles.stepCard}>
            <div className={styles.stepNum}>04</div>
            <div className={styles.stepIcon}><ClockIcon /></div>
            <div className={styles.stepTitle}>Listen every day</div>
            <div className={styles.stepText}>Every morning and every night, your story reprograms your subconscious to notice and attract the people, actions, and opportunities that build your life.</div>
          </div>
        </div>
        <p className={styles.stepsNote}>This takes 10–20 minutes and is worth every one of them. Your subconscious responds to specificity — the more fully you inhabit your answers, the more deeply the story reprograms your mind.</p>
      </div>
    </section>
  );
};

// Story Showcase
const StoryShowcase: React.FC = () => {
  return (
    <section className={styles.storySection}>
      <div className={styles.storyInner}>
        <div style={{ textAlign: 'center' }}>
          <div className={styles.eyebrow} style={{ justifyContent: 'center' }}>Your story</div>
          <h2 className={styles.secTitle}>Not a generic script.<br /><em>Your life. Your words.</em></h2>
          <p className={styles.secSub} style={{ marginTop: '0.5rem' }}>Every story is written from scratch based on your conversation. No two are the same.</p>
        </div>
        <div className={styles.storyDemo}>
          <div className={styles.sdTop}>
            <div>
              <div className={styles.sdEyebrow}>Personal manifestation story</div>
              <div className={styles.sdTitle}>A Day in the Life of My Highest Self</div>
              <div className={styles.sdMeta}>1,740 words · ~13 min audio · Generated from your goals</div>
            </div>
            <div className={styles.sdBadge}>✓ Approved</div>
          </div>
          <div className={styles.sdBody}>
            <div className={styles.sdText}>
              I open my eyes before my alarm has a chance to sound. The room is quiet except for the low hum of the sea beyond the open window — that familiar rhythm that has become the backdrop of my whole life here. Pale morning light falls across the terracotta floor in long, warm strips...
              <br /><br />
              I rise without effort, the way I always do now. There is no resistance in the morning anymore, no heaviness I used to carry. I walk barefoot across the cool tiles and step onto the terrace, and there it is — the Atlantic stretching wide and silver under the early sun…
            </div>
            <div className={styles.sdFade}></div>
          </div>
          <div className={styles.sdFooter}>
            <div className={styles.sdNote}>Your story continues for 1,700+ more words</div>
            <Link href="/user/goal-intake-ai" className={styles.sdCta}>Write mine →</Link>
          </div>
        </div>
      </div>
    </section>
  );
};

// Testimonials
const Testimonials: React.FC = () => {
  return (
    <section className={styles.testimonialsSection}>
      <div style={{ textAlign: 'center', maxWidth: '900px', margin: '0 auto' }}>
        <div className={styles.eyebrow} style={{ justifyContent: 'center' }}>Early users</div>
        <h2 className={styles.secTitle}>What people are <em>experiencing.</em></h2>
      </div>
      <div className={styles.testiGrid}>
        <TestiCard
          initials="S"
          name="Sarah M."
          role="Entrepreneur, 34"
          text="I've tried journaling, vision boards, affirmations. Nothing hit like hearing my own voice describe the life I'm building. It feels different — personal."
        />
        <TestiCard
          initials="J"
          name="James K."
          role="Marketing director, 41"
          text="I was skeptical. Three weeks of listening and it changed something in me. I applied for the role I'd been putting off for two years — and got the job."
        />
        <TestiCard
          initials="A"
          name="Amara T."
          role="Teacher, 29"
          text="The conversation to create my story made me cry. I hadn't let myself think about what I actually wanted in years. The process is transformative."
        />
      </div>
    </section>
  );
};

const TestiCard: React.FC<{ initials: string, name: string, role: string, text: string }> = ({ initials, name, role, text }) => (
  <div className={styles.testiCard}>
    <div className={styles.starsRow}>
      {Array(5).fill(0).map((_, i) => (
        <svg key={i} className={styles.starIcon} viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
      ))}
    </div>
    <div className={styles.testiText}>{text}</div>
    <div className={styles.testiAuthor}>
      <div className={styles.testiAvatar}>{initials}</div>
      <div><div className={styles.testiName}>{name}</div><div className={styles.testiRole}>{role}</div></div>
    </div>
  </div>
);

// Final CTA
const FinalCTA: React.FC = () => {
  return (
    <section className={styles.finalCta}>
      <div className={styles.finalHorizon}></div>
      <div className={styles.finalInner}>
        <div className={styles.finalEyebrow}>Your future is waiting</div>
        <h2 className={styles.finalTitle}>The life you're building<br />deserves to be <em>heard.</em></h2>
        <p className={styles.finalSub}>A conversation about your real vision. A story written in your voice. A practice that returns to you every morning and every night — until the life you imagined becomes the life you live.</p>
        <div className={styles.finalActions}>
          <Link href="/user/goal-intake-ai" className={styles.btnPrimary}>
            <StarIcon />
            Begin my story
          </Link>
        </div>
        <p className={styles.finalProof}>Curious about the science? <Link href="/science">Read how it works →</Link></p>
      </div>
    </section>
  );
};

// Footer Component
const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.footLogo}>Manifest<span>MyStory</span></div>
      <div className={styles.footLinks}>
        <Link href="#how">How it works</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/science">The Science</Link>
        <Link href="/mystical">Ancient Wisdom</Link>
        <Link href="#">Privacy</Link>
        <Link href="#">Terms</Link>
      </div>
      <div className={styles.footCopy}>© 2026 ManifestMyStory · Your future is already speaking. We help you listen.</div>
    </footer>
  );
};

// Intersection Observer Hook
const useScrollReveal = () => {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    const elements = document.querySelectorAll(`.${styles.reveal}`);
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);
};

// Main Component
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
      <AudioPlayer />
      <HowItWorks />
      <StoryShowcase />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  );
}
