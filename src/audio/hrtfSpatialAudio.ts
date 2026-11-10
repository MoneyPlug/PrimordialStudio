import type { Vector3D } from '../xr/webxrTelemetry';
import type { CreatureSDFParams } from '../sdf/creatureSdf';

export interface SpatialAudioConfig {
  panningModel: PanningModelType; // 'HRTF' or 'equalpower'
  distanceModel: DistanceModelType;
  refDistance: number;
  maxDistance: number;
  rolloffFactor: number;
}

export class HRTFSpatialAudioEngine {
  private ctx: AudioContext | null = null;
  private pannerNode: PannerNode | null = null;
  private gainNode: GainNode | null = null;
  private oscillatorNode: OscillatorNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private isRunning = false;

  private creaturePos: Vector3D = { x: 0, y: 1.5, z: -2.0 };
  private listenerPos: Vector3D = { x: 0, y: 1.65, z: 0 };
  private config: SpatialAudioConfig;

  constructor(config?: Partial<SpatialAudioConfig>) {
    this.config = {
      panningModel: 'HRTF',
      distanceModel: 'inverse',
      refDistance: 1,
      maxDistance: 1000,
      rolloffFactor: 1.5,
      ...config,
    };
  }

  public async initialize(): Promise<void> {
    if (this.ctx) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) {
      console.warn('Web Audio API not supported in this environment');
      return;
    }

    this.ctx = new AudioCtx();

    // Create 3D HRTF Panner Node
    this.pannerNode = this.ctx.createPanner();
    this.pannerNode.panningModel = this.config.panningModel;
    this.pannerNode.distanceModel = this.config.distanceModel;
    this.pannerNode.refDistance = this.config.refDistance;
    this.pannerNode.maxDistance = this.config.maxDistance;
    this.pannerNode.rolloffFactor = this.config.rolloffFactor;

    // Filter Node for creature frequency modulation
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 850;
    this.filterNode.Q.value = 4;

    // Gain control
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.value = 0.15;

    // Connect node graph: Source -> Filter -> Panner (HRTF) -> Master Gain -> Destination
    this.filterNode.connect(this.pannerNode);
    this.pannerNode.connect(this.gainNode);
    this.gainNode.connect(this.ctx.destination);

    // Initial position
    this.updateEmitterPosition(this.creaturePos);
    this.updateListenerPose(this.listenerPos, { x: 0, y: 0, z: -1 }, { x: 0, y: 1, z: 0 });
  }

  public startSound() {
    if (!this.ctx || this.isRunning) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.oscillatorNode = this.ctx.createOscillator();
    this.oscillatorNode.type = 'sawtooth';
    this.oscillatorNode.frequency.value = 110; // A2 hum

    if (this.filterNode) {
      this.oscillatorNode.connect(this.filterNode);
      this.oscillatorNode.start();
      this.isRunning = true;
    }
  }

  public stopSound() {
    if (this.oscillatorNode && this.isRunning) {
      this.oscillatorNode.stop();
      this.oscillatorNode.disconnect();
      this.oscillatorNode = null;
      this.isRunning = false;
    }
  }

  /**
   * Syncs creature SDF parameters into acoustic resonance (bioluminescence -> filter cut-off, pulse -> LFO pitch)
   */
  public syncWithCreatureState(params: CreatureSDFParams) {
    if (!this.ctx) return;

    if (this.oscillatorNode) {
      const baseFreq = 80 + params.gyroidFreq * 20;
      this.oscillatorNode.frequency.setTargetAtTime(baseFreq, this.ctx.currentTime, 0.05);
    }

    if (this.filterNode) {
      const cutoff = 300 + params.bioluminescence * 1500 + (1 - params.roughness) * 800;
      this.filterNode.frequency.setTargetAtTime(cutoff, this.ctx.currentTime, 0.05);
    }
  }

  /**
   * Update creature emitter 3D visual coordinates
   */
  public updateEmitterPosition(pos: Vector3D) {
    this.creaturePos = pos;
    if (!this.pannerNode || !this.ctx) return;

    if (this.pannerNode.positionX) {
      this.pannerNode.positionX.setTargetAtTime(pos.x, this.ctx.currentTime, 0.02);
      this.pannerNode.positionY.setTargetAtTime(pos.y, this.ctx.currentTime, 0.02);
      this.pannerNode.positionZ.setTargetAtTime(pos.z, this.ctx.currentTime, 0.02);
    } else {
      (this.pannerNode as any).setPosition(pos.x, pos.y, pos.z);
    }
  }

  /**
   * Update listener orientation and position from WebXR Head 6DoF Pose
   */
  public updateListenerPose(
    position: Vector3D,
    forward: Vector3D = { x: 0, y: 0, z: -1 },
    up: Vector3D = { x: 0, y: 1, z: 0 }
  ) {
    this.listenerPos = position;
    if (!this.ctx) return;
    const listener = this.ctx.listener;

    if (listener.positionX) {
      listener.positionX.setTargetAtTime(position.x, this.ctx.currentTime, 0.02);
      listener.positionY.setTargetAtTime(position.y, this.ctx.currentTime, 0.02);
      listener.positionZ.setTargetAtTime(position.z, this.ctx.currentTime, 0.02);
      listener.forwardX.setTargetAtTime(forward.x, this.ctx.currentTime, 0.02);
      listener.forwardY.setTargetAtTime(forward.y, this.ctx.currentTime, 0.02);
      listener.forwardZ.setTargetAtTime(forward.z, this.ctx.currentTime, 0.02);
      listener.upX.setTargetAtTime(up.x, this.ctx.currentTime, 0.02);
      listener.upY.setTargetAtTime(up.y, this.ctx.currentTime, 0.02);
      listener.upZ.setTargetAtTime(up.z, this.ctx.currentTime, 0.02);
    } else {
      (listener as any).setPosition(position.x, position.y, position.z);
      (listener as any).setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }

  public getSpatialState() {
    return {
      creaturePos: this.creaturePos,
      listenerPos: this.listenerPos,
      distance: Math.sqrt(
        Math.pow(this.creaturePos.x - this.listenerPos.x, 2) +
        Math.pow(this.creaturePos.y - this.listenerPos.y, 2) +
        Math.pow(this.creaturePos.z - this.listenerPos.z, 2)
      ),
      panningModel: this.config.panningModel,
      active: this.isRunning,
    };
  }
}
