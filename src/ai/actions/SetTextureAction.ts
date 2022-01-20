import Phaser from 'phaser';
import { Action } from "../base/Action";
import { BehaviorStatus } from "../base/BehaviorStatus";


export class SetTextureAction extends Action {
  constructor(private self: Phaser.GameObjects.Image, private texture: string, private frame?: string) { super(); }
  update() {
    this.self.setTexture(this.texture, this.frame);
    return BehaviorStatus.SUCCESS;
  }
}
