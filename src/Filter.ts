import { Condition, Action } from "./BehaviorTree";
import { Sequence } from "./Sequence";

// Filter = branch that will not execute its children unless certain conditions met


export class Filter extends Sequence {
  public addCondition(condition: Condition) {
    this.children.unshift(condition);
  }
  public addAction(action: Action) {
    this.children.push(action);
  }
}
