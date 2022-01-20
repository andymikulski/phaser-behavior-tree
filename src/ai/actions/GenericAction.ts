import { Action } from "../base/Action";
import { BehaviorStatus } from "../base/BehaviorStatus";


export class GenericAction extends Action {
  constructor(private fn: () => BehaviorStatus) { super(); }
  update() {
    return this.fn();
  }
}
