# ManifestMyStory — Developer Feedback Note
# April 6, 2026 — Second Full Test Review

---

Hey — I ran another full test today and want to give you detailed feedback. First, I want to acknowledge the real progress since the last round — some important things are now working correctly and I want to make sure those stay exactly as they are while we fix what's still outstanding.

---

## PLEASE KEEP THESE — DO NOT CHANGE

These are now working correctly. Do not modify them:

**1. Orientation pre-chat screen** — The four-chip orientation question renders correctly as a UI screen before the chat opens. This is exactly right. Keep it.

**2. Goal check question per area** — When Maya does ask about an area, the three-option check (I have a specific goal / I have a general direction / I'm not sure yet) is working correctly. Keep this behavior.

**3. Identity builder chips** — The identity statements now render as interactive tappable checkboxes with green checkmarks. The free-text "write your own" field is present. The "Done — these are mine" button is correct. This phase is working well. Keep it exactly as is.

**4. Story length selector removed** — The Short/Long story length selector is gone, replaced with "Based on your vision and tier, I've designed an immersive sensory narrative uniquely for you." This is correct. Keep it.

**5. Hypnotic induction in story** — The staircase descent induction is now in the story and it's genuinely good. Keep this.

**6. NLP anchor in story** — The thumb and forefinger anchor is being installed at an emotional peak in the story. Keep this.

**7. Sleep seeding and three repetitions** — "Sleep now... and receive." appearing three times at the close is correct. Keep this.

**8. Voice context slip-in** — Maya naturally mentions the story will be in the user's own voice mid-conversation. Keep this.

**9. Dot leader act breaks** — The · · · separators between story sections are working. Keep these.

**10. Timeframe redirect** — When the user said "tomorrow" Maya correctly redirected to 3-6 months with good language. Keep this behavior.

---

## WHAT STILL NEEDS TO BE FIXED

### CRITICAL — Fix these first

---

**FIX 1 — Maya must explore ALL selected life areas before moving to proof actions**

This is the most important unfixed issue and it has now appeared in every single test.

What is happening: The user selects six life areas (wealth, health, love, family, purpose, spirituality). Maya explores wealth only, then jumps directly to proof actions, setting, named person, and identity builder — completely skipping health, love, family, purpose, and spirituality.

Why this matters: The story can only be as rich as the intake data. In this test, health was completely absent from the story. Family goals (Ryder and Beckett getting along, admiring their father, self-improvement) never appeared. Purpose (ManifestMyStory platform, 10k users, NYT bestseller book) was missing. Spirituality was missing. Five of six selected areas produced no story scenes.

What must happen: After orientation and life area selection, Maya works through EACH selected area one at a time in sequence. For each area:
- Ask the goal check (specific goal / general direction / not sure yet)
- Ask the primary question for that area
- Capture the answer
- Move to the next area

Maya must check covered[] against selectedAreas after each area. If any selected areas remain uncovered, Maya goes to the next one. Proof actions are only asked AFTER all selected areas have been explored.

The sidebar Topics list should reflect this — there should be a tab for each selected area (Wealth, Health, Love, Family, Purpose, Spirituality) not just generic "Your Vision."

---

**FIX 2 — Timeframe must be captured before story generation**

What is happening: Maya asks the timeframe question but when the user answered "tomorrow," Maya redirected correctly to 3 or 6 months — but then immediately showed the "Your vision is captured / Generate My Story" screen without waiting for the user's answer. The timeframe was never actually captured.

Result in story: The story opened with "It is summer, tomorrow from where I once stood" — which is nonsensical. "Tomorrow" was used literally because the timeframe field was empty.

What must happen:
- After Maya redirects the timeframe ("Would 3 months or 6 months feel right?"), present this as two chips: 3 months / 6 months
- Wait for the user to select before proceeding
- Only show the generate screen after timeframe is captured
- Captured as: timeframe: "3 months" or timeframe: "6 months"
- The generate screen must not appear until timeframe is confirmed

---

**FIX 3 — Proof actions must be asked AFTER all life areas are explored**

What is happening: Proof actions are being asked immediately after wealth, before any other area is covered.

Why this matters: The proof action question is "once all your goals are real, what's the first thing you do?" If only wealth has been discussed, the user can only answer from a wealth perspective. Once all six areas are covered, the answer spans the entire vision — business wins, family trips, health achievements, philanthropic acts, all of it.

What must happen: Move the proof actions phase to AFTER all selected areas have been explored. This is a sequencing fix — the proof actions prompt is correct, it just needs to come later.

---

**FIX 4 — All chip options must render as interactive tappable buttons**

What is happening: The identity builder chips are now working correctly (great). But all other chip lists — life areas, tone, core feeling — are still rendering as □ text characters inside chat bubbles. Users are typing their answers instead of tapping.

Evidence from this test:
- Life areas: user submitted as text "My orientation toward personal growth is: Both. The life areas I want to transform are: wealth, health, love, family, purpose, spirituality" — typed, not tapped
- Tone: captured as "radiate abundance, love, and self-confidence" — free typed answer, not a chip selection
- Timeframe: user typed "tomorrow" because no chips were offered

What must happen: The same chip rendering that works for the identity builder must be applied to ALL chip lists throughout the conversation. When Maya presents options with □ characters, the frontend renders them as tappable buttons and disables the text input until a selection is made.

This is the same fix requested in the previous feedback note. The identity builder proves the frontend can do this — it needs to be applied consistently everywhere.

---

**FIX 5 — Specific proof actions and business goals must appear in story**

What is happening: The user stated these specific proof actions during intake:
- $100 million net worth
- Selling current properties and acquiring 7 more
- Signing 7 custom design build clients
- ManifestMyStory reaching 10k paid subscribers with hyper growth to 100k
- Giving large bonuses to Jon Mann and Kent Johnson
- NYT bestseller book
- $50k donation to water aid / Tanzania water project (this one did appear ✓)
- Israel first class family trip (this appeared briefly ✓)

The story included the Tanzania and Israel references but completely missed the financial milestones, business wins, team bonuses, and book.

Why this happens: These details were shared but Maya moved to proof actions too early and then moved to story generation without capturing them as structured GOALS or ACTIONSAFTER fields. The story generation prompt correctly uses verbatim inputs — but if those inputs weren't captured in the right fields, they won't appear.

What must happen: When the user shares specific business/financial details, Maya must capture them explicitly as GOALS with the exact numbers and specifics. The verbatim rule must apply — if the user said "$100 million net worth" those exact words must be in the goals capture, and therefore in the story.

---

### REQUIRED — Fix before launch

---

**FIX 6 — Splash page copy not updated**

Still showing:
- Headline: "Your journey begins here"
- Subtext: "I am Maya, your guide. Together, we will architect the vivid narrative of your future self. Shall we begin the ceremony of your manifestation?"
- Button: "BEGIN THE CEREMONY"

Replace with:
- Headline: "What do you want more of in your life?"
- Subtext: "I'm Maya. Whether you have a clear vision or just a feeling that something could be better — I'll help you put it into words, then turn them into a story recorded in your own voice that works on your subconscious mind while you sleep."
- Button: "Start the conversation"

---

**FIX 7 — Maya is over-reflecting after every answer**

What is happening: After every user answer, Maya writes 3-5 sentences of enthusiastic praise before asking the next question. Examples from this test:
- "That's deeply resonant — living in total satisfaction and self-love, knowing you are enough and radiating the same love you show your family. I can feel the weight lifted from wanting or proving, replaced by pure contentment in your own skin. And your vision for the app you're building is equally extraordinary..."
- "Those are beautifully powerful identity statements — each one resonates deeply with the vision you've shared. You're creating extraordinary abundance, showing up for your family, transforming lives through your business..."

What must happen: One warm sentence of reflection maximum, then immediately the next question. The reflection must use the user's own words — not a poetic reinterpretation.

Correct format:
"That vision for Ryder and Beckett is powerful — leading by example so they can manifest their own futures. Let's move to health next — what does your perfect body and physical life look like?"

---

**FIX 8 — Remove duplicate text list above identity builder chips**

What is happening: The identity statements appear twice — first as a plain text bulleted list ("Here are your statements: - I am someone who...") and then again as interactive chips below.

What must happen: Remove the text list entirely. Show only:
- The intro sentence ("Before I write your story, I want to build the identity of the person who already lives this life...")
- Then directly the interactive chips
- Then the free-text field
- Then "Done — these are mine" button

---

**FIX 9 — Named person question should not appear if family/love was selected**

What is happening: Maya asked "Is there someone — a partner, a child, or anyone else whose presence makes this life feel complete — who belongs in your story?" as a standalone question — even though family was a selected life area.

What must happen: If family or love is in selectedAreas, Maya extracts named persons naturally from those conversations. No standalone question needed. The standalone question only appears if neither family nor love was selected.

---

**FIX 10 — Voice recording playback**

The voice recording playback shows 0:00 and the user cannot listen back to their recording before generating. This must work so the user can verify recording quality before proceeding.

---

**FIX 11 — Orientation screen chip descriptions**

The four orientation chips (Spiritual / Scientific / Both / Grounded) currently show labels only with no descriptions. Add a brief description under each:
- Spiritual — I believe in God, Source, divine alignment
- Scientific — I trust neuroscience and subconscious programming
- Both — I blend science and spirituality freely
- Grounded — No frameworks, just real feeling and emotion

---

## SUMMARY OF WHAT WAS FIXED AND WHAT REMAINS

| Item | Status |
|---|---|
| Orientation pre-chat screen | ✅ Fixed — keep |
| Goal check per area | ✅ Fixed — keep |
| Identity builder chips | ✅ Fixed — keep |
| Story length selector removed | ✅ Fixed — keep |
| Hypnotic induction in story | ✅ Fixed — keep |
| NLP anchor in story | ✅ Fixed — keep |
| Sleep seeding + 3 repetitions | ✅ Fixed — keep |
| Voice context slip-in | ✅ Fixed — keep |
| Dot leader act breaks | ✅ Fixed — keep |
| Splash page copy | ❌ Not updated |
| All chip options as interactive buttons | ❌ Still rendering as □ text (except identity builder) |
| Maya covers all selected life areas | ❌ Still skipping 5 of 6 areas |
| Proof actions after all areas | ❌ Still asking after wealth only |
| Timeframe captured before generation | ❌ Not waiting for answer before generating |
| Specific goals/proof actions in story | ❌ Missing business wins, financial milestones, book |
| Maya over-reflecting | ❌ Still writing 3-5 sentences per response |
| Duplicate text list in identity builder | ❌ Still showing |
| Named person as standalone question | ❌ Still appearing when family selected |
| Voice recording playback | ❌ Still not working |
| Orientation chip descriptions | ❌ Not added |

---

Please work through the Critical fixes first (1-5) as these directly impact story quality. The Required fixes (6-11) should follow.

Happy to retest as soon as these are ready. Thanks.
