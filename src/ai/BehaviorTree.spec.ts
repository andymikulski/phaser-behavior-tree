import { Behavior, BehaviorStatus } from "./base/BehaviorStatus";
import { Sequence } from "./base/Sequence";
import { BehaviorTree } from "./BehaviorTree";

const IncrementalBehavior = class extends Behavior {
  private counter: number = 0;
  constructor(
    private maxNum: number = 3,
    private failAfter: number = Infinity
  ) {
    super();
  }
  onInitialize() {
    super.onInitialize();
    this.counter = 0;
  }
  update() {
    super.update();
    this.counter += 1;
    if (this.counter >= this.failAfter) {
      return BehaviorStatus.FAILURE;
    }
    return this.counter < this.maxNum
      ? BehaviorStatus.RUNNING
      : BehaviorStatus.SUCCESS;
  }
  onTerminate() {
    super.onTerminate();
  }
};

const FailingBehavior = class extends Behavior {
  update() {
    return BehaviorStatus.FAILURE;
  }
};
const SuccessfulBehavior = class extends Behavior {
  update() {
    return BehaviorStatus.SUCCESS;
  }
};
const RunningBehavior = class extends Behavior {
  update() {
    return BehaviorStatus.RUNNING;
  }
};

describe("BehaviorTree", () => {
  const EmptyBehavior = class extends Behavior {};

  it("should not throw upon construction", () => {
    const attempt = () => new BehaviorTree(new EmptyBehavior());
    expect(attempt).not.toThrow();
  });

  it("should tick the root node when starting", () => {
    const testBehavior = new EmptyBehavior();
    const tree = new BehaviorTree(testBehavior);
    const spy = spyOn(testBehavior, "tick");

    tree.tick();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("Behavior life cycle", () => {
  it("should fire `onInitialize` once", () => {
    const testBehavior = new IncrementalBehavior(3);
    const tree = new BehaviorTree(testBehavior);
    const spy = spyOn(testBehavior, "onInitialize").and.callThrough();
    //
    tree.tick();
    tree.tick();
    tree.tick();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should fire `onInitialize` if called multiple times and status changes from RUNNING <-> SUCCESS", () => {
    const testBehavior = new IncrementalBehavior(3);
    const tree = new BehaviorTree(testBehavior);
    const spy = spyOn(testBehavior, "onInitialize").and.callThrough();
    //
    tree.tick();
    tree.tick();
    tree.tick();
    expect(spy).toHaveBeenCalledTimes(1);
    tree.tick();
    tree.tick();
    tree.tick();
    expect(spy).toHaveBeenCalledTimes(2);
    tree.tick();
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it("should fire `update` once for each tick", () => {
    const testBehavior = new IncrementalBehavior(3);
    const tree = new BehaviorTree(testBehavior);
    const spy = spyOn(testBehavior, "update").and.callThrough();
    tree.tick(); // 1
    tree.tick();
    tree.tick();
    tree.tick(); // ...
    tree.tick();
    tree.tick();
    tree.tick(); // 7
    expect(spy).toHaveBeenCalledTimes(7);
  });

  it("should fire `onTerminate` once", () => {
    const testBehavior = new IncrementalBehavior(3);
    const tree = new BehaviorTree(testBehavior);
    const spy = spyOn(testBehavior, "onTerminate").and.callThrough();
    tree.tick();
    tree.tick();
    tree.tick();
    // 3 = done = terminate
    expect(spy).toHaveBeenCalledTimes(1);
    tree.tick();
    tree.tick();
    // not done = not terminated
    expect(spy).toHaveBeenCalledTimes(1);

    tree.tick();
    // done again = another terminate
    expect(spy).toHaveBeenCalledTimes(2);
  });

  describe("Aborting", () => {
    it("should not run after being aborted", () => {
      const testBehavior = new IncrementalBehavior(3);
      const tree = new BehaviorTree(testBehavior);
      const abortSpy = spyOn(testBehavior, "abort").and.callThrough();
      const terminateSpy = spyOn(testBehavior, "onTerminate").and.callThrough();

      tree.tick();
      expect(testBehavior.status).toBe(BehaviorStatus.RUNNING);

      tree.abort();
      expect(abortSpy).toHaveBeenCalledTimes(1);
      expect(testBehavior.status).toBe(BehaviorStatus.RUNNING);

      tree.tick();
      expect(testBehavior.status).toBe(BehaviorStatus.FAILURE);
      expect(terminateSpy).toHaveBeenCalledTimes(1);
    });
  });

  it("should flag the behavior as terminated when appropriate", () => {
    const testBehavior = new IncrementalBehavior(3);
    const tree = new BehaviorTree(testBehavior);

    expect(testBehavior.status).toBe(undefined);
    expect(testBehavior.isTerminated).toBe(false);

    tree.tick();
    expect(testBehavior.status).toBe(BehaviorStatus.RUNNING);
    expect(testBehavior.isTerminated).toBe(false);

    tree.tick();
    expect(testBehavior.status).toBe(BehaviorStatus.RUNNING);
    expect(testBehavior.isTerminated).toBe(false);

    tree.tick(); // done = terminated
    expect(testBehavior.isTerminated).toBe(true);
    expect(testBehavior.status).toBe(BehaviorStatus.SUCCESS);
  });

  it("should flag the behavior as running when appropriate", () => {
    const testBehavior = new IncrementalBehavior(3);
    const tree = new BehaviorTree(testBehavior);

    expect(testBehavior.status).toBe(undefined);
    expect(testBehavior.isRunning).toBe(false);

    tree.tick();
    expect(testBehavior.status).toBe(BehaviorStatus.RUNNING);
    expect(testBehavior.isRunning).toBe(true);

    tree.tick();
    expect(testBehavior.status).toBe(BehaviorStatus.RUNNING);
    expect(testBehavior.isRunning).toBe(true);

    tree.tick(); // done = terminated
    expect(testBehavior.isRunning).toBe(false);
    expect(testBehavior.status).toBe(BehaviorStatus.SUCCESS);
  });
});

describe("Sequence", () => {
  it("should accept multiple children", () => {
    const firstChild = new FailingBehavior();
    const secondChild = new SuccessfulBehavior();

    const tree = new Sequence([firstChild, secondChild]);

    const children = tree.getChildren();
    expect(children[0]).toEqual(firstChild);
    expect(children[1]).toEqual(secondChild);
  });

  it("calls each child in succession until a NON-SUCCESS status is returned", () => {
    const firstChild = new SuccessfulBehavior();
    const secondChild = new SuccessfulBehavior();
    const thirdChild = new FailingBehavior();
    const fourthChild = new SuccessfulBehavior();

    const firstSpy = spyOn(firstChild, "tick").and.callThrough();
    const secondSpy = spyOn(secondChild, "tick").and.callThrough();
    const thirdSpy = spyOn(thirdChild, "tick").and.callThrough();
    const fourthSpy = spyOn(fourthChild, "tick").and.callThrough();

    const tree = new Sequence([
      firstChild,
      secondChild,
      thirdChild,
      fourthChild,
    ]);

    tree.tick();

    expect(firstSpy).toHaveBeenCalledTimes(1);
    expect(secondSpy).toHaveBeenCalledTimes(1);
    expect(thirdSpy).toHaveBeenCalledTimes(1);
    expect(fourthSpy).toHaveBeenCalledTimes(0);
  });

  it("returns a RUNNING status if a child returns RUNNING", () => {
    const firstChild = new SuccessfulBehavior();
    const secondChild = new RunningBehavior();
    const thirdChild = new SuccessfulBehavior();

    const firstSpy = spyOn(firstChild, "tick").and.callThrough();
    const secondSpy = spyOn(secondChild, "tick").and.callThrough();
    const thirdSpy = spyOn(thirdChild, "tick").and.callThrough();

    const tree = new Sequence([firstChild, secondChild, thirdChild]);

    tree.tick();

    expect(firstSpy).toHaveBeenCalledTimes(1);
    expect(secondSpy).toHaveBeenCalledTimes(1);
    expect(thirdSpy).toHaveBeenCalledTimes(0);

    expect(tree.status).toBe(BehaviorStatus.RUNNING);
  });

  it("returns a FAILURE status if a child returns FAILURE", () => {
    const firstChild = new SuccessfulBehavior();
    const secondChild = new FailingBehavior();
    const thirdChild = new SuccessfulBehavior();

    const firstSpy = spyOn(firstChild, "tick").and.callThrough();
    const secondSpy = spyOn(secondChild, "tick").and.callThrough();
    const thirdSpy = spyOn(thirdChild, "tick").and.callThrough();

    const tree = new Sequence([firstChild, secondChild, thirdChild]);

    tree.tick();

    expect(firstSpy).toHaveBeenCalledTimes(1);
    expect(secondSpy).toHaveBeenCalledTimes(1);
    expect(thirdSpy).toHaveBeenCalledTimes(0);

    expect(tree.status).toBe(BehaviorStatus.FAILURE);
  });

  it("returns a SUCCESS status if all children return SUCCESS", () => {
    const firstChild = new SuccessfulBehavior();
    const secondChild = new SuccessfulBehavior();
    const thirdChild = new SuccessfulBehavior();

    const firstSpy = spyOn(firstChild, "tick").and.callThrough();
    const secondSpy = spyOn(secondChild, "tick").and.callThrough();
    const thirdSpy = spyOn(thirdChild, "tick").and.callThrough();

    const tree = new Sequence([firstChild, secondChild, thirdChild]);

    tree.tick();

    expect(firstSpy).toHaveBeenCalledTimes(1);
    expect(secondSpy).toHaveBeenCalledTimes(1);
    expect(thirdSpy).toHaveBeenCalledTimes(1);

    expect(tree.status).toBe(BehaviorStatus.SUCCESS);
  });

  describe("long-running tasks", () => {
    it("returns RUNNING when a subsequent task is.. RUNNING.", () => {
      const firstChild = new SuccessfulBehavior();
      const secondChild = new RunningBehavior();

      const firstSpy = spyOn(firstChild, "tick").and.callThrough();
      const secondSpy = spyOn(secondChild, "tick").and.callThrough();

      const tree = new Sequence([firstChild, secondChild]);

      tree.tick();

      expect(firstSpy).toHaveBeenCalledTimes(1);
      expect(secondSpy).toHaveBeenCalledTimes(1);

      expect(tree.status).toBe(BehaviorStatus.RUNNING);
    });

    it("ticks the processing behavior multiple times without traversing again", () => {
      const numRuns = 3;
      const firstChild = new SuccessfulBehavior();
      const secondChild = new IncrementalBehavior(numRuns);
      const thirdChild = new SuccessfulBehavior();

      const firstSpy = spyOn(firstChild, "tick").and.callThrough();
      const secondSpy = spyOn(secondChild, "tick").and.callThrough();
      const thirdSpy = spyOn(thirdChild, "tick").and.callThrough();

      const tree = new Sequence([firstChild, secondChild, thirdChild]);

      for (let i = 0; i < numRuns - 1; i++) {
        tree.tick();
        expect(firstSpy).toHaveBeenCalledTimes(1);
        expect(secondSpy).toHaveBeenCalledTimes(i + 1);
        expect(thirdSpy).toHaveBeenCalledTimes(0);
        expect(tree.status).toBe(BehaviorStatus.RUNNING);
      }

      tree.tick();
      expect(firstSpy).toHaveBeenCalledTimes(1);
      expect(secondSpy).toHaveBeenCalledTimes(numRuns);
      expect(thirdSpy).toHaveBeenCalledTimes(1);
      expect(tree.status).toBe(BehaviorStatus.SUCCESS);
    });

    it("resets back to the first child if a FAILURE status is reached", () => {
      const firstChild = new SuccessfulBehavior();
      const secondChild = new SuccessfulBehavior();
      const thirdChild = new IncrementalBehavior(3, 2);
      const fourthChild = new SuccessfulBehavior();

      const firstSpy = spyOn(firstChild, "tick").and.callThrough();
      const secondSpy = spyOn(secondChild, "tick").and.callThrough();
      const thirdSpy = spyOn(thirdChild, "tick").and.callThrough();
      const fourthSpy = spyOn(fourthChild, "tick").and.callThrough();

      const tree = new Sequence([
        firstChild,
        secondChild,
        thirdChild,
        fourthChild,
      ]);

      // expect a reset to happen
      const thirdInitSpy = spyOn(thirdChild, "onInitialize").and.callThrough();

      tree.tick();
      expect(firstSpy).toHaveBeenCalledTimes(1);
      expect(secondSpy).toHaveBeenCalledTimes(1);
      expect(thirdSpy).toHaveBeenCalledTimes(1);
      expect(thirdInitSpy).toHaveBeenCalledTimes(1);
      expect(tree.status).toBe(BehaviorStatus.RUNNING);

      tree.tick();
      expect(firstSpy).toHaveBeenCalledTimes(1);
      expect(secondSpy).toHaveBeenCalledTimes(1);
      expect(thirdSpy).toHaveBeenCalledTimes(2);
      expect(thirdInitSpy).toHaveBeenCalledTimes(1);
      expect(tree.status).toBe(BehaviorStatus.FAILURE);

      tree.tick();
      expect(firstSpy).toHaveBeenCalledTimes(2);
      expect(secondSpy).toHaveBeenCalledTimes(2);
      expect(thirdSpy).toHaveBeenCalledTimes(3);
      expect(thirdInitSpy).toHaveBeenCalledTimes(2);
      expect(tree.status).toBe(BehaviorStatus.RUNNING);

      tree.tick();
      expect(firstSpy).toHaveBeenCalledTimes(2);
      expect(secondSpy).toHaveBeenCalledTimes(2);
      expect(thirdSpy).toHaveBeenCalledTimes(4);
      expect(tree.status).toBe(BehaviorStatus.FAILURE);
    });
  });
});
