import { describe, it, expect, vi } from 'vitest';
import { MultiModelInspector } from '../src/services/multiModelInspector';

describe('MultiModelInspector', () => {
  it('initializes with default comparative state in Stable Era', () => {
    const inspector = new MultiModelInspector();
    const state = inspector.getState();
    expect(state.primaryModel).toBe('llama3');
    expect(state.secondaryModel).toBe('mistral');
    expect(state.ecologicalEra).toBe('stable_era');
    expect(state.isCrisisActive).toBe(false);
    expect(state.comparativeEntropy).toBeGreaterThan(0);
    inspector.dispose();
  });

  it('triggers Macro-Predator Awakening Event when entropy spikes above crisis threshold', () => {
    const inspector = new MultiModelInspector();
    const awakeningListener = vi.fn();
    const eraListener = vi.fn();

    inspector.setEventListeners({
      onMacroPredatorAwakening: awakeningListener,
      onEcologicalEraChange: eraListener,
    });

    // Inject high entropy spike
    inspector.injectEntropySpike(0.85);

    const state = inspector.getState();
    expect(state.isCrisisActive).toBe(true);
    expect(state.ecologicalEra).toBe('apex_crisis');
    expect(state.crisisCountdown).toBe(10);
    expect(awakeningListener).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 10,
      })
    );
    expect(eraListener).toHaveBeenCalledWith('apex_crisis');

    inspector.dispose();
  });

  it('counts down the 10-second timeline and returns to Stable Era', () => {
    const inspector = new MultiModelInspector();
    inspector.triggerMacroPredatorAwakening(10);

    expect(inspector.getState().crisisCountdown).toBe(10);

    // Tick countdown
    inspector.tickCountdown(4.5);
    expect(inspector.getState().crisisCountdown).toBeCloseTo(5.5, 1);

    // Tick remainder to finish 10 seconds
    inspector.tickCountdown(6.0);
    expect(inspector.getState().crisisCountdown).toBe(0);
    expect(inspector.getState().isCrisisActive).toBe(false);
    expect(inspector.getState().ecologicalEra).toBe('stable_era');

    inspector.dispose();
  });
});
