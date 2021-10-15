import { Decorator, Behavior, BehaviorStatus } from './BehaviorTree';

// Example decorator (pg 78)
// Repeats a given behavior N times or until first failure



export class RepeatDecorator extends Decorator {
  private repeatCount: number = 0;

  constructor(private repeatLimit: number, protected child: Behavior) {
    super(child);
  }

  onInitialize = () => {
    super.onInitialize();
    this.repeatCount = 0;
  }

  update = () => {
    while (true && !this.shouldAbort) {
      const status = this.child.tick();
      if (status === BehaviorStatus.RUNNING) { return BehaviorStatus.RUNNING; }
      if (status === BehaviorStatus.FAILURE) { return BehaviorStatus.FAILURE; }
      this.repeatCount += 1;
      if (this.repeatCount >= this.repeatLimit) { return BehaviorStatus.SUCCESS; }
    }
    return BehaviorStatus.ERROR;
  }
}
