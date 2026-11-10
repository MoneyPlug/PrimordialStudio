export type AgentState = 'dormant' | 'docile' | 'hunting' | 'attacking' | 'evading' | 'foraging';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface CivilianAgent {
  id: string;
  position: Vector3;
  velocity: Vector3;
  state: 'foraging' | 'evading';
  fearLevel: number;
  energy: number;
}

export interface PredatorAgent {
  id: string;
  position: Vector3;
  velocity: Vector3;
  state: 'dormant' | 'docile' | 'hunting' | 'attacking';
  hunger: number; // 0.0 (satiated) to 1.0 (starving)
  targetCivilianId: string | null;
  targetNodeId: string | null;
  bodyRadius: number;
  tentacleCount: number;
  glowColor: [number, number, number];
}

export interface CivilizationStructure {
  id: string;
  type: 'grid_repetition' | 'barrier_intersection' | 'citadel_core';
  position: Vector3;
  radius: number;
  health: number;
  maxHealth: number;
  period?: number;
}

export type CreatureCoordinateTuple = [number, number, number, number, number];
// [x, y, z, stateCode (0=dormant, 1=docile, 2=hunting, 3=attacking), hunger]

export interface SwarmSimulationConfig {
  worldRadius: number;
  civilianSpeed: number;
  civilianPerceptionRadius: number;
  civilianSeparationRadius: number;
  civilianPredatorEvasionRadius: number;
  predatorBaseSpeed: number;
  predatorHuntSpeed: number;
  predatorPerceptionRadius: number;
  separationWeight: number;
  alignmentWeight: number;
  cohesionWeight: number;
  evasionWeight: number;
  pursuitWeight: number;
  barrierRepelWeight: number;
}

export const DEFAULT_SWARM_CONFIG: SwarmSimulationConfig = {
  worldRadius: 8.0,
  civilianSpeed: 1.4,
  civilianPerceptionRadius: 3.0,
  civilianSeparationRadius: 1.0,
  civilianPredatorEvasionRadius: 4.5,
  predatorBaseSpeed: 0.8,
  predatorHuntSpeed: 2.5,
  predatorPerceptionRadius: 7.0,
  separationWeight: 1.5,
  alignmentWeight: 1.0,
  cohesionWeight: 1.1,
  evasionWeight: 3.0,
  pursuitWeight: 2.2,
  barrierRepelWeight: 4.0,
};

export class PredatorSwarmSimulation {
  private civilians: CivilianAgent[] = [];
  private predators: PredatorAgent[] = [];
  private structures: CivilizationStructure[] = [];
  private config: SwarmSimulationConfig;

  // Crisis state
  private isApexCrisis = false;
  private crisisRemainingSeconds = 0;
  private crisisTotalDuration = 10;
  private crisisListeners: Array<(isCrisis: boolean, remaining: number) => void> = [];

  constructor(config: Partial<SwarmSimulationConfig> = {}) {
    this.config = { ...DEFAULT_SWARM_CONFIG, ...config };
    this.initializeDefaultPopulation();
  }

