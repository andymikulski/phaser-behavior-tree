import { BehaviorStatus } from "../base/BehaviorStatus";
import { Decorator } from "../base/Decorator";


export class AlwaysSucceed extends Decorator {
  update() {
    this.child.update();
    return BehaviorStatus.SUCCESS;
  }

  tick() {
    this.child.tick();
    return BehaviorStatus.SUCCESS;
  }
}
