import { Decorator } from "../base/Decorator";
import { BehaviorStatus } from "../base/BehaviorStatus";



export class Falsy extends Decorator {
  update() {
    const status = this.child.tick();
    return status === BehaviorStatus.SUCCESS ? BehaviorStatus.SUCCESS : BehaviorStatus.FAILURE;
  }
}
