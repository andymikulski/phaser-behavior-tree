import { BehaviorStatus, Composite } from "./BehaviorTree";
import { Sequence } from "./Sequence";

// Selectors ("OR")
// Executes each child until RUNNING or SUCCESS is returned
export class Selector extends Composite {
  protected currentChildIndex: number = 0;

  update() {
    super.update();
    for (let i = this.currentChildIndex; i < this.children.length; i++) {
      if (this.shouldAbort) { return BehaviorStatus.FAILURE; }
      const status = this.children[i].tick();
      // Return successful or running behaviors
      if (status !== BehaviorStatus.FAILURE) {
        this.currentChildIndex = status === BehaviorStatus.RUNNING ? i : 0;
        return status;
      }
    }
    this.currentChildIndex = 0;
    return BehaviorStatus.FAILURE;
  }
}

export class ActiveSelector extends Selector {
  update() {
    const prevIndex = this.currentChildIndex;
    const previous = this.children[prevIndex];

    this.currentChildIndex = 0;
    this.onInitialize();

    const result = super.update();

    // Compare previous child with current and go from there
    const current = this.children[this.currentChildIndex];
    const last = this.children[this.children.length - 1];
    if (prevIndex !== this.currentChildIndex && (previous && previous !== last && current !== previous)) {
      // Abort last behavior if current child has changed
      if (previous.status === BehaviorStatus.RUNNING) {
        previous.abort();
      }
    }

    return result;
  }
}
