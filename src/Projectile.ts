import Phaser from 'phaser';
import { Action, BehaviorStatus, BehaviorTree } from './BehaviorTree';
import { getMainScene, LinearMotionTowardsDirection, LinearMotionTowardsPosition } from './main';
import { Sequence } from './Sequence';



export class SpawnSimpleProjectile extends Action{
  constructor(private scene:Phaser.Scene, private from:{x:number; y:number;}, private to:{x:number, y:number}){
    super();
  }
  update() {
    const projectile = new SimpleProjectile(this.scene, this.from.x, this.from.y, this.to);
    this.scene.add.existing(projectile);
    this.scene.physics.add.existing(projectile);

    return BehaviorStatus.SUCCESS;
  }
}


export class SimpleProjectile extends Phaser.Physics.Arcade.Image {
  ai: BehaviorTree;
  constructor(scene: Phaser.Scene, x: number, y: number, private target: {x:number; y:number;}) {
    super(scene, x, y, 'env', 'Tomato');

    this.setDepth(10).setScale(2);

    const angleToTarget = Math.atan2((target.y + 16) - y, (target.x + 16) - x);
    console.log('got angle', angleToTarget)

    this.ai = new BehaviorTree(
      new Sequence([
        new LinearMotionTowardsDirection(this, angleToTarget, 750),
      ])
    );

    getMainScene().registerBehavior(this);

    // // Align the emote stuff with the physics body
    // this.scene.physics.world.on('worldstep', () => {
    //   this.emote.x = this.body.x + 16;
    //   this.emote.y = this.body.y - 32;
    //   this.emoteBg.x = this.body.x + 16;
    //   this.emoteBg.y = this.body.y - 32;

    //   this.avatar.x = this.body.x;
    //   this.avatar.y = this.body.y;

    //   this.ammoDisplay.x = this.body.x - 16;
    //   this.ammoDisplay.y = this.body.y + 32;

    //   let wasFlipped = this.avatar.flipX;
    //   if (this.body.velocity.x === 0) {
    //     this.avatar.flipX = wasFlipped;
    //   } else {
    //     this.avatar.flipX = this.body.velocity.x < 0;
    //   }
    // });
  }
}
