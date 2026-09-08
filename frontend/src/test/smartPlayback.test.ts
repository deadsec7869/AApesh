import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePlayerStore } from '../stores/usePlayerStore';

describe('Smart Playback: Autoplay & Sleep Timer Store Logic', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      queue: [],
      currentIndex: -1,
      isPlaying: false,
      autoplayEnabled: true,
      sleepTimer: null,
      shuffleMode: 'off',
    });
  });

  describe('Autoplay Toggle', () => {
    it('toggles autoplay state and persists preference', () => {
      expect(usePlayerStore.getState().autoplayEnabled).toBe(true);
      usePlayerStore.getState().toggleAutoplay();
      expect(usePlayerStore.getState().autoplayEnabled).toBe(false);
      usePlayerStore.getState().setAutoplay(true);
      expect(usePlayerStore.getState().autoplayEnabled).toBe(true);
    });
  });

  describe('Sleep Timer Architecture', () => {
    it('sets duration in minutes and initializes remainingSeconds', () => {
      const { setSleepTimer, cancelSleepTimer } = usePlayerStore.getState();
      setSleepTimer(15);
      const timerState = usePlayerStore.getState().sleepTimer;
      expect(timerState).not.toBeNull();
      expect(timerState?.durationMinutes).toBe(15);
      expect(timerState?.remainingSeconds).toBe(900);
      expect(timerState?.timerType).toBe('minutes');

      cancelSleepTimer();
      expect(usePlayerStore.getState().sleepTimer).toBeNull();
    });

    it('sets End of Track sleep timer', () => {
      const { setSleepTimer, cancelSleepTimer } = usePlayerStore.getState();
      setSleepTimer('track');
      const timerState = usePlayerStore.getState().sleepTimer;
      expect(timerState).not.toBeNull();
      expect(timerState?.timerType).toBe('track');

      cancelSleepTimer();
      expect(usePlayerStore.getState().sleepTimer).toBeNull();
    });
  });

  describe('3-State Shuffle Cycling', () => {
    it('cycles from off -> standard -> smart -> off', () => {
      const { cycleShuffleMode } = usePlayerStore.getState();
      expect(usePlayerStore.getState().shuffleMode).toBe('off');

      cycleShuffleMode();
      expect(usePlayerStore.getState().shuffleMode).toBe('standard');
      expect(usePlayerStore.getState().shuffleEnabled).toBe(true);

      cycleShuffleMode();
      expect(usePlayerStore.getState().shuffleMode).toBe('smart');
      expect(usePlayerStore.getState().shuffleEnabled).toBe(true);

      cycleShuffleMode();
      expect(usePlayerStore.getState().shuffleMode).toBe('off');
      expect(usePlayerStore.getState().shuffleEnabled).toBe(false);
    });
  });
});
