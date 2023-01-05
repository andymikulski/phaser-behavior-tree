// import Phaser from 'phaser';
// import { Action } from "../base/Action";
// import { BehaviorStatus } from "../base/BehaviorStatus";
// import Blackboard from '../data/Blackboard';
// import { GetClosestTaggedObject } from '../data/GetClosestTaggedObject';


// export class AccelerateAwayFromNearestTag extends Action {
//   constructor(private self: Phaser.Physics.Arcade.Image, private tag: string, private targetDist: number = 100, private speed: number = 125, private blackboard: Blackboard) {
//     super();
//   }

//   private target: { x: number; y: number; } | null = null;

//   onInitialize = () => {
//     super.onInitialize();
//     this.self.setMaxVelocity(this.speed, this.speed);
//     this.target = GetClosestTaggedObject(this.blackboard, this.self.body?.position ?? this.self, this.tag);

//     // console.log('on intiailize accelerate away', this.target);
//   };

//   update() {
//     if (!this.target) {
//       return BehaviorStatus.FAILURE;
//     }

//     const dist = Phaser.Math.Distance.Between(
//       this.self.body.x, this.self.body.y,
//       this.target.x, this.target.y
//     );
//     if (dist > this.targetDist) {
//       this.self.body.velocity.set(0, 0);
//       return BehaviorStatus.SUCCESS;
//     } else {
//       const angle = Math.atan2(this.self.body.y - this.target.y, this.self.body.x - this.target.x);
//       this.self.body.velocity.set(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
//       return BehaviorStatus.RUNNING;
//     }
//   }
//   onTerminate() {
//     super.onTerminate();
//     this.self.body.velocity.set(0, 0);
//   }
// }
// ;



import Phaser from "phaser";
import { Action } from "../base/Action";
import { BehaviorStatus } from "../base/BehaviorStatus";
import Blackboard from "../data/Blackboard";
import { GetClosestTaggedObject } from "../data/GetClosestTaggedObject";

export class AccelerateAwayFromNearestTag extends Action {

  private target: { x: number; y: number; };

  constructor(private self: Phaser.Physics.Arcade.Image, private tag: string, private targetDist: number = 100, private speed: number = 125, private blackboard: Blackboard) {
    super();
    this.target = GetClosestTaggedObject(this.blackboard, this.self.body?.position ?? this.self, this.tag);
  }
  update() {
    const dist = Phaser.Math.Distance.Between(
      this.self.body.x,
      this.self.body.y,
      this.target.x,
      this.target.y
    );
    if (dist > this.targetDist) {
      this.self.body.velocity.set(0, 0);
      return BehaviorStatus.SUCCESS;
    } else {
      const angle = Math.atan2(
        this.self.body.y - this.target.y,
        this.self.body.x - this.target.x
      );
      this.self.body.velocity.set(
        Math.cos(angle) * this.speed,
        Math.sin(angle) * this.speed
      );
      return BehaviorStatus.RUNNING;
    }
  }
  onInitialize() {
    super.onInitialize();
    this.self.setMaxVelocity(this.speed, this.speed);
  }
  onTerminate() {
    super.onTerminate();
    this.self.body.velocity.set(0, 0);
  }
}
