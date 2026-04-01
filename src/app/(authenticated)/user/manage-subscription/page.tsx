'use client'
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { format } from 'date-fns';
import styles from '../../../styles/Subscription.module.css';
import {
    CheckIcon,
    XIcon,
    PlusIcon,
    ArrowLeftIcon,
    UserIcon,
    ReceiptIcon
} from '../../../components/icons/SubscriptionIcons';
import { Plan, UsageMetric, BillingRecord, CurrentPlan } from '../../../types/subscription';

// Current Plan Banner Component
interface CurrentPlanBannerProps {
    plan: CurrentPlan;
}

const CurrentPlanBanner: React.FC<CurrentPlanBannerProps> = ({ plan }) => (
    <div className={styles.currentBanner}>
        <div className={styles.cbLeft}>
            <div className={styles.cbEyebrow}>Your current plan</div>
            <div className={styles.cbPlan}>{plan.name}</div>
            <div className={styles.cbPrice}>{plan.price}</div>
        </div>
        <div className={styles.cbRight}>
            {plan.nextRenewal && (
                <div className={styles.cbRenewal}>Next renewal: {format(plan.nextRenewal, 'MMMM d, yyyy')}</div>
            )}
            <div className={styles.cbStatus}>
                <span className={styles.cbDot} />
                {plan.status === 'active' ? 'Active' : (plan.status === 'canceling' ? 'Canceling' : plan.status)}
            </div>
        </div>
    </div>
);

// Usage Card Component
interface UsageCardProps {
    metrics: UsageMetric[];
}

const UsageCard: React.FC<UsageCardProps> = ({ metrics }) => {
    const formatValue = (current: number, limit: number, unit: string): string => {
        if (unit === 'count') return `${current} of ${limit}`;
        if (unit === 'minutes') return `${current} of ${limit} min`;
        return `${current} of ${limit}`;
    };

    const getPercentage = (current: number, limit: number): number => {
        return Math.min((current / limit) * 100, 100);
    };

    return (
        <div className={styles.usageCard}>
            <div className={styles.cardLabel}>Usage this billing cycle</div>

            {metrics.map((metric, index) => (
                <div key={index} className={styles.usageRow}>
                    <div className={styles.usageTop}>
                        <span className={styles.usageName}>{metric.name}</span>
                        <span className={styles.usageCount}>
                            {formatValue(metric.current, metric.limit, metric.unit)}
                        </span>
                    </div>
                    <div className={styles.barTrack}>
                        <div
                            className={`${styles.barFill} ${metric.warn ? styles.warn : ''}`}
                            style={{ width: `${getPercentage(metric.current, metric.limit)}%` }}
                        />
                    </div>
                </div>
            ))}

            <div className={styles.resetsNote}>
                Stories and audio minutes reset on {format(new Date(2026, 3, 7), 'MMMM d')}. Your library slots carry forward and never reset.
            </div>
        </div>
    );
};

// Plan Card Component
interface PlanCardProps {
    plan: Plan;
    onSelect: (planId: string) => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, onSelect }) => {
    const getButtonClass = (): string => {
        switch (plan.buttonStyle) {
            case 'current': return styles.btnCurrent;
            case 'upgrade': return styles.btnUpgrade;
            case 'power': return styles.btnPower;
            case 'downgrade': return styles.btnDowngrade;
            default: return styles.btnDowngrade;
        }
    };

    const getCardClass = (): string => {
        let className = styles.planCard;
        if (plan.isCurrent) className += ` ${styles.current}`;
        if (plan.isHighlighted) className += ` ${styles.highlight}`;
        return className;
    };

    return (
        <div className={getCardClass()}>
            {plan.badge && (
                <div className={`${styles.planPip} ${plan.isCurrent ? styles.pipCurrent : styles.pipPopular}`}>
                    {plan.badge}
                </div>
            )}

            <div className={styles.planName}>{plan.name}</div>
            <div className={styles.planPrice}>
                {plan.priceOriginal && <span style={{ textDecoration: 'line-through', opacity: 0.5, fontSize: '0.65em', marginRight: '6px' }}>{plan.priceOriginal}</span>}
                {plan.price} <span className={styles.planPriceSub}>{plan.priceSub}</span>
            </div>

            <div className={styles.planDivider} />

            <div className={styles.planFeats}>
                {plan.features.map((feat, idx) => (
                    <div key={idx} className={`${styles.feat} ${!feat.included ? styles.dim : ''}`}>
                        {feat.included ? <CheckIcon /> : <XIcon />}
                        <span>{feat.text}</span>
                    </div>
                ))}
            </div>

            <button
                className={`${styles.planBtn} ${getButtonClass()}`}
                onClick={() => onSelect(plan.id)}
                disabled={plan.isCurrent}
            >
                {plan.buttonText}
            </button>
        </div>
    );
};

