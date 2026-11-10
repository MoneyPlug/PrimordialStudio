import dgram from 'dgram';
import { WebSocketServer, WebSocket } from 'ws';

export interface UE5TelemetryPacketConfig {
  targetIp: string;
  targetPort: number; // default Unreal Engine 5 LiveLink / OSC port 8000
  wsPort: number; // default WebSocket relay port 8080
}

/**
 * Formats WebXR Telemetry 6DoF data into an Unreal Engine 5 compatible OSC/Binary Telemetry packet.
 * OSC Packet Format:
 * Address: "/webxr/pose"
 * Types: ",ffffffffff" (10 floats: timestamp, head_pos(x,y,z), head_rot(pitch,yaw,roll), left_grip, right_grip, latency)
 */
export function formatUE5OscPacket(frame: any): Buffer {
  const address = '/webxr/telemetry\0';
  const typeTag = ',fffffffff\0\0\0'; // 9 floats

  // Unreal Engine uses centimeter coordinates (x100) and Left-Handed Z-Up
  const ueX = (frame.head?.position?.x || 0) * 100;
  const ueY = (frame.head?.position?.z || 0) * 100; // Unity/GL Z -> UE Y
  const ueZ = (frame.head?.position?.y || 0) * 100; // GL Y -> UE Z (Up)

  const uePitch = (frame.head?.rotation?.x || 0) * (180 / Math.PI);
  const ueYaw = (frame.head?.rotation?.y || 0) * (180 / Math.PI);
  const ueRoll = (frame.head?.rotation?.z || 0) * (180 / Math.PI);

  const leftTrigger = frame.leftHand?.trigger || 0;
  const rightTrigger = frame.rightHand?.trigger || 0;
  const seq = frame.sequence || 0;

  const addrBuf = Buffer.from(address);
  // Pad address to multiple of 4 bytes
  const addrPadLen = (4 - (addrBuf.length % 4)) % 4;
  const addrPadded = Buffer.concat([addrBuf, Buffer.alloc(addrPadLen)]);

  const tagBuf = Buffer.from(typeTag);
  const tagPadLen = (4 - (tagBuf.length % 4)) % 4;
  const tagPadded = Buffer.concat([tagBuf, Buffer.alloc(tagPadLen)]);

  const dataBuf = Buffer.alloc(9 * 4);
  dataBuf.writeFloatBE(seq, 0);
  dataBuf.writeFloatBE(ueX, 4);
  dataBuf.writeFloatBE(ueY, 8);
  dataBuf.writeFloatBE(ueZ, 12);
  dataBuf.writeFloatBE(uePitch, 16);
  dataBuf.writeFloatBE(ueYaw, 20);
  dataBuf.writeFloatBE(ueRoll, 24);
  dataBuf.writeFloatBE(leftTrigger, 28);
  dataBuf.writeFloatBE(rightTrigger, 32);

  return Buffer.concat([addrPadded, tagPadded, dataBuf]);
}

export class UE5TelemetryUdpBridge {
  private udpSocket: dgram.Socket;
  private wsServer: WebSocketServer | null = null;
  private targetIp: string;
  private targetPort: number;
  private wsPort: number;
  private packetsSent = 0;

  constructor(config: Partial<UE5TelemetryPacketConfig> = {}) {
    this.targetIp = config.targetIp || '127.0.0.1';
    this.targetPort = config.targetPort || 8000;
    this.wsPort = config.wsPort || 8080;
    this.udpSocket = dgram.createSocket('udp4');
  }

  public start() {
    this.wsServer = new WebSocketServer({ port: this.wsPort });

    this.wsServer.on('connection', (ws: WebSocket) => {
      ws.on('message', (message: string) => {
        try {
          const frame = JSON.parse(message.toString());
          this.sendTelemetryToUE5(frame);
        } catch {
          // invalid JSON frame
        }
      });
    });

    console.log(`[UE5 UDP Bridge] Listening on WS port ${this.wsPort}, streaming UDP to ${this.targetIp}:${this.targetPort}`);
  }

  public sendTelemetryToUE5(frame: any, callback?: (err: Error | null, bytes?: number) => void) {
    const packet = formatUE5OscPacket(frame);
    this.udpSocket.send(packet, 0, packet.length, this.targetPort, this.targetIp, (err, bytes) => {
      if (!err) this.packetsSent++;
      if (callback) callback(err, bytes);
    });
  }

  public getStats() {
    return {
      target: `${this.targetIp}:${this.targetPort}`,
      packetsSent: this.packetsSent,
      wsPort: this.wsPort,
    };
  }

  public stop(callback?: () => void) {
    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = null;
    }
    this.udpSocket.close(callback);
  }
}
