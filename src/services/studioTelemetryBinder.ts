import * as THREE from 'three';

export type CreatureCoordinate = [number, number, number, number, number];
// [x, y, z, state, hunger]

export interface BarrierInfo {
  id: string;
  type: string;
  position: [number, number, number];
  radius: number;
  health: number;
}

export interface StudioTelemetryData {
  populationDensity: number;
  societalStress: number;
  territoryCenter: number[];
  phaseCode?: number;
  creatures?: CreatureCoordinate[];
  barriers?: BarrierInfo[];
  isCrisis?: boolean;
}

export class StudioTelemetryBinder {
  private ws: WebSocket | null = null;
  private material: THREE.ShaderMaterial;
  private fallbackInterval: any = null;
  private latestCreatures: CreatureCoordinate[] = [];
  private onTelemetryUpdate?: (data: StudioTelemetryData) => void;

  constructor(
    material: THREE.ShaderMaterial,
    wsUrl = 'ws://localhost:8080',
    onTelemetryUpdate?: (data: StudioTelemetryData) => void
  ) {
    this.material = material;
    this.onTelemetryUpdate = onTelemetryUpdate;
    this.initWebSocket(wsUrl);
  }

  private initWebSocket(wsUrl: string) {
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (event) => {
        try {
          const data: StudioTelemetryData = JSON.parse(event.data);
          this.updateUniforms(data);
          this.onTelemetryUpdate?.(data);
        } catch {
          // ignore parsing error
        }
      };

      this.ws.onerror = () => {
        this.startFallbackSimulation();
      };

      this.ws.onclose = () => {
        this.startFallbackSimulation();
      };
    } catch {
      this.startFallbackSimulation();
    }
  }

  private startFallbackSimulation() {
    if (this.fallbackInterval) return;
    let t = 0;
    this.fallbackInterval = setInterval(() => {
      t += 0.05;
      const density = 1.0 + Math.sin(t * 0.7) * 0.5;
      const stress = (Math.sin(t * 1.2) + 1.0) * 0.4;
      const center = [Math.sin(t * 0.5) * 0.3, Math.cos(t * 0.6) * 0.2, 0.0];

      // Simulated mobile creature coordinates: [x, y, z, state, hunger]
      const creatures: CreatureCoordinate[] = [
        [
          Math.sin(t * 0.8) * 3.5,
          Math.sin(t * 1.2) * 0.5,
          Math.cos(t * 0.8) * 3.5,
          stress > 0.6 ? 2 : 1,
          0.3 + Math.sin(t * 0.4) * 0.2,
        ],
        [
          Math.cos(t * 0.6) * 4.0,
          Math.cos(t * 1.0) * 0.4,
          Math.sin(t * 0.6) * 4.0,
          stress > 0.7 ? 3 : 0,
          0.5,
        ],
        [
          Math.sin(t * 0.4 + 2.0) * 3.0,
          0.2,
          Math.cos(t * 0.4 + 2.0) * 3.0,
          1,
          0.4,
        ],
      ];

      const data: StudioTelemetryData = {
        populationDensity: density,
        societalStress: stress,
        territoryCenter: center,
        creatures,
        isCrisis: stress > 0.75,
      };

      this.updateUniforms(data);
      this.onTelemetryUpdate?.(data);
    }, 50);
  }

  public updateUniforms(data: StudioTelemetryData) {
    if (this.material.uniforms.u_density) {
      this.material.uniforms.u_density.value = data.populationDensity;
    }
    if (this.material.uniforms.u_stress) {
      this.material.uniforms.u_stress.value = data.societalStress;
    }
    if (this.material.uniforms.u_center) {
      this.material.uniforms.u_center.value.set(...data.territoryCenter);
    }

    if (data.creatures && data.creatures.length > 0) {
      this.latestCreatures = data.creatures;

      // Pack creature coordinates into uniform array u_predatorCoords if uniform exists
      if (this.material.uniforms.u_predatorCoords) {
        const uniformArray: THREE.Vector4[] = this.material.uniforms.u_predatorCoords.value;
        data.creatures.slice(0, 4).forEach((c, idx) => {
          if (uniformArray[idx]) {
            uniformArray[idx].set(c[0], c[1], c[2], c[3]); // x, y, z, state
          }
        });
      }

      if (this.material.uniforms.u_predatorCount) {
        this.material.uniforms.u_predatorCount.value = Math.min(4, data.creatures.length);
      }
    }
  }

  public getLatestCreatures(): CreatureCoordinate[] {
    return this.latestCreatures;
  }

  public setStreamedCreatures(creatures: CreatureCoordinate[]) {
    this.latestCreatures = creatures;
    this.updateUniforms({
      populationDensity: 1.0,
      societalStress: 0.0,
      territoryCenter: [0, 0, 0],
      creatures,
    });
  }

  public dispose() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
  }
}