// Billing History Component
interface BillingHistoryProps {
    records: BillingRecord[];
    onReceiptClick: (record: BillingRecord) => void;
}

const BillingHistory: React.FC<BillingHistoryProps> = ({ records, onReceiptClick }) => (
    <div className={styles.billingCard}>
        <div className={styles.billingHead}>Billing History</div>

        {records.map((record, index) => (
            <div key={index} className={styles.billingRow}>
                <div>
                    <div className={styles.billingDate}>{format(record.date, 'MMMM d, yyyy')}</div>
                    <div className={styles.billingDesc}>{record.description}</div>
                </div>
                <div className={styles.billingRight}>
                    <span className={`${styles.billingStatus} ${styles[`status-${record.status}`]}`}>
                        {record.status === 'paid' ? 'Paid' : record.status}
                    </span>
                    <span className={styles.billingAmount}>${record.amount.toFixed(2)}</span>
                    <button
                        className={styles.billingReceipt}
                        onClick={() => onReceiptClick(record)}
                    >
                        Receipt
                    </button>
                </div>
            </div>
        ))}
    </div>
);

// Cancel Section Component
interface CancelSectionProps {
    nextRenewal?: Date | null;
    onCancel: () => void;
}

const CancelSection: React.FC<CancelSectionProps> = ({ nextRenewal, onCancel }) => (
    <div className={styles.cancelSection}>
        <div className={styles.cancelTop}>
            <div>
                <div className={styles.cancelTitle}>Cancel subscription</div>
                <div className={styles.cancelSub}>
                    You can cancel at any time with one click. {nextRenewal ? `Your plan stays active until the end of your current billing period (${format(nextRenewal, 'MMMM d, yyyy')}). ` : ''}Your stories and audio files remain accessible until then.
                </div>
            </div>
            <button className={styles.cancelBtn} onClick={onCancel}>
                Cancel Plan
            </button>
        </div>
        <div className={styles.cancelNote}>
            After cancellation, your account switches to Free. Stories above the free limit will be archived and restored if you resubscribe within 90 days.
        </div>
    </div>
);

// Toast Component
interface ToastProps {
    message: string;
    visible: boolean;
}

const Toast: React.FC<ToastProps> = ({ message, visible }) => (
    <div className={`${styles.toast} ${visible ? styles.show : ''}`}>
        {message}
    </div>
);

