
import Phaser from 'phaser';
import { Action, Behavior, BehaviorStatus, BehaviorTree, Condition, Decorator } from './BehaviorTree';
import { Sequence } from "./Sequence";
import { ActiveSelector, Selector } from "./Selector";
import { RandomSelector } from "./RandomSelector";
import { RepeatDecorator } from './RepeatDecorator';
import throttle from './throttle';


const rand = () => (Math.random() + Math.random() + Math.random()) / 3;

// import SpritesheetStuff from './asset/sprites.json';
// const itemNames = SpritesheetStuff.textures[0].frames.map(y => y.filename);
// console.log('itemnames', itemNames);

const game = new Phaser.Game({
  width: 1024,
  height: 768,
  backgroundColor: 0xa1e064,

  pixelArt: true,

  scale: {
    mode: Phaser.Scale.FIT,
  },

  physics: {
    default: 'arcade',
    arcade: {
      debug: true,
      gravity: {
        y: 0,
      }
    }
  },

  scene: class extends Phaser.Scene {
    private enemies: Enemy[] = [];
    private items: Item[] = [];
    private player: LocalPlayer;

    preload = () => {
      console.log('preload')
      this.load.atlas('sprites', 'asset/sprites.png', 'asset/sprites.json');
      this.load.image('mario', 'https://i.imgur.com/nKgMvuj.png');
      this.load.image('background', 'https://i.imgur.com/dzpw15B.jpg');

      this.load.atlas('bubbles', 'asset/bubbles.png', 'asset/bubbles.json');
    }

    create = () => {
      this.input.mouse.disableContextMenu();
      this.physics.world.setBounds(0, 0, 1024, 768);


      const bg = this.add.image(0, 0, 'background').setOrigin(0, 0).setDisplaySize(1024, 768).setDepth(-1).setAlpha(0.3);

      const lp = new LocalPlayer(this, 128, 128);
      const player = this.physics.add.existing(lp).setDisplaySize(32, 32).setCollideWorldBounds(true).setMaxVelocity(100, 100);
      this.player = player;


      (player.body as Phaser.Physics.Arcade.Body).syncBounds = true;

      for (let i = 0; i < 10; i++) {
        const enemy = new Enemy(this, Math.random() * this.scale.width, Math.random() * this.scale.height, player).setDisplaySize(32, 32).setDepth(10);


        this.physics.add.existing(enemy).setCollideWorldBounds(true).setMaxVelocity(75, 75).setImmovable(false).setPushable(true);
        this.enemies.push(enemy);
        // (enemy.body as Phaser.Physics.Arcade.Body).syncBounds = true;
      }

      // const collisionGroup = this.physics.add.group(this.enemies);
      // collisionGroup.add(player);

      // this.physics.add.collider(collisionGroup, collisionGroup);

      this.time.addEvent({
        loop: true,
        callback: this.updateAI,
      });
      this.time.addEvent({
        loop: true,
        callback: this.updateLocalAgent,
      });

      // for (let i = 0; i < this.enemies.length; i++) {
      //   this.enemies[i].ai.tick();
      // }
      // setInterval(() => {
      //   for (let i = 0; i < this.enemies.length; i++) {
      //     this.enemies[i].ai.tick();
      //   }
      // }, 15_000);

      (window as any).step = this.updateAI;
    }

    updateLocalAgent = throttle(() => {
      this.player.ai?.tick();
    }, 1000 / 30); // 30fps

    updateAI = throttle(() => {
      for (let i = 0; i < this.enemies.length; i++) {
        this.enemies[i].ai.tick();
      }
    }, 1000 / 10); // 10fps - increasing this speed makes them appear smarter
  }
});


class Idle extends Action {
  constructor() {
    super();
  }
  update() {
    return BehaviorStatus.RUNNING;
  }
};



class AccelerateTowardsPosition extends Action {
  constructor(private self: Phaser.Physics.Arcade.Image, private target: { x: number; y: number; }, private range: number = 100) {
    super();
  }
  update() {
    const dist = Phaser.Math.Distance.Between(
      this.self.body.x, this.self.body.y,
      this.target.x, this.target.y,
    );
    if (dist > this.range) {
      this.self.body.velocity.set(this.target.x - this.self.body.x, this.target.y - this.self.body.y)
      return BehaviorStatus.RUNNING;
    } else {
      return BehaviorStatus.SUCCESS;
    }
  }
  onTerminate() {
    super.onTerminate();
    this.self.body.velocity.set(0, 0);
  }
};


