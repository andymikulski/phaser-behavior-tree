import { Action } from "../base/Action";
import { BehaviorStatus } from "../base/BehaviorStatus";



export class WaitMillisecondsAction extends Action {
  constructor(private waitForMS: number | (() => number)) { super(); }

  private waitThreshold: number;
  private startTime: number;
  onInitialize() {
    this.startTime = Date.now();
    this.waitThreshold = typeof this.waitForMS === 'function' ? this.waitForMS() : this.waitForMS;
  }
  update() {
    const now = Date.now();

    if (now - this.startTime < this.waitThreshold) {
      return BehaviorStatus.RUNNING;
    }
    return BehaviorStatus.SUCCESS;
  }
}
