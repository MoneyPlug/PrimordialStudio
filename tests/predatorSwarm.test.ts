import { describe, it, expect } from 'vitest';
import { PredatorSwarmSimulation } from '../src/simulation/predatorSwarm';

describe('PredatorSwarmSimulation', () => {
  it('initializes default population with civilians, predators, and structures', () => {
    const sim = new PredatorSwarmSimulation();
    expect(sim.getCivilians().length).toBeGreaterThan(0);
    expect(sim.getPredators().length).toBeGreaterThan(0);
    expect(sim.getStructures().length).toBeGreaterThan(0);
  });

  it('streams creature coordinate tuples [x, y, z, state, hunger]', () => {
    const sim = new PredatorSwarmSimulation();
    const coords = sim.getCreatureCoordinates();
    expect(coords.length).toBe(sim.getPredators().length);
    const first = coords[0];
    expect(first.length).toBe(5);
    expect(typeof first[0]).toBe('number');
    expect(typeof first[1]).toBe('number');
    expect(typeof first[2]).toBe('number');
    expect([0, 1, 2, 3]).toContain(first[3]); // state code
    expect(first[4]).toBeGreaterThanOrEqual(0); // hunger
  });

  it('mutates predators and triggers Apex Crisis for 10 seconds', () => {
    const sim = new PredatorSwarmSimulation();
    sim.triggerApexCrisis(10);
    let status = sim.getCrisisStatus();
    expect(status.isApexCrisis).toBe(true);
    expect(status.remainingSeconds).toBe(10);

    // Update with delta time
    sim.update(2.0, 0.8, 0.9);
    status = sim.getCrisisStatus();
    expect(status.remainingSeconds).toBe(8);

    // Verify predator mutation under crisis
    const preds = sim.getPredators();
    expect(preds[0].bodyRadius).toBeGreaterThan(1.0);
    expect(preds[0].tentacleCount).toBeGreaterThanOrEqual(8);
    expect(preds[0].glowColor).toEqual([1.0, 0.08, 0.05]); // Crimson RGB glow

    // Fast-forward beyond 10 seconds to end crisis
    sim.update(9.0, 0.3, 0.0);
    status = sim.getCrisisStatus();
    expect(status.isApexCrisis).toBe(false);
    expect(status.remainingSeconds).toBe(0);
  });

  it('causes civilians to evade predators within perception radius', () => {
    const sim = new PredatorSwarmSimulation({
      civilianPredatorEvasionRadius: 5.0,
      worldRadius: 20.0,
    });
    const civ = sim.getCivilians()[0];
    const pred = sim.getPredators()[0];

    // Place predator near civilian and active hunting
    pred.position = { x: civ.position.x + 1.0, y: civ.position.y, z: civ.position.z };
    pred.state = 'hunting';

    const oldPos = { ...civ.position };
    sim.update(0.1, 0.4, 0.2);

    expect(civ.state).toBe('evading');
    expect(civ.fearLevel).toBeGreaterThan(0);
    // Position should have changed in opposite direction of predator
    const movedX = civ.position.x - oldPos.x;
    expect(movedX).toBeLessThan(0); // moved away from positive x predator
  });

  it('causes predators to deflect around defensive structures', () => {
    const sim = new PredatorSwarmSimulation();
    const pred = sim.getPredators()[0];
    const struct = sim.getStructures()[0];

    // Place predator heading toward structure
    pred.position = { x: struct.position.x + 1.0, y: struct.position.y, z: struct.position.z };
    pred.state = 'hunting';
    pred.velocity = { x: -1.0, y: 0, z: 0 };

    sim.update(0.1, 0.3, 0.0);
    // Repulsion force should push velocity away from struct center
    expect(pred.velocity.x).toBeGreaterThan(-1.0);
  });
});
