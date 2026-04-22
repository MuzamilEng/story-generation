import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    ai_chat_150_users: {
      executor: "constant-vus",
      vus: 150,
      duration: "5m",
      gracefulStop: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],        // <5% errors
    http_req_duration: ["p(95)<300000"],   // <300s p95 — assemble is TTS heavy
  },
};

const BASE_URL = "http://localhost:3000";  // change to staging URL if testing against staging

// ── How to get your session token ──────────────────────────────────────────
// 1. Log into staging in Chrome
// 2. DevTools → Application → Cookies → staging-manifest.vercel.app
// 3. Copy the value of: next-auth.session-token
// 4. Run: SESSION_TOKEN="your-token" STORY_ID="your-story-id" k6 run ai-chat-150.js
const SESSION_TOKEN = __ENV.SESSION_TOKEN || "PASTE_YOUR_TOKEN_HERE";

// ── How to get a storyId ───────────────────────────────────────────────────
// 1. Log into staging and create a story (go through goal intake)
// 2. After story is generated, copy the storyId from the URL or browser DevTools
// 3. The story must have story_text_draft or story_text_approved set
const STORY_ID = __ENV.STORY_ID || "PASTE_YOUR_STORY_ID_HERE";

const payload = JSON.stringify({ storyId: STORY_ID });

export default function () {
  const res = http.post(`${BASE_URL}/api/user/audio/assemble`, payload, {
    headers: {
      "Content-Type": "application/json",
      "Cookie": `next-auth.session-token=${SESSION_TOKEN}`,
    },
    timeout: "310s",  // must exceed maxDuration of 300s set on the route
  });

  check(res, {
    "status 200": (r) => r.status === 200,
    "has audioUrl": (r) => {
      try { return !!r.json().audioUrl; } catch { return false; }
    },
  });

  sleep(1);
}




// https://staging-manifest.vercel.app/user/audio-download?storyId=cmo8v950a0001jp04mgtzmy8p&autoplay=true