  public initializeDefaultPopulation(civCount = 18, predCount = 3) {
    this.civilians = [];
    this.predators = [];
    this.structures = [];

    // Initialize Civilization Structures (Safe Zones)
    this.structures.push({
      id: 'citadel_core',
      type: 'citadel_core',
      position: { x: 0, y: 0, z: 0 },
      radius: 1.8,
      health: 100,
      maxHealth: 100,
    });
    this.structures.push({
      id: 'barrier_repeat_1',
      type: 'grid_repetition',
      position: { x: -3.0, y: 0, z: -1.0 },
      radius: 1.4,
      health: 80,
      maxHealth: 80,
      period: 2.5,
    });
    this.structures.push({
      id: 'barrier_intersect_1',
      type: 'barrier_intersection',
      position: { x: 3.0, y: 0, z: 1.0 },
      radius: 1.4,
      health: 80,
      maxHealth: 80,
    });

    // Populate Civilians around safe zones
    for (let i = 0; i < civCount; i++) {
      const angle = (i / civCount) * Math.PI * 2;
      const dist = 1.0 + Math.random() * 2.5;
      this.civilians.push({
        id: `civ_${i}`,
        position: {
          x: Math.cos(angle) * dist,
          y: (Math.random() - 0.5) * 0.8,
          z: Math.sin(angle) * dist,
        },
        velocity: {
          x: (Math.random() - 0.5) * 0.5,
          y: (Math.random() - 0.5) * 0.1,
          z: (Math.random() - 0.5) * 0.5,
        },
        state: 'foraging',
        fearLevel: 0,
        energy: 1.0,
      });
    }

    // Populate Predators at perimeter
    for (let i = 0; i < predCount; i++) {
      const angle = (i / predCount) * Math.PI * 2 + 0.5;
      const dist = 4.5 + Math.random() * 1.5;
      this.predators.push({
        id: `pred_${i}`,
        position: {
          x: Math.cos(angle) * dist,
          y: (Math.random() - 0.5) * 1.0,
          z: Math.sin(angle) * dist,
        },
        velocity: {
          x: (Math.random() - 0.5) * 0.3,
          y: 0,
          z: (Math.random() - 0.5) * 0.3,
        },
        state: 'dormant',
        hunger: 0.2 + Math.random() * 0.3,
        targetCivilianId: null,
        targetNodeId: null,
        bodyRadius: 0.6,
        tentacleCount: 4,
        glowColor: [0.1, 0.7, 0.9],
      });
    }
  }

  /**
   * Main behavior simulation tick
   * @param dt delta time in seconds
   * @param entropy current system entropy (0.0 to 1.0)
   * @param societalStress current societal stress (0.0 to 1.0)
   */
  public update(dt: number, entropy = 0.3, societalStress = 0.0) {
    this.updateCrisisTimer(dt);

    // 1. Update Civilian Flocking & Evasion
    this.updateCivilians(dt);

    // 2. Update Predator Pursuit, Interception & State Transitions
    this.updatePredators(dt, entropy, societalStress);

    // 3. Update Civilization Structure construction / repair during Stable Era
    this.updateStructures(dt);
  }

  private updateCrisisTimer(dt: number) {
    if (this.isApexCrisis) {
      this.crisisRemainingSeconds = Math.max(0, this.crisisRemainingSeconds - dt);
      if (this.crisisRemainingSeconds <= 0) {
        this.isApexCrisis = false;
        this.crisisRemainingSeconds = 0;
        this.notifyCrisisListeners();
      }
    }
  }

  public triggerApexCrisis(duration = 10) {
    this.isApexCrisis = true;
    this.crisisTotalDuration = duration;
    this.crisisRemainingSeconds = duration;
    this.notifyCrisisListeners();
  }

  public endApexCrisis() {
    this.isApexCrisis = false;
    this.crisisRemainingSeconds = 0;
    this.notifyCrisisListeners();
  }

  public onCrisisStateChange(listener: (isCrisis: boolean, remaining: number) => void) {
    this.crisisListeners.push(listener);
    return () => {
      this.crisisListeners = this.crisisListeners.filter((l) => l !== listener);
    };
  }

  private notifyCrisisListeners() {
    for (const listener of this.crisisListeners) {
      listener(this.isApexCrisis, this.crisisRemainingSeconds);
    }
  }

  public getCrisisStatus() {
    return {
      isApexCrisis: this.isApexCrisis,
      remainingSeconds: Math.round(this.crisisRemainingSeconds * 10) / 10,
      totalDuration: this.crisisTotalDuration,
      progress: this.isApexCrisis
        ? Math.max(0, Math.min(1, 1 - this.crisisRemainingSeconds / this.crisisTotalDuration))
        : 0,
    };
  }