class ShootProjectile extends Action {
  constructor(private emitter: Phaser.GameObjects.Particles.ParticleEmitter, private from: { x: number; y: number; }, private to: { x: number; y: number; }) {
    super();
  }

  update() {
    const angle = Math.atan2(this.to.y - this.from.y, this.to.x - this.from.x);
    this.emitter.setEmitterAngle(angle);
    this.emitter.emitParticleAt(this.from.x, this.from.y, 10);

    return BehaviorStatus.SUCCESS;
  }
}

class AdjustHealth extends Action {
  constructor(private entity: { health: number; }, private amount: number) {
    super();
  }
  onInitialize() {
    super.onInitialize();
    this.entity.health += this.amount;
  }
  update() {
    return BehaviorStatus.SUCCESS;
  }
};
class SetAmmo extends Action {
  constructor(private entity: { ammo: number; }, private amount: number) {
    super();
  }
  onInitialize() {
    super.onInitialize();
    this.entity.ammo = Math.max(0, this.amount); // this.entity.ammo + this.amount);
  }
  update() {
    return BehaviorStatus.SUCCESS;
  }
};


class LinearMotionTowardsPosition extends Action {
  private targetX: number;
  private targetY: number;
  constructor(private self: Phaser.Physics.Arcade.Image, private target: { x: number; y: number; } | (() => { x: number; y: number; }), private distThreshold: number = 5) {
    super();

    this.calcTargetXY();
  }

  private calcTargetXY() {
    let targetX, targetY;

    if (typeof this.target === 'function') {
      const res = this.target();
      targetX = res.x;
      targetY = res.y;
    } else {
      targetX = this.target.x;
      targetY = this.target.y;
    }

    this.targetX = targetX;
    this.targetY = targetY;
  }

  onInitialize() {
    super.onInitialize();
    this.self.setMaxVelocity(150, 150);
    this.calcTargetXY();
  }

  update() {
    const dist = Phaser.Math.Distance.Between(
      this.self.body.x, this.self.body.y,
      this.targetX, this.targetY,
    );
    if (dist > this.distThreshold) {
      const angle = Math.atan2(this.targetY - this.self.body.y, this.targetX - this.self.body.x);
      this.self.body.velocity.set(Math.cos(angle) * 150, Math.sin(angle) * 150);
      return BehaviorStatus.RUNNING;
    } else {
      this.self.body.velocity.set(0, 0);
      return BehaviorStatus.SUCCESS;
    }
  }
  onTerminate() {
    console.log('LinearMotionTowardsPosition cancelled');
    super.onTerminate();
    this.self.body.velocity.set(0, 0);
  }
};


class AccelerateAwayFromPosition extends Action {
  constructor(private self: Phaser.Physics.Arcade.Image, private target: { x: number; y: number; }, private targetDist: number = 100) {
    super();
  }
  update() {
    const dist = Phaser.Math.Distance.Between(
      this.self.body.x, this.self.body.y,
      this.target.x, this.target.y,
    );
    if (dist > this.targetDist) {
      this.self.body.velocity.set(0, 0);
      return BehaviorStatus.SUCCESS;
    } else {
      const angle = Math.atan2(this.self.body.y - this.target.y, this.self.body.x - this.target.x);
      this.self.body.velocity.set(Math.cos(angle) * 125, Math.sin(angle) * 125);
      return BehaviorStatus.RUNNING;
    }
  }
  onTerminate() {
    super.onTerminate();
    this.self.body.velocity.set(0, 0);
  }
};


class IsTargetWithinDistance extends Condition {
  constructor(private self: { x: number; y: number; }, private target: { x: number; y: number; }, private maxDistance: number) {
    super();
  }

  update() {
    const dist = Phaser.Math.Distance.Between(
      this.self.x, this.self.y,
      this.target.x, this.target.y,
    );
    // console.log('dist', dist, dist <= this.maxDistance ? BehaviorStatus.SUCCESS : BehaviorStatus.FAILURE);
    return dist <= this.maxDistance ? BehaviorStatus.SUCCESS : BehaviorStatus.FAILURE;
  }
}

class SetEmote extends Action {
  constructor(private self: { emote: Phaser.GameObjects.Image }, private emote: string) {
    super();
  }
  update() {
    this.self.emote.setTexture('bubbles', this.emote);
    return BehaviorStatus.SUCCESS;
  }
};


