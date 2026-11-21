import React, { Component, ErrorInfo, ReactNode } from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { audioReactiveEngine } from '@/services/audio/AudioReactiveEngine';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class CanvasErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[CanvasErrorBoundary] WebGL error caught:', error, errorInfo);
    // Graceful degradation: switch to ambient mode and stealth visualizer
    try {
      audioReactiveEngine.setAmbientMode(true);
    } catch {}
    try {
      useUIStore.getState().setVisualizerMode('stealth');
    } catch {}
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return null; // Render nothing; parent will show StealthMode via visualizerMode
    }
    return this.props.children;
  }
}