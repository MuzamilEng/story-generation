'use client'
import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { format } from 'date-fns';
import styles from '../../styles/Subscription.module.css';
import {
    CheckIcon,
    XIcon,
    PlusIcon,
    ArrowLeftIcon,
    UserIcon,
    ReceiptIcon
} from '../../components/icons/SubscriptionIcons';
import { Plan, UsageMetric, BillingRecord, CurrentPlan } from '../../types/subscription';

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
            <div className={styles.cbRenewal}>Next renewal: {format(plan.nextRenewal, 'MMMM d, yyyy')}</div>
            <div className={styles.cbStatus}>
                <span className={styles.cbDot} />
                {plan.status === 'active' ? 'Active' : plan.status}
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
    nextRenewal: Date;
    onCancel: () => void;
}

const CancelSection: React.FC<CancelSectionProps> = ({ nextRenewal, onCancel }) => (
    <div className={styles.cancelSection}>
        <div className={styles.cancelTop}>
            <div>
                <div className={styles.cancelTitle}>Cancel subscription</div>
                <div className={styles.cancelSub}>
                    You can cancel at any time with one click. Your plan stays active until the end of your current billing period ({format(nextRenewal, 'MMMM d, yyyy')}). Your stories and audio files remain accessible until then.
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

    const currentPlan: CurrentPlan = {
        name: 'Standard',
        price: '$9.99 per month · billed monthly',
        nextRenewal: new Date(2026, 3, 7),
        status: 'active'
    };

    const usageMetrics: UsageMetric[] = [
        { name: 'Stories created', current: 3, limit: 5, unit: 'count' },
        { name: 'Audio minutes generated', current: 22, limit: 60, unit: 'minutes' },
        { name: 'Story library slots earned', current: 15, limit: 60, unit: 'count', warn: true }
    ];

    const plans: Plan[] = [
        {
            id: 'free',
            name: 'Free',
            price: '$0',
            priceSub: 'forever',
            buttonText: 'Downgrade to Free',
            buttonStyle: 'downgrade',
            features: [
                { text: 'Unlimited story creation', included: true },
                { text: '2-minute voice sample', included: true },
                { text: 'No full audio', included: false },
                { text: '1 story max', included: false }
            ]
        },
        {
            id: 'single',
            name: 'Single Story',
            price: '$4.99',
            priceSub: 'one time',
            buttonText: 'Switch to Single',
            buttonStyle: 'downgrade',
            features: [
                { text: '1 full audio story', included: true },
                { text: 'Keep forever', included: true },
                { text: 'Credit toward subscription', included: true },
                { text: 'No monthly stories', included: false }
            ]
        },
        {
            id: 'standard',
            name: 'Standard',
            price: '$9.99',
            priceSub: '/ month',
            isCurrent: true,
            badge: 'Current Plan',
            buttonText: 'Your Current Plan',
            buttonStyle: 'current',
            features: [
                { text: '5 stories / month', included: true },
                { text: '60 audio minutes / month', included: true },
                { text: 'Library grows +5/mo (max 60)', included: true },
                { text: 'Full audio downloads', included: true }
            ]
        },
        {
            id: 'power',
            name: 'Power',
            price: '$19.99',
            priceSub: '/ month',
            isHighlighted: true,
            badge: 'Most Popular',
            buttonText: 'Upgrade to Power',
            buttonStyle: 'power',
            features: [
                { text: '20 stories / month', included: true },
                { text: '300 audio minutes / month', included: true },
                { text: 'Library grows +20/mo (max 240)', included: true },
                { text: 'Priority audio generation', included: true }
            ]
        }
    ];

    const billingRecords: BillingRecord[] = [
        {
            date: new Date(2026, 2, 7),
            description: 'Standard Plan — Monthly',
            amount: 9.99,
            status: 'paid'
        },
        {
            date: new Date(2026, 1, 7),
            description: 'Standard Plan — Monthly',
            amount: 9.99,
            status: 'paid'
        },
        {
            date: new Date(2026, 0, 7),
            description: 'Single Story — One-time purchase',
            amount: 4.99,
            status: 'paid'
        }
    ];

    const showToast = (message: string) => {
        setToast({ message, visible: true });
        setTimeout(() => setToast({ message: '', visible: false }), 3500);
    };

    const handlePlanSelect = (planId: string) => {
        const plan = plans.find(p => p.id === planId);
        if (!plan) return;

        if (planId === 'power') {
            if (confirm('Upgrade to Power ($19.99/month)? Your new plan takes effect immediately and you\'ll be charged a prorated amount today.')) {
                showToast('✓ Upgraded to Power — welcome!');
            }
        } else if (planId === 'free' || planId === 'single') {
            if (confirm(`Switch to ${plan.name}? This takes effect at your next billing date (${format(currentPlan.nextRenewal, 'MMMM d, yyyy')}). You keep your current plan until then.`)) {
                showToast(`✓ Plan change scheduled — switching to ${plan.name} on ${format(currentPlan.nextRenewal, 'MMMM d')}`);
            }
        }
    };

    const handleCancel = () => {
        if (confirm('Cancel your Standard plan? You\'ll keep access until ' + format(currentPlan.nextRenewal, 'MMMM d, yyyy') + '. Your stories will be archived after that.')) {
            showToast('Subscription cancelled — access continues until ' + format(currentPlan.nextRenewal, 'MMMM d'));
        }
    };

    const handleReceipt = (record: BillingRecord) => {
        showToast('📄 Receipt downloading...');
    };

    return (
        <>
            <Head>
                <title>ManifestMyStory — Manage Subscription</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Lora:ital,wght@0,400;1,400&display=swap" rel="stylesheet" />
            </Head>

            <div className={styles.container}>
                {/* TOP BAR */}
                <header className={styles.topbar}>
                    <Link href="/" className={styles.logo}>
                        Manifest<span>MyStory</span>
                    </Link>

                    <nav className={styles.topbarNav}>
                        <Link href="/dashboard" className={`${styles.navLink} ${styles.active}`}>
                            My Stories
                        </Link>
                        <Link href="/account-settings" className={styles.navLink}>
                            Settings
                        </Link>
                    </nav>

                    <div className={styles.topbarRight}>
                        <Link href="/goal-intake-ai" className={styles.newStoryBtn}>
                            <PlusIcon />
                            New Story
                        </Link>
                        <button className={styles.avatarBtn}>MZ</button>
                    </div>
                </header>

                <main className={styles.page}>
                    {/* Back Link */}
                    <Link href="/account-settings" className={styles.backLink}>
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
                    <div className={styles.sectionLabel}>Available plans</div>
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
                    <BillingHistory
                        records={billingRecords}
                        onReceiptClick={handleReceipt}
                    />

                    {/* Cancel Section */}
                    <CancelSection
                        nextRenewal={currentPlan.nextRenewal}
                        onCancel={handleCancel}
                    />
                </main>

                {/* Toast */}
                <Toast message={toast.message} visible={toast.visible} />
            </div>
        </>
    );
};

export default Subscription;