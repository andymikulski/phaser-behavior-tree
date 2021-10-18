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
    console.log('Repeat intiailized')
  }

  onTerminate = () => {
    super.onTerminate();
    this.repeatCount = 0;
    this.status = undefined;
    if (this.child.status === BehaviorStatus.RUNNING) {
      this.child.abort();
      this.child.onTerminate();
    }
    console.log('Repeat terminated')
  }

  update = () => {
    while (true && !this.shouldAbort) {
      const status = this.child.tick();
      if (status === BehaviorStatus.FAILURE) { return BehaviorStatus.FAILURE; }
      this.repeatCount += 1;
      return this.repeatCount >= this.repeatLimit ? BehaviorStatus.SUCCESS : BehaviorStatus.RUNNING;
    }
    return BehaviorStatus.ERROR;
  }
}
