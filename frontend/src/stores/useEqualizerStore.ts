/**
 * Backward Compatibility Layer — useEqualizerStore
 *
 * This file re-exports the new useAudioDSPStore with the legacy API surface.
 * All existing imports from '@/stores/useEqualizerStore' will continue to work.
 *
 * New code should import directly from '@/stores/useAudioDSPStore' for full API access.
 */

import {
  useAudioDSPStore,
  type EqualizerPreset,
  type EqualizerBands,
  type ParametricBand,
  type VUMeterData,
  PRESET_VALUES,
  PARAMETRIC_PRESETS,
  DEFAULT_PARAMETRIC_BANDS,
} from './useAudioDSPStore';

export {
  useAudioDSPStore as useEqualizerStore,
  useAudioDSPStore,
  type EqualizerPreset,
  type EqualizerBands,
  type ParametricBand,
  type VUMeterData,
  PRESET_VALUES,
  PARAMETRIC_PRESETS,
  DEFAULT_PARAMETRIC_BANDS,
};

// Legacy type aliases for existing code
export type LegacyEqualizerBands = EqualizerBands;
export { PRESET_VALUES as LegacyPRESET_VALUES };