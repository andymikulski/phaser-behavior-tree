import { Action } from "../base/Action";
import { BehaviorStatus } from "../base/BehaviorStatus";

export class LoggingAction extends Action {
  constructor(
    private message: string | (() => string),
    private returnStatus: BehaviorStatus = BehaviorStatus.SUCCESS
  ) {
    super();
  }
  update() {
    // console.log('LoggingAction : ', typeof this.message === 'function' ? this.message() : this.message);
    return this.returnStatus;
  }
}