  /**
   * Updates civilian agent behaviors:
   * 1. Boids flocking (separation, alignment, cohesion)
   * 2. Predator evasion vector
   * 3. Safe zone attraction
   */
  private updateCivilians(dt: number) {
    for (const civ of this.civilians) {
      const sep = { x: 0, y: 0, z: 0 };
      const ali = { x: 0, y: 0, z: 0 };
      const coh = { x: 0, y: 0, z: 0 };
      let neighborCount = 0;

      // 1. Flocking with other civilians
      for (const other of this.civilians) {
        if (other.id === civ.id) continue;
        const dx = other.position.x - civ.position.x;
        const dy = other.position.y - civ.position.y;
        const dz = other.position.z - civ.position.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);

        if (dist > 0 && dist < this.config.civilianPerceptionRadius) {
          neighborCount++;
          // Alignment
          ali.x += other.velocity.x;
          ali.y += other.velocity.y;
          ali.z += other.velocity.z;

          // Cohesion
          coh.x += other.position.x;
          coh.y += other.position.y;
          coh.z += other.position.z;

          // Separation
          if (dist < this.config.civilianSeparationRadius) {
            const force = (this.config.civilianSeparationRadius - dist) / dist;
            sep.x -= dx * force;
            sep.y -= dy * force;
            sep.z -= dz * force;
          }
        }
      }

      if (neighborCount > 0) {
        ali.x /= neighborCount;
        ali.y /= neighborCount;
        ali.z /= neighborCount;

        coh.x = coh.x / neighborCount - civ.position.x;
        coh.y = coh.y / neighborCount - civ.position.y;
        coh.z = coh.z / neighborCount - civ.position.z;
      }

      // 2. Predator Evasion Vector
      const evasion = { x: 0, y: 0, z: 0 };
      let closestPredDist = Infinity;

      for (const pred of this.predators) {
        if (pred.state === 'dormant') continue;

        const pdx = pred.position.x - civ.position.x;
        const pdy = pred.position.y - civ.position.y;
        const pdz = pred.position.z - civ.position.z;
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy + pdz * pdz);

        if (pdist < closestPredDist) closestPredDist = pdist;

        if (pdist > 0 && pdist < this.config.civilianPredatorEvasionRadius) {
          const repelWeight = (this.config.civilianPredatorEvasionRadius - pdist) / pdist;
          evasion.x -= pdx * repelWeight;
          evasion.y -= pdy * repelWeight;
          evasion.z -= pdz * repelWeight;
        }
      }

      // Fear factor scales with proximity of active predators
      if (closestPredDist < this.config.civilianPredatorEvasionRadius) {
        civ.state = 'evading';
        civ.fearLevel = Math.min(1.0, (this.config.civilianPredatorEvasionRadius - closestPredDist) / this.config.civilianPredatorEvasionRadius);
      } else {
        civ.state = 'foraging';
        civ.fearLevel = Math.max(0.0, civ.fearLevel - dt * 0.5);
      }

      // 3. Safe zone attraction when fearful
      const safeZoneForce = { x: 0, y: 0, z: 0 };
      if (civ.fearLevel > 0.3) {
        const primaryCitadel = this.structures[0];
        if (primaryCitadel && primaryCitadel.health > 0) {
          const cdx = primaryCitadel.position.x - civ.position.x;
          const cdy = primaryCitadel.position.y - civ.position.y;
          const cdz = primaryCitadel.position.z - civ.position.z;
          safeZoneForce.x = cdx * 0.8;
          safeZoneForce.y = cdy * 0.8;
          safeZoneForce.z = cdz * 0.8;
        }
      }

      // Combine civilian forces
      const accelX =
        sep.x * this.config.separationWeight +
        ali.x * this.config.alignmentWeight +
        coh.x * this.config.cohesionWeight +
        evasion.x * this.config.evasionWeight +
        safeZoneForce.x;
      const accelY =
        sep.y * this.config.separationWeight +
        ali.y * this.config.alignmentWeight +
        coh.y * this.config.cohesionWeight +
        evasion.y * this.config.evasionWeight +
        safeZoneForce.y;
      const accelZ =
        sep.z * this.config.separationWeight +
        ali.z * this.config.alignmentWeight +
        coh.z * this.config.cohesionWeight +
        evasion.z * this.config.evasionWeight +
        safeZoneForce.z;

