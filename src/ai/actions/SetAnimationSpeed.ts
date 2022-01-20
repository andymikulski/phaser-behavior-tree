import Phaser from "phaser";
import { Action } from "../base/Action";
import { BehaviorStatus } from "../base/BehaviorStatus";

export class SetAnimationSpeed extends Action {
  constructor(private self: Phaser.GameObjects.Sprite, private amt: number) {
    super();
  }

  update() {
    this.self.anims.timeScale = this.amt;
    return BehaviorStatus.SUCCESS;
  }
}
