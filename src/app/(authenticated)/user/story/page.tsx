"use client";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  Suspense,
} from "react";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "../../../styles/Story.module.css";
import {
  CheckIcon,
  ArrowIcon,
  EditIcon,
  DoneIcon,
  StarIcon,
  RefreshIcon,
  CircleIcon,
  InfoIcon,
  MicIcon,
  SparkleIcon,
} from "../../../components/icons/StoryIcons";
import { ChecklistItem, GenerationStep } from "../../../types/story";
import {
  UserAnswers,
  normalizeGoals,
  splitIntroFromStory,
} from "@/lib/story-utils";
import { useStoryStore } from "@/store/useStoryStore";
import { useGlobalUI } from "@/components/ui/global-ui-context";

// Step Item Component
interface StepItemProps {
  number: number;
  label: string;
  status: "done" | "active" | "pending";
}

const StepItem: React.FC<StepItemProps> = ({ number, label, status }) => (
  <div className={`${styles.stepItem} ${styles[status]}`}>
    <div className={styles.stepNum}>
      {status === "done" ? <CheckIcon /> : number}
    </div>
    {label}
  </div>
);

// Vision Item Component
interface VisionItemProps {
  label: string;
  value: string;
}

const VisionItem: React.FC<VisionItemProps> = ({ label, value }) => (
  <div className={styles.visionItem}>
    <div className={styles.visionLabel}>{label}</div>
    <div className={styles.visionValue}>{value || "—"}</div>
  </div>
);

// Category Tags Component
interface CategoryTagsProps {
  categories: string[];
}

const CategoryTags: React.FC<CategoryTagsProps> = ({ categories }) => (
  <div className={styles.catTags}>
    {Array.isArray(categories) &&
      categories.map((cat, idx) => (
        <span key={idx} className={styles.catTag}>
          {cat}
        </span>
      ))}
  </div>
);

// Checklist Item Component
interface ChecklistItemProps {
  item: ChecklistItem;
  checked: boolean;
  onToggle: (id: string) => void;
}

const ChecklistItemComponent: React.FC<ChecklistItemProps> = ({
  item,
  checked,
  onToggle,
}) => (
  <div
    className={`${styles.checkItem} ${checked ? styles.checked : ""}`}
    onClick={() => onToggle(item.id)}
  >
    <div className={styles.checkBox} />
    <span>{item.text}</span>
  </div>
);

// Generation Step Component
interface GenerationStepProps {
  step: GenerationStep;
  status: "pending" | "active" | "done";
}

const GenerationStepItem: React.FC<GenerationStepProps> = ({
  step,
  status,
}) => (
  <div className={`${styles.genStep} ${styles[status]}`}>
    <div className={styles.genStepIcon}>
      {status === "active" && <div className={styles.spinnerSmall} />}
      {status === "done" && <CheckIcon />}
      {status === "pending" && <CircleIcon />}
    </div>
    <span>{step.label}</span>
  </div>
);

// Tip Card Component
const TipCard: React.FC = () => (
  <div className={styles.tipCard}>
    <div className={styles.tipTitle}>
      <InfoIcon />
      Editing tips
    </div>
    <div className={styles.tipBody}>
      Click <strong>Edit story</strong> to make changes. Read it aloud as you
      edit — if it doesn't sound natural in your voice, revise it.
    </div>
  </div>
);

// Next Step Card Component
interface NextStepCardProps {
  onNext: () => void;
  disabled: boolean;
}

const NextStepCard: React.FC<NextStepCardProps> = ({ onNext, disabled }) => (
  <div className={styles.nextStepCard}>
    <div className={styles.nextStepTitle}>Next: Record Your Voice</div>
    <div className={styles.nextStepBody}>
      Once you approve your story, record a 60-second voice sample to create
      your personalised audio experience.
    </div>
    <button className={styles.nextStepBtn} onClick={onNext} disabled={disabled}>
      Record My Voice
      <ArrowIcon />
    </button>
  </div>
);

// Approve Banner Component
interface ApproveBannerProps {
  onEditMore: () => void;
  onRecordVoice: () => void;
}

