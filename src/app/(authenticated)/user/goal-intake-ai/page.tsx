"use client";
import React, {
  Suspense,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "../../../styles/GoalDiscovery.module.css";
import Link from "next/link";
import {
  SendIcon,
  UserIcon,
  ArrowIcon,
  MicIcon,
  MicOffIcon,
  AiSparkleIcon,
} from "../../../components/icons/ChatIcons";
import {
  Message,
  CapturedData,
  ProgressData,
  CaptureData,
  SYSTEM_PROMPT,
  TOPICS,
  AREA_TOPIC_IDS,
  SIDEBAR_GROUPS,
  SidebarGroup,
} from "../../../types/goal-discovery";
import { useStoryStore } from "@/store/useStoryStore";
import { normalizeGoals } from "@/lib/story-utils";
import { useGlobalUI } from "@/components/ui/global-ui-context";

// Typing animation component
const TypingIndicator: React.FC = () => (
  <div className={`${styles.msgRow} ${styles.bot}`}>
    <div className={`${styles.avatar} ${styles.bot}`}>M</div>
    <div className={styles.typingBub}>
      <div className={styles.dot}></div>
      <div className={styles.dot}></div>
      <div className={styles.dot}></div>
    </div>
  </div>
);

// Captured item component
interface CapturedItemProps {
  label: string;
  value: string | string[];
}

const CapturedItem: React.FC<CapturedItemProps> = ({ label, value }) => {
  const displayValue = Array.isArray(value) ? value.join(", ") : value;
  return (
    <div className={styles.capturedItem}>
      <strong>{label}</strong>
      {displayValue}
    </div>
  );
};

interface CompletionCardProps {
  onGenerate: (length: "short" | "long") => void;
  capturedGoals: CapturedData;
  onUpdateGoal: (key: string, value: string | string[]) => void;
}

const LIFE_AREAS = [
  {
    id: "wealth",
    label: "Wealth & Abundance",
    icon: "◈",
    desc: "Financial freedom, prosperity, and security",
    color: "#D4B665",
  },
  {
    id: "health",
    label: "Health & Vitality",
    icon: "◉",
    desc: "Energy, strength, and physical wellbeing",
    color: "#8DBF7A",
  },
  {
    id: "love",
    label: "Love & Relationships",
    icon: "◇",
    desc: "Deep connection, romance, and partnership",
    color: "#C97B8A",
  },
  {
    id: "family",
    label: "Family & Parenting",
    icon: "◈",
    desc: "Nurturing bonds and generational legacy",
    color: "#A685C9",
  },
  {
    id: "purpose",
    label: "Purpose & Career",
    icon: "◎",
    desc: "Meaningful work, impact, and fulfilment",
    color: "#6AABCC",
  },
  {
    id: "spirituality",
    label: "Spirituality & Inner Life",
    icon: "✦",
    desc: "Peace, alignment, and inner knowing",
    color: "#C9A46A",
  },
  {
    id: "growth",
    label: "Personal Growth",
    icon: "◐",
    desc: "Mindset, skills, and becoming who you're meant to be",
    color: "#8DBF7A",
  },
  {
    id: "other",
    label: "Something else…",
    icon: "◌",
    desc: "Describe your own area of transformation",
    color: "#6E8A7B",
  },
];

const LIFE_AREA_LABELS = LIFE_AREAS.reduce<Record<string, string>>(
  (acc, area) => {
    acc[area.id] = area.label;
    return acc;
  },
  {},
);

const LIFE_AREA_KEYWORDS: Record<string, string[]> = {
  wealth: [
    "wealth",
    "money",
    "income",
    "abundance",
    "financial",
    "finance",
    "cash",
    "bank",
    "salary",
    "paid",
    "payment",
    "revenue",
    "sales",
    "client",
    "business",
    "invest",
    "investing",
    "prosper",
  ],
  health: [
    "health",
    "healthy",
    "body",
    "fitness",
    "fit",
    "strong",
    "strength",
    "energy",
    "energetic",
    "vital",
    "vitality",
    "sleep",
    "rest",
    "heal",
    "healing",
    "workout",
    "exercise",
    "gym",
    "wellness",
  ],
  love: [
    "love",
    "romance",
    "relationship",
    "partner",
    "marriage",
    "husband",
    "wife",
    "dating",
    "intimacy",
    "connection",
  ],
  family: [
    "family",
    "parent",
    "parenting",
    "mother",
    "mom",
    "father",
    "dad",
    "child",
    "children",
    "kid",
    "kids",
    "home",
  ],
  purpose: [
    "purpose",
    "career",
    "work",
    "job",
    "business",
    "calling",
    "mission",
    "impact",
    "office",
    "team",
    "leader",
    "leadership",
    "promotion",
    "client",
  ],
  spirituality: [
    "spiritual",
    "spirituality",
    "inner",
    "peace",
    "aligned",
    "alignment",
    "god",
    "source",
    "prayer",
    "meditation",
    "meditate",
    "soul",
  ],
  growth: [
    "growth",
    "grow",
    "mindset",
    "confidence",
    "discipline",
    "clarity",
    "learning",
    "skill",
    "skills",
    "expand",
    "expansion",
    "becoming",
  ],
};

const PROOF_ACTION_STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "always",
  "because",
  "before",
  "being",
  "feels",
  "feeling",
  "fully",
  "have",
  "into",
  "just",
  "life",
  "more",
  "really",
  "seeing",
  "still",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "want",
  "with",
  "your",
]);

function normalizeAreaValue(area: string): string {
  const trimmed = String(area).trim();
  const lower = trimmed.toLowerCase();

  if (lower.includes("wealth") || lower.includes("abundance")) return "wealth";
  if (lower.includes("health") || lower.includes("vitality")) return "health";
  if (lower.includes("love") || lower.includes("relationship")) return "love";
  if (lower.includes("family") || lower.includes("parent")) return "family";
  if (lower.includes("purpose") || lower.includes("career")) return "purpose";
  if (lower.includes("spirit") || lower.includes("inner life")) {
    return "spirituality";
  }
  if (lower.includes("growth")) return "growth";

  return trimmed;
}

function stemProofToken(token: string): string {
  if (token.length <= 4) return token;

  return token
    .replace(/(ing|edly|edly|ed|es|s)$/i, "")
    .replace(/(tion|ment|ness)$/i, "");
}

function tokenizeProofText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => stemProofToken(token.trim()))
    .filter(
      (token) => token.length >= 3 && !PROOF_ACTION_STOP_WORDS.has(token),
    );
}

function getAreaMatchTerms(
  area: string,
  capturedGoals?: CapturedData | null,
): Set<string> {
  const normalizedArea = normalizeAreaValue(area);
  const terms = new Set<string>(
    (LIFE_AREA_KEYWORDS[normalizedArea] || []).map((keyword) =>
      stemProofToken(keyword.toLowerCase()),
    ),
  );

  tokenizeProofText(LIFE_AREA_LABELS[normalizedArea] || area).forEach(
    (token) => {
      terms.add(token);
    },
  );

  const areaValue = capturedGoals?.[normalizedArea];
  const areaText = Array.isArray(areaValue)
    ? areaValue.join(" ")
    : typeof areaValue === "string"
      ? areaValue
      : "";

  tokenizeProofText(areaText).forEach((token) => {
    if (token.length >= 4) {
      terms.add(token);
    }
  });

  return terms;
}

function proofItemMatchesArea(
  proofItem: string,
  area: string,
  capturedGoals?: CapturedData | null,
): boolean {
  const normalizedArea = normalizeAreaValue(area);
  const proofTokens = new Set(tokenizeProofText(proofItem));
  const matchTerms = Array.from(
    getAreaMatchTerms(normalizedArea, capturedGoals),
  );
  const keywordTerms = (LIFE_AREA_KEYWORDS[normalizedArea] || []).map(
    (keyword) => stemProofToken(keyword.toLowerCase()),
  );
  const overlapCount = matchTerms.filter((term) =>
    proofTokens.has(term),
  ).length;

  if (keywordTerms.some((term) => proofTokens.has(term))) {
    return true;
  }

  if (LIFE_AREA_LABELS[normalizedArea]) {
    return overlapCount >= 2;
  }

  return overlapCount >= 1;
}

function getSelectedAreaValues(capturedGoals?: CapturedData | null): string[] {
  const rawAreas = capturedGoals?.selectedAreas;
  if (Array.isArray(rawAreas)) {
    return Array.from(
      new Set(
        rawAreas
          .map((area) => normalizeAreaValue(String(area)))
          .filter(Boolean),
      ),
    );
  }
  if (typeof rawAreas === "string") {
    return Array.from(
      new Set(
        rawAreas
          .split(",")
          .map((area) => normalizeAreaValue(area))
          .filter(Boolean),
      ),
    );
  }
  return [];
}

function getProofActionItems(actionsAfter?: string | string[]): string[] {
  if (Array.isArray(actionsAfter)) {
    return actionsAfter.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof actionsAfter !== "string") return [];

  return actionsAfter
    .split(/\n\s*\n|\n(?=[•\-*])|\n(?=\d+[.)]\s)/)
    .map((item) =>
      item
        .replace(/^[•\-*]\s*/, "")
        .replace(/^\d+[.)]\s*/, "")
        .trim(),
    )
    .filter(Boolean);
}

function getProofActionCoverage(capturedGoals?: CapturedData | null) {
  const selectedAreas = getSelectedAreaValues(capturedGoals);
  const proofActionItems = getProofActionItems(capturedGoals?.actionsAfter);
  const requiredCount = selectedAreas.length;
  const coveredAreas = selectedAreas.filter((area) =>
    proofActionItems.some((item) =>
      proofItemMatchesArea(item, area, capturedGoals),
    ),
  );
  const missingAreas = selectedAreas.filter(
    (area) => !coveredAreas.includes(area),
  );
  const missingCount = missingAreas.length;

  return {
    selectedAreas,
    proofActionItems,
    requiredCount,
    coveredAreas,
    missingAreas,
    missingAreaLabels: missingAreas.map(
      (area) => LIFE_AREA_LABELS[area] || area,
    ),
    missingCount,
    hasCoverage: requiredCount === 0 || missingCount === 0,
  };
}

interface GoalDiscoveryScreenProps {
  orientation: string;
  isPaid: boolean;
  onConfirm: (selectedAreas: string[]) => void;
}

