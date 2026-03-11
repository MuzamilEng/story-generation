'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from '../styles/Pricing.module.css';
import { useSession } from 'next-auth/react';
import {
    CheckIcon,
    XIcon,
    StarIcon,
    MicIcon,
    PlayIcon,
    InfoIcon,
    BoltIcon,
    ArrowIcon,
    ChevronIcon
} from '../components/icons/PricingIcons';
import { BillingPeriod, Plan, FeatureComparison, FAQ } from '../types/pricing';

// Step Item Component
interface StepItemProps {
    number: number;
    label: string;
    status: 'done' | 'active' | 'pending';
}

const StepItem: React.FC<StepItemProps> = ({ number, label, status }) => (
    <div className={`${styles.stepItem} ${styles[status]}`}>
        <div className={styles.stepNum}>
            {status === 'done' ? <CheckIcon /> : number}
        </div>
        {label}
    </div>
);

// Plan Card Component
interface PlanCardProps {
    plan: Plan;
    billing: BillingPeriod;
    onSelect: (planId: string) => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, billing, onSelect }) => {
    const price = billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
    const displayPrice = billing === 'monthly'
        ? `$${plan.monthlyPrice}`
        : `$${plan.annualPrice}`;

    const originalPrice = billing === 'annual' && plan.monthlyPrice
        ? `$${plan.monthlyPrice}`
        : null;

    const getCtaClass = () => {
        switch (plan.ctaStyle) {
            case 'outline': return styles.outline;
            case 'gold': return styles.gold;
            case 'primary': return styles.primary;
            case 'purple': return styles.purple;
            default: return styles.outline;
        }
    };

    const getIconClass = () => {
        switch (plan.iconBg) {
            case 'free': return styles.free;
            case 'single': return styles.single;
            case 'standard': return styles.standard;
            case 'power': return styles.power;
            default: return styles.free;
        }
    };

    return (
        <div className={`${styles.planCard} ${plan.popular ? styles.featured : ''} ${plan.id === 'power' ? styles.power : ''}`}>
            {plan.popular && (
                <div className={`${styles.popularBadge} ${styles[plan.popularColor || 'green']}`}>
                    {plan.badge || 'Most popular'}
                </div>
            )}

            <div className={`${styles.planIcon} ${getIconClass()}`}>
                {plan.icon}
            </div>

            <div>
                <div className={styles.planName}>{plan.name}</div>
                <div className={styles.planDesc}>{plan.description}</div>
            </div>

            <div>
                <div className={styles.planPrice}>
                    <span className={styles.priceAmount}>{displayPrice}</span>
                    {billing === 'monthly' && plan.monthlyPrice > 0 && (
                        <span className={styles.pricePeriod}>/mo</span>
                    )}
                    {originalPrice && (
                        <span className={styles.priceOrig}>{originalPrice}</span>
                    )}
                </div>
                <div className={styles.priceNote}>{plan.priceNote}</div>
            </div>

            <div className={styles.planDivider} />

            {plan.credits && (
                <div className={`${styles.creditsBadge} ${plan.creditsColor === 'power' ? styles.powerCredits : ''}`}>
                    <InfoIcon />
                    <span dangerouslySetInnerHTML={{ __html: plan.credits }} />
                </div>
            )}

            <div className={styles.featuresList}>
                {plan.features.map((feature, idx) => (
                    <div key={idx} className={`${styles.featRow} ${!feature.included ? styles.dim : ''}`}>
                        <div className={`${styles.featCheck} 
              ${feature.included ? styles.yes : styles.no} 
              ${feature.powerColor ? styles.yesPower : ''}`}
                        >
                            {feature.included ? <CheckIcon /> : <XIcon />}
                        </div>
                        <span dangerouslySetInnerHTML={{ __html: feature.text }} />
                    </div>
                ))}
            </div>

            <button
                className={`${styles.planCta} ${getCtaClass()}`}
                onClick={() => onSelect(plan.id)}
            >
                {plan.ctaText}
                {plan.ctaStyle !== 'outline' && <ArrowIcon />}
            </button>
        </div>
    );
};

