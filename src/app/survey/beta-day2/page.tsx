"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import "./survey.css";

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
    title: "Step 5 — Audio Experience",
    questions: [
      { id: "audio_overall", label: "Overall audio quality?", type: "scale", min: 1, max: 5, minLabel: "Poor", maxLabel: "Excellent" },
      { id: "audio_pacing", label: "Was the pacing right?", type: "choice", options: ["Too fast", "Just right", "Too slow"] },
      { id: "audio_binaural", label: "Did the binaural beats / background layers enhance the experience?", type: "choice", options: ["Yes, noticeably", "Subtle but good", "Didn't notice", "Distracting"] },
      { id: "audio_feedback", label: "Any issues with the audio quality, volume, or layering?", type: "text" },
    ],
  },
  {
    title: "Step 6 — Listening Practice",
    questions: [
      { id: "listen_when", label: "When do you (or plan to) listen?", type: "choice", options: ["Before sleep", "Morning", "Both", "Other times"] },
      { id: "listen_feel", label: "How did it feel hearing YOUR voice telling your future story?", type: "text" },
    ],
  },
  {
    title: "Step 7 — Pricing (gut reaction)",
    questions: [
      { id: "price_feel_right", label: "Without thinking too hard: what monthly price feels right for this tool?", type: "choice", options: ["Under $10", "$10–$19", "$20–$29", "$30–$39", "$40+"] },
      { id: "price_compared", label: "Compared to other wellness / self-improvement subscriptions you use, ManifestMyStory feels:", type: "choice", options: ["More valuable", "About the same", "Less valuable", "Can't compare"] },
    ],
  },
  {
    title: "Step 8 — Overall Experience",
    questions: [
      { id: "nps", label: "How likely are you to recommend ManifestMyStory to a friend?", type: "nps" },
      { id: "one_improvement", label: "If you could change ONE thing about ManifestMyStory, what would it be?", type: "text" },
      { id: "never_change", label: "What should we NEVER change?", type: "text" },
    ],
  },
  {
    title: "Step 9 — Final Thoughts",
    questions: [
      { id: "testimonial", label: "If you were to describe ManifestMyStory to a friend in one sentence, what would you say?", type: "text" },
      { id: "open_feedback", label: "Anything else you want us to know?", type: "text" },
    ],
  },
];

export default function BetaDay2SurveyPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t") || "";

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const currentStep = STEPS[step];
  const totalSteps = STEPS.length;
  const progress = ((step + 1) / totalSteps) * 100;

  const canAdvance = useMemo(() => {
    if (!currentStep) return false;
    return currentStep.questions.every((q) => {
      if (q.type === "text") return true; // text is optional
      return answers[q.id] !== undefined && answers[q.id] !== "";
    });
  }, [currentStep, answers]);

  const setAnswer = (id: string, value: string | number) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleNext = async () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Submit
      setSubmitting(true);
      setError("");
      try {
        const res = await fetch("/api/beta/survey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, surveyType: "day2", responses: answers, source: "email" }),
        });
        const data = await res.json();
        if (data.success) {
          setDone(true);
        } else {
          setError(data.error === "Survey already submitted." ? "You've already submitted this survey — thank you!" : data.error || "Something went wrong.");
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Auto-scroll on step change
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  if (!token) {
    return (
      <div className="survey-page">
        <div className="survey-card">
          <p className="survey-error">Invalid survey link. Please use the link from your email.</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="survey-page">
        <div className="survey-card survey-done">
          <div className="done-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" stroke="#8DBF7A" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="done-title">Thank you.</h2>
          <p className="done-body">Your feedback is invaluable. We read every single response — and yours will directly shape what gets built next.</p>
          <p className="done-sub">In 5 days, we&apos;ll send one final set of pricing questions. That&apos;s it.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="survey-page">
      <div className="survey-header">
        <span className="survey-logo">Manifest My Story</span>
        <span className="survey-badge">Beta — Day 2 Survey</span>
      </div>

      <div className="survey-progress-wrap">
        <div className="survey-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div className="survey-card">
        <p className="survey-step-label">
          {step + 1} of {totalSteps}
        </p>
        <h2 className="survey-step-title">{currentStep.title}</h2>

        {currentStep.questions.map((q) => (
          <div key={q.id} className="survey-question">
            <label className="survey-q-label">{q.label}</label>

            {q.type === "scale" && (
              <div className="scale-row">
                <span className="scale-end">{q.minLabel}</span>
                <div className="scale-options">
                  {Array.from({ length: q.max - q.min + 1 }, (_, i) => q.min + i).map((v) => (
                    <button key={v} className={`scale-btn ${answers[q.id] === v ? "active" : ""}`} onClick={() => setAnswer(q.id, v)}>
                      {v}
                    </button>
                  ))}
                </div>
                <span className="scale-end">{q.maxLabel}</span>
              </div>
            )}

            {q.type === "choice" && (
              <div className="choice-row">
                {q.options.map((opt) => (
                  <button key={opt} className={`choice-btn ${answers[q.id] === opt ? "active" : ""}`} onClick={() => setAnswer(q.id, opt)}>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {q.type === "nps" && (
              <div className="nps-row">
                <span className="nps-end">Not likely</span>
                <div className="nps-options">
                  {Array.from({ length: 11 }, (_, i) => i).map((v) => (
                    <button key={v} className={`nps-btn ${answers[q.id] === v ? "active" : ""}`} onClick={() => setAnswer(q.id, v)}>
                      {v}
                    </button>
                  ))}
                </div>
                <span className="nps-end">Extremely likely</span>
              </div>
            )}

            {q.type === "text" && (
              <textarea
                className="survey-textarea"
                placeholder="Type your answer…"
                rows={3}
                value={(answers[q.id] as string) || ""}
                onChange={(e) => setAnswer(q.id, e.target.value)}
              />
            )}
          </div>
        ))}

        {error && <p className="survey-error">{error}</p>}

        <div className="survey-nav">
          {step > 0 && (
            <button className="survey-back" onClick={() => setStep(step - 1)}>
              ← Back
            </button>
          )}
          <button className="survey-next" onClick={handleNext} disabled={!canAdvance || submitting}>
            {submitting ? "Submitting…" : step === totalSteps - 1 ? "Submit Feedback →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
