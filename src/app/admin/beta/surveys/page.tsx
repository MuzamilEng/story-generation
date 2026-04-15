import { prisma } from "@/lib/prisma";
import styles from "../../../styles/AdminDashboard.module.css";

async function getSurveyData() {
  const [day2Responses, day7Responses, day2Count, day7Count] = await Promise.all([
    prisma.betaSurveyResponse.findMany({
      where: { survey_type: "day2" },
      orderBy: { created_at: "desc" },
      take: 100,
    }),
    prisma.betaSurveyResponse.findMany({
      where: { survey_type: "day7" },
      orderBy: { created_at: "desc" },
      take: 100,
    }),
    prisma.betaSurveyResponse.count({ where: { survey_type: "day2" } }),
    prisma.betaSurveyResponse.count({ where: { survey_type: "day7" } }),
  ]);

  // Get signup info for each response
  const signupIds = [
    ...new Set([
      ...day2Responses.map((r) => r.beta_signup_id).filter(Boolean),
      ...day7Responses.map((r) => r.beta_signup_id).filter(Boolean),
    ]),
  ] as string[];

  const signups = signupIds.length > 0
    ? await prisma.betaSignup.findMany({
        where: { id: { in: signupIds } },
        select: { id: true, first_name: true, email: true },
      })
    : [];

  const signupMap = Object.fromEntries(signups.map((s) => [s.id, s]));

  return { day2Responses, day7Responses, day2Count, day7Count, signupMap };
}

function fmt(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Question labels for readable display
const DAY2_LABELS: Record<string, string> = {
  onboarding_clarity: "Onboarding clarity",
  onboarding_expectations: "Expectations explained?",
  onboarding_confusion: "Setup confusion",
  goal_ease: "Goal entry ease",
  goal_personal: "Goal felt personal?",
  goal_natural: "Natural goal entry?",
  goal_unclear: "Goal unclear areas",
  voice_ease: "Voice cloning ease",
  voice_quality: "Voice quality",
  voice_hesitation: "Voice hesitation",
  story_speed: "Story gen speed",
  story_personal: "Story personalized?",
  story_goals_included: "Goals included?",
  story_writing_quality: "Writing quality",
  story_feedback: "Story feedback",
  audio_overall: "Audio quality",
  audio_pacing: "Audio pacing",
  audio_binaural: "Binaural effect",
  audio_feedback: "Audio feedback",
  listen_when: "When they listen",
  listen_feel: "How it felt",
  price_feel_right: "Price feels right",
  price_compared: "Value vs others",
  nps: "NPS score",
  one_improvement: "Top improvement",
  never_change: "Never change",
  testimonial: "One-sentence description",
  open_feedback: "Open feedback",
};

const DAY7_LABELS: Record<string, string> = {
  price_too_cheap: "Too cheap",
  price_good_value: "Good value",
  price_getting_expensive: "Getting expensive",
  price_too_expensive: "Too expensive",
  price_annual_interest: "Annual preference",
  pricing_open: "Pricing feedback",
};

function ResponseCard({
  response,
  signupMap,
  labels,
}: {
  response: { id: string; beta_signup_id: string | null; responses: unknown; created_at: Date };
  signupMap: Record<string, { first_name: string; email: string }>;
  labels: Record<string, string>;
}) {
  const signup = response.beta_signup_id ? signupMap[response.beta_signup_id] : null;
  const answers = response.responses as Record<string, string | number>;

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "6px",
        padding: "24px",
        marginBottom: "16px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
        <div style={{ minWidth: 0 }}>
          <span style={{ color: "#8DBF7A", fontWeight: 500, fontSize: "0.9rem" }}>
            {signup ? signup.first_name : "Unknown"}
          </span>
          <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.8rem", marginLeft: "12px", wordBreak: "break-all" }}>
            {signup?.email || "—"}
          </span>
        </div>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
          {fmt(response.created_at)}
        </span>
      </div>

      <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
        <tbody>
          {Object.entries(answers).map(([key, value]) => {
            const display = typeof value === "number" ? String(value) : (value || "—");
            const label = labels[key] || key;
            const isScore = typeof value === "number";
            const isNps = key === "nps";

            return (
              <tr key={key} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td
                  style={{
                    padding: "8px 12px 8px 0",
                    color: "rgba(255,255,255,0.5)",
                    fontWeight: 400,
                    maxWidth: "200px",
                    minWidth: "100px",
                    verticalAlign: "top",
                  }}
                >
                  {label}
                </td>
                <td
                  style={{
                    padding: "8px 0",
                    color: isNps
                      ? Number(value) >= 9
                        ? "#8DBF7A"
                        : Number(value) >= 7
                        ? "#C9A84C"
                        : "#e05252"
                      : isScore
                      ? Number(value) >= 4
                        ? "#8DBF7A"
                        : Number(value) >= 3
                        ? "#C9A84C"
                        : "#e05252"
                      : "rgba(255,255,255,0.75)",
                    verticalAlign: "top",
                    fontWeight: isScore ? 500 : 300,
                  }}
                >
                  {isNps ? `${display}/10` : isScore ? `${display}/5` : display}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

export default async function AdminBetaSurveysPage() {
  const data = await getSurveyData();

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Beta <em>Surveys</em>
        </h1>
        <p className={styles.subtitle}>
          {data.day2Count} Day 2 responses &middot; {data.day7Count} Day 7 responses
        </p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Day 2 Surveys</span>
          </div>
          <div className={styles.cardValue}>{data.day2Count}</div>
          <p className={styles.cardSub}>first impressions</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Day 7 Surveys</span>
          </div>
          <div className={styles.cardValue}>{data.day7Count}</div>
          <p className={styles.cardSub}>pricing pulse</p>
        </div>
      </div>

      {/* DAY 2 RESPONSES */}
      <div style={{ marginTop: "40px" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.4rem", fontWeight: 300, color: "#f0ede8", marginBottom: "8px" }}>
          Day 2 — <em style={{ color: "#8DBF7A" }}>First Impressions</em>
        </h2>
        <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", marginBottom: "24px" }}>
          Onboarding, voice, story, audio, pricing gut reaction, NPS
        </p>

        {data.day2Responses.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem", fontStyle: "italic" }}>
            No Day 2 survey responses yet.
          </p>
        ) : (
          data.day2Responses.map((r) => (
            <ResponseCard key={r.id} response={r} signupMap={data.signupMap} labels={DAY2_LABELS} />
          ))
        )}
      </div>

      {/* DAY 7 RESPONSES */}
      <div style={{ marginTop: "48px" }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.4rem", fontWeight: 300, color: "#f0ede8", marginBottom: "8px" }}>
          Day 7 — <em style={{ color: "#C9A84C" }}>Pricing Pulse</em>
        </h2>
        <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.35)", marginBottom: "24px" }}>
          Van Westendorp pricing questions + annual interest
        </p>

        {data.day7Responses.length === 0 ? (
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem", fontStyle: "italic" }}>
            No Day 7 survey responses yet.
          </p>
        ) : (
          data.day7Responses.map((r) => (
            <ResponseCard key={r.id} response={r} signupMap={data.signupMap} labels={DAY7_LABELS} />
          ))
        )}
      </div>
    </div>
  );
}
