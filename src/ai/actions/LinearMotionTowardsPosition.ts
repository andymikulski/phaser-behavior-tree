import Phaser from 'phaser';
import { Action } from '../base/Action';
import { BehaviorStatus } from '../base/BehaviorStatus';

export class LinearMotionTowardsPosition extends Action {
  private targetX: number;
  private targetY: number;
  constructor(private self: Phaser.Physics.Arcade.Image, private target: { x: number; y: number; } | (() => { x: number; y: number; }), private distThreshold: number = 5, private speed: number = 150, private updatePositionEveryTick?: boolean) {
    super();

    this.calcTargetXY();
  }

  private calcTargetXY() {
    let targetX, targetY;

    if (typeof this.target === 'function') {
      const res = this.target();
      if (!res) {
        targetX = NaN;
        targetY = NaN;
      } else {
        targetX = res.x;
        targetY = res.y;
      }
    } else {
      targetX = this.target.x;
      targetY = this.target.y;
    }

    this.targetX = targetX;
    this.targetY = targetY;
  }

  onInitialize() {
    super.onInitialize();
    this.self.setMaxVelocity(this.speed, this.speed);
    this.calcTargetXY();
  }

  update() {
    if (this.updatePositionEveryTick) { this.calcTargetXY(); }
    if (isNaN(this.targetX) || isNaN(this.targetY)) {
      return BehaviorStatus.FAILURE;
    }

    const dist = Phaser.Math.Distance.Between(
      this.self.body.x, this.self.body.y,
      this.targetX, this.targetY
    );
    if (dist > this.distThreshold) {
      const angle = Math.atan2(this.targetY - this.self.body.y, this.targetX - this.self.body.x);
      this.self.body.velocity.set(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
      return BehaviorStatus.RUNNING;
    } else {
      this.self.body.velocity.set(0, 0);
      return BehaviorStatus.SUCCESS;
    }
  }

  onTerminate() {
    super.onTerminate();
    this.self.body.velocity.set(0, 0);
  }
}
;
