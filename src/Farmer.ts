import Phaser from 'phaser';
import { BehaviorTree } from './ai/BehaviorTree';
import { BehaviorStatus } from "./ai/base/BehaviorStatus";
import { ActiveSelector } from "./ai/base/Selector";
import { LocalPlayer, rand } from './main';
import { SetAnimation } from "./ai/actions/SetAnimation";
import { IsTargetWithinDistance } from "./ai/conditions/IsTargetWithinDistance";
import { Inverter } from "./ai/decorators/Inverter";
import { WaitMillisecondsAction } from "./ai/actions/WaitMillisecondsAction";
import { getClosestFood, HasFoodNearby } from './Chicken';
import { GenericAction } from "./ai/actions/GenericAction";
import Blackboard from './ai/data/Blackboard';
import { TomatoCrop } from './TomatoCrop';
import { Condition } from './ai/base/Condition';
import { FreshSequence } from './ai/base/Sequence';
import { LoggingAction } from './ai/actions/LoggingAction';
import AccelerateAwayFromPosition from './ai/actions/AccelerateAwayFromPosition';
import { IsTagWithinDistance } from './ai/conditions/IsTagWithinDistance';
import { LinearMotionTowardsPosition } from './ai/actions/LinearMotionTowardsPosition';



export class HasTreeNearby extends Condition {
  constructor(private blackboard: Blackboard, private position: { x: number, y: number }, private maxDistance: number) { super(); }
  update() {
    const food = this.blackboard.getTagged('tree:grown') as Phaser.GameObjects.Components.Transform[];
    if (!food.length) { return BehaviorStatus.FAILURE; }

    let dist;
    let lowestDist = Infinity;
    for (let i = 0; i < food.length; i++) {
      dist = Phaser.Math.Distance.BetweenPoints(food[i], this.position);
      lowestDist = lowestDist < dist ? lowestDist : dist;
      if (dist <= this.maxDistance) { return BehaviorStatus.SUCCESS; }
    }
    return BehaviorStatus.FAILURE;
  }
}

export const getClosestTree = (blackboard: Blackboard, position: { x: number, y: number }, maxDistance: number): null | Phaser.GameObjects.Components.Transform => {
  const food = blackboard.getTagged('tree:grown') as Phaser.GameObjects.Components.Transform[];
  if (!food.length) { return null; }

  let dist;
  let closestDist = Infinity;
  let nearestFood = null;
  for (let i = 0; i < food.length; i++) {
    dist = Phaser.Math.Distance.BetweenPoints(food[i], position);

    if (dist > closestDist || dist > maxDistance) { continue; }
    if (dist < closestDist) {
      closestDist = dist;
      nearestFood = food[i];
    }
  }

  return nearestFood;
}



export class Farmer extends Phaser.Physics.Arcade.Image {
  private _numTomatoesCollected: number = 0;
  public get numTomatoesCollected(): number {
    return this._numTomatoesCollected;
  }
  public set numTomatoesCollected(v: number) {
    this._numTomatoesCollected = v;
    this.numTomatoesCollectedDisplay.setText('Tomatoes: ' + this._numTomatoesCollected);
  }

  numLogsCollectedDisplay: Phaser.GameObjects.Text;
  numTomatoesCollectedDisplay: Phaser.GameObjects.Text;
  avatar: Phaser.GameObjects.Sprite;

