import { Decorator } from "../base/Decorator";
import { Behavior, BehaviorStatus } from "../base/BehaviorStatus";


export class Throttle extends Decorator {
  constructor(private throttleMs: number, child: Behavior, private throttledStatus: BehaviorStatus = BehaviorStatus.RUNNING) { super(child); }

  private lastTime: number;
  onInitialize() {
    super.onInitialize();
    this.lastTime = Date.now();
  }
  update() {
    super.update();
    const now = Date.now();
    return (now - this.lastTime < this.throttleMs) ? this.throttledStatus : this.child.tick();
  }
}
