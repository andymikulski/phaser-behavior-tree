import { Action } from "../base/Action";
import { BehaviorStatus } from "../base/BehaviorStatus";


export class FailingAction extends Action {
  update() {
    return BehaviorStatus.FAILURE;
  }
}
