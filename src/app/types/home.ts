export interface Step {
    icon: React.ReactNode;
    title: string;
    description: string;
    delay?: string;
}

export interface PricingPlan {
    name: string;
    price: string;
    description: string;
    cta: string;
    featured?: boolean;
    delay?: string;
}

export interface Testimonial {
    initials: string;
    text: string;
    name: string;
    role: string;
    stars: number;
    delay?: string;
}

export interface NavLink {
    label: string;
    href: string;
    external?: boolean;
}