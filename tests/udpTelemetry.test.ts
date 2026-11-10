import { describe, it, expect } from 'vitest';
import { formatUE5OscPacket, UE5TelemetryUdpBridge } from '../server/udpBridge';
import { WebXRTelemetryManager } from '../src/xr/webxrTelemetry';

describe('WebXR Telemetry & UE5 UDP Bridge', () => {
  it('formats OSC telemetry binary packets correctly for Unreal Engine 5', () => {
    const frame = {
      sequence: 101,
      head: {
        position: { x: 0.5, y: 1.7, z: -1.2 },
        rotation: { x: 0.1, y: 0.2, z: 0.05, w: 1 },
      },
      leftHand: { trigger: 0.8 },
      rightHand: { trigger: 0.3 },
    };

    const packet = formatUE5OscPacket(frame);

    expect(Buffer.isBuffer(packet)).toBe(true);
    expect(packet.length).toBeGreaterThan(32);
    // Address pattern begins with "/webxr/telemetry"
    expect(packet.toString('ascii')).toContain('/webxr/telemetry');
    expect(packet.toString('ascii')).toContain(',fffffffff');
  });

  it('runs WebXR 6DoF simulation loop without errors', () => {
    const manager = new WebXRTelemetryManager();
    let receivedFrame: any = null;

    const unsubscribe = manager.onFrame((frame) => {
      receivedFrame = frame;
    });

    manager.startSimulation();
    expect(typeof unsubscribe).toBe('function');
    manager.stopSession();
    unsubscribe();
  });

  it('initializes UDP Bridge instance with configurable ports', () => {
    const bridge = new UE5TelemetryUdpBridge({
      targetIp: '127.0.0.1',
      targetPort: 9999,
      wsPort: 9090,
    });

    const stats = bridge.getStats();
    expect(stats.target).toBe('127.0.0.1:9999');
    expect(stats.wsPort).toBe(9090);
    expect(stats.packetsSent).toBe(0);
    bridge.stop();
  });
});
