'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/head';
import NextLink from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from '../styles/Pricing.module.css';
import {
    CheckIcon,
    XIcon,
} from '../components/icons/PricingIcons';

const ChevronDown = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}><polyline points="6 9 12 15 18 9" /></svg>
);

import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const PricingPage: React.FC = () => {
    const router = useRouter();
    const { data: session, update } = useSession();
    const searchParams = useSearchParams();
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const [toast, setToast] = useState({ message: '', visible: false });

    const showToast = (message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast({ message: '', visible: false }), 4500);
    };

    useEffect(() => {
        if (searchParams.get('success')) {
            showToast('✓ Payment successful! Your plan will update in a few moments.');
            setTimeout(() => update(), 2000);
            router.replace('/pricing');
        }
        if (searchParams.get('canceled')) {
            showToast('Payment canceled. No changes were made.');
            router.replace('/pricing');
        }
    }, [searchParams, update, router]);

    const handlePlanSelect = async (planId: string) => {
        if (planId === 'free') {
            router.push('/user/goal-intake-ai');
            return;
        }

        if (!session) {
            router.push('/auth/signin?callbackUrl=/pricing');
            return;
        }

        try {
            setLoadingPlan(planId);
            const response = await fetch('/api/user/subscription/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId,
                    billingCycle: planId === 'activator' ? 'oneTime' : (billingCycle === 'yearly' ? 'yearly' : 'monthly'),
                    autoRenew: true, // Default to true for subscriptions
                }),
            });

            if (!response.ok) throw new Error('Failed to create checkout session');

            const { url } = await response.json();
            window.location.href = url;
        } catch (error) {
            console.error('Checkout error:', error);
            showToast('Error initiating checkout. Please try again.');
        } finally {
            setLoadingPlan(null);
        }
    };

    const isBetaUser = (session?.user as any)?.isBetaUser && !(session?.user as any)?.stripeSubscriptionId;
    const currentPlanId = (session?.user as any)?.plan || 'free';

    const plans = [
        {
            id: 'free',
            name: 'Explorer',
            price: '$0',
            priceSub: 'forever',
            buttonText: currentPlanId === 'free' ? 'Your Current Plan' : 'Select Explorer',
            isCurrent: currentPlanId === 'free',
            features: [
                { text: 'Unlimited story creation', included: true },
                { text: 'Save up to 3 stories', included: true },
                { text: 'Free 2-min voice sample', included: true },
                { text: 'Full audio generation', included: false }
            ]
        },
        {
            id: 'activator',
            name: 'Activator',
            priceOriginal: '$19.99',
            price: '$9.99',
            priceSub: 'one time',
            badge: 'Launch offer',
            buttonText: currentPlanId === 'activator' ? 'Your Current Plan' : 'Get Activator',
            isCurrent: currentPlanId === 'activator',
            features: [
                { text: 'Everything in Explorer', included: true },
                { text: 'Full audio up to 10 min', included: true },
                { text: 'MP3 download — forever', included: true },
                { text: 'Affirmations & induction', included: false }
            ]
        },
        {
            id: 'manifester',
            name: 'Manifester',
            priceOriginal: billingCycle === 'yearly' ? '$39.99/mo' : '',
            price: billingCycle === 'monthly' ? '$19.99' : '$15.99',
            priceSub: '/month',
            badge: currentPlanId === 'manifester' ? 'Current Plan' : 'Most popular',
            isHighlighted: true,
            buttonText: currentPlanId === 'manifester' ? 'Your Current Plan' : 'Start Manifesting',
            isCurrent: currentPlanId === 'manifester',
            features: [
                { text: 'Everything in Activator', included: true },
                { text: '5 audio stories/month', included: true },
                { text: 'AI affirmations in voice', included: true },
                { text: 'Guided NLP induction', included: true }
            ]
        },
        {
            id: 'amplifier',
            name: isBetaUser ? 'Beta' : 'Amplifier',
            priceOriginal: isBetaUser ? '' : (billingCycle === 'yearly' ? '$79.99/mo' : ''),
            price: isBetaUser ? 'Free' : (billingCycle === 'monthly' ? '$39.99' : '$31.99'),
            priceSub: isBetaUser ? 'trial' : '/month',
            badge: currentPlanId === 'amplifier' ? 'Current Plan' : (isBetaUser ? 'Beta Access' : 'Most powerful'),
            isCurrent: currentPlanId === 'amplifier',
            buttonText: currentPlanId === 'amplifier' ? 'Your Current Plan' : (isBetaUser ? 'Start Trial' : 'Start Amplifying'),
            features: [
                { text: 'Everything in Manifester', included: true },
                { text: '10 hrs audio/month', included: true },
                { text: 'Binaural beats (theta)', included: true },
                { text: 'Studio-grade quality', included: true }
            ]
        }
    ];

    return (
        <div className={styles.container}>
            <Header />
            <Sidebar />

            <main className={styles.page}>
                <div className={styles.pageHeader}>
                    <div className={styles.pageEyebrow}>Simple, transparent pricing</div>
                    <h1 className={styles.pageTitle}>The practice that changes<br /><em>everything.</em></h1>
                    <p className={styles.pageSub}>Start free. Upgrade when you're ready to hear your future in your own voice. Story creation is always free — on every plan, forever.</p>
                </div>

                <div className={styles.launchBanner}>
                    <span className={styles.launchIcon}>✦</span>
                    <div className={styles.launchText}><strong>Launch offer — 50% off all paid plans</strong> for the first 10,000 stories generated. Unlimited story creation is always free on every plan.</div>
                </div>

                <div className={styles.toggleWrapper}>
                    <span className={`${styles.toggleLabel} ${billingCycle === 'monthly' ? styles.active : ''}`}>Monthly</span>
                    <label className={styles.switch}>
                        <input
                            type="checkbox"
                            checked={billingCycle === 'yearly'}
                            onChange={() => setBillingCycle(c => c === 'monthly' ? 'yearly' : 'monthly')}
                        />
                        <span className={styles.slider}></span>
                    </label>
                    <span className={`${styles.toggleLabel} ${billingCycle === 'yearly' ? styles.active : ''}`}>Annual billing <span className={styles.saveBadge}>Save 20%</span></span>
                </div>

                <div className={styles.plansGrid}>
                    {plans.map((p) => (
                        <div key={p.id} className={`${styles.planCard} ${p.isHighlighted ? styles.highlight : ''}`}>
                            {p.badge && <div className={styles.planPip}>{p.badge}</div>}
                            <div className={styles.planName}>{p.name}</div>
                            <div className={styles.planPrice}>
                                {p.priceOriginal && <span className={styles.priceOriginal}>{p.priceOriginal}</span>}
                                <span className={styles.planPriceVal}>{p.price}</span>
                                <span className={styles.planPriceSub}>{p.priceSub}</span>
                            </div>
                            <div className={styles.planDivider} />
                            <div className={styles.planFeats}>
                                {p.features.map((f, i) => (
                                    <div key={i} className={`${styles.feat} ${!f.included ? styles.dim : ''}`}>
                                        {f.included ? <CheckIcon /> : <XIcon />}
                                        <span>{f.text}</span>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => handlePlanSelect(p.id)}
                                className={`${styles.planBtn} ${(p as any).isCurrent ? styles.btnCurrent : (p.isHighlighted ? styles.btnPower : '')}`}
                                disabled={loadingPlan === p.id || (p as any).isCurrent}
                            >
                                {loadingPlan === p.id ? 'Connecting...' : p.buttonText}
                            </button>
                        </div>
                    ))}
                </div>

                <div className={styles.guarantee}>
                    <div className={styles.guaranteeIcon}>🛡️</div>
                    <div className={styles.guaranteeContent}>
                        <h4>Our satisfaction guarantee</h4>
                        <p>Not happy with how your audio sounds? We'll regenerate it for free. If you're still not satisfied before downloading, we'll refund you in full. Once downloaded, the purchase is final — so stream it first and make sure you love it.</p>
                    </div>
                </div>

                <div className={styles.faqSection}>
                    <h2 className={styles.faqTitle}>Common questions</h2>
                    <FaqItem q="What does 'unlimited story creation' mean?">
                        You can go through the goal discovery, generate your story, and refine it as many times as you like — completely free. You only pay to generate the full audio.
                    </FaqItem>
                    <FaqItem q="How do affirmation bookends work?">
                        We generate personalized affirmations from your goals. You choose 3–5 to play before and after your story, all in your cloned voice.
                    </FaqItem>
                    <FaqItem q="Can I cancel anytime?">
                        Yes — one click from your account settings. You keep access until the end of your billing period.
                    </FaqItem>
                </div>
            </main>

            <div className={`${styles.toast} ${toast.visible ? styles.show : ''}`}>
                {toast.message}
            </div>
        </div>
    );
};

const FaqItem: React.FC<{ q: string, children: React.ReactNode }> = ({ q, children }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className={styles.faqItem}>
            <button className={styles.faqQ} onClick={() => setOpen(!open)}>
                {q}
                <div style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.3s' }}><ChevronDown /></div>
            </button>
            <div className={`${styles.faqA} ${open ? styles.show : ''}`}>{children}</div>
        </div>
    );
}

export default PricingPage;