const ApproveBanner: React.FC<ApproveBannerProps> = ({
  onEditMore,
  onRecordVoice,
}) => (
  <div className={`${styles.approveBanner} ${styles.visible}`}>
    <div className={styles.approveText}>
      <strong>Story approved ✦</strong>
      <span>Ready to record your voice and create your audio</span>
    </div>
    <div className={styles.approveActions}>
      <button className={styles.approveSecondary} onClick={onEditMore}>
        Edit more
      </button>
      <button className={styles.approvePrimary} onClick={onRecordVoice}>
        Record My Voice
        <MicIcon />
      </button>
    </div>
  </div>
);

const generationSteps: GenerationStep[] = [
  { id: "gstep1", label: "Analysing your vision & goals", delay: 0 },
  { id: "gstep2", label: "Building your future world", delay: 1200 },
  { id: "gstep3", label: "Writing sensory narrative", delay: 2400 },
  { id: "gstep4", label: "Finalising your personal story", delay: 4000 },
];

const checklistItems: ChecklistItem[] = [
  { id: "first-person", text: "Written in first person (I, me, my)" },
  { id: "present-tense", text: "Present tense throughout" },
  { id: "sensory", text: "Includes physical sensations" },
  { id: "authentic", text: "Emotions feel authentic to you" },
  { id: "specific", text: "Specific details you recognize" },
  { id: "readable", text: "Reads naturally when spoken aloud" },
  { id: "length", text: "5–8 minutes to read aloud" },
];

