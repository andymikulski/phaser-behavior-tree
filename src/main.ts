
import Phaser from 'phaser';
import { Action, PrioritySequence, Behavior, BehaviorStatus, BehaviorTree, Condition, Sequence, Selector, Decorator, RandomSelector } from './BehaviorTree';
import { RepeatDecorator } from './RepeatDecorator';
import throttle from './throttle';


import SpritesheetStuff from './asset/sprites.json';
const itemNames = SpritesheetStuff.textures[0].frames.map(y => y.filename);
console.log('itemnames', itemNames);

// class FireAtPlayer extends Action {
//   onInitialize = () => {
//     super.onInitialize();
//     console.log('INIT : FireAtPlayer');
//   }
//   update = () => { return Math.random() > 0.5 ? BehaviorStatus.FAILURE : BehaviorStatus.SUCCESS; };
// }
// class MoveTowardsPlayer extends Action {
//   onInitialize = () => {
//     super.onInitialize();
//     console.log('INIT : MoveTowardsPlayer');
//   }
//   update = () => { return Math.random() > 0.5 ? BehaviorStatus.FAILURE : BehaviorStatus.SUCCESS; };
// }
// class MoveToLastKnownPlayerPosition extends Action {
//   onInitialize = () => {
//     super.onInitialize();
//     console.log('INIT : MoveToLastKnownPlayerPosition');
//   }
//   update = () => { return Math.random() > 0.5 ? BehaviorStatus.FAILURE : BehaviorStatus.SUCCESS; };
// }
// class LookAroundArea extends Action {
//   onInitialize = () => {
//     super.onInitialize();
//     console.log('INIT : LookAroundArea');
//   }
//   update = () => { return Math.random() > 0.5 ? BehaviorStatus.FAILURE : BehaviorStatus.SUCCESS; };
// }
// class MoveToRandomPosition extends Action {
//   onInitialize = () => {
//     super.onInitialize();
//     console.log('INIT : MoveToRandomPosition');
//   }
//   update = () => { return Math.random() > 0.5 ? BehaviorStatus.FAILURE : BehaviorStatus.SUCCESS; };
// }

// class IsPlayerInRange extends Condition {
//   onInitialize = () => {
//     super.onInitialize();
//     console.log('INIT : IsPlayerInRange');
//   }
//   update = () => { return Math.random() > 0.5 ? BehaviorStatus.FAILURE : BehaviorStatus.SUCCESS; };
// }
// class IsPlayerVisible extends Condition {
//   onInitialize = () => {
//     super.onInitialize();
//     console.log('INIT : IsPlayerVisible');
//   }
//   update = () => { return Math.random() > 0.5 ? BehaviorStatus.FAILURE : BehaviorStatus.SUCCESS; };
// }
// class HaveWeGotASuspectedLocation extends Condition {
//   onInitialize = () => {
//     super.onInitialize();
//     console.log('INIT : HaveWeGotASuspectedLocation');
//   }
//   update = () => { return Math.random() > 0.5 ? BehaviorStatus.FAILURE : BehaviorStatus.SUCCESS; };
// }


// const AttackPlayerIfInRange = new Sequence([
//   // Do we see the player?
//   new IsPlayerVisible(),
//   new PrioritySequence([
//     // Are they in range? If so, shoot at them 3 times
//     new Sequence([
//       new IsPlayerInRange(),
//       new RepeatDecorator(3, new FireAtPlayer()),
//     ]),
//     // Not in range - move towards the player
//     new MoveTowardsPlayer(),
//   ]),
// ]);


// const SearchAreaLastSeen = new Sequence([
//   new HaveWeGotASuspectedLocation(),
//   new MoveToLastKnownPlayerPosition(),
//   new LookAroundArea(),
// ]);

// const SearchRandomArea = new Sequence([
//   new MoveToRandomPosition(),
//   new LookAroundArea(),
// ]);

// const tree = new BehaviorTree(
//   new PrioritySequence([
//     // Do we see the player?
//     AttackPlayerIfInRange,
//     // Move to last known player location and look around
//     SearchAreaLastSeen,
//     // Move to random area and scan
//     SearchRandomArea,
//   ])
// );

