import Phaser from "phaser";
import { BehaviorStatus } from "../base/BehaviorStatus";
import { Condition } from "../base/Condition";
import Blackboard from "../data/Blackboard";

export class IsTagWithinDistance extends Condition {
  constructor(
    private self: { x: number; y: number },
    private tag: string,
    private maxDistance: number,
    private blackboard: Blackboard
  ) {
    super();
  }

  update() {
    const found = this.blackboard.getTagged(
      this.tag
    ) as Phaser.GameObjects.Components.Transform[];
    if (!found.length) {
      return BehaviorStatus.FAILURE;
    }

    for (let i = 0; i < found.length; i++) {
      const dist = Phaser.Math.Distance.Between(
        this.self.x,
        this.self.y,
        found[i].x,
        found[i].y
      );
      return dist <= this.maxDistance
        ? BehaviorStatus.SUCCESS
        : BehaviorStatus.FAILURE;
    }

    return BehaviorStatus.FAILURE;
  }
}
