import Phaser from "phaser";
import { BehaviorTree } from "./ai/BehaviorTree";
import { Action } from "./ai/base/Action";
import { BehaviorStatus } from "./ai/base/BehaviorStatus";
import throttle from "./throttle";
import { MainGameScene } from "./MainGameScene";
import { GotoBranch } from "./ai/actions/GotoBranch";
import { Idle } from "./ai/actions/Idle";
import { Sequence } from "./ai/base/Sequence";
import { LinearMotionTowardsPosition } from "./ai/actions/LinearMotionTowardsPosition";
import { Condition } from "./ai/base/Condition";

export const rand = () => (Math.random() + Math.random() + Math.random()) / 3;

const game = new Phaser.Game({
  width: 1400,
  height: 900,
  backgroundColor: 0xa1e064,

  pixelArt: true,

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

  physics: {
    default: "arcade",
    arcade: {
      // debug: true,
      gravity: {
        y: 0,
      },
    },
  },

  scene: MainGameScene,
});

export function getMainScene() {
  return game.scene.getScene("MainGame") as MainGameScene;
}

export class AdjustHealth extends Action {
  constructor(private entity: { health: number }, private amount: number) {
    super();
  }
  onInitialize() {
    super.onInitialize();
    this.entity.health += this.amount;
  }
  update() {
    return BehaviorStatus.SUCCESS;
  }
}
export class SetAmmo extends Action {
  constructor(private entity: { ammo: number }, private amount: number) {
    super();
  }
  onInitialize() {
    super.onInitialize();
    this.entity.ammo = Math.max(0, this.amount); // this.entity.ammo + this.amount);
  }
  update() {
    return BehaviorStatus.SUCCESS;
  }
}

export class IsTargetActivelyMoving extends Condition {
  constructor(private target: Phaser.Physics.Arcade.Body) {
    super();
  }

  update() {
    return this.target.speed >= 0.1
      ? BehaviorStatus.SUCCESS
      : BehaviorStatus.FAILURE;
  }
}

export class SetEmote extends Action {
  constructor(
    private self: {
      emoteBg: Phaser.GameObjects.Image;
      emote: Phaser.GameObjects.Image;
    },
    private emote: string
  ) {
    super();
  }
  update() {
    if (this.emote === null) {
      this.self.emote.setVisible(false).setActive(false);
      this.self.emoteBg.setVisible(false).setActive(false);
    } else {
      this.self.emote.setTexture("bubbles", this.emote);
      this.self.emote.setVisible(true).setActive(true);
      this.self.emoteBg.setVisible(true).setActive(true);
    }
    return BehaviorStatus.SUCCESS;
  }
}

export class LocalPlayer extends Phaser.Physics.Arcade.Image {
  public health: number = 100;

  avatar: Phaser.GameObjects.Sprite;
  ai: BehaviorTree;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, "mario");
    this.avatar = scene.add
      .sprite(0, 0, "generic-avatar", "walk-0")
      .setDepth(2)
      .setDisplaySize(64, 64)
      .setOrigin(0, 0);

    this.avatar.anims.create({
      key: "walk-s",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "walk-",
        start: 0,
        end: 7,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: "walk-n",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "walk-",
        start: 8,
        end: 15,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: "walk-e",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "walk-",
        start: 16,
        end: 23,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: "walk-w",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "walk-",
        start: 24,
        end: 31,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: "axe-s",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "axe-",
        start: 0,
        end: 4,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: "axe-n",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "axe-",
        start: 5,
        end: 9,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: "axe-e",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "axe-",
        start: 10,
        end: 14,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: "axe-w",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "axe-",
        start: 15,
        end: 19,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: "hoe-s",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "hoe-",
        start: 0,
        end: 4,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: "hoe-n",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "hoe-",
        start: 5,
        end: 9,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: "hoe-e",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "hoe-",
        start: 10,
        end: 14,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: "hoe-w",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "hoe-",
        start: 15,
        end: 19,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: "die",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "die-",
        start: 0,
        end: 1,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: "sword-s",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "sword-",
        start: 0,
        end: 3,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
    });

    this.avatar.anims.create({
      key: "sword-s",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "sword-",
        start: 0,
        end: 3,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
    });

    this.avatar.anims.create({
      key: "sword-n",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "sword-",
        start: 4,
        end: 7,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
    });

    this.avatar.anims.create({
      key: "sword-e",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "sword-",
        start: 8,
        end: 11,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
    });

    this.avatar.anims.create({
      key: "sword-w",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "sword-",
        start: 12,
        end: 15,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
    });

    this.avatar.anims.create({
      key: "water-s",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "water-",
        start: 0,
        end: 1,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: "water-n",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "water-",
        start: 2,
        end: 3,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: "water-e",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "water-",
        start: 4,
        end: 5,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: "water-w",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "water-",
        start: 6,
        end: 7,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 2,
      repeat: -1,
    });

    this.avatar.anims.create({
      key: "idle-s",
      frames: this.avatar.anims.generateFrameNames("generic-avatar", {
        prefix: "walk-",
        start: 0,
        end: 0,
        suffix: "",
        zeroPad: 0,
      }),
      duration: 1000 / 1,
      repeat: -1,
    });

    this.avatar.anims.play("walk-s");

    this.avatar.setDepth(0);

    const aMoveTree = (target: { x: number; y: number }) =>
      new BehaviorTree(
        new Sequence([
          // new Sequence([
          //   new IsTargetWithinDistance(this, target, 400),
          //   new AccelerateTowardsPosition(this, target),
          // ]),
          new LinearMotionTowardsPosition(this, target),
        ])
      );

    const normalMoveTree = (target: { x: number; y: number }) =>
      new BehaviorTree(
        new Sequence([
          new LinearMotionTowardsPosition(this, target, 5, 220),
          new GotoBranch(this, idleTree),
        ])
      );

    const idleTree = new BehaviorTree(new Idle());

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

    scene.input.on("pointerdown", onPointerDown);
    scene.input.on("pointermove", onPointerDown);

    this.scene.physics.world.on("worldstep", () => {
      this.avatar.x = this.body.x;
      this.avatar.y = this.body.y;
      this.avatar.setDepth(this.avatar.y + this.avatar.height * 0.75);

      // if (this.body.velocity.x < 0.1 && this.body.velocity.x > -0.1
      //   && this.body.velocity.y < 0.1 && this.body.velocity.y > -0.1) {
      //     // this.avatar.anims.play('idle-s', true);
      // } else if (Math.abs(this.body.velocity.x) > Math.abs(this.body.velocity.y)){
      //   this.avatar.anims.play(
      //     this.body.velocity.x > 0 ? 'walk-e' : 'walk-w',
      //     true
      //   )
      // } else {
      //   this.avatar.anims.play(
      //     this.body.velocity.y < 0 ? 'walk-n' : 'walk-s',
      //     true
      //   )
      // }
    });
  }
}

export class AdjustAmmoAction extends Action {
  constructor(private target: { ammo: number }, private amount: number) {
    super();
  }
  onInitialize() {
    this.target.ammo += this.amount;
  }
  update() {
    return BehaviorStatus.SUCCESS;
  }
}

export class CheckAmmoLevel extends Condition {
  constructor(private target: { ammo: number }, private desiredAmount: number) {
    super();
  }
  update() {
    return this.target.ammo >= this.desiredAmount
      ? BehaviorStatus.SUCCESS
      : BehaviorStatus.FAILURE;
  }
}

export class Item extends Phaser.Physics.Arcade.Image {}
