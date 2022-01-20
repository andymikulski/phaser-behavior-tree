import { Behavior } from "./BehaviorStatus";



export abstract class Decorator extends Behavior {
  constructor(protected child: Behavior) {
    super();
  }
}