  ai: BehaviorTree;
  constructor(scene: Phaser.Scene, x: number, y: number, player: LocalPlayer, private blackboard: Blackboard) {
    super(scene, x, y, 'env');

    this.avatar = scene.add.sprite(0, 0, 'generic-avatar', 'walk-0').setOrigin(0, 0).setDisplaySize(64, 64).setTint(0xa1e064);

    this.defineSpriteAnimations();
    this.avatar.anims.play('idle-s');

    this.numTomatoesCollectedDisplay = scene.add.text(0, 0, 'Tomatoes: ' + this.numTomatoesCollected, { color: '#000', backgroundColor: 'rgba(255,255,255,0.3)' }).setDepth(10);

    this.ai = new BehaviorTree(
      new ActiveSelector([
        // Melee danger check
        new FreshSequence([
          new LoggingAction('\tWoodsman: Is player within melee range?'),
          // If player is in melee range, bail
          new IsTargetWithinDistance(this.body?.position ?? this, player.body, 75),
          new AccelerateAwayFromPosition(this, player, 125)
        ]),


        // Find and pick tomatoes
        new FreshSequence([
          new HasFoodNearby(this.blackboard, this.body?.position ?? this, 300),
          new SetAnimation(this.avatar, 'walk-e'),
          new LinearMotionTowardsPosition(this, () => {
            return getClosestFood(this.blackboard, this.body?.position ?? this, 300);
          }, 10, 100, true),
          new SetAnimation(this.avatar, 'hoe-w'),
          // new LoggingAction('Chicken: Reached the food!'),
          new WaitMillisecondsAction(1000),
          new GenericAction(() => {
            const closestFood = getClosestFood(this.blackboard, this.body?.position ?? this, 10) as TomatoCrop | null;
            if (!closestFood) { return BehaviorStatus.FAILURE; }
            // Reset tomato plant
            closestFood.ai.enabled = false;
            closestFood.growthStage = 0;
            closestFood.avatar.setTexture('env', 'TomatoSeeds');

            // This is bad, the plant itself should be responsible for handling being eaten
            this.blackboard.removeObjectTags(['food'], closestFood);
            setTimeout(() => {
              closestFood.ai.enabled = true;
            }, 3000);

            return BehaviorStatus.SUCCESS;
          }),
          new GenericAction(() => {
            this.numTomatoesCollected += 1;
            return BehaviorStatus.SUCCESS;
          }),
          new SetAnimation(this.avatar, 'idle-s'),
          // new LoggingAction('Chicken: FOOD ANNIHIALIATED'),
          new WaitMillisecondsAction(1000),
        ]),



        // Idle
        new FreshSequence([
          new SetAnimation(this.avatar, 'idle-s'),
          new WaitMillisecondsAction(() => Math.random() * 1000),
          new SetAnimation(this.avatar, 'walk-s'),
          new LinearMotionTowardsPosition(this, () => {
            const pos = { x: this.body?.position.x || this.x, y: this.body?.position.y || this.y };
            pos.x += (Math.random() > 0.5 ? -1 : 1) * (rand() * 50);
            pos.y += (Math.random() > 0.5 ? -1 : 1) * (rand() * 50);

            return pos;
          }, 5, 60),
          new SetAnimation(this.avatar, 'idle-s'),
          new WaitMillisecondsAction(() => Math.random() * 1000),
        ])
      ])
    );

    // Align the emote stuff with the physics body
    this.scene.physics.world.on('worldstep', () => {
      this.avatar.x = this.body.x + 1;
      this.avatar.y = this.body.y - 15;

      this.numTomatoesCollectedDisplay.x = this.body.x + 1;
      this.numTomatoesCollectedDisplay.y = this.body.y - 15;
    });
  }

  // private defineSpriteAnimations() {
  //   this.avatar.anims.create({
  //     key: 'idle-s',
  //     frames: this.avatar.anims.generateFrameNames('spritesheet', {
  //       prefix: 'Blacksmith_idle-',
  //       start: 0,
  //       end: 3,
  //       suffix: '',
  //       zeroPad: 0,
  //     }),
  //     duration: 1000 / 1,
  //     repeat: -1,
  //   });


  //   this.avatar.anims.create({
  //     key: 'idle-w',
  //     frames: this.avatar.anims.generateFrameNames('spritesheet', {
  //       prefix: 'Blacksmith_idle-',
  //       start: 4,
  //       end: 7,
  //       suffix: '',
  //       zeroPad: 0,
  //     }),
  //     duration: 1000 / 1,
  //     repeat: -1,
  //   });

  //   this.avatar.anims.create({
  //     key: 'idle-e',
  //     frames: this.avatar.anims.generateFrameNames('spritesheet', {
  //       prefix: 'Blacksmith_idle-',
  //       start: 8,
  //       end: 11,
  //       suffix: '',
  //       zeroPad: 0,
  //     }),
  //     duration: 1000 / 1,
  //     repeat: -1,
  //   });

  //   this.avatar.anims.create({
  //     key: 'idle-n',
  //     frames: this.avatar.anims.generateFrameNames('spritesheet', {
  //       prefix: 'Blacksmith_idle-',
  //       start: 12,
  //       end: 15,
  //       suffix: '',
  //       zeroPad: 0,
  //     }),
  //     duration: 1000 / 1,
  //     repeat: -1,
  //   });


  //   this.avatar.anims.create({
  //     key: 'walk-s',
  //     frames: this.avatar.anims.generateFrameNames('spritesheet', {
  //       prefix: 'Blacksmith_walk-',
  //       start: 0,
  //       end: 3,
  //       suffix: '',
  //       zeroPad: 0,
  //     }),
  //     duration: 1000 / 1,
  //     repeat: -1,
  //   });


