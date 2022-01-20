import Phaser from 'phaser';
import { Action } from "../base/Action";
import { BehaviorStatus } from "../base/BehaviorStatus";

export class SetAnimation extends Action {
  constructor(private self: Phaser.GameObjects.Sprite, private animationKey: string, private ignoreIfAlreadyPlaying = true) {
    super();
  }
  update() {
    this.self.anims.play(this.animationKey, this.ignoreIfAlreadyPlaying);
    return BehaviorStatus.SUCCESS;
  }
}
