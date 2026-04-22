import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    authenticated_150_users: {
      executor: "constant-vus",
      vus: 150,
      duration: "5m",
      gracefulStop: "30s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<8000"],
  },
};

const BASE_URL = "https://staging-manifest.vercel.app";

// ── Replace with a real test account in your database ──
const TEST_EMAIL = "testuser@example.com";
const TEST_PASSWORD = "TestPassword123!";

// ── SETUP: runs once before all VUs start ──
// Returns the session cookie that all VUs will share
export function setup() {
  // Step 1: Get CSRF token from NextAuth
  const csrfRes = http.get(`${BASE_URL}/api/auth/csrf`);
  const csrfToken = csrfRes.json("csrfToken");

  if (!csrfToken) {
    console.error("❌ Could not get CSRF token. Check BASE_URL.");
    return { cookie: null };
  }

  // Step 2: Login with credentials + CSRF token
  const loginRes = http.post(
    `${BASE_URL}/api/auth/callback/credentials`,
    {
      csrfToken: csrfToken,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      json: "true",
    },
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      redirects: 0, // don't follow redirects — we just want the cookie
    }
  );

  // Step 3: Extract session cookie
  const setCookie = loginRes.headers["Set-Cookie"];
  const sessionCookie = setCookie
    ? setCookie.split(";")[0]  // e.g. "next-auth.session-token=xxxx"
    : null;

  if (!sessionCookie) {
    console.error("❌ Login failed — no session cookie returned. Check credentials.");
    return { cookie: null };
  }

  console.log("✅ Authenticated successfully. Session cookie obtained.");
  return { cookie: sessionCookie };
}

// ── DEFAULT: runs for every VU every iteration ──
export default function (data) {
  const cookie = data.cookie;

  if (!cookie) {
    console.error("No session cookie — skipping iteration.");
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    Cookie: cookie,
  };

  // ── Test 1: GET /api/user/stories (list stories) ──
  const storiesRes = http.get(`${BASE_URL}/api/user/stories`, { headers });
  check(storiesRes, {
    "stories: status 200": (r) => r.status === 200,
    "stories: returns array": (r) => {
      try { return Array.isArray(r.json()); } catch { return false; }
    },
  });

  sleep(1);

  // ── Test 2: POST /api/user/chat (AI endpoint) ──
  const chatPayload = JSON.stringify({
    messages: [
      {
        role: "user",
        content: "Life areas I want to transform are: career, health.",
      },
    ],
  });

  const chatRes = http.post(`${BASE_URL}/api/user/chat`, chatPayload, { headers });
  check(chatRes, {
    "chat: status 200": (r) => r.status === 200,
    "chat: has text": (r) => {
      try { return !!r.json().text; } catch { return false; }
    },
  });

  sleep(1);
}
