import { Action } from "../base/Action";
import { BehaviorStatus } from "../base/BehaviorStatus";

export class Idle extends Action {
  constructor() {
    super();
  }
  update() {
    return BehaviorStatus.RUNNING;
  }
}
;