      civ.velocity.x += accelX * dt;
      civ.velocity.y += accelY * dt;
      civ.velocity.z += accelZ * dt;

      // Limit speed
      const targetMaxSpeed = civ.state === 'evading'
        ? this.config.civilianSpeed * 1.6
        : this.config.civilianSpeed;
      const currentSpeed = Math.sqrt(
        civ.velocity.x * civ.velocity.x +
        civ.velocity.y * civ.velocity.y +
        civ.velocity.z * civ.velocity.z
      );
      if (currentSpeed > targetMaxSpeed) {
        civ.velocity.x = (civ.velocity.x / currentSpeed) * targetMaxSpeed;
        civ.velocity.y = (civ.velocity.y / currentSpeed) * targetMaxSpeed;
        civ.velocity.z = (civ.velocity.z / currentSpeed) * targetMaxSpeed;
      }

      civ.position.x += civ.velocity.x * dt;
      civ.position.y += civ.velocity.y * dt;
      civ.position.z += civ.velocity.z * dt;

      // Soft boundary clamp
      this.clampToWorldBounds(civ.position, this.config.worldRadius);
    }
  }

  /**
   * Updates predator behaviors:
   * 1. Target identification (highest density civilian clusters or civilization nodes)
   * 2. Interception trajectory & pursuit
   * 3. Defensive barrier deflection (deflected by territorial safe zones)
   * 4. Morphological scaling from model entropy & latency
   */
  private updatePredators(dt: number, entropy: number, societalStress: number) {
    const isCrisis = this.isApexCrisis;

    for (const pred of this.predators) {
      // Hunger accumulation
      pred.hunger = Math.min(1.0, pred.hunger + dt * 0.015);

      // State determination:
      // In Stable Era (low entropy / low stress), predators remain dormant or docile background fauna
      if (!isCrisis && entropy < 0.45 && societalStress < 0.4) {
        pred.state = pred.hunger > 0.85 ? 'docile' : 'dormant';
      } else {
        pred.state = isCrisis || pred.hunger > 0.4 ? 'hunting' : 'docile';
      }

      // Morphological scaling via telemetry & societal stress
      this.applyMorphologicalScaling(pred, entropy, societalStress, isCrisis);

      if (pred.state === 'dormant') {
        // Slow idling drift
        pred.velocity.x *= 0.95;
        pred.velocity.y *= 0.95;
        pred.velocity.z *= 0.95;
        pred.position.x += pred.velocity.x * dt;
        pred.position.y += pred.velocity.y * dt;
        pred.position.z += pred.velocity.z * dt;
        continue;
      }

      // Find best target:
      // If hunting during Apex Crisis, target structural weak points or dense civilian clusters
      let targetPos: Vector3 | null = null;

      if (isCrisis && this.structures.length > 0) {
        // Target structural nodes / barriers
        const targetStructure = this.findVulnerableStructure(pred.position);
        if (targetStructure) {
          targetPos = targetStructure.position;
          pred.targetNodeId = targetStructure.id;
        }
      }

      if (!targetPos) {
        // Target high-density cluster of civilians
        const clusterTarget = this.findCivilianClusterTarget(pred.position);
        if (clusterTarget) {
          targetPos = clusterTarget;
        }
      }

      const pursuit = { x: 0, y: 0, z: 0 };
      if (targetPos) {
        const tdx = targetPos.x - pred.position.x;
        const tdy = targetPos.y - pred.position.y;
        const tdz = targetPos.z - pred.position.z;
        const tdist = Math.sqrt(tdx * tdx + tdy * tdy + tdz * tdz);

        if (tdist > 0.2) {
          pursuit.x = (tdx / tdist) * this.config.pursuitWeight;
          pursuit.y = (tdy / tdist) * this.config.pursuitWeight;
          pursuit.z = (tdz / tdist) * this.config.pursuitWeight;
        }

        // Check if attacking
        if (tdist < 0.8) {
          pred.state = 'attacking';
          if (pred.targetNodeId) {
            this.damageStructure(pred.targetNodeId, dt * 15);
          }
        }
      }

      // Territorial Safe Zone Deflection:
      // Safe zones act as raymarching barriers, forcing predators to reroute unless barrier is destroyed
      const barrierRepel = this.calculateBarrierDeflection(pred.position);

      const speedLimit = isCrisis
        ? this.config.predatorHuntSpeed * 1.5
        : pred.state === 'hunting'
        ? this.config.predatorHuntSpeed
        : this.config.predatorBaseSpeed;

      pred.velocity.x += (pursuit.x + barrierRepel.x) * dt;
      pred.velocity.y += (pursuit.y + barrierRepel.y) * dt;
      pred.velocity.z += (pursuit.z + barrierRepel.z) * dt;

      const pSpeed = Math.sqrt(
        pred.velocity.x * pred.velocity.x +
        pred.velocity.y * pred.velocity.y +
        pred.velocity.z * pred.velocity.z
      );
      if (pSpeed > speedLimit) {
        pred.velocity.x = (pred.velocity.x / pSpeed) * speedLimit;
        pred.velocity.y = (pred.velocity.y / pSpeed) * speedLimit;
        pred.velocity.z = (pred.velocity.z / pSpeed) * speedLimit;
      }

      pred.position.x += pred.velocity.x * dt;
      pred.position.y += pred.velocity.y * dt;
      pred.position.z += pred.velocity.z * dt;

      this.clampToWorldBounds(pred.position, this.config.worldRadius);
    }
  }

  /**
   * Scales predator physical morphology from token entropy & societal stress
   */
  private applyMorphologicalScaling(
    pred: PredatorAgent,
    entropy: number,
    societalStress: number,
    isCrisis: boolean
  ) {
    const stressFactor = Math.max(entropy, societalStress);

    if (isCrisis) {
      // Apex Crisis: mutate into massive high-alert crimson leviathan
      pred.bodyRadius = 1.1 + stressFactor * 0.5;
      pred.tentacleCount = 8 + Math.round(stressFactor * 6);
      // Crimson RGB Glow: max red, low green/blue
      pred.glowColor = [1.0, 0.08, 0.05];
    } else if (stressFactor > 0.6) {
      // High societal stress mutation
      pred.bodyRadius = 0.8 + stressFactor * 0.3;
      pred.tentacleCount = 6 + Math.round(stressFactor * 4);
      pred.glowColor = [0.95, 0.2, 0.1];
    } else {
      // Stable Era: docile/background fauna
      pred.bodyRadius = 0.55;
      pred.tentacleCount = 4;
      pred.glowColor = [0.1, 0.7, 0.9];
    }
  }

  /**
   * Raymarching barrier deflection:
   * Territorial safe zones act as physical SDF barriers forcing predators around them.
   */
  private calculateBarrierDeflection(pos: Vector3): Vector3 {
    const repel = { x: 0, y: 0, z: 0 };

    for (const structure of this.structures) {
      if (structure.health <= 0) continue;

      const dx = pos.x - structure.position.x;
      const dy = pos.y - structure.position.y;
      const dz = pos.z - structure.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const barrierRadius = structure.radius + 0.6; // padding

      if (dist < barrierRadius && dist > 0.001) {
        const force = (barrierRadius - dist) * this.config.barrierRepelWeight;
        repel.x += (dx / dist) * force;
        repel.y += (dy / dist) * force;
        repel.z += (dz / dist) * force;
      }
    }

    return repel;
  }

  private findVulnerableStructure(predPos: Vector3): CivilizationStructure | null {
    let bestStructure: CivilizationStructure | null = null;
    let minDist = Infinity;

    for (const s of this.structures) {
      if (s.health <= 0) continue;
      const dx = s.position.x - predPos.x;
      const dy = s.position.y - predPos.y;
      const dz = s.position.z - predPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < minDist) {
        minDist = dist;
        bestStructure = s;
      }
    }

    return bestStructure;
  }

  private findCivilianClusterTarget(predPos: Vector3): Vector3 | null {
    if (this.civilians.length === 0) return null;

    // Compute centroid of civilians within perception radius
    let sumX = 0, sumY = 0, sumZ = 0, count = 0;
    let closestCivPos: Vector3 | null = null;
    let minCivDist = Infinity;

    for (const c of this.civilians) {
      const dx = c.position.x - predPos.x;
      const dy = c.position.y - predPos.y;
      const dz = c.position.z - predPos.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < minCivDist) {
        minCivDist = dist;
        closestCivPos = c.position;
      }

      if (dist < this.config.predatorPerceptionRadius) {
        sumX += c.position.x;
        sumY += c.position.y;
        sumZ += c.position.z;
        count++;
      }
    }

    if (count > 0) {
      return { x: sumX / count, y: sumY / count, z: sumZ / count };
    }

    return closestCivPos;
  }

  private damageStructure(id: string, damage: number) {
    const s = this.structures.find((st) => st.id === id);
    if (s && s.health > 0) {
      s.health = Math.max(0, s.health - damage);
    }
  }

  private updateStructures(dt: number) {
    if (!this.isApexCrisis) {
      // Stable Era: civs slowly repair and maintain structures
      for (const s of this.structures) {
        if (s.health < s.maxHealth) {
          s.health = Math.min(s.maxHealth, s.health + dt * 2.0);
        }
      }
    }
  }

  private clampToWorldBounds(pos: Vector3, radius: number) {
    const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    if (dist > radius) {
      pos.x = (pos.x / dist) * radius;
      pos.z = (pos.z / dist) * radius;
    }
    pos.y = Math.max(-1.5, Math.min(1.5, pos.y));
  }

  /**
   * Returns serialized creature coordinate arrays:
   * Each entry: [x, y, z, stateCode, hunger]
   * stateCode: 0: dormant, 1: docile, 2: hunting, 3: attacking
   */
  public getCreatureCoordinates(): CreatureCoordinateTuple[] {
    const stateCodeMap: Record<PredatorAgent['state'], number> = {
      dormant: 0,
      docile: 1,
      hunting: 2,
      attacking: 3,
    };

    return this.predators.map((p) => [
      Math.round(p.position.x * 100) / 100,
      Math.round(p.position.y * 100) / 100,
      Math.round(p.position.z * 100) / 100,
      stateCodeMap[p.state],
      Math.round(p.hunger * 100) / 100,
    ]);
  }

  public getCivilians(): CivilianAgent[] {
    return this.civilians;
  }

  public getPredators(): PredatorAgent[] {
    return this.predators;
  }

  public getStructures(): CivilizationStructure[] {
    return this.structures;
  }

  public spawnPredator(position?: Vector3): PredatorAgent {
    const id = `pred_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newPred: PredatorAgent = {
      id,
      position: position || {
        x: (Math.random() - 0.5) * 6,
        y: 0,
        z: (Math.random() - 0.5) * 6,
      },
      velocity: { x: 0, y: 0, z: 0 },
      state: this.isApexCrisis ? 'hunting' : 'docile',
      hunger: 0.5,
      targetCivilianId: null,
      targetNodeId: null,
      bodyRadius: 0.7,
      tentacleCount: 6,
      glowColor: this.isApexCrisis ? [1.0, 0.08, 0.05] : [0.1, 0.7, 0.9],
    };
    this.predators.push(newPred);
    return newPred;
  }

  public spawnStructure(structure: Omit<CivilizationStructure, 'id'>): CivilizationStructure {
    const full: CivilizationStructure = {
      ...structure,
      id: `struct_${Date.now()}`,
    };
    this.structures.push(full);
    return full;
  }
}