  //   this.avatar.anims.create({
  //     key: 'walk-w',
  //     frames: this.avatar.anims.generateFrameNames('spritesheet', {
  //       prefix: 'Blacksmith_walk-',
  //       start: 4,
  //       end: 7,
  //       suffix: '',
  //       zeroPad: 0,
  //     }),
  //     duration: 1000 / 1,
  //     repeat: -1,
  //   });

  //   this.avatar.anims.create({
  //     key: 'walk-e',
  //     frames: this.avatar.anims.generateFrameNames('spritesheet', {
  //       prefix: 'Blacksmith_walk-',
  //       start: 8,
  //       end: 11,
  //       suffix: '',
  //       zeroPad: 0,
  //     }),
  //     duration: 1000 / 1,
  //     repeat: -1,
  //   });

  //   this.avatar.anims.create({
  //     key: 'walk-n',
  //     frames: this.avatar.anims.generateFrameNames('spritesheet', {
  //       prefix: 'Blacksmith_walk-',
  //       start: 12,
  //       end: 15,
  //       suffix: '',
  //       zeroPad: 0,
  //     }),
  //     duration: 1000 / 1,
  //     repeat: -1,
  //   });
  // }

  private defineSpriteAnimations() {
    this.avatar.anims.create({
      key: 'walk-s',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'walk-',
        start: 0,
        end: 7,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'walk-n',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'walk-',
        start: 8,
        end: 15,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'walk-e',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'walk-',
        start: 16,
        end: 23,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'walk-w',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'walk-',
        start: 24,
        end: 31,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'axe-s',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'axe-',
        start: 0,
        end: 4,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'axe-n',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'axe-',
        start: 5,
        end: 9,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'axe-e',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'axe-',
        start: 10,
        end: 14,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'axe-w',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'axe-',
        start: 15,
        end: 19,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'hoe-s',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'hoe-',
        start: 0,
        end: 4,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'hoe-n',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'hoe-',
        start: 5,
        end: 9,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'hoe-e',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'hoe-',
        start: 10,
        end: 14,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'hoe-w',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'hoe-',
        start: 15,
        end: 19,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'die',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'die-',
        start: 0,
        end: 1,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'sword-s',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'sword-',
        start: 0,
        end: 3,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,

    });

    this.avatar.anims.create({
      key: 'sword-s',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'sword-',
        start: 0,
        end: 3,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,

    });

    this.avatar.anims.create({
      key: 'sword-n',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'sword-',
        start: 4,
        end: 7,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,

    });

    this.avatar.anims.create({
      key: 'sword-e',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'sword-',
        start: 8,
        end: 11,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,

    });

    this.avatar.anims.create({
      key: 'sword-w',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'sword-',
        start: 12,
        end: 15,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,

    });

    this.avatar.anims.create({
      key: 'water-s',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'water-',
        start: 0,
        end: 1,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'water-n',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'water-',
        start: 2,
        end: 3,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'water-e',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'water-',
        start: 4,
        end: 5,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'water-w',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'water-',
        start: 6,
        end: 7,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'idle-s',
      frames: this.avatar.anims.generateFrameNames('generic-avatar', {
        prefix: 'walk-',
        start: 0,
        end: 0,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 1,
      repeat: -1,
    });

    this.avatar.anims.play('walk-s');
  }

  private getDirectionFromVelocity = (vel: { x: number; y: number; }) => {
    if (Math.abs(vel.x) > Math.abs(vel.y)) {
      return vel.x < 0 ? 'w' : 'e';
    } else if (vel.y > 0.1 || vel.y < -0.1) {
      return vel.y < 0 ? 'n' : 's';
    }
    return this._anim;
  }

  private checkIsMoving = () => {
    if (!this.body) { return false; }

    return this.body.velocity.x > 0.1 || this.body.velocity.x < -0.1 || this.body.velocity.y > 0.1 || this.body.velocity.y < -0.1;
  }

  private currentDirection: number = 0;
  private _anim: string = 's';
  preUpdate = (time: number, delta: number) => {
    // this._anim = this.getDirectionFromVelocity(this.body?.velocity || {x:0, y:0});
    // this.avatar.anims.play(
    //   (this.checkIsMoving() ? 'walk-' : 'idle-') + this._anim,
    //   true
    // );
  }
}
