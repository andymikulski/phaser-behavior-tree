import { Decorator } from "../base/Decorator";
import { BehaviorStatus } from "../base/BehaviorStatus";


export class AlwaysFail extends Decorator {
  update() {
    this.child.update();
    return BehaviorStatus.FAILURE;
  }

  tick() {
    this.child.tick();
    return BehaviorStatus.FAILURE;
  }
}
