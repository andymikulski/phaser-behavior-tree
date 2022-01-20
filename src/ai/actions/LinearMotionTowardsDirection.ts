import Phaser from 'phaser';
import { Action } from "../base/Action";
import { BehaviorStatus } from "../base/BehaviorStatus";



export class LinearMotionTowardsDirection extends Action {
  private currentAngle: number = 0;

  constructor(private self: Phaser.Physics.Arcade.Image, private givenAngle: number | (() => number), private speed: number = 150) {
    super();

    this.updateAngle();
  }

  private updateAngle() {
    this.currentAngle = typeof this.givenAngle === 'function' ? this.givenAngle() : this.givenAngle;
  }

  onInitialize() {
    super.onInitialize();
    this.self.setMaxVelocity(this.speed, this.speed);
    this.updateAngle();
  }

  update() {
    if (isNaN(this.currentAngle)) {
      return BehaviorStatus.FAILURE;
    }
    this.self.body.velocity.set(Math.cos(this.currentAngle) * this.speed, Math.sin(this.currentAngle) * this.speed);
    return BehaviorStatus.RUNNING;
  }

  onTerminate() {
    super.onTerminate();
    this.self.body.velocity.set(0, 0);
  }
}
;
