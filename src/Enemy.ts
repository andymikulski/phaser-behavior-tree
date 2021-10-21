import Phaser from 'phaser';
import { BehaviorTree } from './BehaviorTree';
import { FreshSequence, Sequence } from "./Sequence";
import { ActiveSelector, Selector } from "./Selector";
import { Item, LocalPlayer, LoggingAction, IsTargetWithinDistance, SetEmote, AccelerateAwayFromPosition, Inverter, CheckAmmoLevel, WaitMillisecondsAction, SetAmmo, LinearMotionTowardsPosition, AdjustHealth, AdjustAmmoAction, rand } from './main';
import { SpawnSimpleProjectile } from './Projectile';

export class Enemy extends Phaser.Physics.Arcade.Image {
  inventory: Item[] = [];

  private _ammo: number = 3;
  public get ammo(): number {
    return this._ammo;
  }
  public set ammo(v: number) {
    this._ammo = v;
    this.ammoDisplay.setText('Ammo: ' + this._ammo);
  }

  ammoDisplay: Phaser.GameObjects.Text;
  avatar: Phaser.GameObjects.Image;
  emote: Phaser.GameObjects.Image;
  emoteBg: Phaser.GameObjects.Image;
  ai: BehaviorTree;
  constructor(scene: Phaser.Scene, x: number, y: number, player: LocalPlayer) {
    super(scene, x, y, 'mario');


    this.ammoDisplay = scene.add.text(0, 0, 'Ammo: ' + this.ammo, { color: '#000', backgroundColor: 'rgba(255,255,255,0.3)' }).setDepth(10);

    this.emoteBg = scene.add.image(0, 0, 'bubbles', 'round_speech_bubble').setDepth(1).setScale(3);
    this.emote = scene.add.image(0, 0, 'bubbles', 'faceHappy').setDepth(2).setScale(3);
    this.avatar = scene.add.image(0, 0, 'mario').setDepth(2).setDisplaySize(32, 32).setOrigin(0, 0);
    this.avatar.setTint(0xff0000);

    this.ai = new BehaviorTree(
      new ActiveSelector([
        // Melee danger check
        new FreshSequence([
          new LoggingAction('\tEnemy: Is player within melee range?'),
          // If player is in melee range, bail
          new IsTargetWithinDistance(this.body?.position ?? this, player.body, 75),
          new SetEmote(this, 'alert'),
          new LoggingAction('\tEnemy: Player is too close, bail!'),
          new AccelerateAwayFromPosition(this, player, 125)
        ]),

        // Reload!
        new FreshSequence([
          new LoggingAction(() => '\tEnemy: Do I need to reload? ' + this.ammo),
          new Inverter(new CheckAmmoLevel(this, 1)),


          // Set visual indicator
          new SetEmote(this, 'drops'),
          new LoggingAction('\tEnemy: Need to reload!'),

          // Reload
          new Selector([
            // Check if it's safe to reload (or move away from the player if too close)
            new Sequence([
              new IsTargetWithinDistance(this.body?.position ?? this, player.body, 160),
              new SetEmote(this, 'alert'),
              new LoggingAction('\tEnemy: Player is too close, running away first!'),
              new AccelerateAwayFromPosition(this, player, 200)
            ]),
            // Actually reload weapon
            new Sequence([
              new LoggingAction('\tEnemy: Reloading!'),
              new WaitMillisecondsAction(500),
              new SetAmmo(this, 3),
              new LoggingAction('\tEnemy: I have ammo!'),
            ])
          ])
        ]),

        // Is a player nearby? If so run towards them so they are within attacking range
        new Sequence([
          new LoggingAction('\tEnemy: Do I see an enemy?'),
          new IsTargetWithinDistance(this.body?.position ?? this, player.body, 300),

          new LoggingAction('\t\tEnemy: I see the player!'),
          new SetEmote(this, 'exclamation'),
          new LinearMotionTowardsPosition(this, player.body, 150),
          new LoggingAction('\t\tEnemy: I am close enough to the player!'),
          new SetEmote(this, 'faceAngry'),
          new WaitMillisecondsAction(500),
          new LoggingAction(() => '\t\tEnemy: ATTACK! ' + this.ammo),
          new SpawnSimpleProjectile(this.scene, this.body?.position ?? this, player.body),
          new AdjustAmmoAction(this, -1),
          new WaitMillisecondsAction(500),
          // new AdjustHealth(player, -10),
        ]),

        // Idle
        new FreshSequence([
          new SetEmote(this, 'faceHappy'),
          new LoggingAction('\tEnemy: Idling..'),
          new WaitMillisecondsAction(500),
          new Selector([
            // Check if needs to reload after last combat
            new Sequence([
              new Inverter(new CheckAmmoLevel(this, 3)),
              new LoggingAction('\tEnemy: Reloading!'),
              new WaitMillisecondsAction(500),
              new SetAmmo(this, 3),
              new LoggingAction('\tEnemy: I have ammo!'),
              new WaitMillisecondsAction(500),
            ]),
            // Wander
            new Sequence([
              new LinearMotionTowardsPosition(this, () => ({ x: rand() * this.scene.scale.width, y: rand() * this.scene.scale.height }), 10),
              new WaitMillisecondsAction(500),
            ])
          ])
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

      this.ammoDisplay.x = this.body.x - 16;
      this.ammoDisplay.y = this.body.y + 32;

      let wasFlipped = this.avatar.flipX;
      if (this.body.velocity.x === 0) {
        this.avatar.flipX = wasFlipped;
      } else {
        this.avatar.flipX = this.body.velocity.x < 0;
      }
    });
  }
}