// FAQ Item Component
interface FAQItemProps {
    faq: FAQ;
    isOpen: boolean;
    onToggle: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ faq, isOpen, onToggle }) => (
    <div className={styles.faqItem}>
        <button
            className={`${styles.faqQ} ${isOpen ? styles.open : ''}`}
            onClick={onToggle}
        >
            {faq.question}
            <ChevronIcon direction={isOpen ? 'up' : 'down'} />
        </button>
        <div className={`${styles.faqA} ${isOpen ? styles.show : ''}`}>
            {faq.answer}
        </div>
    </div>
);

// Comparison Table Component
interface ComparisonTableProps {
    isOpen: boolean;
    onToggle: () => void;
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({ isOpen, onToggle }) => {
    const comparisons: FeatureComparison[] = [
        { feature: 'Story creation & refinement', free: true, single: true, standard: true, power: true },
        { feature: 'Free 2-min voice sample', free: true, single: true, standard: true, power: true },
        { feature: 'Full audio in your voice', free: false, single: true, standard: true, power: true },
        { feature: 'MP3 download', free: false, single: true, standard: true, power: true },
        { feature: 'Story length', free: '800 words (~7 min)', single: '800 words (~7 min)', standard: 'Up to ~20 min', power: 'Up to ~20 min' },
        { feature: 'Stories in library', free: '1', single: '1', standard: 'Grows — up to 60 after 1 yr', power: 'Grows — up to 240 after 1 yr' },
        { feature: 'Monthly audio allowance', free: '—', single: '1 audio (one-time)', standard: '60 min / mo', power: '300 min / mo' },
        { feature: 'Monthly story credits', free: '—', single: '—', standard: '5 / mo', power: '20 / mo' },
        { feature: 'Stories carry over month-to-month', free: false, single: false, standard: true, power: true },
        { feature: 'Unused audio credits roll over', free: false, single: false, standard: 'No', power: 'No' },
        { feature: 'Stream anytime', free: false, single: true, standard: true, power: true },
        { feature: 'Upgrade credit ($4.99)', free: false, single: true, standard: false, power: false },
    ];

    const renderCell = (value: string | boolean) => {
        if (typeof value === 'boolean') {
            return value ? (
                <span className={styles.checkYes}>✓</span>
            ) : (
                <span className={styles.checkNo}>—</span>
            );
        }
        return value;
    };

    return (
        <div className={styles.compareSection}>
            <button
                className={`${styles.compareToggle} ${isOpen ? styles.open : ''}`}
                onClick={onToggle}
            >
                <ChevronIcon direction={isOpen ? 'up' : 'down'} />
                {isOpen ? ' Hide comparison' : ' See full plan comparison'}
            </button>

            <table className={`${styles.compareTable} ${isOpen ? styles.show : ''}`}>
                <thead>
                    <tr>
                        <th style={{ width: '36%' }}>Feature</th>
                        <th>Free</th>
                        <th>Single</th>
                        <th className={styles.accent}>Standard</th>
                        <th className={styles.purple}>Power</th>
                    </tr>
                </thead>
                <tbody>
                    {comparisons.map((row, idx) => (
                        <tr key={idx}>
                            <td>{row.feature}</td>
                            <td>{renderCell(row.free)}</td>
                            <td>{renderCell(row.single)}</td>
                            <td>{renderCell(row.standard)}</td>
                            <td>{renderCell(row.power)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const PricingPage: React.FC = () => {
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();

    useEffect(() => {
        document.title = "ManifestMyStory — Choose Your Plan";
        const link = document.createElement('link');
        link.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap";
        link.rel = "stylesheet";
        document.head.appendChild(link);

        return () => {
            if (document.head.contains(link)) {
                document.head.removeChild(link);
            }
        };
    }, []);

    const [billing, setBilling] = useState<BillingPeriod>('monthly');
    const [compareOpen, setCompareOpen] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

    const plans: Plan[] = [
        {
            id: 'free',
            name: 'Free',
            description: 'Create and refine your story. Hear a 2-minute sample in your voice.',
            icon: <StarIcon />,
            iconBg: 'free',
            monthlyPrice: 0,
            annualPrice: 0,
            priceNote: 'Forever free · No credit card needed',
            ctaText: 'Continue with Free',
            ctaStyle: 'outline',
            features: [
                { text: 'Unlimited story creation & refinement', included: true },
                { text: 'AI goal discovery chat', included: true },
                { text: '800-word story (~7 min)', included: true },
                { text: 'Free 2-min voice-cloned sample', included: true },
                { text: 'Full audio download', included: false },
                { text: 'Multiple stories', included: false },
            ]
        },
        {
            id: 'single',
            name: 'Single Story',
            description: 'Your full story, once. Yours to keep and listen to forever.',
            icon: <MicIcon />,
            iconBg: 'single',
            monthlyPrice: 4.99,
            annualPrice: 4.99,
            priceNote: 'One-time · No subscription · Keep forever',
            ctaText: 'Get Full Audio — $4.99',
            ctaStyle: 'gold',
            features: [
                { text: 'Everything in Free', included: true },
                { text: 'Full-length audio in your voice', included: true },
                { text: 'MP3 download — keep forever', included: true },
                { text: '800-word story (~7 min audio)', included: true },
                { text: 'Stream anytime from your account', included: true },
                { text: 'Choose story length', included: false },
            ]
        },
        {
            id: 'standard',
            name: 'Standard',
            description: 'The full practice. Multiple stories, longer audio, monthly credits.',
            icon: <StarIcon />,
            iconBg: 'standard',
            monthlyPrice: 9.99,
            annualPrice: 7.49,
            priceNote: 'Billed monthly · Cancel anytime',
            ctaText: 'Start Standard — $9.99/mo',
            ctaStyle: 'primary',
            popular: true,
            popularColor: 'green',
            credits: '<strong>5 stories + 60 min audio</strong> per month · New stories added to your library each month · Credits don\'t roll over',
            creditsColor: 'standard',
            features: [
                { text: 'Everything in Single Story', included: true },
                { text: '<strong>Library grows</strong> — 5 stories/mo, up to 60 after 1 year', included: true, highlight: true },
                { text: '<strong>60 min</strong> audio generation per month', included: true, highlight: true },
                { text: 'Choose story length (up to ~20 min)', included: true },
                { text: 'Stream & download all your stories', included: true },
                { text: 'Re-generate as your goals evolve', included: true },
            ]
        },
        {
            id: 'power',
            name: 'Power',
            description: 'For the committed practitioner. More stories, more audio, more depth.',
            icon: <BoltIcon />,
            iconBg: 'power',
            monthlyPrice: 19.99,
            annualPrice: 14.99,
            priceNote: 'Billed monthly · Cancel anytime',
            ctaText: 'Start Power — $19.99/mo',
            ctaStyle: 'purple',
            badge: 'Power user',
            credits: '<strong>20 stories + 300 min audio</strong> per month · Library accumulates with every month · Credits don\'t roll over',
            creditsColor: 'power',
            features: [
                { text: 'Everything in Standard', included: true, powerColor: true },
                { text: '<strong>Library grows</strong> — 20 stories/mo, up to 240 after 1 year', included: true, highlight: true, powerColor: true },
                { text: '<strong>300 min (5 hrs)</strong> audio generation per month', included: true, highlight: true, powerColor: true },
                { text: 'Choose story length (up to ~20 min)', included: true, powerColor: true },
                { text: 'Priority audio generation', included: true, powerColor: true },
                { text: 'Stories for every life area', included: true, powerColor: true },
            ]
        }
    ];

    const faqs: FAQ[] = [
        {
            question: 'How does the free 2-minute sample work?',
            answer: 'After you approve your story, we generate the first 2 minutes of your audio — in your own cloned voice — completely free. This gives you a real taste of the full experience before you pay anything. If you love it (most people do), you can unlock the full recording with any paid plan.'
        },
        {
            question: 'What does "story creation is always free" mean?',
            answer: 'You can go through the entire goal discovery chat, generate your story, and refine it as many times as you like — all for free, on every plan. You only pay when you want to generate the full audio file. This means you can take your time getting your story exactly right before spending anything.'
        },
        {
            question: 'How does the voice cloning work?',
            answer: 'You record a short voice sample (around 60 seconds). Our system uses ElevenLabs voice cloning technology to create a voice model that sounds like you, then narrates your full story in that voice. The result sounds like you naturally reading your own story to yourself — which is what makes it so powerful to listen to daily.'
        },
        {
            question: 'What are monthly credits and do they roll over?',
            answer: 'There are two things to understand: <strong>stories</strong> and <strong>audio minutes</strong>. Stories you create are yours permanently — they accumulate in your library month after month as long as you\'re subscribed (up to 60 for Standard, up to 240 for Power after one year). Audio generation minutes, however, reset each billing cycle and do not roll over — unused minutes expire at the end of each month. In practice, most members create 1–3 stories and spend the majority of their time listening rather than generating new ones.'
        },
        {
            question: 'Can I upgrade from Single Story to a subscription?',
            answer: 'Yes — and we\'ll credit your $4.99 toward your first month. If you upgrade within 30 days of your Single Story purchase, you\'ll only be charged the difference ($5.00 for Standard, $15.00 for Power). Just use the same account when upgrading.'
        },
        {
            question: 'What story lengths are available on paid plans?',
            answer: 'Free and Single Story plans produce an 800-word story (~7 minutes of audio). Standard and Power subscribers can choose their story length — from a short focused 5-minute story up to a deeply immersive ~20-minute experience. Longer stories use more of your monthly audio minutes.'
        },
        {
            question: 'Is my voice sample private?',
            answer: 'Your voice sample is used solely to generate your personal audio. It is never shared, sold, or used to train AI models. You can delete it from your account settings at any time, which also permanently deletes your voice model.'
        },
        {
            question: 'Can I cancel my subscription anytime?',
            answer: 'Yes — cancel anytime from your account settings with one click. You\'ll keep access to all your stories and any audio you\'ve already downloaded until the end of your billing period. You won\'t be charged again after cancellation.'
        }
    ];

    const isLoggedIn = authStatus === 'authenticated';
    const isPaid = session?.user?.plan && session.user.plan !== 'free';

    const getSteps = () => {
        if (!isLoggedIn) {
            return [
                { label: 'Goals', status: 'done' as const },
                { label: 'Your Story', status: 'done' as const },
                { label: 'Account', status: 'done' as const },
                { label: 'Plan', status: 'active' as const },
                { label: 'Voice Recording', status: 'pending' as const },
                { label: 'Your Audio', status: 'pending' as const },
            ];
        }
        if (!isPaid) {
            return [
                { label: 'Goals', status: 'done' as const },
                { label: 'Your Story', status: 'done' as const },
                { label: 'Plan', status: 'active' as const },
                { label: 'Voice Recording', status: 'pending' as const },
                { label: 'Your Audio', status: 'pending' as const },
            ];
        }
        return [
            { label: 'Goals', status: 'done' as const },
            { label: 'Your Story', status: 'done' as const },
            { label: 'Voice Recording', status: 'pending' as const },
            { label: 'Your Audio', status: 'pending' as const },
        ];
    };

    const steps = getSteps();

    const handleBillingToggle = (type: BillingPeriod) => {
        setBilling(type);
    };

    const handlePlanSelect = (planId: string) => {
        if (planId === 'free') {
            router.push('/user/dashboard');
        } else {
            router.push('/user/voice-recording');
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.topbar}>
                <Link href="/" className={styles.logo}>
                    Manifest<span>MyStory</span>
                </Link>

                <div className={styles.stepsRow}>
                    {steps.map((step, idx) => (
                        <StepItem key={idx} number={idx + 1} label={step.label} status={step.status} />
                    ))}
                </div>

                <nav style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <Link href="/#how" style={{ fontSize: '14px', textDecoration: 'none', opacity: 0.7 }}>How it works</Link>
                    <Link href="/pricing" style={{ fontSize: '14px', textDecoration: 'none', fontWeight: 500 }}>Pricing</Link>
                    <Link href="/user/goal-intake-ai" style={{ fontSize: '14px', textDecoration: 'none', background: 'var(--accent)', color: '#fff', padding: '8px 16px', borderRadius: '8px' }}>Get Started</Link>
                </nav>
            </header>

            <main className={styles.page}>
                <div className={styles.pageHeader}>
                    <div className={styles.pageEyebrow}>You've heard what's possible</div>
                    <h1 className={styles.pageTitle}>
                        Ready to hear your<br />
                        <em>full story?</em>
                    </h1>
                    <p className={styles.pageSub}>
                        You just listened to your free 2-minute sample — in your own voice. Choose a plan to unlock the full recording and start your daily practice.
                    </p>
                </div>

                <div className={styles.previewBanner}>
                    <div className={styles.previewBannerIcon}>
                        <PlayIcon />
                    </div>
                    <div className={styles.previewBannerText}>
                        <strong>Your free 2-minute sample is saved to your account.</strong> Upgrading unlocks your full story audio — the complete experience, every word, in your voice. Story creation and refinement always remain free, no matter which plan you choose.
                    </div>
                </div>

                <div className={styles.billingToggle}>
                    <button
                        className={`${styles.toggleOpt} ${billing === 'monthly' ? styles.active : ''}`}
                        onClick={() => handleBillingToggle('monthly')}
                    >
                        Monthly
                    </button>
                    <button
                        className={`${styles.toggleOpt} ${billing === 'annual' ? styles.active : ''}`}
                        onClick={() => handleBillingToggle('annual')}
                    >
                        Annual <span className={styles.saveBadge}>Save 25%</span>
                    </button>
                </div>

                <div className={styles.plansGrid}>
                    {plans.map(plan => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            billing={billing}
                            onSelect={handlePlanSelect}
                        />
                    ))}
                </div>

                <div className={styles.upgradeNote}>
                    <div className={styles.upgradeNoteInner}>
                        <InfoIcon />
                        <p>
                            <strong>Already purchased a Single Story?</strong> If you upgrade to Standard or Power within 30 days, your $4.99 is credited toward your first month — you'll only be charged the difference. Just use the same account email.
                        </p>
                    </div>
                </div>

                <ComparisonTable
                    isOpen={compareOpen}
                    onToggle={() => setCompareOpen(!compareOpen)}
                />

                <div className={styles.guarantee}>
                    <div className={styles.guaranteeIcon}>🛡️</div>
                    <div className={styles.guaranteeText}>
                        <h4>Our satisfaction guarantee</h4>
                        <p>
                            Not happy with how your audio sounds? We'll regenerate it for free. If you're still not satisfied <strong>before downloading</strong>, we'll refund you in full. Once downloaded, the purchase is final — so stream it first and make sure you love it.
                        </p>
                    </div>
                </div>

                <div className={styles.faqSection}>
                    <div className={styles.faqTitle}>Common questions</div>

                    {faqs.map((faq, index) => (
                        <FAQItem
                            key={index}
                            faq={faq}
                            isOpen={openFaqIndex === index}
                            onToggle={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                        />
                    ))}
                </div>
            </main>
        </div>
    );
};

export default PricingPage;
