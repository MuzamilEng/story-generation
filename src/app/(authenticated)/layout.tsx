'use client'
import React from 'react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import UserHeader from '../components/UserHeader';
import Sidebar from '../components/Sidebar';

export default function UserLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname();
    const { data: session } = useSession();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Desktop top header — always visible now */}
            <UserHeader />
            {/* Mobile-only sidebar hamburger + slide-in drawer */}
            <Sidebar />

            <main style={{ flex: 1 }} className="authenticated-main">
                {children}
            </main>

            {/* Give content room to breathe below the fixed hamburger on mobile */}
            <style>{`
                @media (max-width: 768px) {
                    .authenticated-main {
                        padding-top: 3.25rem;
                    }
                }
            `}</style>
        </div>
    );
}
