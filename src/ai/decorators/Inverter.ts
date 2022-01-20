import { Decorator } from "../base/Decorator";
import { BehaviorStatus } from "../base/BehaviorStatus";


export class Inverter extends Decorator {
  tick() {
    const childStatus = this.child.tick();
    if (childStatus === BehaviorStatus.RUNNING) {
      return BehaviorStatus.RUNNING;
    }
    return childStatus === BehaviorStatus.SUCCESS ? BehaviorStatus.FAILURE : BehaviorStatus.SUCCESS;
  }
}
