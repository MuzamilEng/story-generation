// app/our-story/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import styles from "../styles/OurStory.module.css";

export default function OurStoryPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileOverlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Scroll reveal observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );

    document
      .querySelectorAll(`.${styles.fadeIn}, .${styles.fadeInOpacity}`)
      .forEach((el) => {
        observer.observe(el);
      });

    return () => observer.disconnect();
  }, [mounted]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  if (!mounted) return null;

  return (
    <div className={styles.container}>
      {/* Mobile Menu */}
      <div
        ref={mobileOverlayRef}
        className={`${styles.mobileOverlay} ${menuOpen ? styles.open : ""}`}
        onClick={closeMenu}
      />
      <div
        ref={mobileMenuRef}
        className={`${styles.mobileMenu} ${menuOpen ? styles.open : ""}`}
      >
        <ul className={styles.mobileNavLinks}>
          <li>
            <a href="/#how" onClick={closeMenu}>
              How it works
            </a>
          </li>
          <li>
            <a href="/science" onClick={closeMenu}>
              The Science
            </a>
          </li>
          <li>
            <a href="/quantum" onClick={closeMenu}>
              The Quantum Field
            </a>
          </li>
          <li>
            <a href="/mystical" onClick={closeMenu}>
              Ancient Wisdom
            </a>
          </li>
          <li>
            <a href="/why-it-works" onClick={closeMenu}>
              Why it works
            </a>
          </li>
          <li>
            <a href="/our-story" className={styles.active} onClick={closeMenu}>
              Our story
            </a>
          </li>
        </ul>
        <div className={styles.mobileNavRight}>
          <a href="/auth/signin" className={styles.mobileSignin}>
            Sign In
          </a>
          <a href="/#invite" className={styles.mobileInvite}>
            Request invitation
          </a>
        </div>
      </div>

      {/* Navbar */}
      <nav className={styles.nav}>
        <a href="/" className={styles.navLogo}>
          Manifest My Story
        </a>
        <ul className={styles.navLinks}>
          <li>
            <a href="/#how">How it works</a>
          </li>
          <li>
            <a href="/science">The Science</a>
          </li>
          <li>
            <a href="/why-it-works">Why it works</a>
          </li>
          <li>
            <a href="/our-story" className={styles.active}>
              Our story
            </a>
          </li>
        </ul>
        <div className={styles.navRight}>
          <a href="/auth/signin" className={styles.navSignin}>
            Sign In
          </a>
          <div className={styles.navDivider} />
          <div className={styles.navCta}>
            <a href="/#invite">Request invitation</a>
          </div>
        </div>
        <button
          className={styles.navMobileBtn}
          onClick={toggleMenu}
          aria-label="Menu"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {menuOpen ? (
              <path d="M18 6L6 18M6 6l12 12" />
            ) : (
              <>
                <path d="M3 12h18M3 6h18M3 18h18" />
              </>
            )}
          </svg>
        </button>
      </nav>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroLabel}>Our story</div>
        <h1 className={styles.heroHeadline}>
          I built this for myself
          <br />
          and my team. Then I realized
          <br />
          <em>I can transform people's lives.</em>
        </h1>
        <p className={styles.heroSub}>
          Six years. A notebook. A voice recorder. A business goal with no clear
          path. A practice that changed everything — and then pointed me toward
          something much larger than myself.
        </p>
      </div>

      <div className={styles.divider} />

      {/* Chapter 1 */}
      <div className={styles.chapterOne}>
        <div className={styles.chapterOneGrid}>
          <div className={`${styles.chapterLeft} ${styles.fadeIn}`}>
            <span className={styles.chapterNum}>01</span>
            <div className={styles.chapterEyebrow}>The beginning</div>
            <h2 className={styles.chapterHeadline}>
              A notebook, a voice recorder, and a business goal with no clear
              path
            </h2>
            <p className={styles.chapterBody}>
              Six years ago I hired a business coach — a serious, significant
              commitment I was not fully certain I could justify. The strategy
              he gave me was valuable. But the practice he gave me changed
              everything.
            </p>
            <p className={styles.chapterBody}>
              He taught me to start by getting ruthlessly clear on my goals —
              not vague aspirations, but specific, measurable outcomes. Then he
              showed me how to build a story around them. Not a story about
              wanting those things. A story set in a future where they had
              already happened, written in present tense, grounded in sensory
              detail. The kind of detail your subconscious can inhabit.
            </p>
            <p className={styles.chapterBody}>
              If I wanted to sell a home, I would not write "I sold the house."
              I would write myself into the scene:{" "}
              <em>
                the new owners invite me to dinner, we sit around their table,
                and they tell me how much they love the home and how proud they
                are of what my team built for them.
              </em>{" "}
              If I was pursuing a project acquisition that had not happened yet,
              I would envision myself already working with my design team on the
              architecture — in full detail, months before the deal closed. The
              goal was already real in the story. The subconscious cannot
              distinguish a vivid imagined experience from a real one. That is
              the mechanism.
            </p>
            <p className={styles.chapterBody}>
              Then record yourself reading that story. Listen every morning when
              you wake up, and every night before you fall asleep — when your
              brain is in a theta wave state, and your subconscious is most open
              to what your own voice is telling it.
            </p>

            <div className={styles.pullQuote}>
              <p>
                I felt a little ridiculous the first time I did it.{" "}
                <em>But the results were undeniable.</em> Goals I had been
                chasing for years started showing up — not because the universe
                handed them to me, but because my subconscious started filtering
                for opportunities I had been walking past my whole life.
              </p>
              <cite>— Michael Ziman, Founder</cite>
            </div>

            <p className={styles.chapterBody}>
              That first contract became twelve. Over six years, between myself
              and a close friend who went on the same journey,{" "}
              <strong>
                we invested everything we could find in learning how the
                subconscious mind actually works
              </strong>{" "}
              — coaching, research, NLP training, neuroscience. The number does
              not matter. What matters is what we distilled from it.
            </p>
            <p className={styles.chapterBody}>
              What began as a personal practice grew into something I started
              sharing with my team at Ziman Development. I wanted the people
              closest to me to have access to the same tool. But as the practice
              evolved — as I added hypnotic induction, identity statements, NLP
              anchoring — the stories were growing. Mine was approaching twenty
              minutes. And the manual process of recording them, managing audio
              quality, dealing with background noise and interruptions, was
              becoming a real obstacle.{" "}
              <em>
                For me and for my team, the practice was breaking down in
                execution.
              </em>
            </p>
            <p className={styles.chapterBody}>
              That is what started this. Not a grand vision. A practical problem
              — my own and my team's — and the realization that if the most
              powerful practice I had ever found was this difficult to sustain
              at a high level, most people would never get there at all.
            </p>
          </div>

          <div
            className={`${styles.chapterRight} ${styles.fadeInOpacity} ${styles.delay1}`}
          >
            <div className={styles.chapterFacts}>
              <div className={styles.chapterFact}>
                <div className={styles.factLabel}>The first morning</div>
                <div className={styles.factDesc}>
                  I felt a little ridiculous. I was lying in bed, listening to
                  my own voice describe a future I had not built yet. A home I
                  did not own. A business outcome that had not happened. But
                  something about hearing it in my own voice — at the edge of
                  sleep, when the critical mind goes quiet — made it land
                  differently than anything I had tried before.
                </div>
              </div>

              <div className={styles.chapterFact}>
                <div className={styles.factLabel}>
                  The moment it became undeniable
                </div>
                <div className={styles.factDesc}>
                  A goal I had been writing into the story for two years arrived
                  — not the way I had imagined, not on the timeline I expected,
                  but unmistakably real. I had not stumbled into it. I had been
                  filtering for it without realizing, noticing things I had been
                  walking past my whole life. That is when I understood what the
                  practice was actually doing.
                </div>
              </div>

              <div className={styles.chapterFact}>
                <div className={styles.factLabel}>
                  The goal that never arrived
                </div>
                <div className={styles.factDesc}>
                  There is one goal I never hit. And when I finally stopped to
                  examine why, I realized I had never truly wanted it — not at
                  the level where the subconscious takes it seriously. The
                  practice will surface this too. What you think you want and
                  what you actually want are sometimes different things. That is
                  not failure. That is the practice working.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Honest Section */}
      <div className={`${styles.honestSection} ${styles.fadeIn}`}>
        <div className={styles.honestInner}>
          <div className={styles.honestEyebrow}>
            The part most people do not tell you
          </div>
          <h2 className={styles.honestHeadline}>
            The timing is not always yours to control. And not every goal will
            arrive — nor should it.
          </h2>

          <div className={styles.honestGrid}>
            <div className={styles.honestCard}>
              <span className={styles.honestCardTag}>On timing</span>
              <p className={styles.honestCardText}>
                <em>Twice, the goal arrived a year late.</em> I used to call
                that failure. Now I understand it as the process completing on
                its own schedule.
              </p>
              <p className={styles.honestCardSub}>
                The timing was not mine to control. The direction was. And I
                have learned to program with that in mind — to hold goals
                without gripping them, and to trust the process even when it
                feels slow.
              </p>
            </div>
            <div className={styles.honestCard}>
              <span className={styles.honestCardTag}>On misalignment</span>
              <p className={styles.honestCardText}>
                There is one goal I never hit. And when I stopped to examine
                why, I realized I had never truly wanted it — not at my core.
              </p>
              <p className={styles.honestCardSub}>
                The practice will surface this. What you once thought you wanted
                may not make you content. Life changes. Goals evolve. That is
                not failure — that is the practice working. The story should
                grow with you.
              </p>
            </div>
          </div>

          <p className={styles.honestClose}>
            <strong>ManifestMyStory is a tool.</strong> The practice is showing
            up for it consistently, trusting the intuition that develops, and
            seizing the opportunities when they appear. For everything else —
            how to listen, how to feel it, how to stay committed when momentum
            builds — visit our{" "}
            <a href="/best-practices">Best Practices guide</a>.
          </p>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Chapter 2 */}
      <div className={`${styles.chapterTwo} ${styles.fadeIn}`}>
        <div className={styles.chapterEyebrow}>The expansion</div>
        <h2 className={styles.chapterTwoHeadline}>
          Then I programmed a bigger purpose into the practice itself.
        </h2>
        <p className={styles.chapterTwoSub}>
          Every year the goals expanded. Every year the method grew more
          powerful. And then something shifted — from building a successful
          business to asking a larger question.
        </p>

        <div className={styles.timeline}>
          <div className={styles.timelineItem}>
            <div className={styles.timelineLeft}>
              <span className={styles.timelineYear}>Year 1–2</span>
              <div className={styles.timelineMarker}>
                Business goals, first results
              </div>
            </div>
            <div className={styles.timelineRight}>
              <p className={styles.timelineBody}>
                The practice began with concrete, measurable business goals —
                revenue, growth, specific outcomes. The story was focused and
                practical. And the results were undeniable. Goals that had felt
                impossibly distant started arriving. Not all at once. Not in
                straight lines. But reliably, over time, in ways that
                compounded.
              </p>
            </div>
          </div>

          <div className={styles.timelineItem}>
            <div className={styles.timelineLeft}>
              <span className={styles.timelineYear}>Year 3–5</span>
              <div className={styles.timelineMarker}>The method deepens</div>
            </div>
            <div className={styles.timelineRight}>
              <p className={styles.timelineBody}>
                The practice never stood still. Each year brought new layers —
                NLP anchoring, hypnotic induction, identity-level affirmations,
                theta audio. Research led to refinement. Refinement led to
                deeper results. My close friend and I continued to push the
                practice further, sharing what we each discovered, building
                something that neither of us could have built alone.{" "}
                <em>
                  The method was becoming something more powerful than we had
                  started with.
                </em>
              </p>
            </div>
          </div>

          <div className={styles.timelineItem}>
            <div className={styles.timelineLeft}>
              <span className={styles.timelineYear}>Year 5–6</span>
              <div className={styles.timelineMarker}>
                The practice grows — and the manual process breaks
              </div>
            </div>
            <div className={styles.timelineRight}>
              <p className={styles.timelineBody}>
                As the method became more sophisticated — hypnotic induction,
                identity statements, NLP anchoring layers — the stories grew
                longer. Mine was approaching twenty minutes. Recording them
                manually, managing audio quality, dealing with background noise
                and interruptions, was becoming a genuine obstacle. I was
                running this for my team at Ziman Development too, and the
                friction was real for all of us.{" "}
                <em>
                  The practice that had changed everything was becoming
                  difficult to sustain at the level it deserved.
                </em>{" "}
                I started piecing together a solution — purely for myself and my
                team. Not a product. A fix to a problem we were all
                experiencing.
              </p>
            </div>
          </div>

          <div className={styles.timelineItem}>
            <div className={styles.timelineLeft}>
              <span className={styles.timelineYear}>Year 6</span>
              <div className={styles.timelineMarker}>
                A different kind of goal
              </div>
            </div>
            <div className={styles.timelineRight}>
              <p className={styles.timelineBody}>
                Something shifted. The business goals were being met. The
                personal goals were being met. And I found myself asking a
                question I had never asked before in the story:{" "}
                <em>What do I want to do for other people?</em> Not in a vague,
                aspirational way — but specifically. Programmed into the
                practice with the same precision and sensory detail as every
                other goal before it.{" "}
                <strong>
                  I wanted to make a life-changing impact for 100,000 people
                  over the coming years.
                </strong>{" "}
                I did not have a plan. I just put it in the story. I described
                the feeling.
              </p>
            </div>
          </div>

          <div className={styles.timelineItem}>
            <div className={styles.timelineLeft}>
              <span className={styles.timelineYear}>2026</span>
              <div className={styles.timelineMarker}>
                The coincidence that became the mission
              </div>
            </div>
            <div className={styles.timelineRight}>
              <p className={styles.timelineBody}>
                As the technical solution came together, something clicked into
                place. I had previously programmed into my own story a goal to
                make a life-changing impact for 100,000 people. And here I was —
                having built, for entirely practical reasons, a tool that could
                bring this practice to anyone willing to commit to it.{" "}
                <em>
                  The coincidence was not lost on me. It felt like the practice
                  working exactly as it always had
                </em>{" "}
                — surfacing the next step at the moment I was ready for it. The
                intention and energy behind sharing ManifestMyStory, and the
                research and methodology behind it, come directly from that
                alignment. This did not start with a pitch deck. It started with
                a broken recording process, a team that needed something better,
                and a goal I had already written into my story.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tanzania Section */}
      <div className={`${styles.tanzaniaSection} ${styles.fadeIn}`}>
        <div className={styles.tanzaniaInner}>
          <div className={styles.tanzaniaGrid}>
            <div className={styles.tanzaniaLeft}>
              <div className={styles.tanzaniaEyebrow}>Proof of purpose</div>
              <h2 className={styles.tanzaniaHeadline}>
                The mission to give back started small.{" "}
                <em>Then it kept asking for more.</em>
              </h2>
              <p className={styles.tanzaniaBody}>
                I started volunteering at a soup kitchen. It was rewarding —
                genuinely. But I kept leaving with the same question pulling at
                me: <em>how do I make more impact?</em> Something in me was not
                satisfied with the scale.
              </p>
              <p className={styles.tanzaniaBody}>
                I started mentoring a student. Watched her work. Watched her
                grow. And last year, she was accepted into her first-choice
                college. That moment was real. It mattered. But it was also a
                significant time commitment — and again, the same question
                surfaced: <strong>how do I reach more people?</strong>
              </p>
              <p className={styles.tanzaniaBody}>
                I did my research. I found an opportunity to fund a water
                treatment plant for a village in Tanzania — a community of over
                11,500 people without access to clean, sustainable water. I
                decided to fund it. Not because it fell into my lap, but because
                the mission I had been programming —{" "}
                <em>to make a life-changing impact at scale</em> — had been
                shaping my attention, my research, and my willingness to say yes
                when the right opportunity appeared.
              </p>
              <p className={styles.tanzaniaBody}>
                It is a two-year project, currently underway. And this year, I
                am planning to bring my family to Tanzania — to stand in that
                village with my children and show them what becomes possible
                when you get clear on a purpose and commit to it completely.
              </p>

              <div className={styles.tanzaniaStat}>
                <span className={styles.tanzaniaStatNum}>11,500</span>
                <div className={styles.tanzaniaStatLabel}>
                  People gaining access to clean, sustainable water
                </div>
                <div className={styles.tanzaniaStatSub}>
                  From a soup kitchen to a student's college acceptance to a
                  village in Tanzania. The mission kept asking for more. This is
                  where it led.
                </div>
              </div>
            </div>

            <div className={styles.tanzaniaRight}>
              <div className={styles.tanzaniaQuoteBlock}>
                <span className={styles.tanzaniaQuoteMark}>"</span>
                <p className={styles.tanzaniaQuoteText}>
                  The question I kept asking —{" "}
                  <em>how do I make more impact?</em> — was not anxiety. It was
                  a signal. My subconscious had been programmed for a version of
                  me that could not settle for small.
                </p>
                <p className={styles.tanzaniaQuoteText}>
                  The soup kitchen mattered. The student mattered. And they led
                  me somewhere bigger — because I kept asking for more, and
                  because I did the research and took the action when the right
                  path appeared.
                </p>
                <p className={styles.tanzaniaQuoteText}>
                  <em>
                    11,500 people will have clean water because I funded the
                    research, made the decision, and committed.
                  </em>{" "}
                  Not because the opportunity found me. Because I had become the
                  kind of person who was looking for it.
                </p>
                <p className={styles.tanzaniaQuoteText}>
                  That is what this practice does. It does not hand you things.
                  It makes you someone who sees the door — and walks through it.
                </p>
                <div className={styles.tanzaniaQuoteAttr}>
                  Michael Ziman — Founder, ManifestMyStory
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Mission Section */}
      <div className={`${styles.missionSection} ${styles.fadeIn}`}>
        <h2 className={styles.missionHeadline}>
          Built for myself. Shared with my team.{" "}
          <em>Now offered to the world.</em>
        </h2>

        <div className={styles.missionBlock}>
          <div className={styles.missionNumberCol}>
            <span className={styles.missionBigNum}>100K</span>
            <div className={styles.missionBigLabel}>Lives — the goal</div>
          </div>
          <div className={styles.missionTextCol}>
            <p className={styles.missionText}>
              The practice started with one person. Then it spread to a team.
              Then I programmed into my own story that I wanted to make a
              life-changing impact for <em>100,000 lives</em> over the coming
              years — and ManifestMyStory is the most direct path toward that
              goal I have ever had.
            </p>
            <p className={styles.missionSub}>
              What my team experienced, I now want to make available to
              everyone. Not just the people in my world, not just those who can
              afford high-level coaching — but anyone who is willing to show up
              for the practice. Your decision to sign up is part of something
              larger than a wellness app. It is part of the fulfillment of that
              intention.
            </p>
          </div>
        </div>

        <div className={styles.missionPaths}>
          <div className={styles.missionPath}>
            <span className={styles.pathTag}>Path one</span>
            <h3 className={styles.pathTitle}>
              Direct access — bringing the practice to individuals
            </h3>
            <p className={styles.pathBody}>
              ManifestMyStory makes available to anyone what previously required
              years of coaching and a significant financial investment.{" "}
              <strong>
                The tool does the building. The only requirement is the
                willingness to show up for it.
              </strong>{" "}
              Every person who commits to this practice and transforms their
              life is one step toward 100,000.
            </p>
          </div>
          <div className={styles.missionPath}>
            <span className={styles.pathTag}>Path two</span>
            <h3 className={styles.pathTitle}>
              Built for individuals. Designed to scale with coaches and
              practitioners.
            </h3>
            <p className={styles.pathBody}>
              The most effective coaches are not just giving their clients
              insight — they are giving them tools. ManifestMyStory is designed
              to become that tool: something a coach can offer their clients as
              the daily practice that compounds everything else they are working
              on together.{" "}
              <strong>One coach, many clients, one mission.</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Coaching Note */}
      <div className={`${styles.coachingNote} ${styles.fadeIn}`}>
        <div className={styles.coachingInner}>
          <p className={styles.coachingText}>
            <em>It isn't magic.</em> It takes commitment. But once you start —
            it feels magical. Because the opportunities begin to appear. The
            clarity arrives. And you start making decisions like the person in
            your story.
          </p>
          <p className={styles.coachingSub}>
            Ancient traditions called it alignment. Quantum physicists call it
            field resonance. Neuroscientists call it reticular activation.
            Whatever name you give it — once you experience it, you will never
            question the process again.
          </p>
        </div>
      </div>

      <div className={styles.divider} />

      {/* Closing */}
      <div className={`${styles.closingSection} ${styles.fadeIn}`}>
        <span className={styles.closingMark}>"</span>
        <p className={styles.closingText}>
          I built this for myself. Then for my team. Then I realized it was
          meant for anyone willing to do the work.{" "}
          <em>
            The journey is the point — keep growing, keep asking for more, and
            trust what surfaces.
          </em>
        </p>
        <div className={styles.closingAttr}>
          Michael Ziman — Founder, ManifestMyStory
        </div>

        <div className={styles.ctaBlock}>
          <a href="/#invite" className={styles.ctaBtn}>
            Request founding access →
          </a>
          <p className={styles.ctaNote}>
            <strong>500 founding spots only.</strong> 50% off for life, locked
            in before public launch.
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        <a href="/" className={styles.footerLogo}>
          Manifest My Story
        </a>
        <p className={styles.footerCopy}>
          Copyright &copy; 2026 Manifest My Story. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