class GotoBranch extends Action {
  constructor(private self: { ai: BehaviorTree }, private target: BehaviorTree) {
    super();
  }
  update() {
    this.self.ai = this.target;
    return BehaviorStatus.SUCCESS;
  }
};



class LocalPlayer extends Phaser.Physics.Arcade.Image {
  public health: number = 100;

  avatar: Phaser.GameObjects.Image;
  ai: BehaviorTree;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'mario');
    this.avatar = scene.add.image(0, 0, 'mario').setDepth(2).setDisplaySize(32, 32).setOrigin(0, 0);

    const aMoveTree = (target: { x: number; y: number }) => new BehaviorTree(
      new Sequence([
        // new Sequence([
        //   new IsTargetWithinDistance(this, target, 400),
        //   new AccelerateTowardsPosition(this, target),
        // ]),
        new LinearMotionTowardsPosition(this, target),
      ])
    );

    const normalMoveTree = (target: { x: number; y: number }) => new BehaviorTree(
      new Sequence([
        new LinearMotionTowardsPosition(this, target),
        new GotoBranch(this, idleTree),
      ])
    );

    const idleTree = new BehaviorTree(
      new Idle(),
    );

    this.ai = idleTree;

    const throttleChangeTHing = throttle((pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        // this.ai.abort();
        this.ai = normalMoveTree({ x: pointer.worldX, y: pointer.worldY });
      } else if (pointer.leftButtonDown()) {
        this.ai.abort();
        this.ai = aMoveTree({ x: pointer.worldX, y: pointer.worldY });
      }
    }, 1000 / 30);

    const onPointerDown = throttleChangeTHing;

    scene.input.on('pointerdown', onPointerDown);
    scene.input.on('pointermove', onPointerDown);

    this.scene.physics.world.on('worldstep', () => {
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


class FailingAction extends Action {
  update() {
    return BehaviorStatus.FAILURE;
  }
}

class LoggingAction extends Action {
  constructor(private message: string | (() => string), private returnStatus: BehaviorStatus = BehaviorStatus.SUCCESS) { super(); }
  update() {
    console.log('LoggingAction : ', typeof this.message === 'function' ? this.message() : this.message);
    return this.returnStatus;
  }
}

class WaitMillisecondsAction extends Action {
  constructor(private waitForMS: number) { super(); }

  private startTime: number;
  onInitialize() {
    this.startTime = Date.now();
  }
  update() {
    const now = Date.now();
    if (now - this.startTime < this.waitForMS) {
      return BehaviorStatus.RUNNING;
    }
    return BehaviorStatus.SUCCESS;
  }
}

class AdjustAmmoAction extends Action {
  constructor(private target: { ammo: number }, private amount: number) { super(); }
  onInitialize() {
    this.target.ammo += this.amount;
  }
  update() {
    return BehaviorStatus.SUCCESS;
  }
}

class CheckAmmoLevel extends Condition {
  constructor(private target: { ammo: number; }, private desiredAmount: number) { super(); }
  update() {
    return this.target.ammo >= this.desiredAmount ? BehaviorStatus.SUCCESS : BehaviorStatus.FAILURE;
  }
}

class Inverter extends Decorator {
  tick() {
    const childStatus = this.child.tick();
    if (childStatus === BehaviorStatus.RUNNING) {
      return BehaviorStatus.RUNNING;
    }
    return childStatus === BehaviorStatus.SUCCESS ? BehaviorStatus.FAILURE : BehaviorStatus.SUCCESS;
  }
}

class Enemy extends Phaser.Physics.Arcade.Image {
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

    this.ai = new BehaviorTree(
      new ActiveSelector([
        // Melee danger check
        new Sequence([
          new LoggingAction('\tEnemy: Is player within melee range?'),
          // If player is in melee range, bail
          new IsTargetWithinDistance(this.body?.position ?? this, player.body, 75),
          new SetEmote(this, 'alert'),
          new LoggingAction('\tEnemy: Player is too close, bail!'),
          new AccelerateAwayFromPosition(this, player, 125)
        ]),

        // Reload!
        new Sequence([
          new LoggingAction(() => '\tEnemy: Do I need to reload? ' + this.ammo),
          new Inverter(new CheckAmmoLevel(this, 1)), // do we have at least one bullet?

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
          new AdjustHealth(player, -10),
          new AdjustAmmoAction(this, -1),
        ]),

        // Idle
        new Sequence([
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

class Item extends Phaser.Physics.Arcade.Image { }
