import { describe, it, expect, vi } from 'vitest';
import type { Track } from '@/types/music';
import type { PlaybackCallbacks, PlaybackProvider } from '@/services/player/PlaybackProvider';
import { DualAudioController } from '@/services/player/DualAudioController';
import { initialPlaybackState, transitionPlayback } from '@/services/player/PlaybackStateMachine';

const track = (id: string, source: 'youtube' | 'local' = 'youtube'): Track => ({ videoId: id, source, title: id, artists: [] });
function deferred() { let resolve!: () => void; let reject!: (error: Error) => void; const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
class Provider implements PlaybackProvider {
  name = 'test'; callbacks!: PlaybackCallbacks; id: string | null = null;
  gate: ReturnType<typeof deferred> | null = null;
  init = vi.fn(async (callbacks: PlaybackCallbacks) => { this.callbacks = callbacks; });
  load = vi.fn(async (selected: Track, signal?: AbortSignal) => { if (this.gate) await this.gate.promise; if (!signal?.aborted) this.id = selected.videoId; });
  play = vi.fn(async () => {}); pause = vi.fn(); seek = vi.fn(); setVolume = vi.fn(); destroy = vi.fn();
  getCurrentTime = () => 12; getDuration = () => 180; getCurrentTrackId = () => this.id;
}
const tick = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

describe('Deterministic playback controller', () => {
  it('ignores observations from an older state-machine request', () => {
    const state = transitionPlayback(initialPlaybackState, { type: 'SELECT', requestId: 2, trackId: 'B' });
    expect(transitionPlayback(state, { type: 'FAIL', requestId: 1, error: 'old' })).toBe(state);
    const paused = transitionPlayback(state, { type: 'PAUSE', requestId: 2 });
    expect(transitionPlayback(paused, { type: 'PLAYING', requestId: 2 }).phase).toBe('PAUSED');
  });
  it('supersedes a slow load without waiting for it or playing its result', async () => {
    const youtube = new Provider(), local = new Provider();
    const controller = new DualAudioController(youtube, local);
    const gate = deferred(); youtube.gate = gate;
    const old = controller.select(track('A')); await tick();
    youtube.gate = null;
    await controller.select(track('B'));
    expect(youtube.id).toBe('B'); expect(youtube.play).toHaveBeenCalledTimes(1);
    gate.resolve(); await old;
    expect(youtube.id).toBe('B'); expect(youtube.play).toHaveBeenCalledTimes(1);
    controller.destroy();
  });
  it('preserves pause and the final seek while a track is loading', async () => {
    const provider = new Provider(); const controller = new DualAudioController(provider, new Provider());
    provider.gate = deferred(); const work = controller.select(track('A')); await tick();
    controller.seek(10); controller.seek(60); controller.pause(); provider.gate.resolve(); await work;
    expect(provider.seek).toHaveBeenLastCalledWith(60); expect(provider.play).not.toHaveBeenCalled();
    expect(controller.getSnapshot().phase).toBe('PAUSED'); controller.destroy();
  });
  it('stops the old provider and rejects its late callbacks after switching sources', async () => {
    const youtube = new Provider(), local = new Provider(); const controller = new DualAudioController(youtube, local);
    await controller.select(track('A')); await controller.select(track('local:B', 'local'));
    expect(youtube.pause).toHaveBeenCalled();
    youtube.callbacks.onError('late error'); youtube.callbacks.onEnded();
    expect(controller.getSnapshot().trackId).toBe('local:B'); expect(controller.getSnapshot().error).toBeNull();
    local.callbacks.onStateChange(true, false); expect(controller.getSnapshot().phase).toBe('PLAYING'); controller.destroy();
  });
  it('contains a rejected play promise and supports explicit retry', async () => {
    const provider = new Provider(); provider.play.mockRejectedValueOnce(new Error('autoplay blocked'));
    const controller = new DualAudioController(provider, new Provider());
    await expect(controller.select(track('A'))).resolves.toBeUndefined(); expect(controller.getSnapshot().phase).toBe('ERROR');
    await controller.play(); expect(provider.load).toHaveBeenCalledTimes(2); expect(controller.getSnapshot().error).toBeNull(); controller.destroy();
  });
  it('retries failed initialization and deduplicates ended events', async () => {
    const provider = new Provider(); provider.init.mockRejectedValueOnce(new Error('offline'));
    const controller = new DualAudioController(provider, new Provider()); const ended = vi.fn();
    await controller.init({ onStateChange: vi.fn(), onTimeUpdate: vi.fn(), onEnded: ended, onError: vi.fn() });
    await controller.select(track('A')); expect(controller.getSnapshot().phase).toBe('ERROR');
    await controller.select(track('A')); expect(provider.init).toHaveBeenCalledTimes(2);
    provider.callbacks.onEnded(); provider.callbacks.onEnded(); expect(ended).toHaveBeenCalledTimes(1); controller.destroy();
  });
  it('bounds a hung initialization and consumes a subsequent rejection', async () => {
    vi.useFakeTimers();
    try {
      const provider = new Provider(), gate = deferred(); provider.init.mockReturnValue(gate.promise);
      const controller = new DualAudioController(provider, new Provider(), 100);
      const work = controller.select(track('A')); await vi.advanceTimersByTimeAsync(101); await work;
      expect(controller.getSnapshot().phase).toBe('ERROR'); gate.reject(new Error('late')); await tick(); controller.destroy();
    } finally { vi.useRealTimers(); }
  });
});