const game = new Phaser.Game({
  width: 1024,
  height: 768,
  backgroundColor: 0xa1e064,

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
    }

    create = () => {
      this.input.mouse.disableContextMenu();
      this.physics.world.setBounds(0, 0, 1024, 768);



      // const bg = this.add.image(0, 0, 'background').setOrigin(0, 0).setDisplaySize(1024, 768).setDepth(-1);

      const lp = new LocalPlayer(this, 128, 128);
      const player = this.physics.add.existing(lp).setDisplaySize(32, 32).setCollideWorldBounds(true).setMaxVelocity(100,100).setCircle(196).setTexture('mario');
      this.player = player;

      (player.body as Phaser.Physics.Arcade.Body).syncBounds = true;

      for (let i = 0; i < 1; i++) {
        const enemy = new Enemy(this, 400 + (i * 15), 400 + (i * 15), player).setDisplaySize(32, 32).setDepth(10).setTexture('mario');
        this.physics.add.existing(enemy).setCollideWorldBounds(true).setMaxVelocity(75, 75).setCircle(196).setImmovable(true).setPushable(false);
        this.enemies.push(enemy);
        (enemy.body as Phaser.Physics.Arcade.Body).syncBounds = true;
      }

      const collisionGroup = this.physics.add.group(this.enemies);
      collisionGroup.add(player);

      this.physics.add.collider(collisionGroup, collisionGroup);

      this.time.addEvent({
        loop: true,
        callback: this.updateAI,
      });
      this.time.addEvent({
        loop: true,
        callback: this.updateLocalAgent,
      });
    }

    updateLocalAgent = throttle(()=>{
      this.player.ai?.tick();
    }, 1000 / 30); // 30fps

    updateAI = throttle(() => {
      for (let i = 0; i < this.enemies.length; i++) {
        this.enemies[i].ai.tick();
      }
    }, 1000 / 10); // 10fps
  }
});


class Idle extends Action {
  constructor(private self: Phaser.Physics.Arcade.Image) {
    super();
  }
  onInitialize() {
    this.self.body.velocity.set(0,0);
  }
  update() {
    // this should not be needed 😬
    this.self.body.velocity.set(0,0);
    return BehaviorStatus.RUNNING;
  }
};

// class MoveToTarget extends Action {
//   constructor(private self: Phaser.Physics.Arcade.Image, private target: { x: number; y: number; }) {
//     super();
//   }
//   onInitialize() {
//     super.onInitialize();
//     this.self.setMaxVelocity(50, 50);
//   }
//   update() {
//     const dist = Phaser.Math.Distance.Between(
//       this.self.body.x, this.self.body.y,
//       this.target.x, this.target.y,
//     );
//     // console.log('dist', dist);
//     if (dist > 400) {
//       // Too far
//       return BehaviorStatus.FAILURE;
//     } else if (dist > 4) {
//       this.self.body.velocity.set(this.target.x - this.self.body.x, this.target.y - this.self.body.y)
//       return BehaviorStatus.RUNNING;
//     } else {
//       return BehaviorStatus.SUCCESS;
//     }
//   }

//   onTerminate() {
//     super.onTerminate();
//     this.self.body.velocity.set(0, 0);
//   }
// };

// class RunFromTarget extends Action {
//   constructor(private self: Phaser.Physics.Arcade.Image, private target: { x: number; y: number; }) {
//     super();
//   }
//   update() {
//     const dist = Phaser.Math.Distance.Between(
//       this.self.body.x, this.self.body.y,
//       this.target.x, this.target.y,
//     );
//     // console.log('dist', dist);
//     if (dist > 400) {
//       // Too far
//       return BehaviorStatus.SUCCESS;
//     } else {
//       this.self.body.velocity.set(this.self.body.x - this.target.x, this.self.body.y - this.target.y)
//       return BehaviorStatus.RUNNING;
//     } //else {
//     // return BehaviorStatus.SUCCESS;
//     // }
//   }

//   onTerminate() {
//     super.onTerminate();
//     this.self.body.velocity.set(0, 0);
//   }
// };



