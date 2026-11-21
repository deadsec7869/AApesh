import { defaultPlaybackEngine } from './YouTubeIframeProvider';
import { LocalAudioProvider } from './LocalAudioProvider';
import { DualAudioController } from './DualAudioController';
import { audioReactiveEngine } from '@/services/audio/AudioReactiveEngine';

export const localAudioProvider = new LocalAudioProvider();
export const playbackController = new DualAudioController(defaultPlaybackEngine, localAudioProvider);
playbackController.subscribe(state => {
  audioReactiveEngine.setExternalAnalyser(state.trackId?.startsWith('local:') && state.phase === 'PLAYING'
    ? localAudioProvider.getAnalyser() : null);
});

const refresh = () => { if (!document.hidden) playbackController.refreshPosition(); };
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', refresh);
if (import.meta.hot) import.meta.hot.dispose(() => {
  document.removeEventListener('visibilitychange', refresh);
  playbackController.destroy();
});
