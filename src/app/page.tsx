"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "../app/styles/Home.module.css";
import Sidebar from "../app/components/Sidebar";
import {
  ArrowIcon,
  ExternalIcon,
  InfoIcon,
  CheckIcon,
  ChatIcon,
  StarIcon,
  MicIcon,
  ClockIcon,
  PlayIcon,
  PauseIcon,
} from "../app/components/icons/HomeIcons";
import { Step, PricingPlan, Testimonial } from "../app/types/home";

// Navigation Component
const Navigation: React.FC = () => {
  const { data: session } = useSession();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      {/* Desktop nav — hidden on mobile (Sidebar takes over) */}
      <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ""}`}>
        <Link href="/" className={styles.navLogo}>
          Manifest<span>MyStory</span>
        </Link>

        <div className={styles.navLinks}>
          <Link href="#how" className={styles.navLink}>
            How it works
          </Link>
          <Link href="#pricing" className={styles.navLink}>
            Pricing
          </Link>
          <Link
            href="/science"
            className={`${styles.navLink} ${styles.navScience}`}
          >
            The Science
            <ExternalIcon />
          </Link>
          {session && (
            <Link href="/user/dashboard" className={styles.navLink}>
              Dashboard
            </Link>
          )}
          {!session && (
            <Link href="/auth/signin" className={styles.navLink}>
              Sign In
            </Link>
          )}
        </div>

        <Link
          href={session ? "/user/dashboard" : "/user/goal-intake-ai"}
          className={`${styles.navCta} ${styles.navCtaDesktop}`}
        >
          {session ? "My Dashboard" : "Create My Story — Free"}
        </Link>
      </nav>

      {/* Mobile sidebar — replaces the old burger + drawer */}
      <Sidebar isLandingPage />
    </>
  );
};

// Hero Section
const Hero: React.FC = () => {
  const { data: session } = useSession();
  return (
    <section className={styles.hero}>
      <div className={`${styles.orb} ${styles.orb1}`} />
      <div className={`${styles.orb} ${styles.orb2}`} />
      <div className={`${styles.orb} ${styles.orb3}`} />

      <div className={styles.heroContent}>
        <div className={styles.heroBadge}>
          <div className={styles.badgeDot} />
          Your future, in your own voice
        </div>

        <p className={styles.heroEyebrow}>
          Your future is already speaking. We help you listen.
        </p>

        <h1 className={styles.heroTitle}>
          Hear the life
          <br />
          <em>you're building</em>
          <br />
          every single day.
        </h1>

        <p className={styles.heroSub}>
          Tell us your goals. We write a rich, personal story set in your future
          life — then generate it as audio in your own voice. Listen every
          morning and night to attract what you want.
        </p>

        <div className={styles.heroActions}>
          <Link
            href={session ? "/user/dashboard" : "/user/goal-intake-ai"}
            className={styles.heroPrimary}
          >
            {session ? "View My Stories" : "Create My Story — It's Free"}
            <ArrowIcon />
          </Link>

          <Link href="/science" className={styles.heroGhost}>
            <InfoIcon />
            How does this work?
          </Link>
        </div>

        <div className={styles.heroProof}>
          <div className={styles.proofItem}>
            <CheckIcon />
            No credit card required
          </div>
          <div className={styles.proofDiv} />
          <div className={styles.proofItem}>
            <CheckIcon />
            Story generated in under 2 minutes
          </div>
          <div className={styles.proofDiv} />
          <div className={styles.proofItem}>
            <CheckIcon />
            Your voice. Your story.
          </div>
        </div>
      </div>
    </section>
  );
};

// Audio Demo Component
const AudioDemo: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveformBars, setWaveformBars] = useState<boolean[]>([]);

  const totalDuration = 384; // 6:24 in seconds
  const waveformCount = 72;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Initialize waveform with random heights
    const initialBars = Array.from(
      { length: waveformCount },
      (_, i) => i < 12, // First 12 bars start lit
    );
    setWaveformBars(initialBars);
  }, [waveformCount]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, totalDuration]);

  useEffect(() => {
    // Update waveform based on current time
    const litCount = Math.floor((currentTime / totalDuration) * waveformCount);
    setWaveformBars((prev) => prev.map((_, i) => i < litCount));
  }, [currentTime, totalDuration, waveformCount]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercentage = (currentTime / totalDuration) * 100;

  return (
    <div className={styles.audioDemo}>
      <div className={styles.audioLabel}>Sample story audio</div>

      <div className={styles.audioCard}>
        <div className={styles.acTitle}>
          A Day in the Life of My Highest Self
        </div>
        <div className={styles.acMeta}>
          Personal story · 6 min 24 sec · Generated in your voice
        </div>

        <div className={styles.waveform}>
          {waveformBars.map((isLit, i) => (
            <div
              key={i}
              className={`${styles.wb} ${isLit ? styles.lit : ""}`}
            />
          ))}
        </div>

        <div className={styles.audioCtrl}>
          <button
            className={styles.playBtn}
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <div className={styles.progTrack}>
            <div
              className={styles.progFill}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <span className={styles.timeLbl}>{formatTime(currentTime)}</span>
        </div>
      </div>

      <div className={styles.audioCaption}>
        This is what your finished audio sounds like — except narrated in{" "}
        <em>your</em> voice, about <em>your</em> life.
      </div>
    </div>
  );
};

// How It Works Section
const HowItWorks: React.FC = () => {
  const steps: Step[] = [
    {
      icon: <ChatIcon />,
      title: "Tell us your goals",
      description:
        "A guided AI conversation draws out your vision — where you live, how you feel, who surrounds you, and what your perfect day looks like.",
    },
    {
      icon: <StarIcon />,
      title: "We write your story",
      description:
        "AI crafts a rich, sensory, first-person narrative set in your future — written as if everything you want has already come true.",
      delay: "d1",
    },
    {
      icon: <MicIcon />,
      title: "Hear it in your voice",
      description:
        "Record a 60-second sample. We clone your voice and deliver your story as a personal audio file — narrated by you, for you.",
      delay: "d2",
    },
    {
      icon: <ClockIcon />,
      title: "Listen daily",
      description:
        "Every morning and night, your story reprograms your subconscious to notice and attract the people, actions, and opportunities that build this life.",
      delay: "d3",
    },
  ];

  return (
    <section className={`${styles.section} ${styles.sectionCenter}`} id="how">
      <div className={styles.eyebrow}>How it works</div>
      <h2 className={styles.secTitle}>
        Four steps to
        <br />
        <em>a new reality.</em>
      </h2>
      <p className={styles.secSub}>
        The entire process takes about 20 minutes. What follows can last a
        lifetime.
      </p>

      <div className={styles.steps}>
        {steps.map((step, index) => (
          <div
            key={index}
            className={`${styles.stepCard} ${styles.reveal} ${step.delay ? styles[step.delay] : ""}`}
          >
            <div className={styles.stepCircle}>{step.icon}</div>
            <div className={styles.stepTitle}>{step.title}</div>
            <div className={styles.stepText}>{step.description}</div>
          </div>
        ))}
      </div>
    </section>
  );
};

// Story Preview Section
const StoryPreview: React.FC = () => {
  return (
    <section className={styles.storySection}>
      <div className={styles.storyInner}>
        <div className={`${styles.storyHed} ${styles.reveal}`}>
          <div className={styles.storyEyebrow}>Your story</div>
          <h2>
            Not a generic script.
            <br />
            <em>Your life. Your words.</em>
          </h2>
          <p>
            Every story is written from scratch based on your conversation. No
            two are the same.
          </p>
        </div>

        <div className={`${styles.storyDemo} ${styles.reveal}`}>
          <div className={styles.sdTop}>
            <div>
              <div className={styles.sdEyebrow}>
                Personal Manifestation Story
              </div>
              <div className={styles.sdTitle}>
                A Day in the Life of My Highest Self
              </div>
              <div className={styles.sdMeta}>
                1,740 words · ~13 min audio · Generated from your goals
              </div>
            </div>
            <div className={styles.sdBadge}>✓ Approved</div>
          </div>

          <div className={styles.sdBody}>
            <div className={styles.sdText}>
              I open my eyes before my alarm has a chance to sound. The room is
              quiet except for the low hum of the sea beyond the open window —
              that familiar rhythm that has become the backdrop of my whole life
              here. Pale morning light falls across the terracotta floor in
              long, warm strips, and for a moment I simply lie still and let the
              gratitude wash through me. This is my life. This is actually my
              life.
              <br />
              <br />I rise without effort, the way I always do now. There is no
              resistance in the morning anymore, no heaviness I used to carry. I
              walk barefoot across the cool tiles and step onto the terrace, and
              there it is — the Atlantic stretching wide and silver under the
              early sun…
            </div>
            <div className={styles.sdFade} />
          </div>

          <div className={styles.sdFooter}>
            <div className={styles.sdNote}>
              Your story continues for 1,700+ more words
            </div>
            <Link href="/user/goal-intake-ai" className={styles.sdCta}>
              Write mine <ArrowIcon />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

// Pricing Section
const Pricing: React.FC = () => {
  const plans: PricingPlan[] = [
    {
      name: "Free",
      price: "$0",
      description:
        "Unlimited story creation & editing. Free 2-minute voice sample in your own voice.",
      cta: "Get started",
    },
    {
      name: "Single Story",
      price: "$4.99",
      description:
        "One full audio file in your voice. No subscription — yours to keep forever.",
      cta: "Get one audio",
      delay: "d1",
    },
    {
      name: "Standard",
      price: "$9.99",
      description:
        "5 stories/month, 60 min audio. Library grows — up to 60 stories after 1 year.",
      cta: "Start Standard",
      featured: true,
      delay: "d2",
    },
    {
      name: "Power",
      price: "$19.99",
      description:
        "20 stories/month, 300 min audio. Library grows — up to 240 stories after 1 year.",
      cta: "Start Power",
      delay: "d3",
    },
  ];

  return (
    <section
      className={`${styles.section} ${styles.sectionCenter}`}
      id="pricing"
    >
      <div className={styles.eyebrow}>Simple pricing</div>
      <h2 className={styles.secTitle}>
        Start free.
        <br />
        <em>Upgrade when you're ready.</em>
      </h2>

      <div className={styles.priceCards}>
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`${styles.pc} ${plan.featured ? styles.featured : ""} ${styles.reveal} ${plan.delay ? styles[plan.delay] : ""}`}
          >
            <div className={styles.pcName}>{plan.name}</div>
            <div className={styles.pcPrice}>
              {plan.price} {plan.price !== "$0" && <span>/month</span>}
            </div>
            <div className={styles.pcDesc}>{plan.description}</div>
            <Link
              href="/pricing"
              className={`${styles.pcBtn} ${plan.featured ? styles.solid : styles.outline}`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </div>

      <p className={styles.pricingNote}>
        <Link href="/pricing">See full plan comparison →</Link>
      </p>
    </section>
  );
};

// Testimonials Section
const Testimonials: React.FC = () => {
  const testimonials: Testimonial[] = [
    {
      initials: "S",
      text: "I've tried journaling, vision boards, affirmations. Nothing hit like hearing my own voice describe the life I'm building. It feels different — personal in a way nothing else has.",
      name: "Sarah M.",
      role: "Entrepreneur, 34",
      stars: 5,
    },
    {
      initials: "J",
      text: "I was skeptical. Three weeks in, I've had two conversations I'd been avoiding for years and applied for a role I'd told myself I wasn't ready for.",
      name: "James K.",
      role: "Marketing director, 41",
      stars: 5,
      delay: "d1",
    },
    {
      initials: "A",
      text: "The conversation to create my story made me cry. I hadn't let myself think about what I actually wanted in years. The process itself is transformative.",
      name: "Amara T.",
      role: "Teacher, 29",
      stars: 5,
      delay: "d2",
    },
  ];

  return (
    <section className={styles.testimonials}>
      <div className={styles.testiInner}>
        <div className={styles.eyebrow}>Early users</div>
        <h2 className={styles.secTitle}>
          What people are
          <br />
          <em>experiencing.</em>
        </h2>

        <div className={styles.testiGrid}>
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className={`${styles.testi} ${styles.reveal} ${testimonial.delay ? styles[testimonial.delay] : ""}`}
            >
              <div className={styles.testiStars}>
                {"★".repeat(testimonial.stars)}
              </div>
              <div className={styles.testiText}>{testimonial.text}</div>
              <div className={styles.testiAuthor}>
                <div className={styles.testiAv}>{testimonial.initials}</div>
                <div>
                  <div className={styles.testiName}>{testimonial.name}</div>
                  <div className={styles.testiRole}>{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Final CTA Section
const FinalCTA: React.FC = () => {
  const { data: session } = useSession();
  return (
    <section className={styles.final}>
      <div className={styles.finalContent}>
        <h2 className={styles.finalTitle}>
          Your future is waiting
          <br />
          to be <em>heard.</em>
        </h2>
        <p className={styles.finalSub}>
          It takes 15 minutes to create your story. The rest is just listening.
        </p>
        <Link
          href={session ? "/user/dashboard" : "/user/goal-intake-ai"}
          className={styles.finalBtn}
        >
          {session ? "Go to My Dashboard" : "Create My Story — It's Free"}
          <ArrowIcon />
        </Link>
        <div className={styles.finalNote}>
          Curious about the neuroscience?{" "}
          <Link href="/science">Read the science →</Link>
        </div>
      </div>
    </section>
  );
};

// Footer Component
const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className={styles.footLogo}>
        Manifest<span>MyStory</span>
      </div>

      <div className={styles.footLinks}>
        <Link href="#how">How it works</Link>
        <Link href="/pricing">Pricing</Link>
        <Link href="/science">The Science</Link>
        <Link href="/user/goal-intake-ai">Create my story</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
      </div>

      <div className={styles.footQuote}>
        <p>Your future is already speaking. We help you listen.</p>
      </div>

      <div className={styles.footNote}>© 2026 ManifestMyStory</div>
    </footer>
  );
};

// Intersection Observer for scroll reveals
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
      { threshold: 0.15 },
    );

    document.querySelectorAll(`.${styles.reveal}`).forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
};

// Main Home Component
const Home: React.FC = () => {
  useScrollReveal();
  const router = useRouter();

  useEffect(() => {
    document.title = "ManifestMyStory — Hear Your Future, In Your Own Voice";
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital,wght@0,400;1,400&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Lora:ital@1&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  return (
    <div className={styles.container}>
      <Navigation />
      <Hero />
      <AudioDemo />
      <HowItWorks />
      <StoryPreview />
      <Pricing />
      <Testimonials />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default Home;
