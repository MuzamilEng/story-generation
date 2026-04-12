"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "../styles/FeedbackSurvey.module.css";

/* ── QUESTION TYPES ────────────────────────────────────────── */
type QuestionDef =
  | { id: string; label: string; type: "scale"; min: number; max: number; minLabel: string; maxLabel: string }
  | { id: string; label: string; type: "choice"; options: string[] }
  | { id: string; label: string; type: "nps" }
  | { id: string; label: string; type: "text" };

type StepDef = { title: string; questions: QuestionDef[] };

const STEPS: StepDef[] = [
  {
    title: "Step 1 — Onboarding & Setup",
    questions: [
      { id: "onboarding_clarity", label: "How easy was it to understand what ManifestMyStory does when you first arrived?", type: "scale", min: 1, max: 5, minLabel: "Confusing", maxLabel: "Crystal Clear" },
      { id: "onboarding_expectations", label: "Did the onboarding explain what to expect before you started?", type: "choice", options: ["Yes", "No", "Somewhat"] },
      { id: "onboarding_confusion", label: "What, if anything, confused you during setup?", type: "text" },
    ],
  },
  {
    title: "Step 2 — Life Area & Goal Intake",
    questions: [
      { id: "goal_ease", label: "How easy was it to choose your life areas and enter your goals?", type: "scale", min: 1, max: 5, minLabel: "Very Difficult", maxLabel: "Very Easy" },
      { id: "goal_personal", label: "Did the goal intake feel personal and specific to you?", type: "scale", min: 1, max: 5, minLabel: "Generic", maxLabel: "Very Personal" },
      { id: "goal_natural", label: "Were you able to enter your goals the way you naturally think about them?", type: "choice", options: ["Yes", "No", "Partially"] },
      { id: "goal_unclear", label: "Any part of the goal intake that felt unclear or limiting?", type: "text" },
    ],
  },
  {
    title: "Step 3 — Voice Cloning",
    questions: [
      { id: "voice_ease", label: "How easy was the voice recording and cloning process?", type: "scale", min: 1, max: 5, minLabel: "Very Difficult", maxLabel: "Effortless" },
      { id: "voice_quality", label: "How satisfied are you with how your cloned voice sounds?", type: "scale", min: 1, max: 5, minLabel: "Disappointed", maxLabel: "Impressed" },
      { id: "voice_hesitation", label: "Did anything about the voice cloning step make you hesitate or feel uncomfortable?", type: "text" },
    ],
  },
  {
    title: "Step 4 — Story Generation",
    questions: [
      { id: "story_speed", label: "How long did it take to generate your story?", type: "choice", options: ["Under 30s", "30–60s", "1–2 min", "Longer"] },
      { id: "story_personal", label: "Did your story feel personalized to YOUR specific goals?", type: "scale", min: 1, max: 5, minLabel: "Very Generic", maxLabel: "Deeply Personal" },
      { id: "story_goals_included", label: "Did the story include your specific goals and proof actions?", type: "choice", options: ["Yes", "No", "Partially"] },
      { id: "story_writing_quality", label: "How would you describe the quality of the writing in the story?", type: "scale", min: 1, max: 5, minLabel: "Poor", maxLabel: "Excellent" },
      { id: "story_feedback", label: "Was there anything in the story that felt off, generic, or that you'd want changed?", type: "text" },
    ],
  },
  {
    title: "Step 5 — Audio Playback Experience",
    questions: [
      { id: "audio_feeling", label: "How did it feel to hear the story narrated in your own voice?", type: "scale", min: 1, max: 5, minLabel: "Awkward", maxLabel: "Powerful" },
      { id: "audio_quality", label: "Did the audio quality meet your expectations?", type: "scale", min: 1, max: 5, minLabel: "Poor", maxLabel: "Excellent" },
      { id: "audio_listen_regularly", label: "How likely are you to listen to this story regularly before sleep?", type: "scale", min: 1, max: 5, minLabel: "Not at all", maxLabel: "Very Likely" },
      { id: "audio_music", label: "Did the background music/audio enhance or distract from the experience?", type: "choice", options: ["Enhanced", "Neutral", "Distracted"] },
    ],
  },
  {
    title: "Step 6 — Overall Experience",
    questions: [
      { id: "overall_rating", label: "How would you rate your overall experience with ManifestMyStory?", type: "scale", min: 1, max: 5, minLabel: "Poor", maxLabel: "Excellent" },
      { id: "nps", label: "How likely are you to recommend this to a friend or family member?", type: "nps" },
      { id: "improve", label: "What is the #1 thing we should improve before public launch?", type: "text" },
      { id: "loved", label: "What did you love most about the experience?", type: "text" },
      { id: "pay", label: "Would you pay for this product? If yes, what price feels fair?", type: "text" },
      { id: "missing", label: "Is there anything you expected to find that was missing?", type: "text" },
    ],
  },
];

