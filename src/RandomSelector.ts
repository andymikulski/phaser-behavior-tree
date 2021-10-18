import { BehaviorStatus } from "./BehaviorTree";
import { Sequence } from "./Sequence";


export class RandomSelector extends Sequence {

  update() {
    super.update();

    // Randomize order
    this.children = this.children.sort(() => Math.random() > 0.5 ? 1 : -1);

    while (true && !this.shouldAbort) {
      for (let i = 0; i < this.children.length; i++) {
        const status = this.children[i].tick();
        this.currentChildIndex = i;
        // Return successful or running behaviors
        if (status !== BehaviorStatus.FAILURE) { return status; }
      }
      return BehaviorStatus.FAILURE;
    }
    return BehaviorStatus.ERROR;
  }
}
