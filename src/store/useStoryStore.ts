import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserAnswers } from '@/lib/story-utils';

interface StoryState {
    capturedGoals: Record<string, string | string[]>;
    normalizedGoals: UserAnswers | null;
    isHydrated: boolean;
    setCapturedGoals: (goals: Record<string, string | string[]> | ((prev: Record<string, string | string[]>) => Record<string, string | string[]>)) => void;
    setNormalizedGoals: (goals: UserAnswers | null) => void;
    setHasHydrated: (val: boolean) => void;
    clearStore: () => void;
}

export const useStoryStore = create<StoryState>()(
    persist(
        (set, get) => ({
            capturedGoals: {},
            normalizedGoals: null,
            isHydrated: false,
            setCapturedGoals: (goals) => {
                const next = typeof goals === 'function' ? goals(get().capturedGoals) : goals;
                set({ capturedGoals: next });
            },
            setNormalizedGoals: (goals) => set({ normalizedGoals: goals }),
            setHasHydrated: (val) => set({ isHydrated: val }),
            clearStore: () => set({ capturedGoals: {}, normalizedGoals: null }),
        }),
        {
            name: 'story-storage',
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
