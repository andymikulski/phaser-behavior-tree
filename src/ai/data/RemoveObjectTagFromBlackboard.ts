import Phaser from 'phaser';
import { Action } from "../base/Action";
import { BehaviorStatus } from "../base/BehaviorStatus";
import Blackboard from './Blackboard';


export class RemoveObjectTagFromBlackboard extends Action {
  constructor(private self: Phaser.GameObjects.GameObject, private blackboard: Blackboard, private destTags: string[]) { super(); }
  update() {
    this.blackboard.removeObjectTags(this.destTags, this.self);
    return BehaviorStatus.SUCCESS;
  }
}
