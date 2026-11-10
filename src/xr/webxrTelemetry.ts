export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion4D {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform6DoF {
  position: Vector3D;
  rotation: Quaternion4D;
  linearVelocity?: Vector3D;
  angularVelocity?: Vector3D;
}

export interface WebXRTelemetryFrame {
  timestamp: number;
  sequence: number;
  sessionState: 'inactive' | 'presenting' | 'simulated';
  head: Transform6DoF;
  leftHand: Transform6DoF & { trigger: number; grip: number; primaryButton: boolean };
  rightHand: Transform6DoF & { trigger: number; grip: number; primaryButton: boolean };
  fov: number;
  userIPD: number;
}

export class WebXRTelemetryManager {
  private xrSession: any = null;
  private sequenceNumber = 0;
  private listeners: ((frame: WebXRTelemetryFrame) => void)[] = [];
  private animFrameId: number | null = null;
  private lastTime = performance.now();
  private wsConnection: WebSocket | null = null;

  constructor() {}

  public onFrame(callback: (frame: WebXRTelemetryFrame) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  public connectUdpBridgeWebSocket(wsUrl = 'ws://localhost:8080') {
    try {
      this.wsConnection = new WebSocket(wsUrl);
      this.wsConnection.onopen = () => {
        console.log('[WebXR] Connected to Telemetry UDP Bridge WebSocket');
      };
      this.wsConnection.onerror = () => {
        console.warn('[WebXR] UDP Bridge WS offline. Local telemetry active.');
      };
    } catch {
      // WS offline
    }
  }

  public async startSession(): Promise<boolean> {
    if ('xr' in navigator && (navigator as any).xr) {
      try {
        const isSupported = await (navigator as any).xr.isSessionSupported('immersive-vr');
        if (isSupported) {
          const session = await (navigator as any).xr.requestSession('immersive-vr', {
            optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
          });
          this.xrSession = session;
          this.startXRLoop();
          return true;
        }
      } catch (err) {
        console.warn('Native WebXR session not available, starting high-fidelity 6DoF simulation.', err);
      }
    }

    this.startSimulation();
    return false;
  }

  public stopSession() {
    if (this.xrSession) {
      this.xrSession.end();
      this.xrSession = null;
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private startXRLoop() {
    const onFrame = (_time: number, frame: any) => {
      if (!this.xrSession) return;
      const refSpace = frame.session.requestReferenceSpace ? 'local-floor' : 'viewer';

      const viewerPose = frame.getViewerPose(refSpace);
      if (viewerPose) {
        const headPos = viewerPose.transform.position;
        const headRot = viewerPose.transform.orientation;

        const telemetry = this.createTelemetryFrame({
          head: {
            position: { x: headPos.x, y: headPos.y, z: headPos.z },
            rotation: { x: headRot.x, y: headRot.y, z: headRot.z, w: headRot.w },
          },
          sessionState: 'presenting',
        });
        this.broadcastFrame(telemetry);
      }
      this.xrSession.requestAnimationFrame(onFrame);
    };
    this.xrSession.requestAnimationFrame(onFrame);
  }

  public startSimulation() {
    let t = 0;

    const loop = () => {
      const now = performance.now();
      const dt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      t += dt;

      const headX = Math.sin(t * 0.8) * 0.35 + Math.cos(t * 2.1) * 0.05;
      const headY = 1.65 + Math.cos(t * 1.2) * 0.12;
      const headZ = -1.2 + Math.sin(t * 0.5) * 0.4;

      const pitch = Math.sin(t * 0.7) * 0.1;
      const yaw = Math.cos(t * 0.6) * 0.2;
      const roll = Math.sin(t * 1.5) * 0.03;

      const leftX = headX - 0.28 + Math.sin(t * 1.4) * 0.15;
      const leftY = headY - 0.35 + Math.cos(t * 1.8) * 0.12;
      const leftZ = headZ + 0.45 + Math.sin(t * 1.1) * 0.1;

      const rightX = headX + 0.28 + Math.cos(t * 1.5) * 0.18;
      const rightY = headY - 0.3 + Math.sin(t * 1.9) * 0.15;
      const rightZ = headZ + 0.5 + Math.cos(t * 1.2) * 0.1;

      const telemetry: WebXRTelemetryFrame = {
        timestamp: Math.round(now),
        sequence: this.sequenceNumber++,
        sessionState: 'simulated',
        head: {
          position: { x: round3(headX), y: round3(headY), z: round3(headZ) },
          rotation: { x: round3(pitch), y: round3(yaw), z: round3(roll), w: 1.0 },
          linearVelocity: { x: round3(Math.cos(t * 0.8) * 0.28), y: 0, z: round3(Math.cos(t * 0.5) * 0.2) },
        },
        leftHand: {
          position: { x: round3(leftX), y: round3(leftY), z: round3(leftZ) },
          rotation: { x: 0, y: round3(yaw), z: 0, w: 1.0 },
          trigger: (Math.sin(t * 2.0) + 1) * 0.5,
          grip: (Math.cos(t * 1.5) + 1) * 0.5,
          primaryButton: Math.sin(t * 3.0) > 0.8,
        },
        rightHand: {
          position: { x: round3(rightX), y: round3(rightY), z: round3(rightZ) },
          rotation: { x: 0, y: round3(yaw), z: 0, w: 1.0 },
          trigger: (Math.sin(t * 2.5) + 1) * 0.5,
          grip: (Math.cos(t * 2.0) + 1) * 0.5,
          primaryButton: false,
        },
        fov: 110.0,
        userIPD: 0.064,
      };

      this.broadcastFrame(telemetry);
      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private createTelemetryFrame(partial: Partial<WebXRTelemetryFrame>): WebXRTelemetryFrame {
    return {
      timestamp: Date.now(),
      sequence: this.sequenceNumber++,
      sessionState: partial.sessionState || 'presenting',
      head: partial.head || { position: { x: 0, y: 1.65, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } },
      leftHand: partial.leftHand || { position: { x: -0.25, y: 1.2, z: -0.4 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, trigger: 0, grip: 0, primaryButton: false },
      rightHand: partial.rightHand || { position: { x: 0.25, y: 1.2, z: -0.4 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, trigger: 0, grip: 0, primaryButton: false },
      fov: 110.0,
      userIPD: 0.064,
    };
  }

  private broadcastFrame(frame: WebXRTelemetryFrame) {
    for (const listener of this.listeners) {
      listener(frame);
    }
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify(frame));
    }
  }
}

function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}
