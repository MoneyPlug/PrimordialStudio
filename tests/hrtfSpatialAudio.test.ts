import { describe, it, expect } from 'vitest';
import { HRTFSpatialAudioEngine } from '../src/audio/hrtfSpatialAudio';

describe('HRTF 3D Spatial Audio Engine', () => {
  it('instantiates with HRTF panning model and default inverse distance rolloff', () => {
    const engine = new HRTFSpatialAudioEngine({
      panningModel: 'HRTF',
      distanceModel: 'inverse',
      refDistance: 1,
      maxDistance: 1000,
      rolloffFactor: 1.5,
    });

    const state = engine.getSpatialState();
    expect(state.panningModel).toBe('HRTF');
    expect(state.distance).toBeGreaterThan(0);
    expect(state.active).toBe(false);
  });

  it('updates emitter and listener 3D coordinates accurately', () => {
    const engine = new HRTFSpatialAudioEngine();
    engine.updateEmitterPosition({ x: 3, y: 0, z: 4 });
    engine.updateListenerPose({ x: 0, y: 0, z: 0 });

    const state = engine.getSpatialState();
    expect(state.creaturePos).toEqual({ x: 3, y: 0, z: 4 });
    expect(state.listenerPos).toEqual({ x: 0, y: 0, z: 0 });
    // sqrt(3^2 + 0^2 + 4^2) = 5
    expect(state.distance).toBeCloseTo(5.0);
  });
});
