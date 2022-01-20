import Phaser from 'phaser';
import { Action } from "./ai/base/Action";
import { BehaviorStatus } from "./ai/base/BehaviorStatus";

class ShootProjectile extends Action {
  constructor(private emitter: Phaser.GameObjects.Particles.ParticleEmitter, private from: { x: number; y: number; }, private to: { x: number; y: number; }) {
    super();
  }

  update() {
    const angle = Math.atan2(this.to.y - this.from.y, this.to.x - this.from.x);
    this.emitter.setEmitterAngle(angle);
    this.emitter.emitParticleAt(this.from.x, this.from.y, 10);

    return BehaviorStatus.SUCCESS;
  }
}
