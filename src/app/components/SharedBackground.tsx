'use client'
import React, { useMemo } from 'react';

const SharedBackground: React.FC = () => {
    const stars = useMemo(() => {
        return Array.from({ length: 80 }).map((_, i) => ({
            id: i,
            size: Math.random() > 0.85 ? 2 : 1,
            left: Math.random() * 100,
            top: Math.random() * 100,
            opacity: 0.15 + Math.random() * 0.5,
        }));
    }, []);

    return (
        <>
            <div className="atm-layer atm-1"></div>
            <div className="atm-layer atm-2"></div>
            <div className="atm-layer atm-3"></div>
            <div className="stars-container">
                {stars.map((s) => (
                    <div
                        key={s.id}
                        className="star"
                        style={{
                            width: `${s.size}px`,
                            height: `${s.size}px`,
                            left: `${s.left}%`,
                            top: `${s.top}%`,
                            opacity: s.opacity,
                        }}
                    />
                ))}
            </div>
        </>
    );
};

export default SharedBackground;
