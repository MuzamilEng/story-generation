'use client';

import React from 'react';
import Link from 'next/link';
import styles from '../styles/Mystical.module.css';
import Sidebar from '../components/Sidebar';

export default function MysticalPage() {
  return (
    <div className={styles.mainContainer}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          Manifest<span>MyStory</span>
        </Link>

        <div className={styles.navLinks}>
          <Link href="/">&larr; Home</Link>
          <a href="#tradition">The Tradition</a>
          <a href="#eastern">The Eastern Path</a>
          <a href="#bridge">Where They Meet</a>
          <a href="#for-you">Who It&apos;s For</a>
          <Link href="/science">The Science &rarr;</Link>
        </div>

        <Link href="/user/goal-intake-ai" className={styles.navCta}>
          Create My Story — Free
        </Link>
      </nav>

      <Sidebar isLandingPage />

      {/* HERO */}
      <div className={styles.hero}>
        <div className={styles.stars}></div>
        <div className={styles.heroInner}>
          <div className={styles.heroEyebrow}>Ancient Wisdom &middot; Modern Method</div>
          <span className={styles.heroSymbol}>✦</span>
          <h1 className={styles.heroTitle}>
            What the mystics knew,<br />
            <em>science is only now beginning to prove.</em>
          </h1>
          <p className={styles.heroSub}>
            For thousands of years, across every culture and tradition, human beings have practiced the art of intention — using the mind to shape reality. They didn&apos;t have neuroscience or fMRI machines. They had something else: direct experience of what happens when a person truly, deeply, repeatedly holds a vision of their desired future as already real.
          </p>
          <div className={styles.heroDivider}>
            <div className={styles.heroDividerLine}></div>
            <div className={styles.heroDividerGlyph}>✦</div>
            <div className={styles.heroDividerLine}></div>
          </div>
        </div>
      </div>

      {/* SECTION 1 — THE TRADITION */}
      <div className={styles.section} id="tradition">
        <div className={`${styles.sectionEyebrow} ${styles.mystic}`}>A Practice as Old as Humanity</div>
        <h2 className={styles.sectionTitle}>
          Every great tradition<br />
          has known <em className={styles.mystic}>this.</em>
        </h2>
        <p className={styles.prose}>
          The practice at the heart of ManifestMyStory is not new. It has been called many things across time and culture — prayer, visualization, intention-setting, mental rehearsal, creative imagination, the law of assumption, scripting. The language has changed. The practice has not.
        </p>
        <p className={styles.prose}>
          Across every lineage and tradition, the same essential truth kept re-emerging: <strong>the mind that fully inhabits a vision, treats it as present, and returns to it with discipline — tends to draw that vision into being.</strong> For centuries this was understood as mystical, spiritual, even miraculous. And then neuroscience arrived — and began confirming, with remarkable precision, what the mystics had always described.
        </p>

        <div className={styles.traditionList}>
          <div className={styles.traditionItem}>
            <div className={styles.traditionDot}>𓂀</div>
            <div>
              <div className={styles.traditionName}>Ancient Egypt</div>
              <div className={styles.traditionBody}>
                Sacred texts and ritual repetition were used to anchor desired realities in the mind. The Egyptians understood that repeated inner rehearsal of a future state was the mechanism through which intention became form.
              </div>
            </div>
          </div>
          <div className={styles.traditionItem}>
            <div className={styles.traditionDot}>☸</div>
            <div>
              <div className={styles.traditionName}>Hindu &amp; Buddhist Traditions</div>
              <div className={styles.traditionBody}>
                Dharana — vivid, sustained visualization — was a core tool for transformation and liberation. Practitioners spent hours holding a precise inner image as a path to becoming what they envisioned. The specificity of the vision was not incidental. It was the practice.
              </div>
            </div>
          </div>
          <div className={styles.traditionItem}>
            <div className={styles.traditionDot}>Σ</div>
            <div>
              <div className={styles.traditionName}>Stoic Philosophy</div>
              <div className={styles.traditionBody}>
                The philosophers of ancient Greece and Rome practiced premeditatio — rehearsing outcomes vividly in the mind before they occurred. Marcus Aurelius, Epictetus, and Seneca all described the disciplined mental rehearsal of desired states as foundational to a life of excellence.
              </div>
            </div>
          </div>
          <div className={styles.traditionItem}>
            <div className={styles.traditionDot}>✡</div>
            <div>
              <div className={styles.traditionName}>Kabbalistic Tradition</div>
              <div className={styles.traditionBody}>
                The Kabbalists described consciousness as the creative fabric of reality — that the inner state of the practitioner shapes the outer world through resonance and alignment. The Hebrew word Dabar — meaning both &quot;word&quot; and &quot;thing&quot; — reflects their understanding that spoken intention and physical reality are not separate.
              </div>
            </div>
          </div>
          <div className={styles.traditionItem}>
            <div className={styles.traditionDot}>☽</div>
            <div>
              <div className={styles.traditionName}>Sufi &amp; Islamic Mysticism</div>
              <div className={styles.traditionBody}>
                Sufi poets like Rumi described the longing of the inner self as the very force that draws the desired into being. &quot;What you seek is seeking you&quot; is not poetry alone — it is a description of how consciousness and reality interact when aligned with precision and feeling.
              </div>
            </div>
          </div>
          <div className={styles.traditionItem}>
            <div className={styles.traditionDot}>✝</div>
            <div>
              <div className={styles.traditionName}>Christian Mysticism</div>
              <div className={styles.traditionBody}>
                Medieval mystics, from Meister Eckhart to Julian of Norwich, described the practice of holding a vision of the desired state as already received — not as hope, but as a present reality experienced inwardly first. Faith itself implies assuming the reality of the unseen before it is made visible.
              </div>
            </div>
          </div>
        </div>

        <div className={styles.pullQuoteGold}>
          <p>
            &quot;Imagination is more important than knowledge. For knowledge is limited, whereas imagination embraces the entire world, stimulating progress, giving birth to evolution.&quot;
          </p>
          <cite>— Albert Einstein</cite>
        </div>
      </div>

      <div className={styles.sectionRule}>
        <hr />
      </div>

      {/* SECTION 2 — THE EASTERN CONTEMPLATIVE TRADITIONS */}
      <div className={styles.section} id="eastern">
        <div className={`${styles.sectionEyebrow} ${styles.mystic}`}>The Contemplative East</div>
        <h2 className={styles.sectionTitle}>
          The Eastern traditions went<br />
          <em className={styles.mystic}>deepest of all.</em>
        </h2>
        <p className={styles.prose}>
          While every major tradition discovered the power of intentional inner practice, the Eastern contemplative traditions developed it with a precision and depth that is remarkable by any standard. Over thousands of years, monks, yogis, and sages systematically mapped the inner terrain of consciousness — and arrived at techniques that modern neuroscience is only now beginning to understand.
        </p>
        <p className={styles.prose}>
          The practices below are not metaphor. They are disciplined, repeatable methods for transforming the inner world — and through it, the outer. ManifestMyStory draws directly from this lineage.
        </p>

        <div className={styles.easternPanel}>
          <div className={styles.easternHeader}>
            <div className={styles.easternBadge}>✦ Eastern Contemplative Practices</div>
            <h3 className={styles.easternTitle}>
              Four practices. One truth.<br />
              <em>The inner shapes the outer.</em>
            </h3>
            <p className={styles.easternSub}>
              Each of these traditions independently discovered the same mechanism — and each maps with striking precision onto how ManifestMyStory works.
            </p>
          </div>
          <div className={styles.easternGrid}>
            <div className={styles.easternCard}>
              <div className={styles.easternCardTag}>Tibetan Buddhism</div>
              <div className={styles.easternCardTitle}>Deity Visualization Practice</div>
              <div className={styles.easternCardBody}>
                Tibetan monks spend years visualizing deities, mandalas, and enlightened states with extraordinary sensory precision — color, texture, light, sound, spatial position. The visualization must be held with complete vividness and emotional presence. The specificity is not aesthetic. It is the mechanism. A vague visualization produces a vague result. A fully inhabited one begins to reorganize the practitioner&apos;s consciousness around the envisioned state.
              </div>
              <div className={styles.easternCardScience}>Science: identical to submodality engineering — precision and vividness determine neural encoding strength</div>
            </div>
            <div className={styles.easternCard}>
              <div className={styles.easternCardTag}>Hindu Yoga Tradition</div>
              <div className={styles.easternCardTitle}>Yoga Nidra — Yogic Sleep</div>
              <div className={styles.easternCardBody}>
                Yoga Nidra is a Sanskrit practice literally meaning &quot;yogic sleep&quot; — a state of conscious awareness between waking and sleep. In this state, practitioners receive intentions and visualizations called Sankalpa — heartfelt vows stated in the present tense, as already true — at the precise moment the subconscious is most open. Yoga Nidra is practiced today in hospitals and military programs for trauma, stress, and behavior change. The listening protocol of ManifestMyStory is structurally identical: your story, delivered in the theta state, at the threshold of sleep and waking.
              </div>
              <div className={styles.easternCardScience}>Science: theta state practice — documented elevated neurological receptivity at hypnagogic threshold</div>
            </div>
            <div className={styles.easternCard}>
              <div className={styles.easternCardTag}>Hindu &amp; Yoga Philosophy</div>
              <div className={styles.easternCardTitle}>Sankalpa — The Heartfelt Intention</div>
              <div className={styles.easternCardBody}>
                Sankalpa is a Sanskrit term meaning a heartfelt intention, resolve, or vow — used at the beginning of yoga and meditation practice to plant a seed of intention at the deepest level of consciousness. The Sankalpa is always stated in the present tense, as already true: &quot;I am whole. I am at peace. I live in abundance.&quot; It is not a wish for the future. It is a declaration of present reality. This is identical to how every ManifestMyStory narrative is written — first person, present tense, already done.
              </div>
              <div className={styles.easternCardScience}>Science: present-tense first-person language activates different neural patterns than future-tense aspiration</div>
            </div>
            <div className={styles.easternCard}>
              <div className={styles.easternCardTag}>Zen Buddhism</div>
              <div className={styles.easternCardTitle}>Mushin — The Natural State of Mastery</div>
              <div className={styles.easternCardBody}>
                Mushin — &quot;no mind&quot; in Japanese — describes the state of effortless, natural action that emerges when intention and identity are in complete alignment. The Zen master does not strive to perform correctly. They simply act from who they are. This is precisely the destination ManifestMyStory points toward: not a person effortfully pursuing goals, but someone whose identity has shifted so completely that aligned action flows naturally, without resistance, as automatically as breathing. The story builds that identity. Mushin is what follows.
              </div>
              <div className={styles.easternCardScience}>Science: identity-level change — Dilts&apos; neurological levels model; behavior flows from identity, not from effort</div>
            </div>
          </div>
        </div>

        <div className={styles.pullQuoteMystic}>
          <p>&quot;The mind is everything. What you think, you become.&quot;</p>
          <cite>— Attributed to the Buddha</cite>
        </div>
      </div>

      <div className={styles.sectionRule}>
        <hr />
      </div>

      {/* SECTION 3 — THE BRIDGE */}
      <div className={styles.section} id="bridge">
        <div className={styles.sectionEyebrow}>Where They Meet</div>
        <h2 className={styles.sectionTitle}>
          The mystics were right.<br />
          <em>Here&apos;s exactly why.</em>
        </h2>
        <p className={styles.prose}>
          The science page explains how the Reticular Activating System — the brain&apos;s filter — determines what you notice, pursue, and ultimately create in your life. But the spiritual traditions were describing this same mechanism thousands of years before anyone knew it had a name.
        </p>
        <p className={styles.prose}>
          When a Tibetan monk visualizes an enlightened state for hours each day, he is programming his RAS. When a yogi holds a Sankalpa in the theta state of Yoga Nidra, she is delivering programming directly to the subconscious at the moment it is most receptive. When an ancient prayer is repeated with full feeling — not rote recitation — it is doing exactly what modern affirmation science confirms works.
        </p>
        <p className={styles.prose}>
          The bridge between mysticism and neuroscience is not a compromise of either. It is a recognition that both traditions were pointing at the same truth from different directions.
        </p>

        <div className={styles.bridgeGrid}>
          <div className={`${styles.bridgeCard} ${styles.mysticSide}`}>
            <div className={styles.bridgeCardTag}>The Mystic Said</div>
            <div className={styles.bridgeCardTitle}>As within, so without.</div>
            <div className={styles.bridgeCardBody}>
              The inner state of the practitioner shapes the outer world. What you hold in consciousness with feeling and discipline becomes the reality you inhabit.
            </div>
          </div>
          <div className={`${styles.bridgeCard} ${styles.scienceSide}`}>
            <div className={styles.bridgeCardTag}>The Neuroscientist Says</div>
            <div className={styles.bridgeCardTitle}>The brain filters reality to match its dominant programming.</div>
            <div className={styles.bridgeCardBody}>
              The RAS surfaces what it has been trained to find. Change the programming and you change what you perceive, pursue, and ultimately create.
            </div>
          </div>
          <div className={`${styles.bridgeCard} ${styles.mysticSide}`}>
            <div className={styles.bridgeCardTag}>Neville Goddard Said</div>
            <div className={styles.bridgeCardTitle}>Assume the feeling of the wish fulfilled.</div>
            <div className={styles.bridgeCardBody}>
              Do not wish for the future. Inhabit it inwardly, completely, as if it is already so. The feeling is the prayer — not the words, not the wish, the feeling.
            </div>
          </div>
          <div className={`${styles.bridgeCard} ${styles.scienceSide}`}>
            <div className={styles.bridgeCardTag}>The Neuroscientist Says</div>
            <div className={styles.bridgeCardTitle}>Vivid imagination activates the same neural pathways as real experience.</div>
            <div className={styles.bridgeCardBody}>
              The brain cannot reliably distinguish between a deeply inhabited vision and an actual memory. What you rehearse internally becomes neural reality.
            </div>
          </div>
        </div>
      </div>

      <div className={styles.sectionRule}>
        <hr />
      </div>

      {/* SECTION 4 — FOUR PRINCIPLES */}
      <div className={styles.section}>
        <div className={`${styles.sectionEyebrow} ${styles.mystic}`}>Ancient Wisdom &middot; Modern Confirmation</div>
        <h2 className={styles.sectionTitle}>
          Four principles every tradition<br />
          discovered — <em className={styles.mystic}>and science confirmed.</em>
        </h2>
        <p className={styles.prose}>
          Across thousands of years of independent discovery, mystics from every culture arrived at the same core principles. Modern neuroscience has now given each of them a mechanism.
        </p>

        <div className={styles.principlesGrid}>
          <div className={styles.principleCard}>
            <div className={styles.principleTop}>
              <div className={styles.principleMysticTag}>The Law of Assumption</div>
              <div className={styles.principleTitle}>Inhabit the wish as already fulfilled</div>
            </div>
            <div className={styles.principleMysticBody}>
              Neville Goddard taught that if you assume the feeling of your wish fulfilled — completely, as if it is already done — the outer world must rearrange itself to reflect your inner state. This was not wishful thinking. It was a precise inner discipline. The Hindu Sankalpa teaches the same — state the intention as present reality, not future hope.
            </div>
            <div className={styles.principleBottom}>
              <div className={styles.principleScienceTag}>Neuroscience confirms</div>
              <div className={styles.principleScienceBody}>
                Neuroplasticity research shows that vividly imagined experiences activate the same neural pathways as real ones. The brain cannot fully distinguish a deeply inhabited vision from an actual memory. What you rehearse internally becomes neural reality.
              </div>
            </div>
          </div>
          <div className={styles.principleCard}>
            <div className={styles.principleTop}>
              <div className={styles.principleMysticTag}>The Power of the Spoken Word</div>
              <div className={styles.principleTitle}>Your voice is the instrument of creation</div>
            </div>
            <div className={styles.principleMysticBody}>
              From the Hebrew Dabar to Sanskrit Mantra to Tibetan chant to Indigenous sacred song — spoken words repeated with intention and feeling were understood across every culture to carry creative power. The voice was not merely communication. It was the channel through which inner reality becomes outer reality.
            </div>
            <div className={styles.principleBottom}>
              <div className={styles.principleScienceTag}>Neuroscience confirms</div>
              <div className={styles.principleScienceBody}>
                Self-affirmation research shows that hearing positive statements in your own voice activates the brain&apos;s self-relevance centers far more powerfully than reading the same words or hearing them in another voice. Your voice is the most trusted signal your nervous system receives.
              </div>
            </div>
          </div>
          <div className={styles.principleCard}>
            <div className={styles.principleTop}>
              <div className={styles.principleMysticTag}>The Hypnagogic Gateway</div>
              <div className={styles.principleTitle}>The threshold between waking and sleep is sacred ground</div>
            </div>
            <div className={styles.principleMysticBody}>
              Egyptian dream temples, shamanic practice, and Yoga Nidra all identified the threshold between waking and sleep as the most powerful time for inner work. The veil between conscious and subconscious is thinnest here. The mystics knew this from centuries of observation long before neuroscience had the tools to measure it.
            </div>
            <div className={styles.principleBottom}>
              <div className={styles.principleScienceTag}>Neuroscience confirms</div>
              <div className={styles.principleScienceBody}>
                Elevated theta wave activity in these states creates a measurable period of heightened neurological receptivity and openness to new belief formation. The mystics were describing a real neurological phenomenon. They simply lacked the vocabulary.
              </div>
            </div>
          </div>
          <div className={styles.principleCard}>
            <div className={styles.principleTop}>
              <div className={styles.principleMysticTag}>Repetition as Ritual</div>
              <div className={styles.principleTitle}>A vision held once is a wish. Returned to daily, it becomes belief.</div>
            </div>
            <div className={styles.principleMysticBody}>
              Every tradition uses repetition — rosary beads, mala beads, daily prayer, mantra, liturgy, the Zen practitioner&apos;s daily return to the cushion. The mystics understood that a vision returned to every day with full presence and feeling becomes a belief. And belief becomes lived reality.
            </div>
            <div className={styles.principleBottom}>
              <div className={styles.principleScienceTag}>Neuroscience confirms</div>
              <div className={styles.principleScienceBody}>
                Hebbian learning — neurons that fire together, wire together — is the neuroscientific basis for exactly this. Repeated, emotionally engaged rehearsal physically strengthens neural pathways, making the imagined future feel progressively more familiar and inevitable.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.sectionRule}>
        <hr />
      </div>

      {/* SECTION 5 — YOUR VOICE AS SACRED INSTRUMENT */}
      <div className={styles.section}>
        <div className={styles.voicePanel}>
          <div className={styles.voicePanelEyebrow}>The Most Powerful Channel</div>
          <h2 className={styles.voicePanelTitle}>
            Ancient traditions chose<br />
            <em>the voice for a reason.</em>
          </h2>
          <p className={styles.voicePanelBody}>
            In virtually every wisdom tradition, the spoken word — especially one&apos;s own spoken word — holds special significance. The voice was understood as the channel between the inner world and the outer, between intention and manifestation, between the self that is and the self that is becoming.
          </p>
          <div className={styles.voiceRow}>
            <div className={styles.voiceCard}>
              <div className={styles.vcName}>Tibetan Buddhism</div>
              <div className={styles.vcBody}>
                Monks chant their visions for hours each day. The spoken vibration is understood as both the intention and its vehicle — the calling and the called.
              </div>
            </div>
            <div className={styles.voiceCard}>
              <div className={styles.vcName}>Indigenous Traditions</div>
              <div className={styles.vcBody}>
                Prayers and visions are sung into existence. The voice is not reporting on reality — it is actively participating in its creation.
              </div>
            </div>
            <div className={styles.voiceCard}>
              <div className={styles.vcName}>Hebrew Tradition</div>
              <div className={styles.vcBody}>
                The world itself was spoken into being — Bereishit. Dabar means both &quot;word&quot; and &quot;thing.&quot; Speaking and being are not separate acts.
              </div>
            </div>
          </div>
        </div>
        <p className={styles.prose}>
          ManifestMyStory is built on this principle — and on the neuroscience that now explains why it works. When you hear your vision spoken in your own voice, your brain responds differently than it does to any other source. It recognizes that voice. It trusts that voice at a biological level. It integrates what that voice says in a way that no professionally narrated recording — however beautiful — ever could.
        </p>
        <p className={styles.prose}>
          Your story, narrated by you, heard by you, returned to every day by you — is the most personal, most powerful form of this ancient practice ever made available.
        </p>
      </div>

      <div className={styles.sectionRule}>
        <hr />
      </div>

      {/* SECTION 6 — THE FEELING IS THE PRAYER */}
      <div className={styles.section}>
        <div className={`${styles.sectionEyebrow} ${styles.mystic}`}>The Heart of Every Tradition</div>
        <h2 className={styles.sectionTitle}>
          It was never just<br />
          <em>about the words.</em>
        </h2>
        <p className={styles.prose}>
          Every serious mystical tradition makes the same distinction: there is a difference between reciting words and truly inhabiting a vision. The difference is <strong>feeling.</strong>
        </p>
        <p className={styles.prose}>
          Neville Goddard called it &quot;the feeling of the wish fulfilled.&quot; Gregg Braden calls it &quot;the language of the heart.&quot; The Yoga Nidra tradition calls it the Sankalpa felt in the body, not just stated by the mind. Indigenous wisdom traditions speak of true prayer as a state of already having received — gratitude for what has not yet arrived in physical form. The common thread is this: the emotional reality of your vision — the felt sense that it is already so — is what activates transformation.
        </p>
        <p className={styles.prose}>
          This is why your ManifestMyStory story is not a list of goals. It is a fully immersive, first-person narrative of a day already lived — written to engage your senses, your emotions, your identity. <strong>You are not reading about your future. You are inhabiting it. You are not wishing. You are remembering forward.</strong>
        </p>

        <div className={styles.pullQuoteMystic}>
          <p>
            &quot;The secret is to assume the feeling of the wish fulfilled. Not the wish as something to be fulfilled — but as something already so.&quot;
          </p>
          <cite>— Neville Goddard</cite>
        </div>
      </div>

      <div className={styles.sectionRule}>
        <hr />
      </div>

      {/* SECTION 7 — HOW IT WORKS */}
      <div className={styles.section}>
        <div className={`${styles.sectionEyebrow} ${styles.mystic}`}>The Practice</div>
        <h2 className={styles.sectionTitle}>
          Ancient intention.<br />
          Modern precision. <em className={styles.mystic}>Your voice.</em>
        </h2>
        <p className={styles.prose}>
          Every step of the ManifestMyStory method maps directly onto what the world&apos;s oldest inner practices discovered and taught — now delivered through the most precise technology ever built for this purpose.
        </p>

        <div className={styles.mysticSteps}>
          <div className={styles.mysticStep}>
            <div className={styles.mysticStepNum}>1</div>
            <div>
              <div className={styles.mysticStepTitle}>You describe your vision in specific, sensory detail</div>
              <div className={styles.mysticStepText}>
                Not a list of goals — a living picture of a day already lived. Where you are, who surrounds you, what you feel in your body, what your life looks, sounds, and smells like after your goals are fully real. The Tibetan masters knew this: specificity is not optional. It is the mechanism. Vagueness is where most practices fail.
              </div>
              <span className={styles.mysticStepTag}>
                Science: specificity builds precise neural targets — the RAS needs a clear signal to lock onto
              </span>
            </div>
          </div>
          <div className={styles.mysticStep}>
            <div className={styles.mysticStepNum}>2</div>
            <div>
              <div className={styles.mysticStepTitle}>Your story is written in the language of the already-done</div>
              <div className={styles.mysticStepText}>
                First person. Present tense. As if it is already real. This is exactly what every mystical tradition means by assuming the feeling of the wish fulfilled. The Sankalpa is always stated as present reality. The Zen practitioner inhabits the state of mastery — they do not aspire toward it. Your story is written this way for the same reason: the subconscious responds to present-tense reality, not future-tense hope.
              </div>
              <span className={styles.mysticStepTag}>
                Science: present-tense first-person language activates distinct neural patterns from aspiration language
              </span>
            </div>
          </div>
          <div className={styles.mysticStep}>
            <div className={styles.mysticStepNum}>3</div>
            <div>
              <div className={styles.mysticStepTitle}>You hear it in your own voice</div>
              <div className={styles.mysticStepText}>
                Your voice is the most trusted signal your nervous system receives. Every wisdom tradition understood this. Tibetan monks chant their visions. Indigenous peoples sing their prayers into existence. The Hebrew Dabar — the word that is also the thing. You are not listening to a stranger narrate your future. You are listening to yourself speak your reality into being.
              </div>
              <span className={styles.mysticStepTag}>
                Science: own-voice narration uniquely activates self-concept and autobiographical memory regions
              </span>
            </div>
          </div>
          <div className={styles.mysticStep}>
            <div className={styles.mysticStepNum}>4</div>
            <div>
              <div className={styles.mysticStepTitle}>You listen at the two most sacred thresholds of your day</div>
              <div className={styles.mysticStepText}>
                Just before sleep. Just after waking. The Egyptian dream temples were built for exactly this — the threshold state. Yoga Nidra is practiced precisely here. Shamanic traditions have always worked in this liminal space. These are not arbitrary times. They are the moments when the veil between conscious and subconscious is thinnest, and inner planting goes deepest.
              </div>
              <span className={styles.mysticStepTag}>
                Science: theta state — measurably elevated neurological receptivity at the hypnagogic threshold
              </span>
            </div>
          </div>
          <div className={styles.mysticStep}>
            <div className={styles.mysticStepNum}>5</div>
            <div>
              <div className={styles.mysticStepTitle}>Repetition becomes reality</div>
              <div className={styles.mysticStepText}>
                One listening is a prayer. Thirty days of listening is a rewiring. The Zen master bows ten thousand times. The monk chants ten thousand hours. The mala is turned one hundred and eight times, every day, for years. Every tradition knew that a vision returned to every day with full presence and feeling becomes a belief. And belief becomes lived reality. The practice works through repetition — not through force.
              </div>
              <span className={styles.mysticStepTag}>
                Science: Hebbian learning — repeated neural firing builds permanent structural pathways
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.sectionRule}>
        <hr />
      </div>

      {/* SECTION 8 — WHO IT'S FOR */}
      <div className={styles.section} id="for-you">
        <div className={`${styles.sectionEyebrow} ${styles.mystic}`}>You May Already Know This</div>
        <h2 className={styles.sectionTitle}>
          If something in you<br />
          already believes — <em className={styles.mystic}>this is your tool.</em>
        </h2>
        <p className={styles.prose}>
          You don&apos;t have to choose between science and spirituality here. ManifestMyStory was designed to hold both. Wherever you are coming from, there is a place for you in this practice.
        </p>

        <div className={styles.forGrid}>
          <div className={styles.forItem}>
            <div className={styles.forDot}></div>
            <div className={styles.forText}>
              <strong>If you have studied the Law of Attraction</strong>This is its most neurologically precise application. The missing piece was never the belief — it was the delivery mechanism. Your own voice, your own story, your own proof moments, heard twice daily in the theta state.
            </div>
          </div>
          <div className={styles.forItem}>
            <div className={styles.forDot}></div>
            <div className={styles.forText}>
              <strong>If you have read Neville Goddard</strong>You already understand the feeling of the wish fulfilled. ManifestMyStory gives you the vehicle — a fully personalized, AI-generated story narrated in your own cloned voice, calibrated to your exact goals and proof actions. This is the technology his teachings were waiting for.
            </div>
          </div>
          <div className={styles.forItem}>
            <div className={styles.forDot}></div>
            <div className={styles.forText}>
              <strong>If you practice Yoga Nidra or meditation</strong>You already know the power of the theta threshold. ManifestMyStory is designed for exactly that state — a personalized Sankalpa, spoken in your own voice, delivered at the precise neurological window you already understand and trust.
            </div>
          </div>
          <div className={styles.forItem}>
            <div className={styles.forDot}></div>
            <div className={styles.forText}>
              <strong>If you have practiced affirmations and found them hollow</strong>This is why — you were saying words, but not inhabiting a living, sensory reality spoken back to you in your own voice. That is the difference between an affirmation and a story. One is a statement. The other is an experience.
            </div>
          </div>
          <div className={styles.forItem}>
            <div className={styles.forDot}></div>
            <div className={styles.forText}>
              <strong>If you are a meditator, a seeker, a practitioner</strong>Someone who has always sensed there is more to consciousness than conventional science has fully explained — this will feel immediately right. It combines the precision of modern AI, the proven principles of NLP and neuroplasticity, and the timeless wisdom of inner work into something you can carry in your pocket and return to every day.
            </div>
          </div>
          <div className={styles.forItem}>
            <div className={styles.forDot}></div>
            <div className={styles.forText}>
              <strong>If you are simply ready for your life to change</strong>You don&apos;t need a spiritual framework or a particular belief system. The practice works because of how the brain is built — not because of what you believe about it. All you need to do is listen.
            </div>
          </div>
        </div>

        <div className={styles.pullQuote}>
          <p>&quot;What you seek is seeking you.&quot;</p>
          <cite>— Rumi, 13th century Sufi poet</cite>
        </div>
      </div>

      <div className={styles.sectionRule}>
        <hr />
      </div>

      {/* BRIDGE TO SCIENCE */}
      <div className={styles.section}>
        <div className={styles.scienceBridge}>
          <div className={styles.sbEyebrow}>The Other Side of the Story</div>
          <h2 className={styles.sbTitle}>
            Want the neuroscience<br />
            <em>behind everything on this page?</em>
          </h2>
          <p className={styles.sbBody}>
            The science page explains in precise detail how the RAS, theta brain waves, neuroplasticity, NLP language patterns, and the voice effect work together to make this practice measurably effective. Every claim on this page has a mechanism. The science page shows you exactly what it is.
          </p>
          <Link href="/science" className={styles.sbCta}>
            Read the science &rarr;
          </Link>
        </div>
      </div>

      {/* FINAL CTA */}
      <div className={styles.finalCta}>
        <div className={styles.finalCtaEyebrow}>The mystics spent lifetimes cultivating this</div>
        <h2 className={styles.finalCtaTitle}>
          Your future is already<br />
          <em>speaking. We help you listen.</em>
        </h2>
        <p className={styles.finalCtaSub}>
          This practice is thousands of years old. The technology to do it at this level of personalization — in your own voice, built around your specific life and goals — is brand new. You are standing at a remarkable intersection of ancient wisdom and modern possibility. The only thing left to do is begin.
        </p>
        <Link href="/user/goal-intake-ai" className={styles.finalCtaBtn}>
          Create My Story — It&apos;s Free
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="15" height="15" style={{ marginLeft: '10px' }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Link>
      </div>

      <footer className={styles.footer}>
        <p>
          &copy; 2026 ManifestMyStory &middot; <a href="#">Privacy</a> &middot; <a href="#">Terms</a> &middot; <Link href="/">Home</Link> &middot; <Link href="/science">The Science</Link>
        </p>
      </footer>
    </div>
  );
}