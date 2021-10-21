import Phaser, { GameObjects } from 'phaser';
import { Action, BehaviorStatus, BehaviorTree, Condition } from './BehaviorTree';
import { FreshSequence, Sequence } from "./Sequence";
import { ActiveSelector, Selector } from "./Selector";
import { Item, LocalPlayer, LoggingAction, IsTargetWithinDistance, SetEmote, AccelerateAwayFromPosition, Inverter, CheckAmmoLevel, WaitMillisecondsAction, SetAmmo, LinearMotionTowardsPosition, AdjustHealth, AdjustAmmoAction, rand, IsTargetActivelyMoving, SetAnimationSpeed } from './main';
import Blackboard from './Blackboard';
import { ResetGrowthStage, TomatoCrop } from './TomatoCrop';

export class HasFoodNearby extends Condition {
  constructor(private blackboard: Blackboard, private position: { x: number, y: number }, private maxDistance: number) { super(); }
  update() {
    const food = this.blackboard.getTagged('food') as Phaser.GameObjects.Components.Transform[];
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

export const getClosestFood = (blackboard: Blackboard, position: { x: number, y: number }, maxDistance: number):null|Phaser.GameObjects.Components.Transform => {
  const food = blackboard.getTagged('food') as Phaser.GameObjects.Components.Transform[];
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

export class GenericAction extends Action {
  constructor(private fn:()=>BehaviorStatus) { super(); }
  update(){
    return this.fn();
  }
}

export class Chicken extends Phaser.Physics.Arcade.Image {
  avatar: Phaser.GameObjects.Sprite;
  emote: Phaser.GameObjects.Image;
  emoteBg: Phaser.GameObjects.Image;
  ai: BehaviorTree;
  constructor(scene: Phaser.Scene, x: number, y: number, player: LocalPlayer, private blackboard: Blackboard) {
    super(scene, x, y, 'mario');


    this.emoteBg = scene.add.image(0, 0, 'bubbles', 'round_speech_bubble').setDepth(10).setScale(3).setVisible(false);
    this.emote = scene.add.image(0, 0, 'bubbles', 'faceHappy').setDepth(20).setScale(3).setVisible(false);
    this.avatar = scene.add.sprite(0, 0, 'env', 'Chicken-1').setDepth(20).setDisplaySize(32, 32).setOrigin(0, 0);

    this.avatar.anims.create({
      key: 'ChickenAnim',
      frames: this.avatar.anims.generateFrameNames('env', {
        prefix: 'Chicken-',
        start: 0,
        end: 4,
        suffix: '',
        zeroPad: 0,
      }),
      duration: 1000 / 1,
      repeat: -1,
    });

    this.avatar.anims.play('ChickenAnim');

    this.ai = new BehaviorTree(
      new ActiveSelector([
        // Melee danger check
        new FreshSequence([
          // new LoggingAction('\Chicken: Is player too close?'),
          // If player is too close..
          new IsTargetWithinDistance(this.body?.position ?? this, player.body, 100),
          // .. and they're moving around..
          new IsTargetActivelyMoving(player.body as Phaser.Physics.Arcade.Body),
          // Startled! Run away!
          new SetEmote(this, 'alert'),
          // new LoggingAction('\Chicken: Player is too close, bail!'),
          new SetAnimationSpeed(this.avatar, 4),
          new AccelerateAwayFromPosition(this, player.body, 125, 200),
          new WaitMillisecondsAction(500),
        ]),

        // Find and eat nearby food
        new FreshSequence([
          new HasFoodNearby(this.blackboard, this.body?.position ?? this, 200),
          new SetEmote(this, 'exclamation'),
          new SetAnimationSpeed(this.avatar, 2),
          new LinearMotionTowardsPosition(this, () => {
            return getClosestFood(this.blackboard, this.body?.position ?? this, 200);
          }, 10, 100, true),
          // new LoggingAction('Chicken: Reached the food!'),
          new WaitMillisecondsAction(1000),
          new GenericAction(()=>{
            const closestFood = getClosestFood(this.blackboard, this.body?.position ?? this, 10) as TomatoCrop|null;
            if (!closestFood){ return BehaviorStatus.FAILURE; }
            // Reset tomato plant
            closestFood.ai.enabled = false;
            closestFood.growthStage = 0;
            closestFood.avatar.setTexture('env', 'TomatoSeeds');

            // This is bad, the plant itself should be responsible for handling being eaten
            this.blackboard.removeObjectTags(['food'], closestFood);
            setTimeout(()=>{
              closestFood.ai.enabled = true;
            }, 5000);

            return BehaviorStatus.SUCCESS;
          }),
          new SetAnimationSpeed(this.avatar, 1),
          new SetEmote(this, 'faceHappy'),
          // new LoggingAction('Chicken: FOOD ANNIHIALIATED'),
          new WaitMillisecondsAction(1000),
        ]),

        // Idle
        new FreshSequence([
          new SetEmote(this, null),
          new SetAnimationSpeed(this.avatar, 1),
          // new LoggingAction('\Chicken: Idling..'),
          new WaitMillisecondsAction(500),
          // Wander
          new LinearMotionTowardsPosition(this, () => ({ x: rand() * this.scene.scale.width, y: rand() * this.scene.scale.height }), 20, 60),
          new WaitMillisecondsAction(500),
        ])
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

      this.avatar.setDepth(this.avatar.y + (this.avatar.height));

      this.emoteBg.setDepth(this.avatar.depth);
      this.emote.setDepth(this.avatar.depth + 1);

      let wasFlipped = this.avatar.flipX;
      if (this.body.velocity.x === 0) {
        this.avatar.flipX = wasFlipped;
      } else {
        this.avatar.flipX = this.body.velocity.x < 0;
      }
    });
  }
}
