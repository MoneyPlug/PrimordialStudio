import { OllamaInferenceBridge, type ModelInferenceMetrics } from './ollamaBridge';

export interface ModelComparisonState {
  primaryModel: string;
  secondaryModel: string;
  primaryMetrics: ModelInferenceMetrics;
  secondaryMetrics: ModelInferenceMetrics;
  comparativeEntropy: number; // Combined / cross-entropy metric (0.0 - 1.0)
  entropyDivergence: number; // absolute difference between models
  averageLatencyMs: number;
  ecologicalEra: 'stable_era' | 'apex_crisis';
  isCrisisActive: boolean;
  crisisCountdown: number; // seconds remaining in 10-second timeline
}

export interface SimulationEventBus {
  onMacroPredatorAwakening: (event: {
    entropy: number;
    divergence: number;
    duration: number;
    timestamp: number;
  }) => void;
  onEcologicalEraChange: (era: 'stable_era' | 'apex_crisis') => void;
}

export class MultiModelInspector {
  private primaryBridge: OllamaInferenceBridge;
  private secondaryBridge: OllamaInferenceBridge;
  private primaryModel = 'llama3';
  private secondaryModel = 'mistral';
  private secondaryInterval: any = null;

  private state: ModelComparisonState = {
    primaryModel: 'llama3',
    secondaryModel: 'mistral',
    primaryMetrics: {
      prompt: '',
      tokenCount: 0,
      tokensPerSecond: 0,
      latencyMs: 85,
      entropy: 0.32,
      weightsDistribution: [0.4, 0.7, 0.3, 0.8, 0.5, 0.35, 0.65, 0.75],
      timestamp: Date.now(),
      status: 'idle',
      rawOutput: '',
    },
    secondaryMetrics: {
      prompt: '',
      tokenCount: 0,
      tokensPerSecond: 0,
      latencyMs: 95,
      entropy: 0.28,
      weightsDistribution: [0.35, 0.65, 0.4, 0.7, 0.55, 0.4, 0.6, 0.7],
      timestamp: Date.now(),
      status: 'idle',
      rawOutput: '',
    },
    comparativeEntropy: 0.30,
    entropyDivergence: 0.04,
    averageLatencyMs: 90,
    ecologicalEra: 'stable_era',
    isCrisisActive: false,
    crisisCountdown: 0,
  };

  private eventListeners: Partial<SimulationEventBus> = {};
  private stateListeners: Array<(state: ModelComparisonState) => void> = [];
  private crisisThreshold = 0.75; // Comparative entropy threshold that triggers Apex Crisis

  constructor(primaryEndpoint = 'http://localhost:11434', secondaryEndpoint = 'http://localhost:11434') {
    this.primaryBridge = new OllamaInferenceBridge(primaryEndpoint, this.primaryModel);
    this.secondaryBridge = new OllamaInferenceBridge(secondaryEndpoint, this.secondaryModel);
    this.startSecondarySimulatedDrift();
  }

  public setEventListeners(listeners: Partial<SimulationEventBus>) {
    this.eventListeners = { ...this.eventListeners, ...listeners };
  }

  public subscribe(listener: (state: ModelComparisonState) => void) {
    this.stateListeners.push(listener);
    listener(this.state);
    return () => {
      this.stateListeners = this.stateListeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.stateListeners) {
      listener(this.state);
    }
  }

  public getPrimaryBridge(): OllamaInferenceBridge {
    return this.primaryBridge;
  }

  public getSecondaryBridge(): OllamaInferenceBridge {
    return this.secondaryBridge;
  }

  public getState(): ModelComparisonState {
    return this.state;
  }

  public updatePrimaryMetrics(metrics: ModelInferenceMetrics) {
    this.state.primaryMetrics = metrics;
    this.recomputeComparativeState();
  }

  public updateSecondaryMetrics(metrics: ModelInferenceMetrics) {
    this.state.secondaryMetrics = metrics;
    this.recomputeComparativeState();
  }

