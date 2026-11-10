import * as THREE from 'three';

export interface StudioTelemetryData {
  populationDensity: number;
  societalStress: number;
  territoryCenter: number[];
  phaseCode?: number;
}

export class StudioTelemetryBinder {
  private ws: WebSocket | null = null;
  private material: THREE.ShaderMaterial;
  private fallbackInterval: any = null;

  constructor(material: THREE.ShaderMaterial, wsUrl = 'ws://localhost:8080') {
    this.material = material;
    this.initWebSocket(wsUrl);
  }

  private initWebSocket(wsUrl: string) {
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (event) => {
        try {
          const data: StudioTelemetryData = JSON.parse(event.data);
          this.updateUniforms(data);
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

      this.updateUniforms({
        populationDensity: density,
        societalStress: stress,
        territoryCenter: center,
      });
    }, 50);
  }

  public updateUniforms(data: {
    populationDensity: number;
    societalStress: number;
    territoryCenter: number[];
  }) {
    if (this.material.uniforms.u_density) {
      this.material.uniforms.u_density.value = data.populationDensity;
    }
    if (this.material.uniforms.u_stress) {
      this.material.uniforms.u_stress.value = data.societalStress;
    }
    if (this.material.uniforms.u_center) {
      this.material.uniforms.u_center.value.set(...data.territoryCenter);
    }
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
