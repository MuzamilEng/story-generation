"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import styles from "../../../styles/GoalDiscovery.module.css";
import Link from "next/link";
import {
  SendIcon,
  UserIcon,
  ArrowIcon,
} from "../../../components/icons/ChatIcons";
import {
  Message,
  CapturedData,
  ProgressData,
  CaptureData,
  SYSTEM_PROMPT,
  TOPICS,
} from "../../../types/goal-discovery";
import { useStoryStore } from "@/store/useStoryStore";
import { normalizeGoals } from "@/lib/story-utils";

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
  value: string;
}

const CapturedItem: React.FC<CapturedItemProps> = ({ label, value }) => (
  <div className={styles.capturedItem}>
    <strong>{label}</strong>
    {value.length > 80 ? `${value.slice(0, 80)}…` : value}
  </div>
);

interface CompletionCardProps {
  onGenerate: (length: "short" | "long") => void;
}

const CompletionCard: React.FC<CompletionCardProps> = ({ onGenerate }) => {
  const [selected, setSelected] = useState<"short" | "long">("long");

  return (
    <div className={`${styles.msgRow} ${styles.bot}`}>
      <div className={`${styles.avatar} ${styles.bot}`}>M</div>
      <div className={styles.completeCard}>
        <h3>✦ Your vision is captured</h3>
        <p>
          I have everything I need to write your personal manifestation story.
          Choose the depth of your future world:
        </p>

        <div className={styles.lengthOptions}>
          <div
            className={`${styles.lengthOption} ${selected === "short" ? styles.active : ""}`}
            onClick={() => setSelected("short")}
          >
            <div className={styles.lengthInfo}>
              <div className={styles.lengthTitle}>Short Story</div>
              <div className={styles.lengthDesc}>Focused on 1-2 core goals</div>
            </div>
            <div className={styles.lengthMeta}>
              <div className={styles.lengthWords}>~500 words</div>
              <div className={styles.lengthTime}>4-5 min audio</div>
            </div>
            <div className={styles.radioCircle}>
              {selected === "short" && <div className={styles.radioInner} />}
            </div>
          </div>

          <div
            className={`${styles.lengthOption} ${selected === "long" ? styles.active : ""}`}
            onClick={() => setSelected("long")}
          >
            <div className={styles.lengthInfo}>
              <div className={styles.lengthTitle}>Longer Story</div>
              <div className={styles.lengthDesc}>
                Deeply immersive & expansive
              </div>
            </div>
            <div className={styles.lengthMeta}>
              <div className={styles.lengthWords}>~1000 words</div>
              <div className={styles.lengthTime}>8-10 min audio</div>
            </div>
            <div className={styles.radioCircle}>
              {selected === "long" && <div className={styles.radioInner} />}
            </div>
          </div>
        </div>

        <button
          className={styles.completeBtn}
          onClick={() => onGenerate(selected)}
        >
          Generate My Story
          <ArrowIcon />
        </button>

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
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onChipClick,
}) => {
  const isUser = message.role === "user";

  // Extract chips from assistant messages (simple heuristic)
  const chips =
    !isUser && message.content.toLowerCase().includes("already have")
      ? ["Yes, I have my goals ready", "Let's explore together"]
      : !isUser && message.content.toLowerCase().includes("would you like")
        ? ["Tell me more", "Let's move on"]
        : [];

  // Format text with simple markdown and strip AI markers
  const formatText = (text: string) => {
    // Strip CAPTURE: and PROGRESS: markers
    let cleanText = text.replace(/CAPTURE:\s*\{[\s\S]*?\}/g, "");
    cleanText = cleanText.replace(/PROGRESS:\s*\{[\s\S]*?\}/g, "");

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
            {chips.map((chip, i) => (
              <button
                key={i}
                className={styles.chip}
                onClick={() => onChipClick?.(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Additional Details Modal
interface AdditionalDetailsModalProps {
  onConfirm: (details: string) => void;
  onSkip: () => void;
}

const AdditionalDetailsModal: React.FC<AdditionalDetailsModalProps> = ({
  onConfirm,
  onSkip,
}) => {
  const [details, setDetails] = useState("");

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalIcon}>✦</div>
        <h3>Personalise your story</h3>
        <p>
          Would you like to share any additional details about your story?
          Please add them here to make it more personalized.
        </p>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          placeholder="e.g. specific names, places, or feelings you want to include..."
          className={styles.modalTextarea}
        />
        <div className={styles.modalActions}>
          <button className={styles.modalBtnSecondary} onClick={onSkip}>
            Skip for now
          </button>
          <button
            className={styles.modalBtnPrimary}
            onClick={() => onConfirm(details)}
            disabled={!details.trim()}
          >
            Add Details
          </button>
        </div>
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

// Topic item component
interface TopicItemProps {
  id: string;
  label: string;
  isActive: boolean;
  isCovered: boolean;
  onClick: (id: string, label: string) => void;
}

const TopicItem: React.FC<TopicItemProps> = ({
  id,
  label,
  isActive,
  isCovered,
  onClick,
}) => {
  let className = styles.topicItem;
  if (isCovered) className += ` ${styles.covered}`;
  if (isActive) className += ` ${styles.active}`;

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
  const { data: session, status: authStatus } = useSession();

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
  const { capturedGoals, setCapturedGoals, setNormalizedGoals, clearStore } =
    useStoryStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const [progress, setProgress] = useState<ProgressData>({
    pct: 0,
    phase: "Getting Started",
    covered: [],
  });

  // Keep activeTopicIdRef in sync with the current phase
  useEffect(() => {
    const match = TOPICS.find((t) => t.phase === progress.phase);
    if (match) activeTopicIdRef.current = match.id;
  }, [progress.phase]);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [showTyping, setShowTyping] = useState(false);
  const [pendingSkip, setPendingSkip] = useState<{
    id: string;
    label: string;
  } | null>(null);
  // Track which topic IDs the user has sent at least one reply in
  const [respondedTopics, setRespondedTopics] = useState<string[]>([]);
  const [showAdditionalDetails, setShowAdditionalDetails] = useState(false);
  const [hasSeenAdditionalDetails, setHasSeenAdditionalDetails] =
    useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Always reflects the currently active topic id — safe to read inside callbacks
  const activeTopicIdRef = useRef<string>(TOPICS[0].id);
  // Set when user sends a message in Evening & Close; triggers isComplete after AI replies
  const triggerCompleteAfterResponseRef = useRef(false);
  // Guard against double-fire on back-navigation / React Strict Mode double-invoke
  const hasSentInitialRef = useRef(false);
  // Blocking ref for concurrent calls
  const isCallingRef = useRef(false);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 130)}px`;
    }
  }, [inputValue]);

  // Start conversation on mount — fire only once per mount cycle
  useEffect(() => {
    if (!hasSentInitialRef.current && messagesRef.current.length === 0) {
      hasSentInitialRef.current = true;
      sendToAI();
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
          if (data.phase === "Complete" || data.pct >= 100) {
            setIsComplete(true);
            if (!hasSeenAdditionalDetails) {
              setShowAdditionalDetails(true);
            }
          }
        } catch (e) {
          console.error("Error parsing progress JSON:", e);
        }
      }

      // 2. Extract all CAPTURE data (handles variations, no colons, etc)
      const captureRegex =
        /(?:CAPTURE|CAPTURED|CAP):?\s*(?:```json)?\s*(\{[\s\S]*?\})\s*(?:```)?/gi;
      let match;
      const newGoals: Record<string, string> = {};
      while ((match = captureRegex.exec(cleanText)) !== null) {
        try {
          const data = JSON.parse(match[1]) as CaptureData;
          if (data.label && data.value) {
            newGoals[data.label] = data.value;
          }
        } catch (e) {
          console.error("Error parsing capture JSON:", e);
        }
      }

      if (Object.keys(newGoals).length > 0) {
        console.log("[GOAL_CAPTURE] Extracting new goals:", newGoals);
        setCapturedGoals((prev) => ({
          ...prev,
          ...newGoals,
        }));
      }

      // Clean up the text for UI: remove tags and any surrounding artifacts
      return cleanText
        .replace(
          /(?:PROGRESS|PROG):\s*(?:```json)?\s*\{[\s\S]*?\}\s*(?:```)?/gi,
          "",
        )
        .replace(
          /(?:CAPTURE|CAPTURED|CAP):\s*(?:```json)?\s*\{[\s\S]*?\}\s*(?:```)?/gi,
          "",
        )
        .trim();
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
      if (isWaiting || isCallingRef.current) return;
      isCallingRef.current = true;

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
        if (currentTopicId === "evening") {
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

        // 1. Process metadata and get cleaned text for display
        const uiText = parseResponse(rawText);

        // 2. Store CLEAN version for UI, but RAW version for internal memory
        const assistantMsg: Message = {
          role: "assistant",
          content: uiText,
          rawContent: rawText, // Preserve technical tags for the LLM
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Auto-show completion card after AI replies to the Evening & Close message
        if (triggerCompleteAfterResponseRef.current) {
          triggerCompleteAfterResponseRef.current = false;
          setIsComplete(true);
          if (!hasSeenAdditionalDetails) {
            setShowAdditionalDetails(true);
          }
        }
      } catch (error) {
        console.error("Error calling AI:", error);
        triggerCompleteAfterResponseRef.current = false;
        const errorMsg: Message = {
          role: "assistant",
          content:
            "I'm having a moment of connection trouble. Please check your network and try again.",
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setShowTyping(false);
        setIsWaiting(false);
        isCallingRef.current = false;
        setInputValue("");
      }
    },
    [isWaiting, parseResponse],
  );

  const handleSend = useCallback(() => {
    if (!inputValue.trim() || isWaiting) return;
    sendToAI(inputValue.trim());
  }, [inputValue, isWaiting, sendToAI]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleChipClick = useCallback(
    (text: string) => {
      if (isWaiting) return;
      sendToAI(text);
    },
    [isWaiting, sendToAI],
  );

  /**
   * Build a personalised story title from whatever goals have been captured.
   * Priority order: career → relationship → financial → health → lifestyle → generic
   */
  const buildStoryTitle = useCallback(
    (goals: Record<string, string>): string => {
      if (!goals || Object.keys(goals).length === 0) {
        return "My Manifestation Story";
      }

      const entries = Object.entries(goals);

      // Try to find a high-value goal label to feature in the title
      const priorityKeywords = [
        "career",
        "job",
        "work",
        "business",
        "relationship",
        "love",
        "partner",
        "financial",
        "money",
        "income",
        "wealth",
        "health",
        "body",
        "fitness",
        "lifestyle",
        "home",
        "travel",
        "freedom",
      ];

      let featuredGoal = "";
      for (const keyword of priorityKeywords) {
        const match = entries.find(
          ([label]) =>
            label.toLowerCase().includes(keyword) ||
            goals[label]?.toLowerCase().includes(keyword),
        );
        if (match) {
          // Take first meaningful snippet of the value (max ~5 words)
          const words = match[1]
            .replace(/[^a-zA-Z0-9 ',-]/g, "")
            .split(" ")
            .slice(0, 5)
            .join(" ");
          featuredGoal = words;
          break;
        }
      }

      // Static title templates keyed to theme
      const templates = [
        "A Life of {goal}",
        "My Journey to {goal}",
        "Living My Best Life — {goal}",
        "The Story of {goal}",
        "Manifesting {goal}",
      ];

      if (featuredGoal) {
        // Pick template based on number of captured goals for variety
        const tpl = templates[Object.keys(goals).length % templates.length];
        // Capitalise first letter
        const g =
          featuredGoal.charAt(0).toUpperCase() + featuredGoal.slice(1);
        return tpl.replace("{goal}", g);
      }

      // Fallback: count-based generic
      const goalCount = Object.keys(goals).length;
      return goalCount === 1
        ? "My Manifestation Story"
        : `My ${goalCount}-Goal Manifestation Story`;
    },
    [],
  );

  const handleGenerateStory = useCallback(
    async (length: "short" | "long" = "long") => {
      // 1. Normalize the data before sending/storing
      const normalized = normalizeGoals(capturedGoals);
      setNormalizedGoals(normalized);

      // Build a dynamic title from captured goals
      const storyTitle = buildStoryTitle(capturedGoals);

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
            title: storyTitle,
            length: length,
          }),
        });
        const data = await response.json();
        if (data.storyId) {
          clearStore(); // Session successfully saved, clear temporary data
          router.push(`/user/story?id=${data.storyId}`);
        } else {
          console.warn("API error during story creation:", data.error);
          // Fallback if API fails
          sessionStorage.setItem(
            "capturedGoals",
            JSON.stringify(capturedGoals),
          );
          sessionStorage.setItem("storyLength", length);
          router.push("/user/story");
        }
      } catch (error) {
        console.error("Error saving story goals:", error);
        // Fallback
        sessionStorage.setItem("capturedGoals", JSON.stringify(capturedGoals));
        sessionStorage.setItem("storyLength", length);
        router.push("/user/story");
      }
    },
    [capturedGoals, router, session, setNormalizedGoals, clearStore, buildStoryTitle],
  );

  // Execute the actual topic navigation (called directly or after modal confirm)
  const executeTopicNav = useCallback(
    (id: string, label: string) => {
      const topicIndex = TOPICS.findIndex((t) => t.id === id);
      const targetPct = Math.max(progress.pct, (topicIndex + 1) * 15);

      setProgress((prev) => ({
        pct: targetPct,
        phase: TOPICS[topicIndex].phase,
        covered: prev.covered.includes(id)
          ? prev.covered
          : [...prev.covered, id],
      }));

      const prompt = `I'd like to dive into ${label} next.`;
      sendToAI(prompt);
    },
    [progress.pct, sendToAI],
  );

  const handleTopicClick = useCallback(
    (id: string, label: string) => {
      if (isWaiting) return;

      const topicIndex = TOPICS.findIndex((t) => t.id === id);
      const currentTopicIndex = TOPICS.findIndex(
        (t) => t.phase === progress.phase,
      );

      // Block navigating to a previous stage
      if (topicIndex < currentTopicIndex) return;

      // "Getting Started" is mandatory — block any forward jump until the user
      // has replied at least once in that stage.
      const firstTopicId = TOPICS[0].id;
      if (id !== firstTopicId && !respondedTopics.includes(firstTopicId))
        return;

      const isAlreadyCovered = progress.covered.includes(id);

      // Check if there are uncovered topics before the target (i.e. this is a skip)
      const hasGapBefore = TOPICS.slice(0, topicIndex).some(
        (t) => !progress.covered.includes(t.id),
      );

      if (!isAlreadyCovered && hasGapBefore) {
        // Allow skipping only if user has already replied in the current topic
        const currentTopicId = TOPICS[currentTopicIndex]?.id;
        const hasRespondedToCurrentTopic = currentTopicId
          ? respondedTopics.includes(currentTopicId)
          : false;

        if (!hasRespondedToCurrentTopic) {
          // User hasn't interacted with their current stage — show warning modal
          setPendingSkip({ id, label });
          return;
        }
        // Has responded → allow navigation without modal
      }

      executeTopicNav(id, label);
    },
    [
      isWaiting,
      progress.phase,
      progress.covered,
      respondedTopics,
      executeTopicNav,
    ],
  );

  const isPaid = session?.user?.plan && session.user.plan !== "free";

  return (
    <div className={styles.container}>
      {pendingSkip && (
        <SkipConfirmModal
          topicLabel={pendingSkip.label}
          onConfirm={() => {
            const { id, label } = pendingSkip;
            setPendingSkip(null);
            executeTopicNav(id, label);
          }}
          onCancel={() => setPendingSkip(null)}
        />
      )}
      {showAdditionalDetails && (
        <AdditionalDetailsModal
          onConfirm={(details) => {
            if (details.trim()) {
              setCapturedGoals((prev) => ({
                ...prev,
                "Additional Details": details.trim(),
              }));
            }
            setShowAdditionalDetails(false);
            setHasSeenAdditionalDetails(true);
          }}
          onSkip={() => {
            setShowAdditionalDetails(false);
            setHasSeenAdditionalDetails(true);
          }}
        />
      )}
      <div className={styles.main}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Topics</div>

          {TOPICS.map((topic) => (
            <TopicItem
              key={topic.id}
              id={topic.id}
              label={topic.label}
              isActive={progress.phase === topic.phase}
              isCovered={progress.covered.includes(topic.id)}
              onClick={() => handleTopicClick(topic.id, topic.label)}
            />
          ))}
          <div className={styles.capturedBox}>
            <div className={styles.capturedTitle}>Captured So Far</div>
            <div className={styles.capturedList}>
              {!capturedGoals || Object.entries(capturedGoals).length === 0 ? (
                <span className={styles.nothingYet}>
                  Your vision will appear here…
                </span>
              ) : (
                Object.entries(capturedGoals).map(([label, value]) => (
                  <CapturedItem key={label} label={label} value={value} />
                ))
              )}
              <div ref={goalsEndRef} />
            </div>
          </div>

          {/* Sidebar finish button - always shown, disabled if no goals */}
          {!isComplete && (
            <button
              className={styles.finishEarlyBtn}
              onClick={() => {
                setIsComplete(true);
                if (!hasSeenAdditionalDetails) {
                  setShowAdditionalDetails(true);
                }
              }}
              disabled={
                !capturedGoals || Object.keys(capturedGoals).length === 0
              }
              title={
                Object.keys(capturedGoals).length === 0
                  ? "Capture at least one goal to proceed"
                  : "Click here whenever you feel ready to see your story"
              }
            >
              <span>Ready to see your story?</span>
              <strong>Finish & Generate →</strong>
            </button>
          )}
        </aside>

        {/* Chat Area */}
        <div className={styles.chatWrap}>
          <div className={styles.chatMessages}>
            {messages.map((msg, index) => (
              <MessageBubble
                key={index}
                message={msg}
                onChipClick={handleChipClick}
              />
            ))}

            {showTyping && <TypingIndicator />}

            {isComplete && <CompletionCard onGenerate={handleGenerateStory} />}

            <div ref={messagesEndRef} />
          </div>

          <div className={styles.inputArea}>
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share your answer here…"
              rows={1}
              disabled={isWaiting || isComplete}
            />
            <button
              className={styles.sendBtn}
              onClick={handleSend}
              disabled={!inputValue.trim() || isWaiting || isComplete}
            >
              <SendIcon />
            </button>
          </div>

          <div className={styles.inputHint}>
            Enter to send · Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalDiscovery;
