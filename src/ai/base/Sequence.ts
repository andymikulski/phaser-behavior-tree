
// ex Composite (pg 79) ("AND")

import { BehaviorStatus } from "./BehaviorStatus";
import { Composite } from "./Composite";


/**
 * Continues from last processing node regardless if aborted
 */
export class Sequence extends Composite {
  protected currentChildIndex: number = 0;

  update() {
    super.update();

    for (let i = this.currentChildIndex; i < this.children.length; i++) {
      const status = this.children[i].tick();
      // Return failing or running behaviors
      if (status !== BehaviorStatus.SUCCESS) {
        this.currentChildIndex = status === BehaviorStatus.RUNNING ? i : 0;
        return status;
      }
    }
    this.currentChildIndex = 0;
    return BehaviorStatus.SUCCESS;
  }

  abort() {
    super.abort();
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i].status === BehaviorStatus.RUNNING) {
        this.children[i].abort();
      }
    }
    this.currentChildIndex = 0;
    this.onTerminate();
  }
}


/**
 * Starts the sequence over when aborted
 */
export class FreshSequence extends Sequence {
  abort() {
    super.abort();
    this.currentChildIndex = 0;
  }
}
