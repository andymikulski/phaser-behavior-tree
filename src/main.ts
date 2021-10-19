
import Phaser from 'phaser';
import { Action, BehaviorStatus, BehaviorTree, Condition, Decorator } from './BehaviorTree';
import { Sequence } from "./Sequence";
import throttle from './throttle';
import { Enemy } from './Enemy';
import { Food } from './Food';
import { Chicken } from './Chicken';


export const rand = () => (Math.random() + Math.random() + Math.random()) / 3;

// import SpritesheetStuff from './asset/sprites.json';
// const itemNames = SpritesheetStuff.textures[0].frames.map(y => y.filename);

new Phaser.Game({
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
      // debug: true,
      gravity: {
        y: 0,
      }
    }
  },

  scene: class extends Phaser.Scene {
    private npcList: {ai:BehaviorTree}[] = [];
    private enemies: Enemy[] = [];
    private food: Food[] = [];
    private player: LocalPlayer;

    preload = () => {
      this.load.atlas('sprites', 'asset/sprites.png', 'asset/sprites.json');
      this.load.image('mario', 'https://i.imgur.com/nKgMvuj.png');
      this.load.image('background', 'https://i.imgur.com/dzpw15B.jpg');

      this.load.atlas('env', 'asset/env.png', 'asset/env.json');
      this.load.atlas('bubbles', 'asset/bubbles.png', 'asset/bubbles.json');
    }

    createEnv = () => {
      for (let i = 0; i < 12; i++) {
        const img = this.add.image(Math.random() * this.scale.width, Math.random() * this.scale.height, 'env', 'Tree').setScale(3);
        img.setDepth(img.y + (img.height * 0.75));
      }
    }

    create = () => {

      this.anims.create({
        key: 'ChickenAnim',
        frames: this.anims.generateFrameNames('Chicken-', {
          prefix: '',
          start: 0,
          end: 4,
          suffix: '',
          zeroPad: 0,
        }),
        duration: 1000 / 7,
        repeat: -1,
      });

      this.createEnv();

      this.input.mouse.disableContextMenu();
      this.physics.world.setBounds(0, 0, 1024, 768);


      // const bg = this.add.image(0, 0, 'background').setOrigin(0, 0).setDisplaySize(1024, 768).setDepth(-1).setAlpha(0.3);

      const lp = new LocalPlayer(this, 128, 128);
      const player = this.physics.add.existing(lp).setDisplaySize(32, 32).setCollideWorldBounds(true).setMaxVelocity(100, 100);
      this.player = player;


      (player.body as Phaser.Physics.Arcade.Body).syncBounds = true;


      for (let i = 0; i < 250; i++) {
        const chicken = new Chicken(this, Math.random() * this.scale.width, Math.random() * this.scale.height, player);
        chicken.setDisplaySize(32,32,).setDepth(10);
        this.physics.add.existing(chicken).setCollideWorldBounds(true).setMaxVelocity(150, 150).setImmovable(false).setPushable(true);
        this.npcList.push(chicken);
      }

      for (let i = 0; i < 1; i++) {
        continue;
        const enemy = new Enemy(this, Math.random() * this.scale.width, Math.random() * this.scale.height, player).setDisplaySize(32, 32).setDepth(10);


        this.physics.add.existing(enemy).setCollideWorldBounds(true).setMaxVelocity(75, 75).setImmovable(false).setPushable(true);
        this.enemies.push(enemy);
        // this.npcList.push(enemy);
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

      (window as any).step = this.updateAI;
    }

    updateLocalAgent = throttle(() => {
      this.player.ai?.tick();
    }, 1000 / 30); // 30fps

    updateAI = throttle(() => {
      for (let i = 0; i < this.npcList.length; i++) {
        this.npcList[i].ai.tick();
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

export class AdjustHealth extends Action {
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
export class SetAmmo extends Action {
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


export class LinearMotionTowardsPosition extends Action {
  private targetX: number;
  private targetY: number;
  constructor(private self: Phaser.Physics.Arcade.Image, private target: { x: number; y: number; } | (() => { x: number; y: number; }), private distThreshold: number = 5, private speed:number = 150) {
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
    this.self.setMaxVelocity(this.speed, this.speed);
    this.calcTargetXY();
  }

  update() {
    const dist = Phaser.Math.Distance.Between(
      this.self.body.x, this.self.body.y,
      this.targetX, this.targetY,
    );
    if (dist > this.distThreshold) {
      const angle = Math.atan2(this.targetY - this.self.body.y, this.targetX - this.self.body.x);
      this.self.body.velocity.set(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
      return BehaviorStatus.RUNNING;
    } else {
      this.self.body.velocity.set(0, 0);
      return BehaviorStatus.SUCCESS;
    }
  }

  onTerminate() {
    super.onTerminate();
    this.self.body.velocity.set(0, 0);
  }
};


export class AccelerateAwayFromPosition extends Action {
  constructor(private self: Phaser.Physics.Arcade.Image, private target: { x: number; y: number; }, private targetDist: number = 100, private speed:number = 125) {
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
      this.self.body.velocity.set(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
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
};


export class IsTargetWithinDistance extends Condition {
  constructor(private self: { x: number; y: number; }, private target: { x: number; y: number; }, private maxDistance: number) {
    super();
  }

  update() {
    const dist = Phaser.Math.Distance.Between(
      this.self.x, this.self.y,
      this.target.x, this.target.y,
    );
    return dist <= this.maxDistance ? BehaviorStatus.SUCCESS : BehaviorStatus.FAILURE;
  }
}

export class IsTargetActivelyMoving extends Condition {
  constructor(private target: Phaser.Physics.Arcade.Body) {
    super();
  }

  update() {
    return this.target.speed >= 0.1 ? BehaviorStatus.SUCCESS : BehaviorStatus.FAILURE;
  }
}

export class SetEmote extends Action {
  constructor(private self: { emoteBg: Phaser.GameObjects.Image; emote: Phaser.GameObjects.Image }, private emote: string) {
    super();
  }
  update() {
    if (this.emote === null) {
      this.self.emote.setVisible(false).setActive(false);
      this.self.emoteBg.setVisible(false).setActive(false);
    } else {
      this.self.emote.setTexture('bubbles', this.emote);
      this.self.emote.setVisible(true).setActive(true);
      this.self.emoteBg.setVisible(true).setActive(true);
    }
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



export class LocalPlayer extends Phaser.Physics.Arcade.Image {
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
      } //else if (pointer.leftButtonDown()) {
        // this.ai.abort();
        // this.ai = aMoveTree({ x: pointer.worldX, y: pointer.worldY });
      // }
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


export class LoggingAction extends Action {
  constructor(private message: string | (() => string), private returnStatus: BehaviorStatus = BehaviorStatus.SUCCESS) { super(); }
  update() {
    // console.log('LoggingAction : ', typeof this.message === 'function' ? this.message() : this.message);
    return this.returnStatus;
  }
}

export class WaitMillisecondsAction extends Action {
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

export class AdjustAmmoAction extends Action {
  constructor(private target: { ammo: number }, private amount: number) { super(); }
  onInitialize() {
    this.target.ammo += this.amount;
  }
  update() {
    return BehaviorStatus.SUCCESS;
  }
}

export class CheckAmmoLevel extends Condition {
  constructor(private target: { ammo: number; }, private desiredAmount: number) { super(); }
  update() {
    return this.target.ammo >= this.desiredAmount ? BehaviorStatus.SUCCESS : BehaviorStatus.FAILURE;
  }
}

export class Inverter extends Decorator {
  tick() {
    const childStatus = this.child.tick();
    if (childStatus === BehaviorStatus.RUNNING) {
      return BehaviorStatus.RUNNING;
    }
    return childStatus === BehaviorStatus.SUCCESS ? BehaviorStatus.FAILURE : BehaviorStatus.SUCCESS;
  }
}

export class Item extends Phaser.Physics.Arcade.Image { }
