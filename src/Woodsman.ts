import Phaser from 'phaser';
import { BehaviorStatus, BehaviorTree, Condition, Decorator } from './BehaviorTree';
import { FreshSequence, Sequence } from "./Sequence";
import { ActiveSelector, Selector } from "./Selector";
import { Item, LocalPlayer, LoggingAction, IsTargetWithinDistance, SetEmote, AccelerateAwayFromPosition, Inverter, CheckAmmoLevel, WaitMillisecondsAction, SetAmmo, LinearMotionTowardsPosition, AdjustHealth, AdjustAmmoAction, rand } from './main';
import { SpawnProjectileBurst, SpawnSimpleProjectile } from './Projectile';
import { GenericAction, getClosestFood, HasFoodNearby } from './Chicken';
import Blackboard from './Blackboard';
import { Throttle, TomatoCrop } from './TomatoCrop';
import { ActualTree } from './ActualTree';
import PoissonNeighborhood from './NeighborhoodGenerator';


export class Falsy extends Decorator {
  update() {
    const status = this.child.tick();
    return status === BehaviorStatus.SUCCESS ? BehaviorStatus.SUCCESS : BehaviorStatus.FAILURE;
  }
}


export class HasTreeNearby extends Condition {
  constructor(private blackboard: Blackboard, private position: { x: number, y: number }, private maxDistance: number) { super(); }
  update() {
    const food = this.blackboard.getTagged('tree:grown') as Phaser.GameObjects.Components.Transform[];
    if (!food.length) {  return BehaviorStatus.FAILURE; }

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

export const getClosestTree = (blackboard: Blackboard, position: { x: number, y: number }, maxDistance: number):null|Phaser.GameObjects.Components.Transform => {
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



export class Woodsman extends Phaser.Physics.Arcade.Image {
  private _numLogsCollected: number = 3;
  public get numLogsCollected(): number {
    return this._numLogsCollected;
  }
  public set numLogsCollected(v: number) {
    this._numLogsCollected = v;
    this.numLogsCollectedDisplay.setText('Logs: ' + this._numLogsCollected);
  }

  numLogsCollectedDisplay: Phaser.GameObjects.Text;
  avatar: Phaser.GameObjects.Sprite;

  ai: BehaviorTree;
  constructor(scene: Phaser.Scene, x: number, y: number, player: LocalPlayer, private blackboard: Blackboard) {
    super(scene, x, y, 'env');

    this.avatar = scene.add.sprite(0,0,'spritesheet', 'Blacksmith_idle-0').setOrigin(0,0);

    this.defineSpriteAnimations();
    this.avatar.anims.play('idle-s');

    this.numLogsCollectedDisplay = scene.add.text(0, 0, 'Logs: ' + this.numLogsCollected, { color: '#000', backgroundColor: 'rgba(255,255,255,0.3)' }).setDepth(10);

    this.ai = new BehaviorTree(
      new ActiveSelector([
        // Melee danger check
        new FreshSequence([
          new LoggingAction('\tWoodsman: Is player within melee range?'),
          // If player is in melee range, bail
          new IsTargetWithinDistance(this.body?.position ?? this, player.body, 75),
          new AccelerateAwayFromPosition(this, player, 125)
        ]),


        // Have logs; build house
        new FreshSequence([
          new GenericAction(()=>{
            return this.numLogsCollected >= 3 ? BehaviorStatus.SUCCESS : BehaviorStatus.FAILURE;
          }),
          new LinearMotionTowardsPosition(this, () => {
            const pt = (this.blackboard.get('neighborhood') as PoissonNeighborhood).getEnds();
            // const pt = pts[(Math.random() * pts.length) | 0];
            // this.scene.add.rectangle(pt[0], pt[1], 32, 32, 0xff0000, 0.9).setDepth(10000);

            if (!pt) { return {x: NaN, y: NaN}; }

            return {x: pt[0], y: pt[1]};
          }, 20, 75),
          // new LinearMotionTowardsPosition(this, () => ({ x: Math.random() * this.scene.scale.width, y: Math.random() * this.scene.scale.height }), 20, 150),
          new GenericAction(()=>{
            // this.numLogsCollected = 0;
            const houseKey = 'House' + (((Math.random() * 10) | 0) + 1);
            const house = scene.add.image(this.x, this.y, 'spritesheet', houseKey).setScale(2.5);

            this.blackboard.tagObject(['emitter:light'], house);

            house.setDepth(house.y + (house.height * 0.5));

            house.setScale(0.4 + (rand() / 2), 0.6 + (rand() / 2));
            scene.tweens.add({
              targets: house,
              props: {
                scaleY: 2.5,
              },
              ease: Phaser.Math.Easing.Bounce.Out,
              duration: 1500,
            })

            scene.tweens.add({
              targets: house,
              props: {
                scaleX: 2.5,
              },
              ease: Phaser.Math.Easing.Bounce.Out,
              duration: 1250,
            })

            return BehaviorStatus.SUCCESS;
          })
        ]),



        new FreshSequence([
          new HasTreeNearby(this.blackboard, this.body?.position ?? this, 1000),
          new LinearMotionTowardsPosition(this, () => {
            return getClosestTree(this.blackboard, this.body?.position ?? this, 1000);
          }, 10, 75, true),
          new WaitMillisecondsAction(1000),
          new GenericAction(()=>{
            const tree = getClosestTree(this.blackboard, this.body?.position ?? this, 10) as ActualTree|null;
            if (!tree){ return BehaviorStatus.FAILURE; }
            // Reset tomato tree
            tree.ai.enabled = false;
            tree.growthStage = 0;
            tree.avatar.setTexture('spritesheet', 'Tree1-Stump');

            // This is bad, the tree itself should be responsible for handling being eaten
            this.blackboard.removeObjectTags(['tree:grown'], tree);
            this.blackboard.tagObject(['tree:stump'], tree);

            setTimeout(()=>{
              tree.ai.enabled = true;
            }, 20_000);
            return BehaviorStatus.SUCCESS;
          }),
          new GenericAction(()=>{
            this.numLogsCollected += 1;
            return BehaviorStatus.SUCCESS;
          }),
          new WaitMillisecondsAction(1000),
        ]),


        new FreshSequence([
          new WaitMillisecondsAction(()=>Math.random()*1000),
          new LinearMotionTowardsPosition(this, () => {
            const pos = {x: this.body?.position.x || this.x, y: this.body?.position.y || this.y};
            pos.x += (Math.random() > 0.5 ? -1 : 1) * (rand() * 50);
            pos.y += (Math.random() > 0.5 ? -1 : 1) * (rand() * 50);

            return pos;
          }, 5, 60),
          new WaitMillisecondsAction(()=>Math.random()*1000),
        ])
      ])
    );

    // Align the emote stuff with the physics body
    this.scene.physics.world.on('worldstep', () => {
      this.avatar.x = this.body.x + 1;
      this.avatar.y = this.body.y - 15;
      this.numLogsCollectedDisplay.x = this.body.x + 1;
      this.numLogsCollectedDisplay.y = this.body.y - 15;
    });
  }

  private defineSpriteAnimations() {
    this.avatar.anims.create({
      key: 'idle-s',
      frames: this.avatar.anims.generateFrameNames('spritesheet', {
        prefix: 'Blacksmith_idle-',
        start: 0,
        end: 3,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 1,
      repeat: -1,
    });


    this.avatar.anims.create({
      key: 'idle-w',
      frames: this.avatar.anims.generateFrameNames('spritesheet', {
        prefix: 'Blacksmith_idle-',
        start: 4,
        end: 7,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 1,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'idle-e',
      frames: this.avatar.anims.generateFrameNames('spritesheet', {
        prefix: 'Blacksmith_idle-',
        start: 8,
        end: 11,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 1,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'idle-n',
      frames: this.avatar.anims.generateFrameNames('spritesheet', {
        prefix: 'Blacksmith_idle-',
        start: 12,
        end: 15,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 1,
      repeat: -1,
    });


    this.avatar.anims.create({
      key: 'walk-s',
      frames: this.avatar.anims.generateFrameNames('spritesheet', {
        prefix: 'Blacksmith_walk-',
        start: 0,
        end: 3,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 1,
      repeat: -1,
    });


    this.avatar.anims.create({
      key: 'walk-w',
      frames: this.avatar.anims.generateFrameNames('spritesheet', {
        prefix: 'Blacksmith_walk-',
        start: 4,
        end: 7,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 1,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'walk-e',
      frames: this.avatar.anims.generateFrameNames('spritesheet', {
        prefix: 'Blacksmith_walk-',
        start: 8,
        end: 11,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 1,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: 'walk-n',
      frames: this.avatar.anims.generateFrameNames('spritesheet', {
        prefix: 'Blacksmith_walk-',
        start: 12,
        end: 15,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 1,
      repeat: -1,
    });
  }

  private getDirectionFromVelocity = (vel:{x:number;y:number;}) => {
    if (Math.abs(vel.x) > Math.abs(vel.y)){
      return vel.x < 0 ? 'w' : 'e';
    } else if (vel.y > 0.1 || vel.y < -0.1) {
      return vel.y < 0 ? 'n' : 's';
    }
    return this._anim;
  }

  private checkIsMoving = () => {
    if (!this.body){ return false; }

    return this.body.velocity.x > 0.1 || this.body.velocity.x < -0.1 || this.body.velocity.y > 0.1 || this.body.velocity.y < -0.1;
  }

  private currentDirection:number = 0;
  private _anim:string = 's';
  preUpdate = (time:number, delta:number) => {
    this._anim = this.getDirectionFromVelocity(this.body?.velocity || {x:0, y:0});
    this.avatar.anims.play(
      (this.checkIsMoving() ? 'walk-' : 'idle-') + this._anim,
      true
    );
  }
}