class AccelerateTowardsPosition extends Action {
  constructor(private self: Phaser.Physics.Arcade.Image, private target: { x: number; y: number; }, private range:number = 100) {
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


class AdjustHealth extends Action {
  constructor(private entity: { health: number; }, private amount:number) {
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
  constructor(private entity: { ammo: number; }, private amount:number) {
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
  constructor(private self: Phaser.Physics.Arcade.Image, private target: { x: number; y: number; }) {
    super();
  }

  // movementTween:Phaser.Tweens.Tween;
  onInitialize() {
    super.onInitialize();
    this.self.setMaxVelocity(150, 150);
  }

  update() {
    const dist = Phaser.Math.Distance.Between(
      this.self.body.x, this.self.body.y,
      this.target.x, this.target.y,
    );
    if (dist > 5) {
      const angle = Math.atan2(this.target.y - this.self.body.y, this.target.x - this.self.body.x);
      // this.self.scene.physics.moveTo(this.self, this.target.x, this.target.y, 75, 1000);
      // console.log('right after the thing', this.self.x, this.target.x, this.self.y, this.target.y);
      // this.self.body.velocity.set(this.target.x - this.self.body.x, this.target.y - this.self.body.y)
      this.self.body.velocity.set(Math.cos(angle) * 150, Math.sin(angle) * 150);
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


class GotoBranch extends Action {
  constructor(private self:{ai:BehaviorTree}, private target: BehaviorTree) {
    super();
  }
  update() {
    this.self.ai = this.target;
    return BehaviorStatus.SUCCESS;
  }
};



class LocalPlayer extends Phaser.Physics.Arcade.Image {
  public health:number = 100;

  ai: BehaviorTree;
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'mario');

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
      new Idle(this),
    );

    this.ai = idleTree;

    const onPointerDown = (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) {
        this.ai.abort();
        this.ai = normalMoveTree({x: pointer.worldX, y: pointer.worldY});
      } else if (pointer.leftButtonDown()) {
        this.ai.abort();
        this.ai = aMoveTree({x: pointer.worldX, y: pointer.worldY});
      }
    };

    scene.input.on('pointerdown', onPointerDown);
    scene.input.on('pointermove', onPointerDown);
  }


}


class FailingAction extends Action {
  update() {
    return BehaviorStatus.FAILURE;
  }
}

class LoggingAction extends Action {
  constructor(private message:string, private returnStatus:BehaviorStatus = BehaviorStatus.SUCCESS){ super(); }
  update() {
    console.log('LoggingAction : ' , this.message);
    return this.returnStatus;
  }
}

class WaitMillisecondsAction extends Action {
  constructor(private waitForMS:number){ super(); }

  private startTime:number;
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
  constructor(private target:{ammo:number}, private amount:number){ super(); }
  onInitialize() {
    this.target.ammo += this.amount;
  }
  update() {
    return BehaviorStatus.SUCCESS;
  }
}

class CheckAmmoLevel extends Condition {
  constructor(private target:{ammo:number;}, private desiredAmount:number){ super(); }
  update(){
    return this.target.ammo >= this.desiredAmount ? BehaviorStatus.SUCCESS : BehaviorStatus.FAILURE;
  }
}

class Inverter extends Decorator {
  tick(){
    const childStatus = this.child.tick();
    if (childStatus === BehaviorStatus.RUNNING) {
      return BehaviorStatus.RUNNING;
    }
    return childStatus === BehaviorStatus.SUCCESS ? BehaviorStatus.FAILURE : BehaviorStatus.SUCCESS;
  }
}

class Enemy extends Phaser.Physics.Arcade.Image {
  inventory: Item[] = [];
  ammo:number = 3;

  ai: BehaviorTree;
  constructor(scene: Phaser.Scene, x: number, y: number, player: LocalPlayer) {
    super(scene, x, y, 'mario');
    this.ai = new BehaviorTree(
      new Selector([

        // Danger close
        new Sequence([
          // If player is in melee range, bail
          new IsTargetWithinDistance(this.body?.position ?? this, player.body, 75),
          new AccelerateAwayFromPosition(this, player, 100)
        ]),

        // Reload!
        new Sequence([
          new Inverter(new CheckAmmoLevel(this, 1)), // do we have at least one bullet?
          new LoggingAction('Enemy: Reloading!'),
          new WaitMillisecondsAction(500),
          new SetAmmo(this, 3),
          new LoggingAction('Enemy: I have ammo!'),
        ]),

        // IS a player nearby? If so run towards them so they are within attacking range
        new Sequence([
          new IsTargetWithinDistance(this.body?.position ?? this, player.body, 175),
          new LoggingAction('Enemy: I see the player!'),
          new AccelerateTowardsPosition(this, player.body, 150),
          new LoggingAction('Enemy: I am close enough to the player!'),
          new RepeatDecorator(3, new Sequence([
            new LoggingAction('Enemy: ATTACK!'),
            new AdjustHealth(player, -10),
            new AdjustAmmoAction(this, -1),
            new WaitMillisecondsAction(1000),
          ])),
          new LoggingAction('Enemy: I am done attacking the player!'),
        ]),

        // Idle
        new RandomSelector([
          new Sequence([
            new LoggingAction('Enemy: Idling..'),
            new Idle(this),
          ]),
          new Sequence([
            new LoggingAction('Enemy: Second Idling..'),
            new Idle(this),
          ])
        ])




        // // Do we see the player?
        // AttackPlayerIfInRange,
        // // Move to last known player location and look around
        // SearchAreaLastSeen,
        // // Move to random area and scan
        // SearchRandomArea,
      ])
    );
  }
}

class Item extends Phaser.Physics.Arcade.Image { }