const GoalDiscoveryScreen: React.FC<GoalDiscoveryScreenProps> = ({
  orientation,
  isPaid,
  onConfirm,
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [customArea, setCustomArea] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);

  const maxAllowed = isPaid ? LIFE_AREAS.length : 1;

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (!isPaid && prev.length >= 1) return [id]; // Explorer: replace
      return [...prev, id];
    });
  };

  const handleConfirm = () => {
    const areas = [...selected];
    if (selected.includes("other") && customArea.trim()) {
      // Replace "other" with the custom text
      const idx = areas.indexOf("other");
      areas.splice(idx, 1, customArea.trim());
    } else if (selected.includes("other")) {
      areas.splice(areas.indexOf("other"), 1);
    }
    if (areas.length === 0) return;
    onConfirm(areas);
  };

  return (
    <div className={styles.discoveryScreen}>
      <div className={styles.discoveryHeader}>
        <div className={styles.discoveryIcon}>✦</div>
        <h1>Where does your transformation begin?</h1>
        <p>
          Select the areas of life you're ready to call in right now.
          {!isPaid && (
            <span className={styles.explorerBadge}>
              {" "}
              Explorer: 1 area — <a href="/pricing">upgrade to unlock all</a>
            </span>
          )}
        </p>
      </div>

      <div className={styles.discoveryGrid}>
        {LIFE_AREAS.map((area) => {
          const isSelected = selected.includes(area.id);
          const isDisabled = !isPaid && selected.length >= 1 && !isSelected;
          return (
            <button
              key={area.id}
              className={`${styles.areaCard} ${isSelected ? styles.areaCardSelected : ""} ${isDisabled ? styles.areaCardDisabled : ""}`}
              onClick={() => !isDisabled && toggle(area.id)}
              onMouseEnter={() => setHovered(area.id)}
              onMouseLeave={() => setHovered(null)}
              style={
                isSelected
                  ? ({ "--area-color": area.color } as React.CSSProperties)
                  : {}
              }
            >
              <div className={styles.areaCardInner}>
                <div
                  className={styles.areaIcon}
                  style={{
                    color:
                      isSelected || hovered === area.id
                        ? area.color
                        : undefined,
                  }}
                >
                  {area.icon}
                </div>
                <div className={styles.areaLabel}>{area.label}</div>
                <div className={styles.areaDesc}>{area.desc}</div>
                <div
                  className={`${styles.areaCheck} ${isSelected ? styles.areaCheckSelected : ""}`}
                >
                  {isSelected && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </div>
              {isSelected && (
                <div
                  className={styles.areaCardGlow}
                  style={{ background: area.color }}
                />
              )}
            </button>
          );
        })}
      </div>

      {selected.includes("other") && (
        <div className={styles.discoveryCustom}>
          <input
            type="text"
            className={styles.discoveryCustomInput}
            placeholder="Describe your area of transformation…"
            value={customArea}
            onChange={(e) => setCustomArea(e.target.value)}
            autoFocus
          />
        </div>
      )}

      <div className={styles.discoveryFooter}>
        {selected.length > 0 && (
          <div className={styles.discoverySelected}>
            {selected
              .filter((s) => s !== "other")
              .map((id) => {
                const a = LIFE_AREAS.find((x) => x.id === id);
                return a ? (
                  <span
                    key={id}
                    className={styles.discoveryTag}
                    style={{ borderColor: a.color, color: a.color }}
                  >
                    {a.label}
                  </span>
                ) : null;
              })}
            {selected.includes("other") && customArea.trim() && (
              <span className={styles.discoveryTag}>{customArea.trim()}</span>
            )}
          </div>
        )}
        <button
          className={styles.discoveryConfirmBtn}
          onClick={handleConfirm}
          disabled={
            selected.length === 0 ||
            (selected.includes("other") &&
              !customArea.trim() &&
              selected.length === 1)
          }
        >
          Begin My Vision Journey
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const OrientationScreen: React.FC<{
  onStart: (orientation: string) => void;
}> = ({ onStart }) => {
  const [step, setStep] = useState<"start" | "orientation">("start");

  const orientationOptions = [
    { label: "Spiritual", desc: "I believe in God, Source, divine alignment" },
    {
      label: "Scientific",
      desc: "I trust neuroscience and subconscious programming",
    },
    { label: "Both", desc: "I blend science and spirituality freely" },
    { label: "Grounded", desc: "No frameworks, just real feeling and emotion" },
  ];

  if (step === "start") {
    return (
      <div className={styles.orientationScreen}>
        <div className={styles.orientationIcon}>✦</div>
        <h1>What do you want more of in your life?</h1>
        <p>
          I'm Maya. Whether you have a clear vision or just a feeling that
          something could be better — I'll help you put it into words, then turn
          them into a story recorded in your own voice that works on your
          subconscious mind while you sleep.
        </p>
        <button
          className={styles.orientationBtn}
          onClick={() => setStep("orientation")}
        >
          Start the conversation
        </button>
      </div>
    );
  }

  return (
    <div className={styles.orientationScreen}>
      <div className={styles.orientationIcon}>✦</div>
      <h1>How do you grow?</h1>
      <p>
        To assist me in crafting a story that resonates with your worldview, how
        would you describe your orientation toward personal growth?
      </p>
      <div className={styles.orientationOptions}>
        {orientationOptions.map((o) => (
          <button
            key={o.label}
            className={styles.orientationOption}
            onClick={() => onStart(o.label)}
          >
            <strong>{o.label}</strong>
            <span className={styles.orientationDesc}>{o.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const CompletionCard: React.FC<CompletionCardProps> = ({
  onGenerate,
  capturedGoals,
  onUpdateGoal,
}) => {
  const [generating, setGenerating] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleClick = () => {
    setGenerating(true);
    onGenerate("long");
  };

  const handleEdit = (key: string) => {
    const val = capturedGoals[key];
    setEditValue(Array.isArray(val) ? val.join(", ") : String(val || ""));
    setEditingKey(key);
  };

  const handleSaveEdit = () => {
    if (editingKey) {
      onUpdateGoal(editingKey, editValue);
      setEditingKey(null);
      setEditValue("");
    }
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditValue("");
  };

  // Labels for display
  const labelMap: Record<string, string> = {
    orientation: "Orientation",
    selectedAreas: "Life Areas",
    wealth: "Wealth Goals",
    health: "Health Goals",
    love: "Love Goals",
    family: "Family Goals",
    purpose: "Purpose Goals",
    spirituality: "Spirituality Goals",
    spirit: "Spirituality",
    growth: "Growth Goals",
    actionsAfter: "Proof Actions",
    tone: "Story Tone",
    namedPersons: "Key People",
    coreFeeling: "Core Feeling",
    identityStatements: "Identity Statements",
    timeframe: "Timeframe",
    location: "Setting / Location",
    home: "Home",
  };

  const getLabel = (key: string) => {
    if (labelMap[key]) return labelMap[key];
    if (key.startsWith("areaAffirmations_")) {
      const area = key.replace("areaAffirmations_", "");
      return `${area.charAt(0).toUpperCase() + area.slice(1)} Affirmations`;
    }
    return (
      key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")
    );
  };

  const isReadyToGenerate = useMemo(() => {
    // We use the same normalization logic that the API uses to ensure consistency
    const norm = normalizeGoals(capturedGoals);

    // Core requirements for a valid story
    const hasCore =
      norm.actionsAfter &&
      String(norm.actionsAfter).trim().length > 10 &&
      norm.timeframe &&
      String(norm.timeframe).trim().length > 0 &&
      norm.coreFeeling &&
      String(norm.coreFeeling).trim().length > 0;

    // Identity and specific goals are highly recommended but we could technically fallback
    const hasIdentity =
      norm.identityStatements && norm.identityStatements.length > 0;

    // Check that we have at least one life area with some content
    const areaKeys = [
      "wealth",
      "health",
      "love",
      "family",
      "purpose",
      "spirituality",
      "growth",
      "goals",
    ];
    const hasAnyGoal = areaKeys.some((key) => {
      const val = (norm as any)[key];
      return val && String(val).trim().length > 0;
    });

    return !!(hasCore && hasIdentity && hasAnyGoal);
  }, [capturedGoals]);

  const proofActionCoverage = useMemo(
    () => getProofActionCoverage(capturedGoals),
    [capturedGoals],
  );
  const isGenerateDisabled = generating;

  const reviewEntries = Object.entries(capturedGoals || {}).filter(
    ([key, v]) =>
      !["selectedAreas", "orientation"].includes(key) &&
      v &&
      (Array.isArray(v) ? v.length > 0 : String(v).trim().length > 0),
  );

  return (
    <div className={`${styles.msgRow} ${styles.bot}`}>
      <div className={`${styles.avatar} ${styles.bot}`}>M</div>
      <div className={styles.completeCard}>
        <h3>✦ Review your vision before we write</h3>
        <p style={{ marginBottom: "16px" }}>
          Here's everything you shared. Check that nothing is missing — you can
          edit any field below. Once you're happy, hit Generate.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          {reviewEntries.map(([key, value]) => {
            const displayVal = Array.isArray(value)
              ? value.join(", ")
              : String(value);
            const label = getLabel(key);
            const isEditing = editingKey === key;

            return (
              <div
                key={key}
                style={{
                  padding: "10px 14px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "4px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "rgba(255,255,255,0.45)",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {label}
                  </span>
                  {!isEditing && (
                    <button
                      onClick={() => handleEdit(key)}
                      style={{
                        background: "none",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "rgba(255,255,255,0.5)",
                        fontSize: "0.7rem",
                        padding: "2px 10px",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      style={{
                        width: "100%",
                        minHeight: "60px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "8px",
                        color: "#fff",
                        padding: "8px 10px",
                        fontSize: "0.85rem",
                        resize: "vertical",
                        fontFamily: "inherit",
                      }}
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={handleSaveEdit}
                        style={{
                          background: "var(--accent, #52b788)",
                          color: "#fff",
                          border: "none",
                          padding: "4px 16px",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          cursor: "pointer",
                        }}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        style={{
                          background: "none",
                          color: "rgba(255,255,255,0.5)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          padding: "4px 16px",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: "0.85rem",
                      color: "rgba(255,255,255,0.8)",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {displayVal}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          className={styles.completeBtn}
          onClick={handleClick}
          disabled={isGenerateDisabled}
          style={{
            opacity: isGenerateDisabled ? 0.5 : 1,
            cursor: isGenerateDisabled ? "not-allowed" : "pointer",
          }}
        >
          {generating ? (
            <>
              <span className={styles.btnSpinner} />
              Generating…
            </>
          ) : (
            <>
              Confirm & Generate My Story
              <ArrowIcon />
            </>
          )}
        </button>

        {/* {!proofActionCoverage.hasCoverage && (
          <div className={styles.betaNote}>
            Add at least one proof action for each selected life area before
            generating. Still missing:{" "}
            {proofActionCoverage.missingAreaLabels.join(", ")}.
          </div>
        )} */}

        <div className={styles.betaNote}>
          Note: ManifestMyStory is currently in early access.
        </div>
      </div>
    </div>
  );
};

// Message bubble component
interface MessageBubbleProps {
  message: Message;
  onChipClick?: (text: string) => void;
  isIdentityPhase?: boolean;
  isLifeAreasPhase?: boolean;
  isExplorer?: boolean;
  isAffirmationPhase?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onChipClick,
  isIdentityPhase,
  isLifeAreasPhase,
  isExplorer,
  isAffirmationPhase,
}) => {
  const isUser = message.role === "user";
  const [selectedChips, setSelectedChips] = useState<string[]>([]);
  const [customIdentity, setCustomIdentity] = useState("");
  const [addedCustomEntries, setAddedCustomEntries] = useState<string[]>([]);

  // Robustly extract chips from bot messages
  const extractBotChips = useCallback(() => {
    if (isUser) return [];

    const lines = message.content.split("\n");
    const detected: string[] = [];

    // Prioritise lines starting with bullet symbols, checkboxes, or numbers
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.startsWith("•") ||
        trimmed.startsWith("-") ||
        (trimmed.startsWith("*") && !trimmed.startsWith("**")) ||
        trimmed.startsWith("□") ||
        trimmed.startsWith("☐") ||
        trimmed.startsWith("◻") ||
        trimmed.startsWith("▪") ||
        trimmed.startsWith("▸") ||
        trimmed.startsWith("›") ||
        /^\d+[\.\)]\s/.test(trimmed)
      ) {
        // Extract the text part — strip leading bullet/checkbox symbols and whitespace
        const text = trimmed.replace(/^[•\-*□☐◻▪▸›\d\.\)]+\s*/, "").trim();
        // Also strip trailing formatting like " —" descriptions for clean chip labels
        // but keep the full text for longer identity statements
        if (text && text.length > 0 && text.length < 150) {
          detected.push(text);
        }
      }
    }

    // Heuristic fallbacks
    if (detected.length === 0) {
      if (message.content.toLowerCase().includes("which areas of your life")) {
        return [
          "Wealth & Abundance",
          "Health & Vitality",
          "Love & Relationships",
          "Purpose & Career",
          "Personal Growth",
          "Home & Environment",
          "Spirituality",
        ];
      }
      if (message.content.toLowerCase().includes("already have")) {
        return ["Yes, I have my goals ready", "Let's explore together"];
      }
      if (message.content.toLowerCase().includes("would you like")) {
        return ["Tell me more", "Let's move on"];
      }
    }

    return detected;
  }, [isUser, message.content]);

  const chips = useMemo(() => extractBotChips(), [extractBotChips]);

  // Detect if this specific message contains affirmation/confirmation chips
  // that should be multi-select, even outside the identity/life-areas phases
  const isMultiSelectMessage = useMemo(() => {
    if (isUser || chips.length < 2) return false;
    const lower = message.content.toLowerCase();
    return (
      isIdentityPhase ||
      isLifeAreasPhase ||
      isAffirmationPhase ||
      /select every|select all|which of these|claim|choose the ones|pick the ones|check.*(you want|that feel|that resonate)|i['']ve captured the following|here['']s what i captured|affirmation/i.test(
        lower,
      )
    );
  }, [
    isUser,
    chips.length,
    message.content,
    isIdentityPhase,
    isLifeAreasPhase,
    isAffirmationPhase,
  ]);

  // Whether to show the custom input field (for identity or affirmation chips)
  const showCustomInput =
    isIdentityPhase ||
    isAffirmationPhase ||
    (isMultiSelectMessage && !isLifeAreasPhase);

  const toggleChip = (chip: string) => {
    if (isMultiSelectMessage) {
      setSelectedChips((prev) => {
        const isActive = prev.includes(chip);
        let next;
        if (isActive) {
          next = prev.filter((c) => c !== chip);
        } else {
          // Enforce 1-area limit for Explorers
          if (isLifeAreasPhase && isExplorer && prev.length >= 1) {
            next = [chip]; // Replace with new selection
          } else {
            next = [...prev, chip];
          }
        }
        return next;
      });
    } else {
      onChipClick?.(chip);
    }
  };

  const handleAddCustomEntry = () => {
    if (customIdentity.trim()) {
      setAddedCustomEntries((prev) => [...prev, customIdentity.trim()]);
      setCustomIdentity("");
    }
  };

  const handleRemoveCustomEntry = (idx: number) => {
    setAddedCustomEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleConfirmMulti = () => {
    const combined = [...selectedChips, ...addedCustomEntries];
    if (customIdentity.trim()) {
      combined.push(customIdentity.trim());
    }
    // Filter out placeholder chips that require follow-up (e.g., "Something else — let me write my own")
    const filtered = combined.filter((item) => {
      const lower = item.toLowerCase();
      return !(
        lower.includes("something else") ||
        lower.includes("let me choose") ||
        lower.includes("let me describe") ||
        lower.includes("let me write")
      );
    });
    if (filtered.length > 0) {
      onChipClick?.(filtered.join(", "));
      setCustomIdentity("");
      setAddedCustomEntries([]);
    } else if (combined.length > 0 && filtered.length === 0) {
      // User only selected "Something else" with no custom entry — prompt for input
      onChipClick?.(combined.join(", "));
      setCustomIdentity("");
      setAddedCustomEntries([]);
    }
  };

  // Format text with simple markdown and strip AI markers
  const formatText = (text: string) => {
    // Strip technical markers using balanced-brace matching
    let cleanText = text;
    const tagPattern =
      /(?:PROGRESS|PROG|CAPTURE|CAPTURED|CAP):?\s*(?:```json)?\s*/gi;
    let tagMatch;
    const ranges: [number, number][] = [];
    while ((tagMatch = tagPattern.exec(cleanText)) !== null) {
      const searchStart = tagMatch.index + tagMatch[0].length;
      const brace = cleanText.indexOf("{", searchStart);
      if (brace === -1 || brace - searchStart > 5) continue;
      let depth = 0;
      let end = brace;
      for (let i = brace; i < cleanText.length; i++) {
        if (cleanText[i] === "{") depth++;
        else if (cleanText[i] === "}") depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
      let trailEnd = end + 1;
      const trailing = cleanText.substring(trailEnd, trailEnd + 10);
      const fenceMatch = trailing.match(/^\s*```\s*/);
      if (fenceMatch) trailEnd += fenceMatch[0].length;
      ranges.push([tagMatch.index, trailEnd]);
    }
    for (let i = ranges.length - 1; i >= 0; i--) {
      cleanText =
        cleanText.substring(0, ranges[i][0]) +
        cleanText.substring(ranges[i][1]);
    }
    cleanText = cleanText.trim();

    // If chips were detected, strip the bullet lines from the displayed text
    // so options appear ONLY as interactive chips, not as text + chips
    if (chips.length > 0) {
      cleanText = cleanText
        .split("\n")
        .filter((line) => {
          const trimmed = line.trim();
          return !(
            trimmed.startsWith("•") ||
            trimmed.startsWith("□") ||
            trimmed.startsWith("☐") ||
            trimmed.startsWith("◻") ||
            trimmed.startsWith("▪") ||
            trimmed.startsWith("▸") ||
            trimmed.startsWith("›") ||
            (trimmed.startsWith("-") &&
              trimmed.length < 150 &&
              !trimmed.startsWith("---")) ||
            (trimmed.startsWith("*") &&
              !trimmed.startsWith("**") &&
              trimmed.length < 150) ||
            (/^\d+[\.\)]\s/.test(trimmed) && trimmed.length < 150)
          );
        })
        .join("\n");
    }

    // Safety net: remove any orphaned template/JSON artifacts (#8)
    // Catches stray braces, brackets, or partial JSON that leaked through
    cleanText = cleanText
      .replace(/^\s*[\{\}]\s*$/gm, "") // Lines that are just { or }
      .replace(/["']\s*:\s*["']/g, "") // Key-value fragments like "label": "value"
      .replace(/^\s*"?\w+"?\s*:\s*$/gm, "") // Orphaned JSON keys on their own line
      .trim();

    const withBold = cleanText.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    const withItalic = withBold.replace(/\*(.*?)\*/g, "<em>$1</em>");
    const withParagraphs = withItalic.replace(/\n\n/g, "</p><p>");
    const withBreaks = withParagraphs.replace(/\n/g, "<br>");
    return `<p>${withBreaks}</p>`;
  };

  return (
    <div className={`${styles.msgRow} ${isUser ? styles.user : styles.bot}`}>
      <div className={`${styles.avatar} ${isUser ? styles.user : styles.bot}`}>
        {isUser ? <UserIcon /> : "M"}
      </div>
      <div className={styles.bubble}>
        <div
          dangerouslySetInnerHTML={{ __html: formatText(message.content) }}
        />
        {chips.length > 0 && (
          <div className={styles.chips}>
            {chips.map((chip, i) => {
              const isActive = selectedChips.includes(chip);
              const isMulti = isMultiSelectMessage;
              return (
                <button
                  key={i}
                  className={`${styles.chip} ${isActive ? styles.active : ""} ${isMulti ? styles.multi : ""}`}
                  onClick={() => toggleChip(chip)}
                >
                  {chip}
                </button>
              );
            })}
            {showCustomInput && (
              <div className={styles.customIdentity}>
                <div style={{ display: "flex", gap: "8px", width: "100%" }}>
                  <input
                    type="text"
                    placeholder={
                      isIdentityPhase
                        ? "Write your own identity statement…"
                        : "Write your own…"
                    }
                    value={customIdentity}
                    onChange={(e) => setCustomIdentity(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomEntry();
                      }
                    }}
                    className={styles.customIdentityInput}
                  />
                  <button
                    className={styles.chip}
                    onClick={handleAddCustomEntry}
                    disabled={!customIdentity.trim()}
                    style={{
                      minWidth: "60px",
                      opacity: customIdentity.trim() ? 1 : 0.4,
                    }}
                  >
                    Add +
                  </button>
                </div>
                {addedCustomEntries.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px",
                      marginTop: "8px",
                    }}
                  >
                    {addedCustomEntries.map((entry, i) => (
                      <button
                        key={i}
                        className={`${styles.chip} ${styles.active}`}
                        onClick={() => handleRemoveCustomEntry(i)}
                        title="Click to remove"
                      >
                        {entry} ✕
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {isMultiSelectMessage &&
              (selectedChips.length > 0 ||
                addedCustomEntries.length > 0 ||
                customIdentity.trim()) && (
                <button
                  className={styles.chip}
                  onClick={handleConfirmMulti}
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                    borderColor: "var(--accent)",
                    marginTop: "12px",
                    width: "100%",
                    textAlign: "center",
                    justifyContent: "center",
                  }}
                >
                  {isLifeAreasPhase
                    ? "Explore These Areas →"
                    : "Done — these are mine"}
                </button>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

// Skip-confirmation modal
interface SkipConfirmModalProps {
  topicLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const SkipConfirmModal: React.FC<SkipConfirmModalProps> = ({
  topicLabel,
  onConfirm,
  onCancel,
}) => (
  <div className={styles.modalOverlay} onClick={onCancel}>
    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
      <div className={styles.modalIcon}>✦</div>
      <h3>Skip this stage?</h3>
      <p>
        For a richer, more <strong>comprehensive story</strong> we recommend
        completing every stage in order. Skipping may leave gaps in your
        personalised narrative.
        <br />
        <br />
        Are you sure you want to jump to <strong>{topicLabel}</strong>?
      </p>
      <div className={styles.modalActions}>
        <button className={styles.modalBtnSecondary} onClick={onCancel}>
          Stay on track
        </button>
        <button className={styles.modalBtnPrimary} onClick={onConfirm}>
          Skip anyway
        </button>
      </div>
    </div>
  </div>
);

// Helper: check if a sidebar area group is selected by the user
function isAreaSelected(
  topicId: string,
  capturedGoals: CapturedData | null,
): boolean {
  const rawAreas =
    capturedGoals?.selectedAreas ||
    capturedGoals?.SELECTEDAREAS ||
    [];
  let areas: string[];
  if (Array.isArray(rawAreas)) {
    areas = rawAreas.map((a) => String(a));
  } else if (typeof rawAreas === "string" && rawAreas.includes(",")) {
    areas = rawAreas.split(",").map((a) => a.trim()).filter(Boolean);
  } else {
    areas = [String(rawAreas)];
  }
  return areas.some((a) => {
    const s = a.toLowerCase();
    const normalized = normalizeAreaValue(s);
    if (normalized === topicId) return true;
    if (s === topicId) return true;
    if (s.includes(topicId)) return true;
    if (topicId === "spirituality" && s.includes("spirit")) return true;
    if (topicId === "purpose" && s.includes("career")) return true;
    return false;
  });
}

// Helper: check if a sidebar group should be visible
function isSidebarGroupVisible(
  group: SidebarGroup,
  capturedGoals: CapturedData | null,
): boolean {
  if (!group.isArea) return true;
  // Area groups are visible only if the user selected that area
  return group.topicIds.some((tid) => isAreaSelected(tid, capturedGoals));
}

// Topic item component
interface TopicItemProps {
  id: string;
  label: string;
  isActive: boolean;
  isCovered: boolean;
  isResponded: boolean;
  onClick: (id: string, label: string) => void;
}

const TopicItem: React.FC<TopicItemProps> = ({
  id,
  label,
  isActive,
  isCovered,
  isResponded,
  onClick,
}) => {
  let className = styles.topicItem;
  if (isActive) {
    className += ` ${styles.active}`;
  } else if (isCovered && isResponded) {
    // User actually interacted with this stage
    className += ` ${styles.covered}`;
  } else if (isCovered && !isResponded) {
    // User skipped past this stage without responding
    className += ` ${styles.skipped}`;
  }

  return (
    <div
      className={className}
      id={`t-${id}`}
      onClick={() => onClick(id, label)}
      style={{ cursor: "pointer" }}
    >
      <div className={styles.tDot}></div>
      <span>{label}</span>
    </div>
  );
};

const GoalDiscovery: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useGlobalUI();
  const { data: session, status: authStatus } = useSession();
  // Track the intake flow stage: null = orientation, 'discovery' = area selection, 'chat' = main chat
  const [intakeStage, setIntakeStage] = useState<
    "orientation" | "discovery" | "chat"
  >("orientation");
  const [pendingOrientation, setPendingOrientation] = useState("");

  useEffect(() => {
    document.title = "ManifestMyStory — Goal Discovery";
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);
  const STORAGE_KEY = "mms_chat_session";

  // ── Restore persisted session from localStorage (runs once, before first render) ──
  const restoreSession = () => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  const saved = restoreSession();

  const {
    capturedGoals,
    setCapturedGoals,
    setNormalizedGoals,
    clearStore,
    isHydrated,
  } = useStoryStore();
  const [messages, setMessages] = useState<Message[]>(saved?.messages ?? []);
  const messagesRef = useRef<Message[]>(saved?.messages ?? []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const [progress, setProgress] = useState<ProgressData>(
    saved?.progress ?? { pct: 0, phase: "Getting Started", covered: [] },
  );
  const progressRef = useRef<ProgressData>(
    saved?.progress ?? { pct: 0, phase: "Getting Started", covered: [] },
  );
  const [activeTopicId, setActiveTopicId] = useState<string>(TOPICS[0].id);
  const activeTopicIdRef = useRef<string>(TOPICS[0].id); // Keep ref for callbacks if needed
  const [recentGoalKey, setRecentGoalKey] = useState<string | null>(null);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Clear highlight after animation
  useEffect(() => {
    if (recentGoalKey) {
      const timer = setTimeout(() => setRecentGoalKey(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [recentGoalKey]);

  // Keep activeTopicId in sync with the current phase (fallback only if AI doesn't send topic)
  useEffect(() => {
    const { phase, topic } = progress;

    // 1. If we have an explicit topic ID (set via navigation or AI tag), use it first
    if (topic && TOPICS.some((t) => t.id === topic)) {
      if (activeTopicIdRef.current !== topic) {
        setActiveTopicId(topic);
        activeTopicIdRef.current = topic;
      }
      return;
    }

    // 2. Fallback: Map specific AI-driven phases back to the sidebar topics if topic isn't set
    const phaseToTopicMap: Record<string, string> = {
      Orientation: "orientation",
      Setup: "orientation",
      "Life Areas": "selectedAreas",
      Gratitude: "gratitude",
      Wealth: "wealth",
      Health: "health",
      Love: "love",
      Family: "family",
      Purpose: "purpose",
      Spirituality: "spirituality",
      Growth: "growth",
      "Proof Actions": "actionsAfter",
      "Story Anchors": "tone",
      "Story Tone": "tone",
      Setting: "location",
      "Core Feeling": "coreFeeling",
      "Identity Builder": "identityStatements",
      Timeframe: "timeframe",
      Complete: "timeframe",
    };

    const targetTopicId = phaseToTopicMap[phase];

    // Safety: If the current active topic belongs to the same phase group as the incoming phase,
    // don't force a move. This prevents "jumping back" when skipping through topics in the same phase.
    const currentTopicId = activeTopicIdRef.current;
    if (currentTopicId && targetTopicId) {
      const currentTopic = TOPICS.find((t) => t.id === currentTopicId);
      const targetTopic = TOPICS.find((t) => t.id === targetTopicId);

      // If we are already on a topic that shares the phase of the target, stay there
      if (
        currentTopic &&
        targetTopic &&
        currentTopic.phase === targetTopic.phase
      ) {
        // If the user manually navigated to a specific topic in a shared phase (like 'selectedAreas' in 'Setup'),
        // and the AI sends 'Setup', don't pull them back to 'orientation'.
        return;
      }
    }

    if (targetTopicId && activeTopicIdRef.current !== targetTopicId) {
      setActiveTopicId(targetTopicId);
      activeTopicIdRef.current = targetTopicId;
    }
  }, [progress.phase, progress.topic]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isComplete, setIsComplete] = useState(saved?.isComplete ?? false);
  const [inputValue, setInputValue] = useState("");
  const [showTyping, setShowTyping] = useState(false);

  // Track which topic IDs the user has sent at least one reply in
  const [respondedTopics, setRespondedTopics] = useState<string[]>(
    saved?.respondedTopics ?? [],
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mobileTopicBarRef = useRef<HTMLDivElement>(null);
  // Set when user sends a message in Evening & Close; triggers isComplete after AI replies
  const triggerCompleteAfterResponseRef = useRef(false);

  // ── Voice input (Web Speech API) ──
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isAiAnswering, setIsAiAnswering] = useState(false);
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognitionRef = useRef<any>(null);
  const hasTriedSnapshotPrefillRef = useRef(false);
  const isEditMode =
    searchParams.get("fresh") !== "1" &&
    !saved?.messages?.length &&
    !saved?.isComplete;
  const [isPrefillPending, setIsPrefillPending] = useState(isEditMode);
  // Whether we should auto-restart recognition on session end (timeout/pause)
  const voiceIntentActiveRef = useRef<boolean>(false);
  // Whether the browser is Safari (needs special handling for speech recognition)
  const isSafariRef = useRef<boolean>(false);
  // ── Voice accumulation via React state (single source of truth) ──
  // All text from COMPLETED recognition sessions lives here. Never lost on restart.
  const [voiceAccumulatedText, setVoiceAccumulatedText] = useState<string>("");
  // Ref mirror for reading inside event handlers (state isn't readable in closures)
  const voiceAccumulatedRef = useRef<string>("");
  // Text from the CURRENT (in-progress) recognition session — not yet committed to state
  const currentSessionTextRef = useRef<string>("");
  // Live preview shown to user during recording
  const [voiceLivePreview, setVoiceLivePreview] = useState<string>("");

  // Keep ref mirror in sync with state
  useEffect(() => {
    voiceAccumulatedRef.current = voiceAccumulatedText;
  }, [voiceAccumulatedText]);

  // Prefill intake answers for authenticated users who want to edit and regenerate.
  useEffect(() => {
    if (!isHydrated) return;
    if (authStatus !== "authenticated") return;
    if (searchParams.get("fresh") === "1") {
      setIsPrefillPending(false);
      return;
    }
    if (hasTriedSnapshotPrefillRef.current) {
      setIsPrefillPending(false);
      return;
    }
    if (messagesRef.current.length > 0) {
      setIsPrefillPending(false);
      return;
    }
    if (Object.keys(capturedGoals || {}).length > 0) {
      setIsPrefillPending(false);
      return;
    }

    hasTriedSnapshotPrefillRef.current = true;
    setIsPrefillPending(true);

    (async () => {
      try {
        const res = await fetch("/api/user/intake-snapshot?includeAnswers=1", {
          cache: "no-store",
        });
        if (!res.ok) return;

        const data = await res.json();
        const answers = data?.answers;
        if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
          return;
        }

        setCapturedGoals(answers);
        setIsComplete(true);
        setIntakeStage("chat");
      } catch (error) {
        console.error("Failed to prefill intake answers:", error);
      } finally {
        setIsPrefillPending(false);
      }
    })();
  }, [authStatus, capturedGoals, isHydrated, searchParams, setCapturedGoals]);

  useEffect(() => {
    const SR =
      typeof window !== "undefined" &&
      ((window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition);
    if (SR) {
      setVoiceSupported(true);
      const recognition = new SR();
      const isSafari =
        /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      isSafariRef.current = isSafari;

      // Safari ignores continuous:true — it stops after each utterance.
      // We manually restart in onend for both browsers.
      recognition.continuous = !isSafari;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        // Build the FULL text from this session's results (all of them).
        // This is the simplest approach — just concatenate everything the API
        // gives us for the current session. On restart, results reset anyway.
        let sessionText = "";
        for (let i = 0; i < event.results.length; i++) {
          sessionText += event.results[i][0].transcript;
        }
        // Store current session text in ref
        currentSessionTextRef.current = sessionText.trim();

        // Live preview = committed state text + current session text
        const preview = (
          voiceAccumulatedRef.current +
          (currentSessionTextRef.current
            ? " " + currentSessionTextRef.current
            : "")
        ).trim();
        setVoiceLivePreview(preview);
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "no-speech" || event.error === "aborted") return;
        voiceIntentActiveRef.current = false;
        setIsListening(false);
      };

      recognition.onend = () => {
        // Commit current session text to state (the safe place).
        // Once in state, this text can NEVER be lost by the Web Speech API.
        const sessionText = currentSessionTextRef.current.trim();
        if (sessionText) {
          setVoiceAccumulatedText((prev) => {
            const updated = prev ? prev + " " + sessionText : sessionText;
            voiceAccumulatedRef.current = updated;
            setVoiceLivePreview(updated);
            return updated;
          });
        }
        // Clear current session ref for the next session
        currentSessionTextRef.current = "";

        // Restart if user hasn't clicked stop
        if (voiceIntentActiveRef.current) {
          // Small delay for Safari to release the mic
          const delay = isSafari ? 300 : 50;
          setTimeout(() => {
            if (!voiceIntentActiveRef.current) return; // user stopped during delay
            try {
              recognition.start();
            } catch {
              voiceIntentActiveRef.current = false;
              setIsListening(false);
            }
          }, delay);
          return;
        }
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Keep voice transcript ref clean on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Refine transcribed voice text via LLM
  const refineVoiceText = useCallback(async (rawText: string) => {
    if (!rawText.trim()) return;
    setIsProcessingVoice(true);
    try {
      const currentTopic = activeTopicIdRef.current;
      const topicObj = TOPICS.find((t) => t.id === currentTopic);
      const response = await fetch("/api/user/chat/refine-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawText,
          context: topicObj ? topicObj.label : currentTopic,
        }),
      });
      if (!response.ok) throw new Error("Refine API failed");
      const data = await response.json();
      setInputValue(data.text || rawText.trim());
    } catch (error) {
      console.error("Voice refinement failed, using raw text:", error);
      setInputValue(rawText.trim());
    } finally {
      setIsProcessingVoice(false);
    }
  }, []);

  const toggleVoice = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      // User explicitly stops
      voiceIntentActiveRef.current = false;
      recognitionRef.current.stop();
      setIsListening(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingSeconds(0);

      // Read ALL text: state (previous sessions) + current session ref.
      // No delay needed — state already has all previous sessions committed.
      // Current session text is in the ref (set synchronously by onresult).
      const previousText = voiceAccumulatedRef.current;
      const currentText = currentSessionTextRef.current.trim();
      const fullText = (previousText + (currentText ? " " + currentText : "")).trim();

      if (fullText) {
        refineVoiceText(fullText);
      }

      // Reset all voice state
      setVoiceAccumulatedText("");
      voiceAccumulatedRef.current = "";
      currentSessionTextRef.current = "";
      setVoiceLivePreview("");
    } else {
      // Start fresh
      setVoiceAccumulatedText("");
      voiceAccumulatedRef.current = "";
      currentSessionTextRef.current = "";
      setVoiceLivePreview("");
      voiceIntentActiveRef.current = true;
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening, refineVoiceText]);

  // ── Persist session state to localStorage whenever key state changes ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          messages,
          progress,
          respondedTopics,
          isComplete,
        }),
      );
    } catch {
      // Storage quota exceeded or unavailable — silently skip
    }
  }, [messages, progress, respondedTopics, isComplete]);

  // ── Helper to wipe the persisted session (called after successful story save) ──
  const clearChatSession = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showTyping]);

  // Auto-scroll active topic into view in mobile topic bar
  useEffect(() => {
    if (!mobileTopicBarRef.current) return;
    // Find the active topic group ID that contains activeTopicId
    const activeGroup = SIDEBAR_GROUPS.find((g) =>
      g.topicIds.includes(activeTopicId),
    );
    if (!activeGroup) return;
    const pill = mobileTopicBarRef.current.querySelector(
      `[data-topic-id="${activeGroup.id}"]`,
    ) as HTMLElement | null;
    if (pill) {
      pill.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTopicId]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 130)}px`;
    }
  }, [inputValue]);

  // Step 1: User picks orientation → go to goal discovery screen
  const handleOrientationSelected = (orientation: string) => {
    setCapturedGoals((prev) => ({
      ...prev,
      orientation: orientation.toLowerCase(),
    }));
    setRecentGoalKey("orientation");
    setPendingOrientation(orientation);
    setIntakeStage("discovery");
  };

  // Step 2: User picks life areas → start chat with combined context
  const handleGoalDiscoveryConfirm = (selectedAreas: string[]) => {
    // Capture selected areas immediately
    setCapturedGoals((prev) => ({ ...prev, selectedAreas }));
    setRecentGoalKey("selectedAreas");
    setIntakeStage("chat");
    // Advance sidebar to selectedAreas
    setActiveTopicId("selectedAreas");
    activeTopicIdRef.current = "selectedAreas";
    setProgress((prev) => ({
      ...prev,
      pct: 15,
      phase: "Life Areas",
      topic: "selectedAreas",
      covered: ["orientation", "selectedAreas"],
    }));
    setRespondedTopics((prev) => [
      ...new Set([...prev, "orientation", "selectedAreas"]),
    ]);
    // Send combined message to AI
    const areasLabel = selectedAreas.join(", ");
    sendToAI(
      `My orientation toward personal growth is: ${pendingOrientation}. ` +
        `The life areas I want to transform are: ${areasLabel}.`,
    );
  };

  // Legacy: Start conversation with orientation (no discovery screen — not used now)
  const handleStartConversation = (orientation: string) => {
    setCapturedGoals((prev) => ({
      ...prev,
      orientation: orientation.toLowerCase(),
    }));
    setRecentGoalKey("orientation");
    sendToAI(`My orientation toward personal growth is: ${orientation}`);
  };

  // Skip auto-send if showing orientation screen or discovery screen
  useEffect(() => {
    // Only auto-start if we already have chat history (resumed session)
    if (messagesRef.current.length > 0) {
      setIntakeStage("chat");
    }
  }, []);

  // Parse bot response for metadata and return cleaned text for the UI
  const parseResponse = useCallback(
    (raw: string) => {
      let cleanText = raw;

      // 1. Extract PROGRESS data (handles optional markdown, variations, and missing colons)
      const progressRegex =
        /(?:PROGRESS|PROG):?\s*(?:```json)?\s*(\{[\s\S]*?\})\s*(?:```)?/i;
      const progressMatch = cleanText.match(progressRegex);
      if (progressMatch) {
        try {
          const data = JSON.parse(progressMatch[1]) as ProgressData;
          setProgress((prev) => ({
            pct: data.pct !== undefined ? data.pct : prev.pct,
            phase: data.phase || prev.phase,
            covered: data.covered || prev.covered,
          }));
          if (data.topic) {
            setActiveTopicId(data.topic);
            activeTopicIdRef.current = data.topic;
          }
          if (data.phase === "Complete" && data.pct >= 100) {
            // Only mark complete when minimum required captures are actually present
            const currentGoals = useStoryStore.getState().capturedGoals;
            const proofActionCoverage = getProofActionCoverage(currentGoals);
            const hasMinimum =
              currentGoals?.actionsAfter &&
              String(currentGoals.actionsAfter).trim().length > 0 &&
              currentGoals?.timeframe &&
              String(currentGoals.timeframe).trim().length > 0;
            if (hasMinimum && proofActionCoverage.hasCoverage) {
              setIsComplete(true);
            }
          }
        } catch (e) {
          console.error("Error parsing progress JSON:", e);
        }
      }

      // 2. Extract all CAPTURE data (handles variations, no colons, etc)
      // Use a balanced-brace matcher to handle nested JSON (arrays, objects)
      const captureRegex = /(?:CAPTURE|CAPTURED|CAP):?\s*(?:```json)?\s*/gi;
      let match;
      const newGoals: Record<string, string | string[]> = {};
      while ((match = captureRegex.exec(cleanText)) !== null) {
        try {
          // Find the opening brace after the tag
          const startIdx = match.index + match[0].length;
          const braceIdx = cleanText.indexOf("{", startIdx);
          if (braceIdx === -1 || braceIdx - startIdx > 5) continue;

          // Walk forward matching balanced braces
          let depth = 0;
          let endIdx = braceIdx;
          for (let i = braceIdx; i < cleanText.length; i++) {
            if (cleanText[i] === "{") depth++;
            else if (cleanText[i] === "}") depth--;
            if (depth === 0) {
              endIdx = i;
              break;
            }
          }
          if (depth !== 0) continue; // unbalanced — skip

          const jsonStr = cleanText
            .substring(braceIdx, endIdx + 1)
            .replace(/```\s*$/, ""); // strip trailing markdown fence
          const data = JSON.parse(jsonStr) as CaptureData;
          if (data.label && data.value) {
            let label = data.label;
            // Normalize common labels to camelCase for the UI
            const lowerLabel = label.toLowerCase();
            if (lowerLabel === "corefeeling") label = "coreFeeling";
            else if (lowerLabel === "actionsafter") label = "actionsAfter";
            else if (lowerLabel === "identitystatements")
              label = "identityStatements";
            else if (lowerLabel === "selectedareas") label = "selectedAreas";
            else if (lowerLabel === "namedpersons") label = "namedPersons";
            else if (lowerLabel === "orientation") label = "orientation";
            else if (lowerLabel === "timeframe") label = "timeframe";
            else if (lowerLabel === "location") label = "location";
            else if (lowerLabel === "tone") label = "tone";

            // Map area labels back to IDs if AI sends labels
            if (label === "selectedAreas" && Array.isArray(data.value)) {
              data.value = data.value.map((val) => {
                const s = val.toLowerCase();
                if (s.includes("wealth")) return "wealth";
                if (s.includes("health")) return "health";
                if (s.includes("love")) return "love";
                if (s.includes("family")) return "family";
                if (s.includes("purpose") || s.includes("career"))
                  return "purpose";
                if (s.includes("spirit")) return "spirituality";
                if (s.includes("growth")) return "growth";
                return val;
              });
            }

            newGoals[label] = data.value;
          }
        } catch (e) {
          console.error("Error parsing capture JSON:", e);
        }
      }

      if (Object.keys(newGoals).length > 0) {
        console.log("[GOAL_CAPTURE] Extracting new goals:", newGoals);
        setCapturedGoals((prev) => {
          const merged = { ...prev };
          for (const [key, value] of Object.entries(newGoals)) {
            // Append actionsAfter across multiple turns instead of overwriting
            if (key === "actionsAfter" && merged.actionsAfter) {
              const existing = String(merged.actionsAfter).trim();
              const incoming = Array.isArray(value)
                ? value.join(", ")
                : String(value).trim();

              if (existing && !existing.includes(incoming)) {
                merged.actionsAfter = `${existing}\n\n${incoming}`;
              } else {
                merged.actionsAfter = existing || incoming;
              }
            } else if (AREA_TOPIC_IDS.includes(key) && merged[key]) {
              // Append per-area data across multiple CAPTURE tags
              const existing = String(merged[key]).trim();
              const incoming = Array.isArray(value)
                ? value.join(", ")
                : String(value).trim();
              if (existing && !existing.includes(incoming)) {
                merged[key] = `${existing}\n\n${incoming}`;
              } else {
                merged[key] = existing || incoming;
              }
            } else if (
              key === "selectedAreas" &&
              Array.isArray(merged.selectedAreas) &&
              merged.selectedAreas.length > 0
            ) {
              // Never let AI CAPTURE overwrite the UI-set selectedAreas array
              // The discovery screen already sets this correctly
            } else {
              merged[key] = value;
            }
          }
          return merged;
        });
        // Trigger highlight for the last one in the set
        const keys = Object.keys(newGoals);
        setRecentGoalKey(keys[keys.length - 1]);
      }

      // Clean up the text for UI: remove tags and any surrounding artifacts
      // Use a function to strip balanced-brace JSON blocks after tag keywords
      const stripTagBlocks = (text: string): string => {
        const tagPattern =
          /(?:PROGRESS|PROG|CAPTURE|CAPTURED|CAP):?\s*(?:```json)?\s*/gi;
        let result = text;
        let tagMatch;
        // Process from end to start so indices don't shift
        const ranges: [number, number][] = [];
        while ((tagMatch = tagPattern.exec(result)) !== null) {
          const searchStart = tagMatch.index + tagMatch[0].length;
          const brace = result.indexOf("{", searchStart);
          if (brace === -1 || brace - searchStart > 5) continue;
          let depth = 0;
          let end = brace;
          for (let i = brace; i < result.length; i++) {
            if (result[i] === "{") depth++;
            else if (result[i] === "}") depth--;
            if (depth === 0) {
              end = i;
              break;
            }
          }
          // Also consume trailing markdown fence and whitespace
          let trailEnd = end + 1;
          const trailing = result.substring(trailEnd, trailEnd + 10);
          const fenceMatch = trailing.match(/^\s*```\s*/);
          if (fenceMatch) trailEnd += fenceMatch[0].length;
          ranges.push([tagMatch.index, trailEnd]);
        }
        // Remove ranges from end to start
        for (let i = ranges.length - 1; i >= 0; i--) {
          result =
            result.substring(0, ranges[i][0]) + result.substring(ranges[i][1]);
        }
        return result.trim();
      };
      return stripTagBlocks(cleanText);
    },
    [setCapturedGoals],
  );

  const goalsEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    goalsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [capturedGoals]);

  // Send message to AI
  const sendToAI = useCallback(
    async (userMessage?: string) => {
      if (isWaiting) return;

      const wasCollectingProofActions =
        activeTopicIdRef.current === "actionsAfter" ||
        progressRef.current.phase === "Proof Actions";

      const currentHistory = [...messagesRef.current];
      if (userMessage) {
        const userMsg: Message = { role: "user", content: userMessage };
        currentHistory.push(userMsg);
        setMessages([...currentHistory]);

        // Record that the user responded to the current active topic
        const currentTopicId = activeTopicIdRef.current;
        setRespondedTopics((prev) =>
          prev.includes(currentTopicId) ? prev : [...prev, currentTopicId],
        );

        // Flag auto-completion when submitting a message in the last stage
        if (currentTopicId === "timeframe") {
          triggerCompleteAfterResponseRef.current = true;
        }
      }

      setShowTyping(true);
      setIsWaiting(true);

      try {
        const response = await fetch("/api/user/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Send RAW content (with technical tags) back to LLM for context
            messages: currentHistory.map(({ role, content, rawContent }) => ({
              role,
              content: rawContent || content,
            })),
          }),
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();
        const rawText = data.text || "";
        let taggedProgress: ProgressData | null = null;
        const progressMatch = rawText.match(
          /(?:PROGRESS|PROG):?\s*(?:```json)?\s*(\{[\s\S]*?\})\s*(?:```)?/i,
        );
        if (progressMatch) {
          try {
            taggedProgress = JSON.parse(progressMatch[1]) as ProgressData;
          } catch (error) {
            console.error("Error parsing progress JSON in sendToAI:", error);
          }
        }

        // 1. Process metadata and get cleaned text for display
        const uiText = parseResponse(rawText);

        // 2. Store CLEAN version for UI, but RAW version for internal memory
        const assistantMsg: Message = {
          role: "assistant",
          content: uiText,
          rawContent: rawText, // Preserve technical tags for the LLM
        };
        setMessages((prev) => [...prev, assistantMsg]);

        const updatedGoals = useStoryStore.getState().capturedGoals;
        const proofActionCoverage = getProofActionCoverage(updatedGoals);
        const advancedPastProofActions =
          wasCollectingProofActions &&
          taggedProgress !== null &&
          taggedProgress.topic !== "actionsAfter" &&
          taggedProgress.phase !== "Proof Actions";

        if (
          advancedPastProofActions &&
          !proofActionCoverage.hasCoverage &&
          proofActionCoverage.requiredCount > 0
        ) {
          const missingAreaLabels =
            proofActionCoverage.missingAreaLabels.join(", ");

          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                proofActionCoverage.missingCount === 1
                  ? `Before we move on, I still need one proof moment for ${missingAreaLabels} so that area is anchored in your story. What's one specific real-world moment that shows this is already real there?`
                  : `Before we move on, I still need proof moments for ${missingAreaLabels} so every selected life area is anchored in your story. What's another specific real-world moment that shows this is already real?`,
            },
          ]);
          setProgress((prev) => ({
            ...prev,
            phase: "Proof Actions",
            topic: "actionsAfter",
          }));
          setActiveTopicId("actionsAfter");
          activeTopicIdRef.current = "actionsAfter";
        }

        // Auto-show completion card after AI replies to the Evening & Close message
        if (triggerCompleteAfterResponseRef.current) {
          triggerCompleteAfterResponseRef.current = false;
          if (proofActionCoverage.hasCoverage) {
            setIsComplete(true);
          }
        }
      } catch (error) {
        console.error("Error calling AI:", error);
        triggerCompleteAfterResponseRef.current = false;

        // Auto-retry logic (FIX 10)
        const retryCount = (window as any)._mmsRetryCount || 0;
        if (retryCount < 3) {
          (window as any)._mmsRetryCount = retryCount + 1;
          console.log(`Retrying chat API (${retryCount + 1}/3)...`);
          // Brief delay before retry
          setTimeout(() => sendToAI(userMessage), 1000);
          return;
        }

        // After 3 retries, show a gentle reconnecting message
        (window as any)._mmsRetryCount = 0;
        const errorMsg: Message = {
          role: "assistant",
          content: "Just a moment \u2014 reconnecting\u2026",
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setShowTyping(false);
        setIsWaiting(false);
        setInputValue("");
        // Reset voice state for next turn (#2, #14)
        setVoiceAccumulatedText("");
        voiceAccumulatedRef.current = "";
        currentSessionTextRef.current = "";
        setVoiceLivePreview("");
      }
    },
    [isWaiting, parseResponse],
  );

  const proofActionCoverage = useMemo(
    () => getProofActionCoverage(capturedGoals),
    [capturedGoals],
  );
  const visibleTopicIds = useMemo(
    () =>
      SIDEBAR_GROUPS.filter((group) =>
        isSidebarGroupVisible(group, capturedGoals),
      ).flatMap((group) => group.topicIds),
    [capturedGoals],
  );
  const canFinishIntake = useMemo(
    () =>
      visibleTopicIds.every((id) => respondedTopics.includes(id)) &&
      proofActionCoverage.hasCoverage,
    [proofActionCoverage.hasCoverage, respondedTopics, visibleTopicIds],
  );

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || isWaiting) return;

    // Stop voice input on send so mic state doesn't persist across turns (#14)
    if (isListening && recognitionRef.current) {
      voiceIntentActiveRef.current = false;
      recognitionRef.current.stop();
      setIsListening(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingSeconds(0);
    }
    // Reset voice state for next turn
    setVoiceAccumulatedText("");
    voiceAccumulatedRef.current = "";
    currentSessionTextRef.current = "";
    setVoiceLivePreview("");

    // Preemptive local capture for specific topics to ensure the UI feels responsive
    // even if the AI fails to send a CAPTURE tag.
    const text = inputValue.trim();
    const topic = activeTopicIdRef.current;

    if (topic === "orientation") {
      setCapturedGoals((prev) => ({
        ...prev,
        orientation: text.toLowerCase(),
      }));
    } else if (topic === "timeframe") {
      setCapturedGoals((prev) => ({ ...prev, timeframe: text }));
    } else if (topic === "tone") {
      setCapturedGoals((prev) => ({ ...prev, tone: text }));
    } else if (topic === "location") {
      setCapturedGoals((prev) => ({ ...prev, location: text }));
    } else if (topic === "coreFeeling") {
      setCapturedGoals((prev) => ({ ...prev, coreFeeling: text }));
    } else if (AREA_TOPIC_IDS.includes(topic)) {
      // Capture goals for the specific life area being explored — APPEND across turns
      setCapturedGoals((prev) => {
        const existing = prev[topic] ? String(prev[topic]).trim() : "";
        return {
          ...prev,
          [topic]:
            existing && !existing.includes(text)
              ? `${existing}\n\n${text}`
              : existing || text,
        };
      });
    } else if (topic === "actionsAfter") {
      setCapturedGoals((prev) => {
        const existing = prev.actionsAfter
          ? String(prev.actionsAfter).trim()
          : "";
        return {
          ...prev,
          actionsAfter: existing ? `${existing}\n\n${text}` : text,
        };
      });
    }

    sendToAI(text);
  }, [inputValue, isWaiting, isListening, sendToAI, progress.phase]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleAiAnswer = useCallback(async () => {
    if (isWaiting || isComplete || isAiAnswering) return;
    setIsAiAnswering(true);
    try {
      const currentHistory = messagesRef.current.map(
        ({ role, content, rawContent }) => ({
          role,
          content: rawContent || content,
        }),
      );
      const response = await fetch("/api/user/chat/auto-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: currentHistory,
          capturedGoals,
        }),
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      if (data.text) {
        setInputValue(data.text);
      }
    } catch (error) {
      console.error("Error generating AI answer:", error);
    } finally {
      setIsAiAnswering(false);
    }
  }, [isWaiting, isComplete, isAiAnswering, capturedGoals]);

  const handleChipClick = useCallback(
    (text: string) => {
      if (isWaiting) return;

      // Detect "follow-up needed" chips — these require the user to provide
      // additional input, so we don't capture the chip text itself as the value.
      // The AI will ask a follow-up question and the real value will be captured
      // either via the next user message or the AI's CAPTURE tag.
      const lowerText = text.toLowerCase();
      const isFollowUpNeeded =
        lowerText.includes("something else") ||
        lowerText.includes("let me choose") ||
        lowerText.includes("let me describe") ||
        lowerText.includes("let me write") ||
        lowerText.includes("let me explain") ||
        lowerText.includes("i\u2019ll describe") ||
        lowerText.includes("i'll describe") ||
        lowerText.includes("other \u2014 ") ||
        lowerText.includes("other — ");

      if (isFollowUpNeeded) {
        // Send to AI without capturing — AI will ask follow-up
        sendToAI(text);
        return;
      }

      // Real-time instant effect: Capture structured data locally immediately
      const currentTopic = activeTopicIdRef.current;

      if (progress.phase === "Life Areas" || currentTopic === "selectedAreas") {
        // Only update selectedAreas if the chip values are actual area IDs.
        // After the discovery screen sets selectedAreas, subsequent chips
        // (e.g. "I have a specific goal in mind") must NOT overwrite them.
        const areas = text.split(", ").map((a) => a.trim());
        const validAreaIds = new Set(AREA_TOPIC_IDS);
        const areAllValidAreas = areas.every(
          (a) => validAreaIds.has(normalizeAreaValue(a)),
        );
        if (areAllValidAreas) {
          setCapturedGoals((prev) => ({ ...prev, selectedAreas: areas }));
          setRecentGoalKey("selectedAreas");
        }
        // Otherwise it's a conversational chip within the area phase — don't capture as areas
      } else if (
        progress.phase === "Identity Builder" ||
        currentTopic === "identityStatements"
      ) {
        const statements = text.split(", ").map((s) => s.trim());
        setCapturedGoals((prev) => ({
          ...prev,
          identityStatements: statements,
        }));
        setRecentGoalKey("identityStatements");
      } else if (progress.phase === "Story Tone" || currentTopic === "tone") {
        setCapturedGoals((prev) => ({ ...prev, tone: text }));
        setRecentGoalKey("tone");
      } else if (
        progress.phase === "Timeframe" ||
        currentTopic === "timeframe"
      ) {
        setCapturedGoals((prev) => ({ ...prev, timeframe: text }));
        setRecentGoalKey("timeframe");
      } else if (currentTopic === "orientation") {
        setCapturedGoals((prev) => ({
          ...prev,
          orientation: text.toLowerCase(),
        }));
        setRecentGoalKey("orientation");
      } else if (currentTopic === "coreFeeling") {
        setCapturedGoals((prev) => ({ ...prev, coreFeeling: text }));
        setRecentGoalKey("coreFeeling");
      } else if (currentTopic === "location") {
        setCapturedGoals((prev) => ({ ...prev, location: text }));
        setRecentGoalKey("location");
      } else if (AREA_TOPIC_IDS.includes(currentTopic)) {
        // If this looks like a multi-select affirmation submission (comma-separated),
        // store as per-area affirmations array; otherwise store as area goals
        const items = text
          .split(", ")
          .map((s) => s.trim())
          .filter(Boolean);
        if (items.length > 1) {
          // Multiple items = likely affirmation multi-select
          const affKey = `areaAffirmations_${currentTopic}`;
          setCapturedGoals((prev) => ({ ...prev, [affKey]: items }));
          setRecentGoalKey(affKey);
        } else {
          // Append per-area goal text instead of overwriting
          setCapturedGoals((prev) => {
            const existing = prev[currentTopic]
              ? String(prev[currentTopic]).trim()
              : "";
            return {
              ...prev,
              [currentTopic]:
                existing && !existing.includes(text)
                  ? `${existing}\n\n${text}`
                  : existing || text,
            };
          });
          setRecentGoalKey(currentTopic);
        }
      } else if (
        progress.phase === "Proof Actions" ||
        currentTopic === "actionsAfter"
      ) {
        setCapturedGoals((prev) => {
          const existing = prev.actionsAfter
            ? String(prev.actionsAfter).trim()
            : "";
          return {
            ...prev,
            actionsAfter: existing ? `${existing}\n\n${text}` : text,
          };
        });
        setRecentGoalKey("actionsAfter");
      }

      sendToAI(text);
    },
    [isWaiting, sendToAI, progress.phase, activeTopicId, setCapturedGoals],
  );

  const handleGenerateStory = useCallback(
    async (length: "short" | "long" = "long") => {
      // Do not act while the session is still being fetched — session is null
      // during loading and treating that as "unauthenticated" causes a spurious
      // redirect to the signup page every time the user returns to the tab.
      if (authStatus === "loading") return;

      // Prevent submission if no goals are captured
      const goalCount = !capturedGoals ? 0 : Object.keys(capturedGoals).length;

      // 1. Normalize the data before sending/storing
      const normalized = normalizeGoals(capturedGoals);
      setNormalizedGoals(normalized);

      // If not logged in: store in session storage first then go through signup
      if (!session) {
        sessionStorage.setItem("capturedGoals", JSON.stringify(capturedGoals));
        sessionStorage.setItem("storyLength", length);
        router.push("/auth/signup?next=/user/story");
        return;
      }

      // Logged in: save directly to database
      try {
        const response = await fetch("/api/user/stories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goals: normalized,
            length: length,
            storyType: "night",
          }),
        });

        // Handle auth errors explicitly — do NOT fall back to the sessionStorage
        // path, as that causes a second failed API call on the story page and
        // shows the user a confusing alert.
        if (response.status === 401) {
          const errData = await response.json();
          const msg = errData?.error || "Your session has expired.";
          showToast(
            `${msg} You will be signed out so you can sign back in.`,
            "error",
          );
          router.push("/api/auth/signout?callbackUrl=/auth/signin");
          return;
        }

        const data = await response.json();
        if (data.storyId) {
          clearStore();
          clearChatSession();
          router.push(`/user/story?id=${data.storyId}`);
        } else {
          console.warn("API error during story creation:", data.error);
          // Fallback – only for non-auth errors (e.g. validation)
          sessionStorage.setItem(
            "capturedGoals",
            JSON.stringify(capturedGoals),
          );
          sessionStorage.setItem("storyLength", length);
          router.push("/user/story");
        }
      } catch (error) {
        console.error("Error saving story goals:", error);
        sessionStorage.setItem("capturedGoals", JSON.stringify(capturedGoals));
        sessionStorage.setItem("storyLength", length);
        router.push("/user/story");
      }
    },
    [
      capturedGoals,
      router,
      session,
      authStatus,
      setNormalizedGoals,
      clearStore,
    ],
  );

  const executeTopicNav = useCallback(
    (id: string, label: string) => {
      const topicIndex = TOPICS.findIndex((t) => t.id === id);

      setProgress((prev) => {
        const newlyCovered = TOPICS.slice(0, topicIndex).map((t) => t.id); // Topics before are skipped
        const uniqueCovered = Array.from(
          new Set([...prev.covered, ...newlyCovered, id]),
        ); // current being active marks it as visited

        const newPct = Math.max(
          prev.pct,
          Math.min(100, Math.round(((topicIndex + 1) / TOPICS.length) * 100)),
        );

        return {
          ...prev,
          pct: newPct,
          phase: TOPICS[topicIndex].phase,
          topic: id,
          covered: uniqueCovered,
        };
      });

      // Update active topic ID directly for immediate UI feedback
      setActiveTopicId(id);
      activeTopicIdRef.current = id;

      // Prompt AI to transition, acknowledging history and extracting any available goals
      const prompt = `Let's skip ahead to "${label}". Please reflect on what we've discussed so far, capture any goals or details you've identified in our history using CAPTURE tags, and then ask me about ${label}.`;
      sendToAI(prompt);
    },
    [sendToAI],
  );

  const handleTopicClick = useCallback(
    (id: string, label: string) => {
      if (isWaiting) return;
      executeTopicNav(id, label);
    },
    [isWaiting, executeTopicNav],
  );

  const isPaid = !!(session?.user?.plan && session.user.plan !== "free");

  return (
    <div className={styles.container}>
      <div className={styles.main}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.topicListSection}>
            <div className={styles.sidebarTitle}>Topics</div>

            {SIDEBAR_GROUPS.filter((group) =>
              isSidebarGroupVisible(group, capturedGoals),
            ).map((group) => {
              // A group is "active" if the current activeTopicId is one of its sub-topics
              const isActive = group.topicIds.includes(activeTopicId);
              // A group is "covered" if ALL its sub-topics are covered
              const isCovered = group.topicIds.every((tid) =>
                progress.covered.includes(tid),
              );
              // A group is "responded" if the user responded to at least one of its sub-topics
              const isResponded = group.topicIds.some((tid) =>
                respondedTopics.includes(tid),
              );
              // When clicked, navigate to the first sub-topic in the group
              const navTopicId = group.topicIds[0];
              const navLabel = group.label;

              return (
                <TopicItem
                  key={group.id}
                  id={group.id}
                  label={group.label}
                  isActive={isActive}
                  isCovered={isCovered}
                  isResponded={isResponded}
                  onClick={() => handleTopicClick(navTopicId, navLabel)}
                />
              );
            })}
          </div>
          <div className={styles.capturedBox}>
            <div className={styles.capturedTitle}>Captured So Far</div>
            <div className={styles.capturedList}>
              {!isHydrated ? (
                <div className={styles.loadingCaptured}>Loading...</div>
              ) : !capturedGoals ||
                Object.entries(capturedGoals).length === 0 ? (
                <span className={styles.nothingYet}>
                  Your vision will appear here…
                </span>
              ) : (
                (() => {
                  const capturedLabelMap: Record<string, string> = {
                    orientation: "Orientation",
                    selectedAreas: "Life Areas",
                    wealth: "Wealth Goals",
                    health: "Health Goals",
                    love: "Love Goals",
                    family: "Family Goals",
                    purpose: "Purpose Goals",
                    spirituality: "Spirituality Goals",
                    growth: "Growth Goals",
                    goals: "Goals",
                    actionsAfter: "Proof of Actions",
                    tone: "Story Tone",
                    coreFeeling: "Core Feeling",
                    identityStatements: "Identity Statements",
                    timeframe: "Timeframe",
                    location: "Setting / Location",
                    namedPersons: "Key People",
                    gratitudeItems: "Gratitude",
                    home: "Home",
                  };
                  return Object.entries(capturedGoals)
                    .filter(
                      ([key, v]) =>
                        !key.startsWith("areaAffirmations_") &&
                        v &&
                        (Array.isArray(v)
                          ? v.length > 0
                          : String(v).trim().length > 0),
                    )
                    .map(([key]) => (
                      <div
                        key={key}
                        className={`${styles.capturedItemWrapper} ${recentGoalKey === key ? styles.recentGoal : ""}`}
                      >
                        <div className={styles.capturedItem}>
                          <span>
                            ✓{" "}
                            {capturedLabelMap[key] ||
                              key.charAt(0).toUpperCase() +
                                key.slice(1).replace(/([A-Z])/g, " $1")}
                          </span>
                        </div>
                      </div>
                    ));
                })()
              )}
              <div ref={goalsEndRef} />
            </div>
          </div>

          {/* Sidebar finish button - only active when all required fields captured */}
          {!isComplete &&
            (() => {
              return (
                <button
                  className={styles.finishEarlyBtn}
                  onClick={() => {
                    setIsComplete(true);
                  }}
                  disabled={!canFinishIntake}
                  style={
                    !canFinishIntake
                      ? { opacity: 0.5, cursor: "not-allowed" }
                      : {}
                  }
                  title={
                    canFinishIntake
                      ? "Click here whenever you feel ready to see your story"
                      : "Complete all chat steps before generating"
                  }
                >
                  <span>Ready to see your story?</span>
                  <strong>Finish & Generate →</strong>
                </button>
              );
            })()}
        </aside>

        {/* Mobile topic strip — visible only on ≤1000px via CSS */}
        <div className={styles.mobileTopicBar} ref={mobileTopicBarRef}>
          {SIDEBAR_GROUPS.filter((group) =>
            isSidebarGroupVisible(group, capturedGoals),
          ).map((group) => {
            const isActive = group.topicIds.includes(activeTopicId);
            const isCovered = group.topicIds.every((tid) =>
              progress.covered.includes(tid),
            );
            const isResponded = group.topicIds.some((tid) =>
              respondedTopics.includes(tid),
            );
            const navTopicId = group.topicIds[0];
            const navLabel = group.label;

            let pillClass = styles.mobileTopicPill;
            if (isActive) {
              pillClass += ` ${styles.mobileTopicPillActive}`;
            } else if (isCovered && isResponded) {
              pillClass += ` ${styles.mobileTopicPillCovered}`;
            } else if (isCovered && !isResponded) {
              pillClass += ` ${styles.mobileTopicPillSkipped}`;
            }

            return (
              <button
                key={group.id}
                className={pillClass}
                data-topic-id={group.id}
                onClick={() => handleTopicClick(navTopicId, navLabel)}
              >
                <span className={styles.mobileTopicDot} />
                {group.label}
              </button>
            );
          })}
        </div>

        {/* Chat Area */}
        <div className={styles.chatWrap}>
          <div className={styles.chatMessages}>
            {messages.map((msg, index) => (
              <MessageBubble
                key={index}
                message={msg}
                onChipClick={handleChipClick}
                isIdentityPhase={progress.phase === "Identity Builder"}
                isLifeAreasPhase={progress.phase === "Life Areas"}
                isExplorer={!isPaid}
                isAffirmationPhase={[
                  "Wealth",
                  "Health",
                  "Love",
                  "Family",
                  "Purpose",
                  "Spirituality",
                  "Proof Actions",
                ].includes(progress.phase)}
              />
            ))}

            {showTyping && <TypingIndicator />}

            {isComplete &&
              capturedGoals &&
              Object.keys(capturedGoals).length > 0 && (
                <CompletionCard
                  onGenerate={handleGenerateStory}
                  capturedGoals={capturedGoals}
                  onUpdateGoal={(key, value) => {
                    setCapturedGoals((prev) => ({ ...prev, [key]: value }));
                  }}
                />
              )}

            <div ref={messagesEndRef} />
          </div>

          <div className={styles.inputArea}>
            {isListening ? (
              <div className={styles.recordingOverlay}>
                {voiceLivePreview ? (
                  <div className={styles.recordingTranscript}>
                    {voiceLivePreview}
                  </div>
                ) : (
                  <div className={styles.recordingWave}>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className={styles.recordingBar} />
                    ))}
                  </div>
                )}
                <span className={styles.recordingLabel}>
                  {voiceLivePreview ? "Listening… click mic to stop & refine" : "Listening…"}
                </span>
                <span className={styles.recordingTimer}>
                  {Math.floor(recordingSeconds / 60)
                    .toString()
                    .padStart(2, "0")}
                  :{(recordingSeconds % 60).toString().padStart(2, "0")}
                </span>
              </div>
            ) : isProcessingVoice ? (
              <div className={styles.processingOverlay}>
                <div className={styles.processingSpinner} />
                <span className={styles.processingLabel}>
                  Refining your words…
                </span>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  activeTopicId === "timeframe"
                    ? "Pick an option above or type your own timeframe…"
                    : "Share your answer here…"
                }
                rows={1}
                disabled={isWaiting || isComplete}
              />
            )}
            {voiceSupported && (
              <button
                className={`${styles.micBtn} ${isListening ? styles.micBtnActive : ""} ${isProcessingVoice ? styles.micBtnTranscribing : ""}`}
                onClick={toggleVoice}
                disabled={isWaiting || isComplete || isProcessingVoice}
                title={
                  isListening
                    ? "Stop & refine"
                    : isProcessingVoice
                      ? "Processing…"
                      : "Use voice input"
                }
              >
                {isListening ? <MicOffIcon /> : <MicIcon />}
              </button>
            )}
            <button
              className={`${styles.aiBtn} ${isAiAnswering ? styles.aiBtnActive : ""}`}
              onClick={handleAiAnswer}
              disabled={
                isWaiting ||
                isComplete ||
                isAiAnswering ||
                isListening ||
                isProcessingVoice
              }
              title={
                isAiAnswering
                  ? "Generating answer…"
                  : "Auto-generate answer with AI"
              }
            >
              <AiSparkleIcon />
            </button>
            <button
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={
                !inputValue.trim() ||
                isWaiting ||
                isComplete ||
                isListening ||
                isProcessingVoice
              }
            >
              <SendIcon />
            </button>
          </div>

          {!isPrefillPending &&
            intakeStage === "orientation" &&
            messages.length === 0 && (
              <OrientationScreen onStart={handleOrientationSelected} />
            )}
          {!isPrefillPending &&
            intakeStage === "discovery" &&
            messages.length === 0 && (
              <GoalDiscoveryScreen
                orientation={pendingOrientation}
                isPaid={isPaid}
                onConfirm={handleGoalDiscoveryConfirm}
              />
            )}

          <div className={styles.inputHint}>
            {isListening
              ? "Speak now · Click mic to stop & refine"
              : isProcessingVoice
                ? "AI is adding emotional depth to your words…"
                : "Enter to send · Shift+Enter for new line"}
          </div>
        </div>

        {/* Mobile finish button — visible only on ≤1000px via CSS */}
        {!isComplete && (
          <div className={styles.mobileFinishBar}>
            <button
              className={styles.mobileFinishBtn}
              onClick={() => {
                setIsComplete(true);
              }}
              disabled={!canFinishIntake}
              style={
                !canFinishIntake ? { opacity: 0.5, cursor: "not-allowed" } : {}
              }
            >
              <span>Finish & Generate →</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function GoalDiscoveryPage() {
  return (
    <Suspense>
      <GoalDiscovery />
    </Suspense>
  );
}
