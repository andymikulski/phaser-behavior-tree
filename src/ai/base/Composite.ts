// Composites are branches with multiple behaviors

import { Behavior } from "./BehaviorStatus";

export abstract class Composite extends Behavior {
  constructor(protected children: Behavior[] = []) {
    super();
  }

  addChild = (behavior: Behavior) => {
    this.children.push(behavior);
  };
  removeChild = (behavior: Behavior) => {
    this.children = this.children.filter((b) => b !== behavior);
  };
  clearChildren = () => {
    this.children = [];
  };
  getChildren = () => {
    return this.children;
  };
}
