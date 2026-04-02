'use client'
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import styles from '../styles/Pricing.module.css';

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
            router.push(`/auth/signin?callbackUrl=/pricing`);
            return;
        }

        try {
            setLoadingPlan(planId);
            const response = await fetch('/api/user/subscription/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId,
                    billingCycle: billingCycle === 'yearly' ? 'yearly' : 'monthly',
                    autoRenew: true,
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

    const prices = {
        monthly: { act: [10, 19], man: [20, 39], amp: [35, 69] },
        yearly: { act: [7, 13], man: [14, 27], amp: [25, 48] }
    };

    const isAnnual = billingCycle === 'yearly';
    const p = isAnnual ? prices.yearly : prices.monthly;

    return (
        <div className={styles.container}>
            <Header />
            <Sidebar />

            <main className={styles.page}>
                <section className={styles.pricingHero}>
                    <div className={styles.heroInner}>
                        <div className={styles.eyebrowTag}>Choose your path</div>
                        <h1 className={styles.heroTitle}>
                            <span className={styles.plain}>How deeply do you</span>
                            <span className={styles.italic}>want to go?</span>
                        </h1>
                        <p className={styles.heroSub}>Every tier delivers a personalized night story in your own voice. Higher tiers unlock the neurological depth that creates real, lasting change.</p>
                    </div>

                    <div className={styles.foundingWrap}>
                        <div className={styles.foundingInner}>
                            <div className={styles.fLeft}>
                                <div className={styles.fTitle}>Founding member pricing — 50% off</div>
                                <div className={styles.fSub}>We're offering this rate to our first members only. Once we reach capacity, this pricing closes permanently.</div>
                            </div>
                            <div className={styles.fBadge}>Limited spots</div>
                        </div>
                    </div>

                    <div className={styles.toggleRow}>
                        <div className={styles.toggleWrap}>
                            <span 
                                className={`${styles.tl} ${!isAnnual ? styles.on : ''}`} 
                                onClick={() => setBillingCycle('monthly')}
                            >
                                Monthly
                            </span>
                            <div 
                                className={`${styles.tpill} ${isAnnual ? styles.annual : ''}`} 
                                onClick={() => setBillingCycle(isAnnual ? 'monthly' : 'yearly')}
                            >
                                <div className={styles.tdot}></div>
                            </div>
                            <span 
                                className={`${styles.tl} ${isAnnual ? styles.on : ''}`} 
                                onClick={() => setBillingCycle('yearly')}
                            >
                                Annual
                            </span>
                            <span className={styles.saveTag} style={{ opacity: isAnnual ? 1 : 0.4 }}>Save 30%</span>
                        </div>
                    </div>
                </section>

                <section className={styles.cardsSection}>
                    <div className={styles.cardsGrid}>

                        {/* EXPLORER */}
                        <div className={styles.pcard}>
                            <div className={styles.picon} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <svg viewBox="0 0 18 18" fill="none" style={{ width: '18px', height: '18px', color: 'rgba(255,255,255,0.3)' }}><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" /><path d="M6.5 9l2 2L11.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                            <div className={styles.pname}>Explorer</div>
                            <div className={styles.ptagline}>Begin your journey. One life area, your voice, your story.</div>
                            <div className={styles.priceBlock}>
                                <div className={styles.pwas}>&nbsp;</div>
                                <div className={styles.prow}><span className={`${styles.pamt} ${styles.free}`}>Free</span></div>
                                <div className={styles.pnote}>&nbsp;</div>
                            </div>
                            <button 
                                onClick={() => handlePlanSelect('free')} 
                                className={styles.pcta}
                                disabled={currentPlanId === 'free'}
                            >
                                {currentPlanId === 'free' ? 'Current Plan' : 'Start free'}
                            </button>
                            <div className={styles.fdiv}></div>
                            <ul className={styles.flist}>
                                <li className={styles.fitem}><span className={styles.fck}>✓</span><span className={`${styles.ft} ${styles.hi}`}>1 personalized night story</span></li>
                                <li className={styles.fitem}><span className={styles.fck}>✓</span><span className={styles.ft}>1 life area</span></li>
                                <li className={styles.fitem}><span className={styles.fck}>✓</span><span className={styles.ft}>AI voice cloning</span></li>
                                <li className={styles.fitem}><span className={styles.fck}>✓</span><span className={styles.ft}>7–8 min story</span></li>
                                <li className={styles.fitem}><span className={styles.fck}>✓</span><span className={styles.ft}>Listening streak tracking</span></li>
                                <li className={styles.fitem}><span className={`${styles.fck} ${styles.dim}`}>–</span><span className={styles.ft}>Downloadable MP3</span></li>
                                <li className={styles.fitem}><span className={`${styles.fck} ${styles.dim}`}>–</span><span className={styles.ft}>Hypnotic induction</span></li>
                                <li className={styles.fitem}><span className={`${styles.fck} ${styles.dim}`}>–</span><span className={styles.ft}>NLP anchor</span></li>
                                <li className={styles.fitem}><span className={`${styles.fck} ${styles.dim}`}>–</span><span className={styles.ft}>Binaural beats</span></li>
                            </ul>
                        </div>

                        {/* ACTIVATOR */}
                        <div className={styles.pcard}>
                            <div className={styles.picon} style={{ background: 'rgba(82,183,136,0.08)', border: '1px solid rgba(82,183,136,0.15)' }}>
                                <svg viewBox="0 0 18 18" fill="none" style={{ width: '18px', height: '18px', color: 'var(--accent)' }}><path d="M9 2v2M9 14v2M2 9h2M14 9h2M4.22 4.22l1.42 1.42M12.36 12.36l1.42 1.42M12.36 5.64l-1.42 1.42M5.64 12.36l-1.42 1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /><circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5" /></svg>
                            </div>
                            <div className={styles.pname}>Activator</div>
                            <div className={styles.ptagline}>Open your subconscious before the vision begins. Real depth starts here.</div>
                            <div className={styles.priceBlock}>
                                <div className={styles.pwas}>Was ${prices.monthly.act[1]}/mo</div>
                                <div className={styles.prow}>
                                    <span className={styles.pamt}>${p.act[0]}</span>
                                    <span className={styles.pper}>/mo</span>
                                    <span className={styles.ftag}>Founding rate</span>
                                </div>
                                <div className={styles.pnote}>{isAnnual ? `($${prices.yearly.act[0]}/mo billed annually)` : '\u00a0'}</div>
                            </div>
                            <button 
                                onClick={() => handlePlanSelect('activator')} 
                                className={styles.pcta}
                                disabled={loadingPlan === 'activator' || currentPlanId === 'activator'}
                            >
                                {loadingPlan === 'activator' ? 'Connecting...' : (currentPlanId === 'activator' ? 'Current Plan' : 'Get started')}
                            </button>
                            <div className={styles.fdiv}></div>
                            <ul className={styles.flist}>
                                <li className={styles.fitem}><span className={styles.fck}>✓</span><span className={`${styles.ft} ${styles.hi}`}>Night story, up to 3 areas</span></li>
                                <li className={styles.fitem}><span className={styles.fck}>✓</span><span className={styles.ft}>AI voice cloning</span></li>
                                <li className={styles.fitem}><span className={styles.fck}>✓</span><span className={`${styles.ft} ${styles.hi}`}>Full hypnotic induction</span></li>
                                <li className={styles.fitem}><span className={styles.fck}>✓</span><span className={`${styles.ft} ${styles.hi}`}>Identity-level programming</span></li>
                                <li className={styles.fitem}><span className={styles.fck}>✓</span><span className={`${styles.ft} ${styles.hi}`}>Downloadable MP3</span></li>
                                <li className={styles.fitem}><span className={styles.fck}>✓</span><span className={styles.ft}>9–11 min story</span></li>
                                <li className={styles.fitem}><span className={styles.fck}>✓</span><span className={styles.ft}>Listening streak tracking</span></li>
                                <li className={styles.fitem}><span className={`${styles.fck} ${styles.dim}`}>–</span><span className={styles.ft}>NLP anchor</span></li>
                                <li className={styles.fitem}><span className={`${styles.fck} ${styles.dim}`}>–</span><span className={styles.ft}>Binaural beats</span></li>
                            </ul>
                        </div>

                        {/* MANIFESTER */}
                        <div className={`${styles.pcard} ${styles.feat}`}>
                            <div className={`${styles.cbadge} ${styles.badgeGreen}`}>Most popular</div>
                            <div className={styles.picon} style={{ background: 'rgba(82,183,136,0.1)', border: '1px solid rgba(82,183,136,0.2)' }}>
                                <svg viewBox="0 0 18 18" fill="none" style={{ width: '18px', height: '18px', color: 'var(--accent)' }}><path d="M9 1l2 5.5h5.5L12 10l1.5 5.5L9 13l-4.5 2.5L6 10 1.5 6.5H7L9 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
                            </div>
                            <div className={styles.pname}>Manifester</div>
                            <div className={styles.ptagline}>The complete system. All areas, NLP anchor, affirmations planted in theta.</div>
                            <div className={styles.priceBlock}>
                                <div className={styles.pwas}>Was ${prices.monthly.man[1]}/mo</div>
                                <div className={styles.prow}>
                                    <span className={styles.pamt}>${p.man[0]}</span>
                                    <span className={styles.pper}>/mo</span>
                                    <span className={styles.ftag}>Founding rate</span>
                                </div>
                                <div className={styles.pnote}>{isAnnual ? `($${prices.yearly.man[0]}/mo billed annually)` : '\u00a0'}</div>
                            </div>
                            <button 
                                onClick={() => handlePlanSelect('manifester')} 
                                className={`${styles.pcta} ${styles.green}`}
                                disabled={loadingPlan === 'manifester' || currentPlanId === 'manifester'}
                            >
                                {loadingPlan === 'manifester' ? 'Connecting...' : (currentPlanId === 'manifester' ? 'Current Plan' : 'Begin manifesting')}
                            </button>
                            <div className={styles.fdiv}></div>
                            <ul className={styles.flist}>
                                <li className={styles.fitem}><span className={styles.fck}>✓</span><span className={`${styles.ft} ${styles.hi}`}>Everything in Activator</span></li>
                                <li className={styles.fitem}><span className={styles.fck}>✓</span><span className={`${styles.ft} ${styles.hi}`}>All 6 life areas</span></li>
                                <li className={styles.fitem}><span className={styles.fck}>✓</span><span className={`${styles.ft} ${styles.hi}`}>NLP kinesthetic anchor</span></li>
                                <li className={styles.fitem}><span className={styles.fck}>✓</span><span className={`${styles.ft} ${styles.hi}`}>Affirmations planted in theta</span></li>
                                <li className={styles.fitem}><span className={styles.ft}>12–15 min story</span></li>
                                <li className={styles.fitem}><span className={`${styles.fck} ${styles.dim}`}>–</span><span className={styles.ft}>Morning activation story</span></li>
                                <li className={styles.fitem}><span className={`${styles.fck} ${styles.dim}`}>–</span><span className={styles.ft}>Theta binaural beats</span></li>
                            </ul>
                        </div>

                        {/* AMPLIFIER / BETA */}
                        <div className={`${styles.pcard} ${styles.amp}`}>
                            <div className={`${styles.cbadge} ${styles.badgePurple}`}>{isBetaUser ? 'Beta Access' : 'Most powerful'}</div>
                            <div className={styles.picon} style={{ background: 'rgba(124,77,189,0.1)', border: '1px solid rgba(124,77,189,0.2)' }}>
                                <svg viewBox="0 0 18 18" fill="none" style={{ width: '18px', height: '18px', color: 'rgba(180,130,255,0.8)' }}><path d="M3 9h2l2-5 3 10 2-5h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                            <div className={styles.pname}>{isBetaUser ? 'Beta' : 'Amplifier'}</div>
                            <div className={styles.ptagline}>Night + morning. Theta binaural beats. The deepest reprogramming available.</div>
                            <div className={styles.priceBlock}>
                                <div className={styles.pwas}>{isBetaUser ? '\u00a0' : `Was $${prices.monthly.amp[1]}/mo`}</div>
                                <div className={styles.prow}>
                                    <span className={styles.pamt}>{isBetaUser ? 'Free' : `$${p.amp[0]}`}</span>
                                    <span className={styles.pper}>{isBetaUser ? 'trial' : '/mo'}</span>
                                    {!isBetaUser && <span className={styles.ftag}>Founding rate</span>}
                                </div>
                                <div className={styles.pnote}>{!isBetaUser && isAnnual ? `($${prices.yearly.amp[0]}/mo billed annually)` : '\u00a0'}</div>
                            </div>
                            <button 
                                onClick={() => handlePlanSelect('amplifier')} 
                                className={`${styles.pcta} ${styles.purple}`}
                                disabled={loadingPlan === 'amplifier' || currentPlanId === 'amplifier'}
                            >
                                {loadingPlan === 'amplifier' ? 'Connecting...' : (currentPlanId === 'amplifier' ? 'Current Plan' : (isBetaUser ? 'Start Trial' : 'Go all in'))}
                            </button>
                            <div className={styles.fdiv}></div>
                            <ul className={styles.flist}>
                                <li className={styles.fitem}><span className={`${styles.fck} ${styles.pu}`}>✓</span><span className={`${styles.ft} ${styles.hi}`}>Everything in Manifester</span></li>
                                <li className={styles.fitem}><span className={`${styles.fck} ${styles.pu}`}>✓</span><span className={`${styles.ft} ${styles.hi}`}>Morning activation story</span></li>
                                <li className={styles.fitem}><span className={`${styles.fck} ${styles.pu}`}>✓</span><span className={`${styles.ft} ${styles.hi}`}>Theta binaural beats (432 Hz)</span></li>
                                <li className={styles.fitem}><span className={`${styles.fck} ${styles.pu}`}>✓</span><span className={styles.ft}>16–20 min night story</span></li>
                                <li className={styles.fitem}><span className={`${styles.fck} ${styles.pu}`}>✓</span><span className={styles.ft}>5 min morning activation</span></li>
                                <li className={styles.fitem}><span className={`${styles.fck} ${styles.pu}`}>✓</span><span className={styles.ft}>Anchor fired morning + night</span></li>
                                <li className={styles.fitem}><span className={`${styles.fck} ${styles.pu}`}>✓</span><span className={styles.ft}>Priority story regeneration</span></li>
                            </ul>
                        </div>

                    </div>
                </section>

                <section className={styles.incSection}>
                    <div className={styles.incDiv}>
                        <span className={styles.incLabel}>what every paid plan includes</span>
                    </div>
                    <div className={styles.incGrid}>
                        <div className={styles.incItem}>
                            <div className={styles.incTitle}>Your voice, only yours</div>
                            <div className={styles.incText}>AI voice cloning personalized entirely to you — no shared voices, ever</div>
                        </div>
                        <div className={styles.incItem}>
                            <div className={styles.incTitle}>Downloadable MP3</div>
                            <div className={styles.incText}>Listen anywhere — phone, speaker, earbuds, offline</div>
                        </div>
                        <div className={styles.incItem}>
                            <div className={styles.incTitle}>21-day imprint guarantee</div>
                            <div className={styles.incText}>Listen nightly for 21 days or we rewrite your story free</div>
                        </div>
                        <div className={styles.incItem}>
                            <div className={styles.incTitle}>Cancel anytime</div>
                            <div className={styles.incText}>No contracts. No hidden fees. No pressure.</div>
                        </div>
                    </div>
                </section>

                <div className={styles.bottomNote}>
                    <p className={styles.bn}>Not sure? Start free with Explorer — hear what your own voice speaking your future sounds like.<br /><em>Most people upgrade within the first week.</em></p>
                </div>
            </main>

            <div className={`${styles.toast} ${toast.visible ? styles.show : ''}`}>
                {toast.message}
            </div>
        </div>
    );
};

export default PricingPage;
