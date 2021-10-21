
import Phaser from 'phaser';
import { Action, BehaviorStatus, BehaviorTree, Condition, Decorator } from './BehaviorTree';
import { Sequence } from "./Sequence";
import throttle from './throttle';
import { Food } from './Food';
import { MainGameScene } from './MainGameScene';


export const rand = () => (Math.random() + Math.random() + Math.random()) / 3;

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
      // debug: true,
      gravity: {
        y: 0,
      }
    }
  },

  scene: MainGameScene
});



export function getMainScene() {
  return game.scene.getScene('MainGame') as MainGameScene;
}


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
  constructor(private self: Phaser.Physics.Arcade.Image, private target: { x: number; y: number; } | (() => { x: number; y: number; }), private distThreshold: number = 5, private speed: number = 150, private updatePositionEveryTick?:boolean) {
    super();

    this.calcTargetXY();
  }

  private calcTargetXY() {
    let targetX, targetY;

    if (typeof this.target === 'function') {
      const res = this.target();
      if (!res) {
        targetX = NaN;
        targetY = NaN;
      } else {
        targetX = res.x;
        targetY = res.y;
      }
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
    if (this.updatePositionEveryTick){ this.calcTargetXY(); }
    if (isNaN(this.targetX) || isNaN(this.targetY)) {
      return BehaviorStatus.FAILURE;
    }

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


export class LinearMotionTowardsDirection extends Action {
  private currentAngle:number = 0;

  constructor(private self: Phaser.Physics.Arcade.Image, private givenAngle: number | (() => number), private speed: number = 150) {
    super();

    this.updateAngle();
  }

  private updateAngle() {
    this.currentAngle = typeof this.givenAngle === 'function' ? this.givenAngle() : this.givenAngle;
  }

  onInitialize() {
    super.onInitialize();
    this.self.setMaxVelocity(this.speed, this.speed);
    this.updateAngle();
  }

  update() {
    if (isNaN(this.currentAngle)) {
      return BehaviorStatus.FAILURE;
    }
    this.self.body.velocity.set(Math.cos(this.currentAngle) * this.speed, Math.sin(this.currentAngle) * this.speed);
    return BehaviorStatus.RUNNING;
  }

  onTerminate() {
    super.onTerminate();
    this.self.body.velocity.set(0, 0);
  }
};

export class SetAnimationSpeed extends Action {
  constructor(private self: Phaser.GameObjects.Sprite, private amt: number) {
    super();
  }

  update() {
    this.self.anims.timeScale = this.amt;
    return BehaviorStatus.SUCCESS;
  }
}


export class AccelerateAwayFromPosition extends Action {
  constructor(private self: Phaser.Physics.Arcade.Image, private target: { x: number; y: number; }, private targetDist: number = 100, private speed: number = 125) {
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


export class LoggingAction extends Action {
  constructor(private message: string | (() => string), private returnStatus: BehaviorStatus = BehaviorStatus.SUCCESS) { super(); }
  update() {
    console.log('LoggingAction : ', typeof this.message === 'function' ? this.message() : this.message);
    return this.returnStatus;
  }
}

export class WaitMillisecondsAction extends Action {
  constructor(private waitForMS: number | (() => number)) { super(); }

  private waitThreshold: number;
  private startTime: number;
  onInitialize() {
    this.startTime = Date.now();
    this.waitThreshold = typeof this.waitForMS === 'function' ? this.waitForMS() : this.waitForMS;
  }
  update() {
    const now = Date.now();

    if (now - this.startTime < this.waitThreshold) {
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

