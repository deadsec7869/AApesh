export type PlaybackPhase =
  | 'IDLE'
  | 'LOADING'
  | 'BUFFERING'
  | 'PLAYING'
  | 'PAUSED'
  | 'RECOVERING'
  | 'ERROR';

export interface PlaybackSnapshot {
  phase: PlaybackPhase;
  playbackRequestId: number;
  trackId: string | null;
  wantsPlay: boolean;
  error: string | null;
}

export type PlaybackEvent =
  | { type: 'SELECT'; requestId: number; trackId: string }
  | { type: 'RESET'; requestId: number }
  | { type: 'PLAY' | 'PAUSE' | 'PLAYING' | 'BUFFERING' | 'ENDED' | 'RECOVER'; requestId: number }
  | { type: 'FAIL'; requestId: number; error: string };

export const initialPlaybackState: PlaybackSnapshot = {
  phase: 'IDLE',
  playbackRequestId: 0,
  trackId: null,
  wantsPlay: false,
  error: null,
};

/** Intent and observations are separate; old observations cannot mutate a new session. */
export function transitionPlayback(state: PlaybackSnapshot, event: PlaybackEvent): PlaybackSnapshot {
  if (event.type === 'SELECT') {
    if (event.requestId <= state.playbackRequestId) return state;
    return { phase: 'LOADING', playbackRequestId: event.requestId, trackId: event.trackId, wantsPlay: true, error: null };
  }
  if (event.type === 'RESET') return event.requestId > state.playbackRequestId
    ? { ...initialPlaybackState, playbackRequestId: event.requestId } : state;
  if (event.requestId !== state.playbackRequestId || !state.trackId) return state;
  switch (event.type) {
    case 'PLAY': return { ...state, wantsPlay: true, phase: 'BUFFERING', error: null };
    case 'PAUSE': return { ...state, wantsPlay: false, phase: 'PAUSED' };
    case 'PLAYING': return state.wantsPlay ? { ...state, phase: 'PLAYING', error: null } : state;
    case 'BUFFERING': return state.wantsPlay ? { ...state, phase: 'BUFFERING' } : state;
    case 'RECOVER': return { ...state, phase: 'RECOVERING', error: null };
    case 'ENDED': return { ...state, wantsPlay: false, phase: 'PAUSED' };
    case 'FAIL': return { ...state, phase: 'ERROR', wantsPlay: false, error: event.error };
  }
}