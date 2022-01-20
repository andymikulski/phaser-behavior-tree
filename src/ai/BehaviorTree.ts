import { Behavior, BehaviorStatus } from "./base/BehaviorStatus";

export class BehaviorTree {
  private _enabled: boolean = true;
  public get enabled(): boolean {
    return this._enabled;
  }
  public set enabled(v: boolean) {
    this._enabled = v;
  }

  constructor(private rootNode: Behavior) {}
  tick() {
    if (!this.enabled) {
      return BehaviorStatus.FAILURE;
    }
    return this.rootNode.tick();
  }
  abort() {
    return this.rootNode.abort?.();
  }

  setRootNode(node: Behavior) {
    this.rootNode?.abort?.();
    this.rootNode = node;
  }
}
