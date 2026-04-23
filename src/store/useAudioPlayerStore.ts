import { create } from 'zustand';

export interface AudioStory {
  id: string;
  title?: string | null;
  audio_url: string;
  audio_duration_secs?: number | null;
  combined_audio_key?: string | null;
  soundscape_audio_key?: string | null;
  voice_only_url?: string | null;
}

interface AudioControls {
  play: () => void;
  pause: () => void;
  seek: (t: number, resume?: boolean) => void;
  setVolume: (v: number) => void;
}

interface AudioPlayerState {
  story: AudioStory | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isBuffering: boolean;
  bufferedPct: number;
  pendingAutoplay: boolean;
  _controls: AudioControls | null;

  // Public actions
  setStory: (story: AudioStory | null) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (t: number, resume?: boolean) => void;
  setVolume: (v: number) => void;
  setPendingAutoplay: (v: boolean) => void;
  registerControls: (controls: AudioControls) => void;

  // Internal state setters (called by GlobalAudioPlayer)
  _setIsPlaying: (v: boolean) => void;
  _setCurrentTime: (t: number) => void;
  _setDuration: (d: number) => void;
  _setIsBuffering: (v: boolean) => void;
  _setBufferedPct: (pct: number) => void;
}

export const useAudioPlayerStore = create<AudioPlayerState>()((set, get) => ({
  story: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 85,
  isBuffering: false,
  bufferedPct: 0,
  pendingAutoplay: false,
  _controls: null,

  setStory: (story) => {
    const prev = get().story;
    const isSameAudio = prev?.audio_url === story?.audio_url;
    if (!isSameAudio) {
      set({ story, currentTime: 0, isPlaying: false, duration: 0, isBuffering: false, bufferedPct: 0 });
    } else {
      set({ story });
    }
  },

  play: () => get()._controls?.play(),
  pause: () => get()._controls?.pause(),
  togglePlay: () => {
    const { isPlaying, _controls } = get();
    if (isPlaying) _controls?.pause();
    else _controls?.play();
  },
  seek: (t, resume) => get()._controls?.seek(t, resume),
  setVolume: (v) => {
    set({ volume: v });
    get()._controls?.setVolume(v);
  },
  setPendingAutoplay: (v) => set({ pendingAutoplay: v }),
  registerControls: (controls) => set({ _controls: controls }),

  _setIsPlaying: (v) => set({ isPlaying: v }),
  _setCurrentTime: (t) => set({ currentTime: t }),
  _setDuration: (d) => set({ duration: d }),
  _setIsBuffering: (v) => set({ isBuffering: v }),
  _setBufferedPct: (pct) => set({ bufferedPct: pct }),
}));
