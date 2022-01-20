
export enum BehaviorStatus {
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  ERROR = 'ERROR'
}

export abstract class Behavior {
  private _status: BehaviorStatus;
  public get status(): BehaviorStatus {
    return this._status;
  }
  protected set status(v: BehaviorStatus) {
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
  public update(): BehaviorStatus {
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
    this.onTerminate();
  }

  // Called immediately after previous `update` which signalled the behavior is done processing
  public onTerminate() {
    this.isRunning = false;
    this.isTerminated = true;
    this.shouldAbort = false;
  };

  public tick() {
    if (this.shouldAbort) {
      if (this.status === BehaviorStatus.RUNNING) {
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