// Main Component
const Subscription: React.FC = () => {
    const [toast, setToast] = useState({ message: '', visible: false });
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const [subStatus, setSubStatus] = useState<any>(null);
    const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);

    useEffect(() => {
        // Handle URL parameters for success/canceled
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('success')) {
            showToast('✓ Subscription updated successfully!');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        if (searchParams.get('canceled')) {
            showToast('Checkout canceled.');
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        const fetchData = async () => {
            try {
                const [statusRes, historyRes] = await Promise.all([
                    fetch('/api/user/subscription/status'),
                    fetch('/api/user/subscription/history')
                ]);

                if (statusRes.ok) {
                    setSubStatus(await statusRes.json());
                }
                if (historyRes.ok) {
                    const hData = await historyRes.json();
                    setBillingRecords(hData.map((record: any) => ({
                        ...record,
                        date: new Date(record.date)
                    })));
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const showToast = (message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast({ message: '', visible: false }), 3500);
    };

    const currentPlanId = subStatus?.plan || 'free';
    const planNamesMap: Record<string, string> = {
        'free': 'Explorer',
        'activator': 'Activator',
        'manifester': 'Manifester',
        'amplifier': 'Amplifier'
    };

    const currentPlan: CurrentPlan = {
        name: planNamesMap[currentPlanId] || 'Free',
        price: currentPlanId === 'free' ? '$0 forever' : (currentPlanId === 'activator' ? '$9.99 one-time' : (currentPlanId === 'manifester' ? '$19.99/month' : '$39.99/month')),
        nextRenewal: subStatus?.stripeCurrentPeriodEnd ? new Date(subStatus.stripeCurrentPeriodEnd * 1000) : null,
        status: subStatus?.stripeSubscriptionId && subStatus?.stripeCancelAtPeriodEnd ? 'canceling' : (subStatus?.stripeSubscriptionId ? 'active' : 'active')
    };

    const usageMetrics: UsageMetric[] = [
        { name: 'Stories created', current: 3, limit: 5, unit: 'count' },
        { name: 'Audio minutes generated', current: 22, limit: 60, unit: 'minutes' },
        { name: 'Story library slots earned', current: 15, limit: 60, unit: 'count', warn: true }
    ];

    const plans: Plan[] = [
        {
            id: 'free' as any,
            name: 'Explorer',
            price: '$0',
            priceSub: 'forever',
            buttonText: currentPlanId === 'free' ? 'Your Current Plan' : 'Downgrade to Free',
            buttonStyle: currentPlanId === 'free' ? 'current' : 'downgrade',
            isCurrent: currentPlanId === 'free',
            features: [
                { text: 'Unlimited story creation', included: true },
                { text: 'Save up to 3 stories', included: true },
                { text: 'Free 2-min voice sample', included: true },
                { text: 'Full audio generation', included: false }
            ]
        },
        {
            id: 'activator' as any,
            name: 'Activator',
            priceOriginal: '$19.99',
            price: '$9.99',
            priceSub: 'one time',
            badge: 'Launch offer',
            buttonText: currentPlanId === 'activator' ? 'Your Current Plan' : 'Get Activator',
            buttonStyle: currentPlanId === 'activator' ? 'current' : 'downgrade',
            isCurrent: currentPlanId === 'activator',
            features: [
                { text: 'Everything in Explorer', included: true },
                { text: 'Full audio up to 10 min', included: true },
                { text: 'MP3 download — forever', included: true },
                { text: 'Affirmations & induction', included: false }
            ]
        },
        {
            id: 'manifester' as any,
            name: 'Manifester',
            priceOriginal: billingCycle === 'yearly' ? '$39.99/mo' : '',
            price: billingCycle === 'monthly' ? '$19.99' : '$15.99',
            priceSub: '/month',
            isCurrent: currentPlanId === 'manifester',
            badge: currentPlanId === 'manifester' ? 'Current Plan' : 'Most popular',
            isHighlighted: currentPlanId !== 'manifester',
            buttonText: currentPlanId === 'manifester' ? 'Your Current Plan' : (currentPlanId === 'amplifier' ? 'Downgrade to Manifester' : 'Upgrade to Manifester'),
            buttonStyle: currentPlanId === 'manifester' ? 'current' : (currentPlanId === 'amplifier' ? 'downgrade' : 'upgrade'),
            features: [
                { text: 'Everything in Activator', included: true },
                { text: '5 audio stories/month', included: true },
                { text: 'AI affirmations in voice', included: true },
                { text: 'Guided NLP induction', included: true }
            ]
        },
        {
            id: 'amplifier' as any,
            name: 'Amplifier',
            priceOriginal: billingCycle === 'yearly' ? '$79.99/mo' : '',
            price: billingCycle === 'monthly' ? '$39.99' : '$31.99',
            priceSub: '/month',
            isCurrent: currentPlanId === 'amplifier',
            badge: currentPlanId === 'amplifier' ? 'Current Plan' : 'Most powerful',
            buttonText: currentPlanId === 'amplifier' ? 'Your Current Plan' : 'Upgrade to Amplifier',
            buttonStyle: currentPlanId === 'amplifier' ? 'current' : 'power',
            features: [
                { text: 'Everything in Manifester', included: true },
                { text: '10 hrs audio/month', included: true },
                { text: 'Binaural beats (theta)', included: true },
                { text: 'Studio-grade quality', included: true }
            ]
        }
    ];

    const handlePlanSelect = async (planId: string) => {
        if (actionLoading) return;
        if (planId === currentPlanId) return;

        if (planId === 'free') {
            if (confirm(`Are you sure you want to revert to Explorer (Free)? Your access will stay active until the end of your current period.`)) {
                handleCancel();
            }
            return;
        }

        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        if (confirm(`Proceed to checkout for ${plan.name} (${plan.price}${plan.priceSub !== 'one time' ? plan.priceSub : ''})?`)) {
            try {
                setActionLoading(true);
                const res = await fetch('/api/user/subscription/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        planId,
                        billingCycle: planId === 'activator' ? 'oneTime' : (billingCycle === 'yearly' ? 'yearly' : 'monthly'),
                        autoRenew: true
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data.url) {
                        window.location.href = data.url;
                    }
                } else {
                    const err = await res.text();
                    showToast(`Failed to initiate checkout: ${err}`);
                }
            } catch (err) {
                showToast('Error occurred during checkout.');
            } finally {
                setActionLoading(false);
            }
        }
    };

    const handleCancel = async () => {
        if (actionLoading) return;
        if (!confirm('Cancel your plan? Your subscription will be cancelled immediately.')) return;

        try {
            setActionLoading(true);
            const res = await fetch('/api/user/subscription/cancel', {
                method: 'POST'
            });

            if (res.ok) {
                showToast('Subscription cancelled successfully.');
                const newStatus = await fetch('/api/user/subscription/status').then(r => r.json());
                setSubStatus(newStatus);
            } else {
                const err = await res.text();
                showToast(`Failed to cancel: ${err}`);
            }
        } catch (err) {
            showToast('Error occurred while cancelling.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReceipt = (record: BillingRecord) => {
        if (record.receiptUrl) {
            window.open(record.receiptUrl, '_blank');
        } else {
            showToast('Receipt not available.');
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <main className={styles.page}>
                    <h1 className={styles.pageTitle} style={{ marginTop: '2rem' }}>Loading subscription...</h1>
                </main>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>ManifestMyStory — Manage Subscription</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Lora:ital,wght@0,400;1,400&display=swap" rel="stylesheet" />
            </Head>

            <div className={styles.container}>
                <main className={styles.page}>
                    {/* Back Link */}
                    <Link href="/user/account-setting" className={styles.backLink}>
                        <ArrowLeftIcon />
                        Back to Account Settings
                    </Link>

                    <h1 className={styles.pageTitle}>Manage Subscription</h1>
                    <p className={styles.pageSub}>Upgrade, downgrade, or cancel your plan at any time.</p>

                    {/* Current Plan Banner */}
                    <CurrentPlanBanner plan={currentPlan} />

                    {/* Usage Card */}
                    <UsageCard metrics={usageMetrics} />

                    {/* Plan Options */}
                    <div className={styles.sectionLabel} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>Available plans</span>
                        <div className={styles.toggleWrapper} style={{ marginTop: 0 }}>
                            <span className={`${styles.toggleLabel} ${billingCycle === 'monthly' ? styles.active : ''}`}>Monthly</span>
                            <label className={styles.switch}>
                                <input
                                    type="checkbox"
                                    checked={billingCycle === 'yearly'}
                                    onChange={() => setBillingCycle(c => c === 'monthly' ? 'yearly' : 'monthly')}
                                />
                                <span className={styles.slider}></span>
                            </label>
                            <span className={`${styles.toggleLabel} ${billingCycle === 'yearly' ? styles.active : ''}`}>Annual <span className={styles.saveBadge}>Save 20%</span></span>
                        </div>
                    </div>
                    <div className={styles.plansGrid}>
                        {plans.map(plan => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                onSelect={handlePlanSelect}
                            />
                        ))}
                    </div>

                    {/* Billing History */}
                    {billingRecords.length > 0 && (
                        <BillingHistory
                            records={billingRecords}
                            onReceiptClick={handleReceipt}
                        />
                    )}

                    {/* Cancel Section */}
                    {currentPlanId !== 'free' && (
                        <CancelSection
                            nextRenewal={currentPlan.nextRenewal}
                            onCancel={handleCancel}
                        />
                    )}
                </main>

                {/* Toast */}
                <Toast message={toast.message} visible={toast.visible} />
            </div>
        </>
    );
};

export default Subscription;