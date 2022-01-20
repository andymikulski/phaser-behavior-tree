import Phaser from 'phaser';
import { Action, Behavior, BehaviorStatus, BehaviorTree, Condition, Decorator } from './BehaviorTree';
import { FreshSequence, Sequence } from "./Sequence";
import { ActiveSelector, Selector } from "./Selector";
import { Item, LocalPlayer, LoggingAction, IsTargetWithinDistance, SetEmote, AccelerateAwayFromPosition, Inverter, CheckAmmoLevel, WaitMillisecondsAction, SetAmmo, LinearMotionTowardsPosition, AdjustHealth, AdjustAmmoAction, rand, IsTargetActivelyMoving, SetAnimationSpeed } from './main';
import Blackboard from './Blackboard';
import { AlwaysFail } from './LightingAI';

export class FailingAction extends Action {
  update() {
    return BehaviorStatus.FAILURE;
  }
}

export class Throttle extends Decorator {
  constructor(private throttleMs: number, child: Behavior , private throttledStatus:BehaviorStatus = BehaviorStatus.RUNNING) { super(child); }

  private lastTime: number;
  onInitialize() {
    super.onInitialize();
    this.lastTime = Date.now();
  }
  update() {
    super.update();
    const now = Date.now();
    return (now - this.lastTime < this.throttleMs) ? this.throttledStatus : this.child.tick();
  }
}


export class HasSunlight extends Condition {
  constructor(private blackboard: Blackboard) { super(); }
  update() {
    return this.blackboard.get<boolean>('hasDaylight', false) ? BehaviorStatus.SUCCESS : BehaviorStatus.FAILURE;
  }
}

export class GoToNextGrowthStage extends Condition {
  constructor(private self: { growthStage: GrowthStatus }) { super(); }
  update() {
    if (this.self.growthStage === GrowthStatus.Stage5) {
      return BehaviorStatus.FAILURE;
    }
    this.self.growthStage += 1;
    return BehaviorStatus.SUCCESS;
  }
}

export class ResetGrowthStage extends Condition {
  constructor(private self: { growthStage: GrowthStatus }) { super(); }
  update() {
    this.self.growthStage = 0;
    return BehaviorStatus.SUCCESS;
  }
}

export class SetTextureAction extends Action {
  constructor(private self: Phaser.GameObjects.Image, private texture: string, private frame?: string) { super(); }
  update() {
    this.self.setTexture(this.texture, this.frame);
    return BehaviorStatus.SUCCESS;
  }
}

export class UpdateTomatoPlantTexture extends Action {
  constructor(private self: { growthStage: GrowthStatus }, private img: Phaser.GameObjects.Image) { super(); }
  update() {
    if (this.self.growthStage === GrowthStatus.Seeds) {
      this.img.setTexture('env', 'TomatoSeeds');
    } else {
      this.img.setTexture('env', 'TomatoPlant-' + this.self.growthStage);
    }
    return BehaviorStatus.SUCCESS;
  }
}

export class AddObjectTagToBlackboard extends Action {
  constructor(private self: Phaser.GameObjects.GameObject, private blackboard: Blackboard, private destTags: string[]) { super(); }
  update() {
    this.blackboard.tagObject(this.destTags, this.self);
    return BehaviorStatus.SUCCESS;
  }
}
export class RemoveObjectTagFromBlackboard extends Action {
  constructor(private self: Phaser.GameObjects.GameObject, private blackboard: Blackboard, private destTags: string[]) { super(); }
  update() {
    this.blackboard.removeObjectTags(this.destTags, this.self);
    return BehaviorStatus.SUCCESS;
  }
}

export class IsFullyGrown extends Condition {
  constructor(private self: { growthStage: GrowthStatus }) { super(); }
  update() {
    return this.self.growthStage >= GrowthStatus.Stage5 ? BehaviorStatus.SUCCESS : BehaviorStatus.FAILURE;
  }
}


enum GrowthStatus {
  Seeds = 0,
  Stage1,
  Stage2,
  Stage3,
  Stage4,
  Stage5,
}


export class TomatoCrop extends Phaser.Physics.Arcade.Image {
  public growthStage: GrowthStatus = GrowthStatus.Seeds;

  avatar: Phaser.GameObjects.Image;
  emote: Phaser.GameObjects.Image;
  emoteBg: Phaser.GameObjects.Image;
  ai: BehaviorTree;
  constructor(scene: Phaser.Scene, x: number, y: number, private blackboard: Blackboard) {
    super(scene, x, y, 'env', 'TomatoSeeds');

    this.emoteBg = scene.add.image(0, 0, 'bubbles', 'round_speech_bubble').setDepth(1).setScale(3).setVisible(false);
    this.emote = scene.add.image(0, 0, 'bubbles', 'faceHappy').setDepth(2).setScale(3).setVisible(false);
    this.avatar = scene.add.image(0, 0, 'env', 'TomatoSeeds').setDepth(2).setOrigin(0.5, 0.5).setDisplaySize(32, 32).setScale(3);

    this.ai = new BehaviorTree(
      new ActiveSelector([
        new AlwaysFail(new UpdateTomatoPlantTexture(this, this.avatar)),

        new FreshSequence([
          new HasSunlight(this.blackboard),
          new WaitMillisecondsAction(() => 1000 + (Math.random() * 5000)),
          new GoToNextGrowthStage(this),
          new UpdateTomatoPlantTexture(this, this.avatar),
        ]),
        new FreshSequence([
          new IsFullyGrown(this),
          new AddObjectTagToBlackboard(this, this.blackboard, ['food']),
        ])
        // new Sequence([
        //   // new FailingAction(),
        //   new IsFullyGrown(this),
        //   new WaitMillisecondsAction(() => 100 + (Math.random() * 500)),
        //   new RemoveObjectTagFromBlackboard(this, this.blackboard, ['food']),
        //   new ResetGrowthStage(this),
        //   new UpdateTomatoPlantTexture(this, this.avatar),
        //   new WaitMillisecondsAction(() => 100 + (Math.random() * 500)),
        // ])
      ])
    );


    // Align the emote stuff with the physics body
    this.scene.physics.world.on('worldstep', () => {
      this.emote.x = this.body.x + 16;
      this.emote.y = this.body.y - 32;
      this.emoteBg.x = this.body.x + 16;
      this.emoteBg.y = this.body.y - 32;

      this.avatar.x = this.body.x;
      this.avatar.y = this.body.y;
      this.avatar.setDepth(this.avatar.y + (this.avatar.height * 0.75));

      let wasFlipped = this.avatar.flipX;
      if (this.body.velocity.x === 0) {
        this.avatar.flipX = wasFlipped;
      } else {
        this.avatar.flipX = this.body.velocity.x < 0;
      }
    });
  }
}
