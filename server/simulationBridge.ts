import * as dgram from 'dgram';
import { WebSocketServer, WebSocket } from 'ws';

export type CreatureCoords = [number, number, number, number, number];
// [x, y, z, state, hunger]

export interface BarrierData {
  id: string;
  type: string;
  position: [number, number, number];
  radius: number;
  health: number;
}

export interface SimulationTelemetry {
  populationDensity: number;
  societalStress: number;
  territoryCenter: [number, number, number];
  phaseCode: number;
  creatures: CreatureCoords[];
  barriers?: BarrierData[];
  isCrisis?: boolean;
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
    creatures: [
      [-2.0, 0.0, -1.5, 0, 0.2],
      [2.2, 0.5, 1.8, 1, 0.4],
      [0.0, -0.2, 3.0, 2, 0.8],
    ],
    barriers: [
      { id: 'barrier_repeat_1', type: 'grid_repetition', position: [-3.0, 0.0, -1.0], radius: 1.4, health: 80 },
      { id: 'barrier_intersect_1', type: 'barrier_intersection', position: [3.0, 0.0, 1.0], radius: 1.4, health: 80 },
    ],
    isCrisis: false,
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
          populationDensity: packet.density ?? this.latestTelemetry.populationDensity,
          societalStress: packet.stress ?? this.latestTelemetry.societalStress,
          territoryCenter: packet.center ?? this.latestTelemetry.territoryCenter,
          phaseCode: packet.phaseCode ?? 2.2,
          creatures: packet.creatures ?? this.latestTelemetry.creatures,
          barriers: packet.barriers ?? this.latestTelemetry.barriers,
          isCrisis: packet.isCrisis ?? this.latestTelemetry.isCrisis,
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