/* ── QUESTION COMPONENTS ───────────────────────────────────── */
const ScaleQuestion: React.FC<{
  q: Extract<QuestionDef, { type: "scale" }>;
  value: number | undefined;
  onChange: (v: number) => void;
}> = ({ q, value, onChange }) => (
  <div>
    <div className={styles.scaleGroup}>
      {Array.from({ length: q.max - q.min + 1 }, (_, i) => q.min + i).map((n) => (
        <button
          key={n}
          type="button"
          className={`${styles.scaleBtn} ${value === n ? styles.selected : ""}`}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
    <div className={styles.scaleLabels}>
      <span className={styles.scaleLabel}>{q.minLabel}</span>
      <span className={styles.scaleLabel}>{q.maxLabel}</span>
    </div>
  </div>
);

const ChoiceQuestion: React.FC<{
  options: string[];
  value: string | undefined;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div className={styles.choiceGroup}>
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        className={`${styles.choiceBtn} ${value === opt ? styles.selected : ""}`}
        onClick={() => onChange(opt)}
      >
        {opt}
      </button>
    ))}
  </div>
);

const NPSQuestion: React.FC<{
  value: number | undefined;
  onChange: (v: number) => void;
}> = ({ value, onChange }) => (
  <div>
    <div className={styles.npsGroup}>
      {Array.from({ length: 11 }, (_, i) => (
        <button
          key={i}
          type="button"
          className={`${styles.npsBtn} ${value === i ? styles.selected : ""}`}
          onClick={() => onChange(i)}
        >
          {i}
        </button>
      ))}
    </div>
    <div className={styles.scaleLabels}>
      <span className={styles.scaleLabel}>Not at all</span>
      <span className={styles.scaleLabel}>Definitely</span>
    </div>
  </div>
);

/* ── MAIN SURVEY PAGE ──────────────────────────────────────── */
export default function FeedbackPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const step = STEPS[currentStep];

  const setValue = (id: string, value: string | number) => {
    setResponses((prev) => ({ ...prev, [id]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses }),
      });

      if (res.ok) {
        setSubmitted(true);
      }
    } catch {
      // Silent fail — user can retry
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLastStep = currentStep === STEPS.length - 1;

  if (submitted) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.thankYou}>
            <div className={styles.thankYouIcon}>✦</div>
            <h2 className={styles.thankYouTitle}>Thank you!</h2>
            <p className={styles.thankYouText}>
              Your feedback means the world to us and will shape the final product.
            </p>
            <Link href="/user/dashboard" className={styles.dashboardLink}>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Top bar with back button and step counter */}
      <div className={styles.topBar}>
        <Link href="/user/dashboard" className={styles.backToApp}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Dashboard
        </Link>
        <span className={styles.stepCounter}>
          {currentStep + 1} / {STEPS.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
        />
      </div>

      <div className={styles.card}>
        <div className={styles.logo}>
          Manifest<span>My</span>Story
        </div>

        <div className={styles.header}>
          <h1 className={styles.title}>Beta Feedback</h1>
          <p className={styles.intro}>
            Thank you for being an early tester of ManifestMyStory. Your honest feedback
            helps us build something truly powerful. This will take about 3 minutes.
          </p>
        </div>

        {/* Step dots */}
        <div className={styles.stepNav}>
          {STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.stepDot} ${i === currentStep ? styles.active : ""} ${i < currentStep ? styles.completed : ""}`}
              onClick={() => i <= currentStep && setCurrentStep(i)}
              aria-label={`Step ${i + 1}`}
            />
          ))}
        </div>

        {/* Current step */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{step.title}</h3>
          {step.questions.map((q) => (
            <div key={q.id} className={styles.question}>
              <p className={styles.questionLabel}>{q.label}</p>
              {q.type === "scale" && (
                <ScaleQuestion
                  q={q}
                  value={responses[q.id] as number | undefined}
                  onChange={(v) => setValue(q.id, v)}
                />
              )}
              {q.type === "choice" && (
                <ChoiceQuestion
                  options={q.options}
                  value={responses[q.id] as string | undefined}
                  onChange={(v) => setValue(q.id, v)}
                />
              )}
              {q.type === "nps" && (
                <NPSQuestion
                  value={responses[q.id] as number | undefined}
                  onChange={(v) => setValue(q.id, v)}
                />
              )}
              {q.type === "text" && (
                <textarea
                  className={styles.textInput}
                  placeholder="Your thoughts..."
                  value={(responses[q.id] as string) || ""}
                  onChange={(e) => setValue(q.id, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className={styles.navButtons}>
          <button
            type="button"
            className={styles.backBtn}
            onClick={handleBack}
            style={{ visibility: currentStep === 0 ? "hidden" : "visible" }}
          >
            ← Back
          </button>
          {isLastStep ? (
            <button
              type="button"
              className={styles.nextBtn}
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? <div className={styles.spinner} /> : "Submit Feedback"}
            </button>
          ) : (
            <button type="button" className={styles.nextBtn} onClick={handleNext}>
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
