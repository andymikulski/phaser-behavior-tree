import { Composite, BehaviorStatus } from "./BehaviorTree";

// ex Composite (pg 79) ("AND")


export class Sequence extends Composite {
  protected currentChildIndex: number = 0;

  update() {
    super.update();

    if (this.shouldAbort) {
      console.log('SEQUENCE ABORTING');
      for (let i = 0; i < this.children.length; i++) {
        // Terminate any behaviors that are in progress
        if (this.children[i].status === BehaviorStatus.RUNNING) {
          this.children[i].onTerminate();
        }
      }
      this.currentChildIndex = 0;
      return BehaviorStatus.FAILURE;
    }

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

  onTerminate() {
    super.onTerminate();
    this.currentChildIndex = 0;
  }

  abort() {
    super.abort();
    for (let i = 0; i < this.children.length; i++) {
      if (this.children[i].status === BehaviorStatus.RUNNING) {
        this.children[i].abort();
        this.children[i].onTerminate();
      }
    }
  }
}
