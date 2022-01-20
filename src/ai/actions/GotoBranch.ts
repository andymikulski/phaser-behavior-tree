import { BehaviorTree } from '../BehaviorTree';
import { Action } from "../base/Action";
import { BehaviorStatus } from "../base/BehaviorStatus";

export class GotoBranch extends Action {
  constructor(private self: { ai: BehaviorTree; }, private target: BehaviorTree) {
    super();
  }
  update() {
    this.self.ai = this.target;
    return BehaviorStatus.SUCCESS;
  }
}
;