// "What's in your story" summary component
const StorySummaryPanel: React.FC<{ answers: UserAnswers | null }> = ({
  answers,
}) => {
  if (!answers) return null;

  const summaryItems: { label: string; value: string }[] = [];

  if (answers.location || answers.home) {
    summaryItems.push({
      label: "Setting",
      value:
        [answers.location, answers.home].filter(Boolean).join(" — ") +
        (answers.timeframe ? ` (${answers.timeframe})` : ""),
    });
  } else if (answers.timeframe) {
    summaryItems.push({ label: "Timeframe", value: answers.timeframe });
  }

  if (answers.namedPersons?.length > 0) {
    summaryItems.push({
      label: "Key people",
      value: answers.namedPersons.join(", "),
    });
  }

  if (answers.selectedAreas?.length > 0) {
    summaryItems.push({
      label: "Life areas",
      value: answers.selectedAreas
        .map((a) => a.charAt(0).toUpperCase() + a.slice(1))
        .join(", "),
    });
  }

  if (answers.goals) {
    const goalText =
      answers.goals.length > 200
        ? answers.goals.slice(0, 200) + "…"
        : answers.goals;
    summaryItems.push({ label: "Your goals", value: goalText });
  }

  if (answers.actionsAfter) {
    const actionsText =
      answers.actionsAfter.length > 200
        ? answers.actionsAfter.slice(0, 200) + "…"
        : answers.actionsAfter;
    summaryItems.push({ label: "Proof actions", value: actionsText });
  }

  if (answers.identityStatements?.length > 0) {
    summaryItems.push({
      label: "Your affirmations",
      value: answers.identityStatements.join(" · "),
    });
  }

  if (answers.tone) {
    summaryItems.push({ label: "Story tone", value: answers.tone });
  }

  if (answers.coreFeeling) {
    summaryItems.push({ label: "Core feeling", value: answers.coreFeeling });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div
        style={{
          fontSize: "0.78rem",
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "1.5px",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        What's in your story
      </div>
      {summaryItems.map((item, i) => (
        <div
          key={i}
          style={{ display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <div
            style={{
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.45)",
              fontWeight: 500,
            }}
          >
            {item.label}
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              color: "rgba(255,255,255,0.8)",
              lineHeight: 1.5,
            }}
          >
            {item.value}
          </div>
        </div>
      ))}
      {summaryItems.length === 0 && (
        <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>
          Your story details will appear here after generation.
        </div>
      )}
    </div>
  );
};

const StoryContent: React.FC = () => {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useGlobalUI();
  const storyIdFromUrl = searchParams.get("id");

  const isLoggedIn = authStatus === "authenticated";
  const isPaid = session?.user?.plan && session.user.plan !== "free";

  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [storyText, setStoryText] = useState("");
  const [storyTitle, setStoryTitle] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [activeStep, setActiveStep] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswers | null>(null);
  const [storyId, setStoryId] = useState<string | null>(storyIdFromUrl);
  const [refinementNotes, setRefinementNotes] = useState("");
  const [isRefiningStory, setIsRefiningStory] = useState(false);
  const [showRefineInput, setShowRefineInput] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [genError, setGenError] = useState<string | null>(null);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);


  const {
    capturedGoals,
    normalizedGoals,
    setNormalizedGoals,
    clearStore,
    isHydrated,
  } = useStoryStore();
  const hasInitialized = useRef(false);

  // Mobile Panel Visibility
  const [showVisionMobile, setShowVisionMobile] = useState(false);
  const [showChecklistMobile, setShowChecklistMobile] = useState(false);

  // Dynamic steps based on logic
  const getSteps = () => {
    if (!isLoggedIn) {
      return [
        { label: "Goals", status: "done" as const },
        { label: "Your Story", status: "active" as const },
        { label: "Account", status: "pending" as const },
        { label: "Voice Recording", status: "pending" as const },
        { label: "Your Audio", status: "pending" as const },
      ];
    }
    return [
      { label: "Goals", status: "done" as const },
      { label: "Your Story", status: "active" as const },
      { label: "Voice Recording", status: "pending" as const },
      { label: "Your Audio", status: "pending" as const },
    ];
  };

  const steps = getSteps();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    document.title = "ManifestMyStory — Your Story";

    const fontLink = document.createElement("link");
    fontLink.href =
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Lora:ital,wght@0,400;0,500;1,400;1,500&display=swap";
    fontLink.rel = "stylesheet";
    document.head.appendChild(fontLink);
  }, []);

  const generate = useCallback(async (id: string) => {
    setIsGenerating(true);
    setGenError(null);
    setActiveStep(0);

    // UI simulation of steps
    for (let i = 0; i < generationSteps.length; i++) {
      setActiveStep(i);
      await new Promise((r) => setTimeout(r, 1200));
    }

    try {
      const res = await fetch(`/api/user/stories/${id}/generate`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.storyText) {
        setStoryText(data.storyText);
      } else if (data.error) {
        setGenError(data.error);
      }
      if (data.title) {
        setStoryTitle(data.title);
      }
    } catch (e: any) {
      console.error("Generation failed", e);
      setGenError(
        e.message || "Something went wrong while generating your story.",
      );
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const saveAndGenerate = useCallback(
    async (goals: UserAnswers) => {
      // Validation check to prevent {goals: {}} - handles arrays and missing values
      const isEmpty =
        !goals ||
        Object.keys(goals).length === 0 ||
        Object.values(goals).every(
          (v) => !v || v === "" || (Array.isArray(v) && v.length === 0),
        );

      if (isEmpty) {
        console.warn("Skipping saveAndGenerate: Goals are empty or default.");
        return;
      }

      const length = sessionStorage.getItem("storyLength") || "long";

      try {
        const res = await fetch("/api/user/stories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goals,
            length: length,
          }),
        });

        // Auth errors should redirect to sign-in, not show an alert.
        // This happens when the JWT token points to a deleted/non-existent
        // user (e.g., after a DB reset in dev, or a deleted account).
        if (res.status === 401) {
          const errData = await res.json().catch(() => ({}));
          console.error(
            "[STORY] Auth error in saveAndGenerate:",
            errData?.error,
          );
          router.push("/auth/signin?callbackUrl=/user/goal-intake-ai");
          return;
        }

        const data = await res.json();
        if (data.storyId) {
          setStoryId(data.storyId);
          generate(data.storyId);
          sessionStorage.removeItem("capturedGoals");
          sessionStorage.removeItem("storyLength");
        } else if (data.error) {
          console.error("API error:", data.error);
          setGenError(data.error);
        }
      } catch (e) {
        console.error("Failed to save goals", e);
      }
    },
    [generate, router],
  );

  useEffect(() => {
    const init = async () => {
      if (!isHydrated || hasInitialized.current) return;
      hasInitialized.current = true;

      let currentId = storyIdFromUrl || storyId;

      // 1. Check Store for goals
      let goals: UserAnswers | null = normalizedGoals;

      // If we have raw captured goals but no normalized version, normalize them now
      if (!goals && capturedGoals && Object.keys(capturedGoals).length > 0) {
        goals = normalizeGoals(capturedGoals);
        setNormalizedGoals(goals);
      }

      if (goals) {
        setUserAnswers(goals);
      }

      // 2. Load or Save
      if (currentId) {
        try {
          const res = await fetch(`/api/user/stories/${currentId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.goal_intake_json) {
              const dbGoals = normalizeGoals(data.goal_intake_json);
              setUserAnswers(dbGoals);
              setNormalizedGoals(dbGoals);
            }

            if (data.title) {
              setStoryTitle(data.title);
            }

            if (data.story_text_draft) {
              setStoryText(data.story_text_draft);
              setIsGenerating(false);
            } else {
              generate(currentId);
            }
          }
        } catch (e) {
          console.error("Failed to fetch story", e);
        }
      } else if (
        goals &&
        Object.values(goals).some(
          (v) =>
            v &&
            (typeof v === "string"
              ? v !== ""
              : !Array.isArray(v) || v.length > 0),
        )
      ) {
        saveAndGenerate(goals);
      }

      setIsInitializing(false);
    };

    init();
  }, [
    isHydrated,
    storyIdFromUrl,
    generate,
    saveAndGenerate,
    storyId,
    capturedGoals,
    normalizedGoals,
    setNormalizedGoals,
  ]);

  useEffect(() => {
    const count = storyText.trim().split(/\s+/).filter(Boolean).length;
    setWordCount(count);
  }, [storyText]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [storyText, isEditing]);

  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
    if (!isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleStoryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setStoryText(e.target.value);
  };

  const handleRegenerate = () => {
    if (storyId) {
      generate(storyId);
    }
  };

  const handleApprove = () => {
    setIsApproved(true);
    if (isEditing) {
      setIsEditing(false);
    }

    // Go directly to voice recording — affirmations are planted inside the story
    if (!isLoggedIn) {
      router.push("/auth/signup?next=/user/story");
    } else {
      router.push(`/user/voice-recording?storyId=${storyId}`);
    }
  };

  const handleUnapprove = () => {
    setIsApproved(false);
  };

  const handleRecordVoice = () => {
    // Go directly to voice recording — affirmations are planted inside the story
    router.push(`/user/voice-recording?storyId=${storyId}`);
  };

  const handleToggleCheck = (id: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleAIRefine = async () => {
    if (!storyId || !refinementNotes.trim()) return;
    setIsRefiningStory(true);

    try {
      const res = await fetch(`/api/user/stories/${storyId}/edit-ai/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refinementNotes: refinementNotes,
        }),
      });
      const data = await res.json();
      if (data.storyText) {
        setStoryText(data.storyText);
        if (data.title) setStoryTitle(data.title);
        setRefinementNotes("");
        setShowRefineInput(false);
        showToast("✓ Story refined successfully!", "success");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        showToast("Failed to refine story. Please try again.", "error");
      }
    } catch (e) {
      console.error("AI refinement failed", e);
    } finally {
      setIsRefiningStory(false);
      setIsAIModalOpen(false);
    }
  };

  if (isInitializing) {
    return (
      <div className={styles.pageLoader}>
        <div className={styles.pageLoaderInner}>
          <div className={styles.loadingSpinner} />
          <p className={styles.pageLoaderText}>Preparing your story…</p>
        </div>
      </div>
    );
  }

  if (!userAnswers && !isGenerating) {
    return (
      <div className={styles.container}>
        <div style={{ padding: "40px", textAlign: "center" }}>
          <h2>No story data found.</h2>
          <p>Please complete the goal discovery first.</p>
          <Link href="/user/goal-intake-ai" className={styles.primaryBtn}>
            Start Discovery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Mobile Overlay — sits outside pageBody so it covers everything */}
      {(showVisionMobile || showChecklistMobile) && (
        <div
          className={styles.mobileOverlay}
          onClick={() => {
            setShowVisionMobile(false);
            setShowChecklistMobile(false);
          }}
        />
      )}

      {/* Mobile Navigation Bar */}
      <div className={styles.mobilePanelNav}>
        <button
          className={`${styles.mobileNavBtn} ${showVisionMobile ? styles.active : ""}`}
          onClick={() => {
            setShowVisionMobile(!showVisionMobile);
            setShowChecklistMobile(false);
          }}
        >
          <InfoIcon />
          Your Vision
        </button>
        <button
          className={`${styles.mobileNavBtn} ${showChecklistMobile ? styles.active : ""}`}
          onClick={() => {
            setShowChecklistMobile(!showChecklistMobile);
            setShowVisionMobile(false);
          }}
        >
          <CheckIcon />
          Your Story Details
        </button>
      </div>

      <div className={styles.pageBody}>
        <aside
          className={`${styles.leftPanel} ${showVisionMobile ? styles.showMobile : ""}`}
        >
          <div className={styles.mobilePanelHeader}>
            <span className={styles.panelSectionTitle}>Your Vision</span>
            <button
              className={styles.closeMobileBtn}
              onClick={() => setShowVisionMobile(false)}
            >
              ×
            </button>
          </div>
          {userAnswers && (
            <div>
              <div className={styles.panelSectionTitle}>Your Vision</div>

              <VisionItem
                label="New Identity"
                value={
                  userAnswers.identityStatements?.length
                    ? userAnswers.identityStatements.join(", ")
                    : ""
                }
              />
              <VisionItem
                label="Most Important Goal"
                value={userAnswers.goals}
              />
              <VisionItem
                label="Proof Action"
                value={userAnswers.actionsAfter}
              />

              {userAnswers.namedPersons &&
                userAnswers.namedPersons.length > 0 && (
                  <VisionItem
                    label="People with you"
                    value={userAnswers.namedPersons.join(", ")}
                  />
                )}

              {userAnswers.location && (
                <VisionItem label="Environment" value={userAnswers.location} />
              )}

              {userAnswers.coreFeeling && (
                <VisionItem
                  label="Core Feeling"
                  value={userAnswers.coreFeeling}
                />
              )}

              {userAnswers.selectedAreas &&
                userAnswers.selectedAreas.length > 0 && (
                  <div className={styles.visionItem}>
                    <div className={styles.visionLabel}>Areas of Focus</div>
                    <CategoryTags categories={userAnswers.selectedAreas} />
                  </div>
                )}

              <div className={styles.visionItem}>
                <div className={styles.visionLabel}>Timeframe</div>
                <div className={styles.visionValue}>
                  {userAnswers.timeframe}
                </div>
              </div>
            </div>
          )}

          <button className={styles.regenBtn} onClick={handleRegenerate}>
            <RefreshIcon />
            Regenerate story
          </button>
        </aside>

        <main className={styles.centerPanel} id="centerPanel">
          {genError && (
            <div className={styles.errorCard}>
              <div className={styles.errorIcon}>⚠️</div>
              <div className={styles.errorTitle}>Generation Failed</div>
              <div className={styles.errorMsg}>{genError}</div>
              <button
                className={styles.primaryBtn}
                onClick={() =>
                  storyId
                    ? generate(storyId)
                    : userAnswers
                      ? saveAndGenerate(userAnswers)
                      : null
                }
              >
                <RefreshIcon />
                Try again
              </button>
            </div>
          )}

          {isGenerating && (
            <div className={styles.generatingCard} id="generatingCard">
              <div className={styles.genIcon}>
                <StarIcon />
              </div>
              <div className={styles.genTitle}>Crafting your story…</div>
              <div className={styles.genSubtitle}>
                We're weaving your vision into a rich, sensory narrative set on
                a perfect day in your future life.
              </div>

              <div className={styles.genSteps}>
                {generationSteps.map((step, index) => {
                  let status: "pending" | "active" | "done" = "pending";
                  if (index < activeStep) status = "done";
                  else if (index === activeStep) status = "active";
                  return (
                    <GenerationStepItem
                      key={step.id}
                      step={step}
                      status={status}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {!isGenerating && storyText && (
            <div
              className={`${styles.storyCard} ${styles.visible}`}
              id="storyCard"
            >
              <div className={styles.storyHeader}>
                <div className={styles.storyHeaderLeft}>
                  <div className={styles.storyEyebrow}>
                    Your Personal Manifestation Story
                  </div>
                  <div className={styles.storyTitle} id="storyTitleEl">
                    {storyTitle ||
                      (userAnswers?.identity
                        ? `A Day in the Life of ${userAnswers.identity.split(" ")[0]}'s Highest Self`
                        : "Your Manifestation Story")}
                  </div>
                  <div className={styles.storyMeta} id="storyMeta">
                    Generated just now · {wordCount.toLocaleString()} words
                  </div>
                </div>
                <div className={styles.footerActions} style={{ gap: "0.6rem" }}>
                  <button
                    className={styles.editToggle}
                    onClick={() => setIsAIModalOpen(true)}
                  >
                    <SparkleIcon />
                    Edit with AI
                  </button>
                  <button
                    className={`${styles.editToggle} ${isEditing ? styles.editing : ""}`}
                    onClick={handleToggleEdit}
                  >
                    {isEditing ? (
                      <>
                        <DoneIcon />
                        Done editing
                      </>
                    ) : (
                      <>
                        <EditIcon />
                        Edit story
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className={styles.storyBody}>
                {isEditing ? (
                  <textarea
                    ref={textareaRef}
                    id="storyText"
                    className={styles.storyText}
                    value={storyText}
                    onChange={handleStoryChange}
                    placeholder="Start writing your story here..."
                  />
                ) : (
                  <div className={styles.storyTextDisplay}>
                    {(() => {
                      const { intro, storyBody } =
                        splitIntroFromStory(storyText);

                      const renderProseLines = (
                        text: string,
                        keyPrefix: string,
                      ) =>
                        text.split("\n").map((line, idx) => {
                          const trimmed = line.trim();
                          if (!trimmed)
                            return <br key={`${keyPrefix}-${idx}`} />;
                          const cleanLine = trimmed
                            .replace(/[\*#_]/g, "")
                            .trim();
                          const isHeader = /[A-Z\s]{5,}.*?\d+-\d+\s+min/i.test(
                            cleanLine,
                          );
                          if (isHeader) {
                            return (
                              <h4
                                key={`${keyPrefix}-${idx}`}
                                className={styles.storySectionHeader}
                              >
                                {cleanLine}
                              </h4>
                            );
                          }
                          if (cleanLine === "· · ·") {
                            return (
                              <div
                                key={`${keyPrefix}-${idx}`}
                                className={styles.sceneDivider}
                              >
                                · · ·
                              </div>
                            );
                          }
                          return (
                            <p
                              key={`${keyPrefix}-${idx}`}
                              className={styles.storyPara}
                            >
                              {cleanLine}
                            </p>
                          );
                        });

                      return (
                        <>
                          {/* INTRO (Induction + Opening Affirmations) */}
                          {intro && (
                            <>
                              <div className={styles.storySectionLabel}>
                                Intro
                              </div>
                              {renderProseLines(intro, "intro")}
                              <div className={styles.sceneDivider}>· · ·</div>
                            </>
                          )}

                          {/* STORY BODY (Vision + Closing Affirmations + Close) */}
                          <div className={styles.storySectionLabel}>Story</div>
                          {renderProseLines(storyBody, "story")}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className={styles.storyFooter}>
                <span className={styles.wordCount} id="wordCountBottom">
                  {wordCount.toLocaleString()} words
                </span>
                <div className={styles.footerActions} style={{ gap: "0.6rem" }}>
                  <button
                    className={styles.editToggle}
                    onClick={() => setIsAIModalOpen(true)}
                  >
                    <SparkleIcon />
                    Edit with AI
                  </button>
                  <button
                    className={`${styles.editToggle} ${isEditing ? styles.editing : ""}`}
                    onClick={handleToggleEdit}
                  >
                    {isEditing ? (
                      <>
                        <DoneIcon />
                        Done editing
                      </>
                    ) : (
                      <>
                        <EditIcon />
                        Edit story
                      </>
                    )}
                  </button>
                  <button
                    className={styles.outlineBtn}
                    onClick={handleRegenerate}
                  >
                    ↺ New version
                  </button>
                  <button
                    className={styles.primaryBtn}
                    onClick={handleApprove}
                    disabled={isApproved}
                  >
                    Approve & Continue
                    <ArrowIcon />
                  </button>
                </div>
              </div>
            </div>
          )}

          {isApproved && !isGenerating && (
            <ApproveBanner
              onEditMore={handleUnapprove}
              onRecordVoice={handleRecordVoice}
            />
          )}

          {/* WARM REFINEMENT PROMPT — shown after story generates */}
          {!isGenerating && storyText && !isApproved && (
            <div className={styles.refinementSection}>
              <div className={styles.refinementHeader}>
                <div className={styles.refinementIcon}>✦</div>
                <p>
                  This story was written from everything you shared with us.
                  Before you record it in your own voice, read it as if you're
                  already living this life. Does every scene feel true? Does it
                  capture the feelings, the people, the moments — the life you
                  actually want?
                  <br />
                  If anything feels off, unclear, or missing — tell us here and
                  we'll refine it until every word feels like yours.
                </p>
              </div>

              {showRefineInput ? (
                <div className={styles.refinementInputArea}>
                  <textarea
                    value={refinementNotes}
                    onChange={(e) => setRefinementNotes(e.target.value)}
                    placeholder="Tell us what feels off, or what you'd like to add or change…"
                    className={styles.refinementTextarea}
                    disabled={isRefiningStory}
                  />
                  <div className={styles.refinementActions}>
                    <button
                      className={styles.refineBtn}
                      onClick={handleAIRefine}
                      disabled={isRefiningStory || !refinementNotes.trim()}
                    >
                      {isRefiningStory ? (
                        <div className={styles.spinnerSmall} />
                      ) : (
                        <SparkleIcon />
                      )}
                      {isRefiningStory ? "Refining…" : "Update my story"}
                    </button>
                    <button
                      className={styles.perfectBtn}
                      onClick={() => {
                        setShowRefineInput(false);
                        setRefinementNotes("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.refinementActions}>
                  <button
                    className={styles.refineBtn}
                    onClick={() => setShowRefineInput(true)}
                  >
                    <EditIcon />
                    Refine my story
                  </button>
                  <button className={styles.perfectBtn} onClick={handleApprove}>
                    This is perfect — let's record it
                    <ArrowIcon />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AI EDIT MODAL */}
          {isAIModalOpen && (
            <div
              className={styles.modalOverlay}
              onClick={() => setIsAIModalOpen(false)}
            >
              <div
                className={styles.modalContent}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className={styles.modalClose}
                  onClick={() => setIsAIModalOpen(false)}
                >
                  ×
                </button>

                <div className={styles.modalTitle}>Refine with AI</div>
                <p className={styles.modalSubtitle}>
                  Tell Maya how you'd like to refine your story. You can ask for
                  a different tone, more sensory detail, or specific changes to
                  any part of your vision.
                </p>

                <div className={styles.modalActionArea}>
                  <textarea
                    value={refinementNotes}
                    onChange={(e) => setRefinementNotes(e.target.value)}
                    placeholder="Tell Maya what to change... e.g. 'Make the ending more emotional' or 'Focus more on my family'..."
                    className={styles.refinementTextarea}
                    disabled={isRefiningStory}
                  />

                  <button
                    className={styles.modalBtn}
                    onClick={handleAIRefine}
                    disabled={isRefiningStory || !refinementNotes.trim()}
                  >
                    {isRefiningStory ? (
                      <div className={styles.spinnerSmall} />
                    ) : (
                      <SparkleIcon />
                    )}
                    {isRefiningStory ? "Refining story..." : "Update my story"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        <aside
          className={`${styles.rightPanel} ${showChecklistMobile ? styles.showMobile : ""}`}
        >
          <div className={styles.mobilePanelHeader}>
            <div className={styles.panelSectionTitle}>What's In Your Story</div>
            <button
              className={styles.closeMobileBtn}
              onClick={() => setShowChecklistMobile(false)}
            >
              ×
            </button>
          </div>
          <TipCard />

          <div>
            <StorySummaryPanel answers={userAnswers} />
          </div>

          <NextStepCard onNext={handleRecordVoice} disabled={!isApproved} />
        </aside>
      </div>
    </div>
  );
};

const StoryPage: React.FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StoryContent />
    </Suspense>
  );
};

export default StoryPage;
