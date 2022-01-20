import { BehaviorStatus, Behavior } from "./BehaviorStatus";
import { Composite } from "./Composite";

export enum ParallelPolicy {
  RequireOne,
  RequireAll
}
export class Parallel extends Composite {
  constructor(protected successPolicy: ParallelPolicy, protected failurePolicy: ParallelPolicy, protected children:Behavior[]) {
    super();
  }

  update() {
    let totalCount = this.children.length;
    let successCount = 0;
    let failureCount = 0;
    let b;
    for (let i = 0; i < totalCount; i++) {
      b = this.children[i];

      // Skip if this child has already terminated
      if (b.isTerminated) {
        continue;
      }

      const status = b.tick();
      if (status === BehaviorStatus.SUCCESS) {
        successCount += 1;
        if (this.successPolicy === ParallelPolicy.RequireOne) {
          return BehaviorStatus.SUCCESS;
        }
      } else if (status === BehaviorStatus.FAILURE) {
        failureCount += 1;
        if (this.failurePolicy === ParallelPolicy.RequireOne) {
          return BehaviorStatus.FAILURE;
        }
      }
    }

    if (this.failurePolicy === ParallelPolicy.RequireAll && failureCount === totalCount) {
      return BehaviorStatus.FAILURE;
    } else if (this.successPolicy === ParallelPolicy.RequireAll && successCount === totalCount) {
      return BehaviorStatus.SUCCESS;
    }
    return BehaviorStatus.RUNNING;
  };

  public onTerminate = () => {
    super.onTerminate();

    let b;
    for (let i = 0; i < this.children.length; i++) {
      b = this.children[i];
      if (b.isRunning) {
        b.abort();
      }
    }
  };
}