  /**
   * Evaluates combined entropy and detects whether an Apex Crisis Macro-Predator Awakening Event
   * should be triggered across the simulation bus.
   */
  public recomputeComparativeState() {
    const e1 = this.state.primaryMetrics.entropy;
    const e2 = this.state.secondaryMetrics.entropy;
    const divergence = Math.abs(e1 - e2);

    // Cross entropy weight blending
    const comparativeEntropy = Math.min(1.0, Math.max(0.0, (e1 + e2) * 0.5 + divergence * 0.25));
    const avgLatency = (this.state.primaryMetrics.latencyMs + this.state.secondaryMetrics.latencyMs) / 2;

    this.state.comparativeEntropy = Math.round(comparativeEntropy * 100) / 100;
    this.state.entropyDivergence = Math.round(divergence * 100) / 100;
    this.state.averageLatencyMs = Math.round(avgLatency);

    // Check if entropy spikes over crisis threshold and not already in crisis
    if (this.state.comparativeEntropy >= this.crisisThreshold && !this.state.isCrisisActive) {
      this.triggerMacroPredatorAwakening(10);
    } else if (!this.state.isCrisisActive) {
      if (this.state.ecologicalEra !== 'stable_era') {
        this.state.ecologicalEra = 'stable_era';
        this.eventListeners.onEcologicalEraChange?.('stable_era');
      }
    }

    this.notify();
  }

  /**
   * Triggers the Macro-Predator Awakening Event across the simulation bus.
   * Shaders flare up with maximum bioluminescence, speeds scale up, and creatures hunt nodes
   * across the 10-second timeline.
   */
  public triggerMacroPredatorAwakening(duration = 10) {
    this.state.isCrisisActive = true;
    this.state.ecologicalEra = 'apex_crisis';
    this.state.crisisCountdown = duration;

    this.eventListeners.onMacroPredatorAwakening?.({
      entropy: this.state.comparativeEntropy,
      divergence: this.state.entropyDivergence,
      duration,
      timestamp: Date.now(),
    });
    this.eventListeners.onEcologicalEraChange?.('apex_crisis');

    this.notify();
  }

  public tickCountdown(dt: number) {
    if (this.state.isCrisisActive) {
      this.state.crisisCountdown = Math.max(0, this.state.crisisCountdown - dt);
      if (this.state.crisisCountdown <= 0) {
        this.state.isCrisisActive = false;
        this.state.crisisCountdown = 0;
        this.state.ecologicalEra = 'stable_era';
        this.eventListeners.onEcologicalEraChange?.('stable_era');
      }
      this.notify();
    }
  }

  /**
   * Injects an entropy spike manually for testing / live demonstrations
   */
  public injectEntropySpike(spikeLevel = 0.92) {
    this.state.primaryMetrics.entropy = spikeLevel;
    this.state.secondaryMetrics.entropy = Math.min(1.0, spikeLevel + 0.05);
    this.recomputeComparativeState();
  }

  /**
   * Resets entropy back to calm Stable Era
   */
  public resetToStableEra() {
    this.state.isCrisisActive = false;
    this.state.crisisCountdown = 0;
    this.state.ecologicalEra = 'stable_era';
    this.state.primaryMetrics.entropy = 0.28;
    this.state.secondaryMetrics.entropy = 0.24;
    this.recomputeComparativeState();
  }

  /**
   * Background drift simulation for the secondary comparative model stream
   */
  private startSecondarySimulatedDrift() {
    let t = 0;
    this.secondaryInterval = setInterval(() => {
      t += 0.1;
      if (this.state.secondaryMetrics.status === 'generating') return;

      const baseEntropy = this.state.isCrisisActive ? 0.82 : 0.25;
      const wave = Math.sin(t * 0.4) * 0.08;
      const entropy = Math.min(1.0, Math.max(0.1, baseEntropy + wave));

      const weights = this.state.secondaryMetrics.weightsDistribution.map((w, idx) =>
        Math.max(0.1, Math.min(0.9, w + Math.sin(t * 0.5 + idx) * 0.04))
      );

      this.state.secondaryMetrics = {
        ...this.state.secondaryMetrics,
        entropy: Math.round(entropy * 100) / 100,
        weightsDistribution: weights,
        latencyMs: 80 + Math.round(Math.abs(Math.sin(t * 0.3)) * 40),
        tokensPerSecond: 28.5 + Math.round(Math.cos(t * 0.2) * 5),
        timestamp: Date.now(),
      };

      if (!this.state.isCrisisActive) {
        this.recomputeComparativeState();
      }
    }, 400);
  }

  public dispose() {
    if (this.secondaryInterval) {
      clearInterval(this.secondaryInterval);
      this.secondaryInterval = null;
    }
    this.primaryBridge.abort();
    this.secondaryBridge.abort();
  }
}
