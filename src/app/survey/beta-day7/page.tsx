"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import "../beta-day2/survey.css";

type QuestionDef =
  | { id: string; label: string; type: "choice"; options: string[] }
  | { id: string; label: string; type: "text" };

type StepDef = { title: string; questions: QuestionDef[] };

const STEPS: StepDef[] = [
  {
    title: "Pricing — Four price points",
    questions: [
      { id: "price_too_cheap", label: "At what monthly price would ManifestMyStory feel too cheap — where you'd question whether it actually works?", type: "choice", options: ["Under $5", "$5–$9", "$10–$14", "$15–$19"] },
      { id: "price_good_value", label: "At what monthly price does ManifestMyStory feel like genuinely good value — a fair exchange for what you get?", type: "choice", options: ["$10–$14", "$15–$19", "$20–$24", "$25–$29", "$30–$39"] },
      { id: "price_getting_expensive", label: "At what monthly price does it start feeling expensive — you'd pause, but might still subscribe?", type: "choice", options: ["$20–$24", "$25–$29", "$30–$39", "$40–$49", "$50+"] },
      { id: "price_too_expensive", label: "At what monthly price would you walk away — regardless of how good it is?", type: "choice", options: ["$30–$39", "$40–$49", "$50–$59", "$60–$79", "$80+"] },
    ],
  },
  {
    title: "Final thoughts",
    questions: [
      { id: "price_annual_interest", label: "If we offered a discounted annual plan, would you prefer that over monthly?", type: "choice", options: ["Yes — I'd prefer annual", "Maybe, depends on savings", "No — prefer monthly flexibility"] },
      { id: "pricing_open", label: "Anything else about pricing or value you want us to know?", type: "text" },
    ],
  },
];

export default function BetaDay7SurveyPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("t") || "";

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const currentStep = STEPS[step];
  const totalSteps = STEPS.length;
  const progress = ((step + 1) / totalSteps) * 100;

  const canAdvance = useMemo(() => {
    if (!currentStep) return false;
    return currentStep.questions.every((q) => {
      if (q.type === "text") return true;
      return answers[q.id] !== undefined && answers[q.id] !== "";
    });
  }, [currentStep, answers]);

  const setAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleNext = async () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setSubmitting(true);
      setError("");
      try {
        const res = await fetch("/api/beta/survey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, surveyType: "day7", responses: answers, source: "email" }),
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
            <svg viewBox="0 0 24 24" width="32" height="32" stroke="#C9A84C" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h2 className="done-title">Thank you.</h2>
          <p className="done-body">This is the last survey we will send. Your access continues as normal — and your honest numbers will directly set the launch price.</p>
          <p className="done-sub">We are deeply grateful, truly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="survey-page survey-page--gold">
      <div className="survey-header">
        <span className="survey-logo" style={{ color: "#C9A84C" }}>Manifest My Story</span>
        <span className="survey-badge" style={{ color: "#C9A84C", borderColor: "rgba(201,168,76,0.3)" }}>Beta — Day 7</span>
      </div>

      <div className="survey-progress-wrap">
        <div className="survey-progress-bar" style={{ width: `${progress}%`, background: "#C9A84C" }} />
      </div>

      <div className="survey-card">
        <p className="survey-step-label">
          {step + 1} of {totalSteps}
        </p>
        <h2 className="survey-step-title">{currentStep.title}</h2>

        {currentStep.questions.map((q) => (
          <div key={q.id} className="survey-question">
            <label className="survey-q-label">{q.label}</label>

            {q.type === "choice" && (
              <div className="choice-row">
                {q.options.map((opt) => (
                  <button key={opt} className={`choice-btn ${answers[q.id] === opt ? "active gold" : ""}`} onClick={() => setAnswer(q.id, opt)}>
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {q.type === "text" && (
              <textarea
                className="survey-textarea"
                placeholder="Type your answer…"
                rows={3}
                value={answers[q.id] || ""}
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
          <button className="survey-next" onClick={handleNext} disabled={!canAdvance || submitting} style={step === totalSteps - 1 ? { background: "#C9A84C" } : {}}>
            {submitting ? "Submitting…" : step === totalSteps - 1 ? "Submit Pricing Feedback →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
