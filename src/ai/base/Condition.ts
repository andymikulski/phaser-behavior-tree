import { Behavior } from "./BehaviorStatus";

// `Action`s are leaf nodes that have the responsibility of accessing info from the world,
// as well as making _changes_ to the world.
// Conditions are leaf nodes which check information in the world and return a boolean result,
// as they rely on the return statuses of behaviors (success/failure).

export abstract class Condition extends Behavior { }
