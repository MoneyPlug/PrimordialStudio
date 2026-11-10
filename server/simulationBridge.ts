import * as dgram from 'dgram';
import { WebSocketServer, WebSocket } from 'ws';

export interface SimulationTelemetry {
  populationDensity: number;
  societalStress: number;
  territoryCenter: [number, number, number];
  phaseCode: number;
}

export class SimulationTelemetryBridge {
  private udpServer: dgram.Socket;
  private wss: WebSocketServer | null = null;
  private udpPort: number;
  private wsPort: number;
  private latestTelemetry: SimulationTelemetry = {
    populationDensity: 1.0,
    societalStress: 0.0,
    territoryCenter: [0.0, 0.0, 0.0],
    phaseCode: 2.2,
  };
  private syncInterval: any = null;

  constructor(udpPort = 9021, wsPort = 8080) {
    this.udpPort = udpPort;
    this.wsPort = wsPort;
    this.udpServer = dgram.createSocket('udp4');
  }

  public start() {
    this.udpServer.on('message', (msg) => {
      try {
        const packet = JSON.parse(msg.toString());
        this.latestTelemetry = {
          populationDensity: packet.density ?? 1.0,
          societalStress: packet.stress ?? 0.0,
          territoryCenter: packet.center ?? [0.0, 0.0, 0.0],
          phaseCode: 2.2,
        };
      } catch (err) {
        console.error('[Telemetry Bridge] Failed to parse UDP packet:', err);
      }
    });

    this.udpServer.bind(this.udpPort, () => {
      console.log(`[UDP Ingest] Listening for simulation packets on port ${this.udpPort}`);
    });

    this.wss = new WebSocketServer({ port: this.wsPort });
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('[Studio Bridge] Frontend client connected.');
      const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(this.latestTelemetry));
        }
      }, 16);

      ws.on('close', () => clearInterval(interval));
    });
  }

  public getLatestTelemetry(): SimulationTelemetry {
    return this.latestTelemetry;
  }

  public setTelemetry(data: Partial<SimulationTelemetry>) {
    this.latestTelemetry = {
      ...this.latestTelemetry,
      ...data,
    };
  }

  public stop(callback?: () => void) {
    if (this.syncInterval) clearInterval(this.syncInterval);
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
    this.udpServer.close(callback);
  }
}
