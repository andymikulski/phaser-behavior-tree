export class BehaviorTree {
  constructor(private rootNode: Behavior){}
  tick() {
    return this.rootNode.tick();
  }
  abort() {
    return this.rootNode.abort?.();
  }
}

export enum BehaviorStatus {
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  ERROR = 'ERROR'
}

export abstract class Behavior {
  private _status : BehaviorStatus;
  public get status() : BehaviorStatus {
    return this._status;
  }
  protected set status(v : BehaviorStatus) {
    this._status = v;
  }

  private _isTerminated: boolean = false;
  public get isTerminated(): boolean {
    return this._isTerminated;
  }
  protected set isTerminated(v: boolean) {
    this._isTerminated = v;
  }

  private _isRunning: boolean = false;
  public get isRunning(): boolean {
    return this._isRunning;
  }
  protected set isRunning(v: boolean) {
    this._isRunning = v;
  }

  // Called once - immediately before first 'update' call
  public onInitialize() {
    this.isTerminated = false;
    this.isRunning = true;
    this.shouldAbort = false;
    this.status = undefined;
  };
  // Called _once_ each time the BT is updated.
  public update():BehaviorStatus {
    if (this.shouldAbort) {
      if (this.status === BehaviorStatus.RUNNING) {
        this.onTerminate();
      }
      return BehaviorStatus.FAILURE;
    }
    return this.status;
  }

  protected shouldAbort: boolean = false;
  public abort() {
    this.shouldAbort = true;
  }

  // Called immediately after previous `update` which signalled the behavior is done processing
  public onTerminate() {
    this.isRunning = false;
    this.isTerminated = true;
    this.shouldAbort = false;
    // this.status = undefined;
  };

  public tick() {
    if (this.shouldAbort) {
      if (this.status === BehaviorStatus.RUNNING){
        this.onTerminate();
      }
      this.status = BehaviorStatus.FAILURE;
      return this.status;
    }

    // Enter handler
    if (this.status !== BehaviorStatus.RUNNING) {
      this.onInitialize();
    }

    // Task update/process
    this.status = this.update();

    // Exit handler
    if (this.status !== BehaviorStatus.RUNNING) {
      this.onTerminate();
    }
    return this.status;
  }
}

// `Action`s are leaf nodes that have the responsibility of accessing info from the world,
// as well as making _changes_ to the world.


// Conditions are leaf nodes which check information in the world and return a boolean result,
// as they rely on the return statuses of behaviors (success/failure).

export abstract class Condition extends Behavior { }
export abstract class Action extends Behavior { }


export abstract class Decorator extends Behavior {
  constructor(protected child: Behavior) {
    super();
  }
}



// Composites are branches with multiple behaviors

abstract class Composite extends Behavior {
  constructor(protected children: Behavior[] = []) { super(); };

  addChild = (behavior: Behavior) => {
    this.children.push(behavior);
  }
  removeChild = (behavior: Behavior) => {
    this.children = this.children.filter(b => b !== behavior);
  }
  clearChildren = () => {
    this.children = [];
  }
  getChildren = () => {
    return this.children;
  }
}


// ex Composite (pg 79) ("AND")
export class Sequence extends Composite {
  protected currentChildIndex:number = 0;

  update(){
    super.update();

    if (this.shouldAbort) {
      console.log('SEQUENCE ABORTING')
      for (let i = 0; i < this.children.length; i++) {
        // Terminate any behaviors that are in progress
        if (this.children[i].status === BehaviorStatus.RUNNING) {
          this.children[i].onTerminate();
        }
      }
      return BehaviorStatus.FAILURE;
    }

    for (let i = this.currentChildIndex; i < this.children.length; i++) {
      const status = this.children[i].tick();
      // Return failing or running behaviors
      this.currentChildIndex = i;
      if (status !== BehaviorStatus.SUCCESS) {
        return status;
      }
    }
    return BehaviorStatus.SUCCESS;
  }

  onTerminate() {
    super.onTerminate();
    this.currentChildIndex = 0;
  }

  abort() {
    super.abort();
    for(let i = 0; i < this.children.length; i++){
      if (this.children[i].status === BehaviorStatus.RUNNING) {
        this.children[i].abort();
      }
    }
  }
}


// Filter = branch that will not execute its children unless certain conditions met
export class Filter extends Sequence {
  public addCondition(condition: Condition) {
    this.children.unshift(condition);
  }
  public addAction(action: Action) {
    this.children.push(action);
  }
}


// Selectors ("OR")
// Executes each child until RUNNING or SUCCESS is returned
export class Selector extends Sequence {
  update(){
    super.update();

    for (let i = this.currentChildIndex; i < this.children.length; i++) {
      if (this.shouldAbort){ return BehaviorStatus.FAILURE; }
      const status = this.children[i].tick();
      // Return successful or running behaviors
      this.currentChildIndex = i;

      if (status !== BehaviorStatus.FAILURE) {
        return status;
      }
    }
    return BehaviorStatus.FAILURE;
  }
}

export class RandomSelector extends Sequence {

  update(){
    super.update();

    // Randomize order
    this.children = this.children.sort(()=> Math.random() > 0.5 ? 1 : - 1);

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



enum ParallelPolicy {
  RequireOne,
  RequireAll,
}
export class Parallel extends Composite {
  constructor(protected successPolicy: ParallelPolicy, protected failurePolicy: ParallelPolicy) {
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
  }
}


export class PrioritySequence extends Selector {
  update(){
    const previous = this.children[this.currentChildIndex];

    // onInit forces this to run every tick
    this.onInitialize();
    const result = super.update();

    // Compare previous child with current and go from there
    const current = this.children[this.currentChildIndex];
    const last = this.children[this.children.length - 1];

    if (previous && previous !== last && current !== previous) {
      // Abort last behavior if current child has changed
      previous.abort();
    }

    return result;
  }
}

