import Phaser from 'phaser';
import { BehaviorTree } from './BehaviorTree';
import { FreshSequence, Sequence } from "./Sequence";
import { ActiveSelector, Selector } from "./Selector";
import { Item, LocalPlayer, LoggingAction, IsTargetWithinDistance, SetEmote, AccelerateAwayFromPosition, Inverter, CheckAmmoLevel, WaitMillisecondsAction, SetAmmo, LinearMotionTowardsPosition, AdjustHealth, AdjustAmmoAction, rand, IsTargetActivelyMoving } from './main';

export class Chicken extends Phaser.Physics.Arcade.Image {
  avatar: Phaser.GameObjects.Sprite;
  emote: Phaser.GameObjects.Image;
  emoteBg: Phaser.GameObjects.Image;
  ai: BehaviorTree;
  constructor(scene: Phaser.Scene, x: number, y: number, player: LocalPlayer) {
    super(scene, x, y, 'mario');

    this.emoteBg = scene.add.image(0, 0, 'bubbles', 'round_speech_bubble').setDepth(1).setScale(3).setVisible(false);
    this.emote = scene.add.image(0, 0, 'bubbles', 'faceHappy').setDepth(2).setScale(3).setVisible(false);
    this.avatar = scene.add.sprite(0, 0, 'env', 'Chicken-1').setDepth(2).setDisplaySize(32, 32).setOrigin(0, 0);


    // ????
    // this.avatar.anims.play('ChickenAnim');

    this.ai = new BehaviorTree(
      new ActiveSelector([
        // Melee danger check
        new FreshSequence([
          new LoggingAction('\Chicken: Is player too close?'),
          // If player is too close..
          new IsTargetWithinDistance(this.body?.position ?? this, player.body, 100),
          // .. and they're moving around..
          // new IsTargetActivelyMoving(player.body as Phaser.Physics.Arcade.Body),
          // Startled! Run away!
          new SetEmote(this, 'alert'),
          new LoggingAction('\Chicken: Player is too close, bail!'),
          new AccelerateAwayFromPosition(this, player.body, 125, 200),
          new WaitMillisecondsAction(500),
        ]),

        // Idle
        new FreshSequence([
          new SetEmote(this, null),
          new LoggingAction('\Chicken: Idling..'),
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

      let wasFlipped = this.avatar.flipX;
      if (this.body.velocity.x === 0) {
        this.avatar.flipX = wasFlipped;
      } else {
        this.avatar.flipX = this.body.velocity.x < 0;
      }
    });
  }
}
