import Phaser, { GameObjects } from 'phaser';
import { Action, Behavior, BehaviorStatus, BehaviorTree, Composite, Condition, Decorator } from './BehaviorTree';
import { FreshSequence, Sequence } from "./Sequence";
import { ActiveSelector, Selector } from "./Selector";
import { Item, LocalPlayer, LoggingAction, IsTargetWithinDistance, SetEmote, AccelerateAwayFromPosition, Inverter, CheckAmmoLevel, WaitMillisecondsAction, SetAmmo, LinearMotionTowardsPosition, AdjustHealth, AdjustAmmoAction, rand, IsTargetActivelyMoving, SetAnimationSpeed } from './main';
import Blackboard, { BlackboardObj } from './Blackboard';
import FogOfWar from './FogOfWar';
import { Parallel, ParallelPolicy } from './ParallelPolicy';
import { FailingAction, Throttle } from './TomatoCrop';
import { GenericAction } from './Chicken';




class GrowFog extends Action {
  constructor(private self: NightFog, private blackboard: Blackboard) { super(); }
  update() {
    this.self.fog.growFog(0.05);
    return BehaviorStatus.SUCCESS;
  }
}

class ClearFog extends Action {
  constructor(private self: NightFog, private blackboard: Blackboard) { super(); }
  update() {
    const emitters = (this.blackboard.getTagged('emitter:light') || []) as Phaser.GameObjects.Components.Transform[];
    for (let i = 0; i < emitters.length; i++) {
      this.self.fog.reveal(emitters[i].x, emitters[i].y, emitters[i] instanceof LocalPlayer ? 12 : 32);
    }
    return BehaviorStatus.SUCCESS;
  }
}

class AlwaysSucceed extends Decorator {
  update() {
    this.child.update();
    return BehaviorStatus.SUCCESS;
  }

  tick() {
    this.child.tick();
    return BehaviorStatus.SUCCESS;
  }
}

class NightFog extends Sequence {
  public readonly fog: FogOfWar;

  constructor(private blackboard: Blackboard) {
    super();
    const scene = this.blackboard.get<Phaser.Scene>('scene');
    if (!scene) { throw new Error("No scene found when instantiating NightFog"); }

    this.blackboard.set('hasDaylight', true);
    const worldWidth = this.blackboard.get('worldWidth', 1024);
    const worldHeight = this.blackboard.get('worldHeight', 768);

    const fog = new FogOfWar(scene, worldWidth, worldHeight, 512, 0.0025);
    fog.fogColor = 0x111111;
    fog.fogTexture.setDepth(100000);
    this.fog = fog;

    let isDay = true;
    let lastSwitch = Date.now();
    let isVisible = !isDay;
    fog.fogTexture.alpha = isVisible ? 1 : 0;

    console.log('it is day')

    this.children = [
      new GrowFog(this, this.blackboard),
      new GenericAction(() => {
        let now = Date.now();
        if (now - lastSwitch < 10_000) {
          return BehaviorStatus.SUCCESS;
        }
        lastSwitch = now;
        isDay = this.blackboard.get('hasDaylight');
        console.log('it is currently:' + (isDay ? 'DAY' : 'NIGHT'), 'switching now!');
        this.blackboard.set('hasDaylight', !isDay)

        isVisible = isDay;

        const scene = this.fog.fogTexture.scene;
        scene.tweens.add({
          targets: this.fog.fogTexture,
          alpha: isVisible ? 1 : 0,
          ease: 'Linear',
          duration: 1500,
        });

        return isDay ? BehaviorStatus.FAILURE : BehaviorStatus.SUCCESS;
      }),
      new ClearFog(this, this.blackboard)
    ];
  }
}

export class LightingAI extends Phaser.GameObjects.GameObject {
  ai: BehaviorTree;
  fog: FogOfWar;


  // dayNight: DayNightCycle;

  constructor(scene: Phaser.Scene, private blackboard: Blackboard) {
    super(scene, 'lighting AI');
    // this.dayNight = new DayNightCycle(this.blackboard);
    // const worldWidth = this.blackboard.get('worldWidth', 1024);
    // const worldHeight = this.blackboard.get('worldHeight', 768);

    this.ai = new BehaviorTree(
      new Sequence([

        // new DayNightCycle(this.blackboard),
        new NightFog(this.blackboard),
      ])
    );
  }
}
