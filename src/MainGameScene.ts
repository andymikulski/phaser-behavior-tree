import Phaser, { Curves } from 'phaser';
import { BehaviorTree } from './BehaviorTree';
import throttle from './throttle';
import { Enemy } from './Enemy';
import { Chicken } from './Chicken';
import Blackboard from './Blackboard';
import { TomatoCrop } from './TomatoCrop';
import { LocalPlayer, rand } from './main';
import { Woodsman } from './Woodsman';
import { ActualTree } from './ActualTree';
import PoissonNeighborhood from './NeighborhoodGenerator';

// import SpritesheetStuff from './asset/sprites.json';
// const itemNames = SpritesheetStuff.textures[0].frames.map(y => y.filename);
export class MainGameScene extends Phaser.Scene {
  constructor() {
    super({
      key: 'MainGame',
      active: true,
    });
  }

  private aiBlackboard: Blackboard;
  private npcList: { ai: BehaviorTree; }[] = [];
  public registerBehavior = (obj: { ai: BehaviorTree }) => {
    this.npcList.push(obj);
  };
  private enemies: Enemy[] = [];
  // private food: Food[] = [];
  private player: LocalPlayer;

  preload = () => {
    this.load.image('mario', 'https://i.imgur.com/nKgMvuj.png');
    this.load.image('background', 'https://i.imgur.com/dzpw15B.jpg');

    this.load.atlas('env', 'asset/env.png', 'asset/env.json');
    this.load.atlas('bubbles', 'asset/bubbles.png', 'asset/bubbles.json');
    this.load.atlas('spritesheet', 'asset/spritesheet.png', 'asset/spritesheet.json');
  };

  create = () => {
    this.cameras.main.zoom = 0.5;
    const worldWidth = this.scale.width * 3;
    const worldHeight = this.scale.height * 3;

    const bg = this.add.tileSprite(0, 0, worldWidth, worldHeight, 'env', 'Tiles-5').setOrigin(0, 0);

    this.aiBlackboard = new Blackboard();
    this.aiBlackboard.set('hasDaylight', true);

    const hood = new PoissonNeighborhood(worldWidth, worldHeight, worldWidth / 2, worldHeight / 2);
    let lastX;
    let lastY;
    // for(let i = 0; i < 25; i++ ){
    //   const pos = hood.stepUntilPOI();
    //   if (pos[0] === lastX && pos[1] === lastY){
    //     console.log('out of POIs')
    //     continue;
    //   }
    //   lastX = pos[0];
    //   lastY = pos[1];

    //   this.add.rectangle(pos[0], pos[1], 32, 32, 0xff0000, 0.8).setDepth(200000);
    // }

    lastX = null;

    this.aiBlackboard.set('neighborhood', hood);

    this.input.mouse.disableContextMenu();
    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

    const lp = new LocalPlayer(this, worldWidth / 2, worldHeight / 2);
    const player = this.physics.add.existing(lp).setDisplaySize(32, 32).setCollideWorldBounds(true).setMaxVelocity(100, 100);
    this.player = player;
    this.aiBlackboard.tagObject(['humanoid'], player);


    this.cameras.main.startFollow(player, false, 0.4, 0.4);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setDeadzone(400, 200);

    for (let i = 0; i < 35; i++) {
      const plant = new TomatoCrop(this, rand() * worldWidth, rand() * worldHeight, this.aiBlackboard);
      this.physics.add.existing(plant).setCollideWorldBounds(true).setMaxVelocity(150, 150).setImmovable(false).setPushable(true);
      this.npcList.push(plant);

      this.aiBlackboard.tagObject(['crop'], plant);
      hood.registerObstacle([plant.x, plant.y, 10]);
    }

    for (let i = 0; i < 150; i++) {
      const tree = new ActualTree(this, Math.random() * worldWidth, Math.random() * worldHeight, this.aiBlackboard);
      // tree.setDisplaySize(32, 32).setDepth(10);
      this.physics.add.existing(tree).setCollideWorldBounds(true).setMaxVelocity(150, 150).setImmovable(false).setPushable(true);

      this.aiBlackboard.tagObject(['tree', 'tree:grown'], tree);

      this.npcList.push(tree);

      hood.registerObstacle([tree.x, tree.y, 10]);
    }

    for (let i = 0; i < 50; i++) {
      const chicken = new Chicken(this, Math.random() * worldWidth, Math.random() * worldHeight, player, this.aiBlackboard);
      chicken.setDisplaySize(32, 32).setDepth(10);
      this.physics.add.existing(chicken).setCollideWorldBounds(true).setMaxVelocity(150, 150).setImmovable(false).setPushable(true);
      this.npcList.push(chicken);
    }

    for (let i = 0; i < 0; i++) {
      // continue;
      const enemy = new Enemy(this, Math.random() * worldWidth, Math.random() * worldHeight, player, this.aiBlackboard).setDisplaySize(32, 32).setDepth(10);
      this.physics.add.existing(enemy).setCollideWorldBounds(true).setMaxVelocity(75, 75).setImmovable(false).setPushable(true);
      this.enemies.push(enemy);
      this.npcList.push(enemy);
      this.aiBlackboard.tagObject(['humanoid'], enemy);
    }



    for (let i = 0; i < 10; i++) {
      // continue;
      const woodsman = new Woodsman(this, Math.random() * worldWidth, Math.random() * worldHeight, player, this.aiBlackboard).setDisplaySize(32, 32).setDepth(10);

      this.sys.updateList.add(woodsman);

      this.physics.add.existing(woodsman).setCollideWorldBounds(true).setMaxVelocity(75, 75).setImmovable(false).setPushable(true);
      this.npcList.push(woodsman);
      this.aiBlackboard.tagObject(['humanoid'], woodsman);
    }



    // hood.stepExpansion(false);

    hood.getPOI();
    // const pointsOfInterest = hood.pointsOfInterest;
    const declaredWaypoints = hood.declaredWaypoints;


    // blue
    // for(let i = 0; i < pointsOfInterest.length; i++){
    //   this.add.rectangle(pointsOfInterest[i][0], pointsOfInterest[i][1], pointsOfInterest[i][2]*16, pointsOfInterest[i][2]*16, 0x0000ff, 0.8).setDepth(200000-2)
    // }

    const buildable = [] as [number, number, number][];
    // red
    for (let i = 0; i < declaredWaypoints.length; i++) {

      if (declaredWaypoints[i][2] < 2) {
        // this.add.rectangle(declaredWaypoints[i][0], declaredWaypoints[i][1], declaredWaypoints[i][2] * 16, declaredWaypoints[i][2] * 16, 0x0000ff, 0.8).setDepth(200000 - 3)
        buildable.push(declaredWaypoints[i]);
      } else {
        // this.add.rectangle(declaredWaypoints[i][0], declaredWaypoints[i][1], declaredWaypoints[i][2] * 16, declaredWaypoints[i][2] * 16, 0xff0000, 0.8).setDepth(200000 - 3)
      }
    }

    this.aiBlackboard.set('buildable', buildable);
    this.aiBlackboard.set('buildable:claimed', []);

    const gfx = this.add.graphics();
    gfx.lineStyle(25, 0xA52A2A, 0.1);

    let ptA, ptB;
    for (let i = 0; i < hood.edges.length; i++) {
      ptA = hood.edges[i][0];
      ptB = hood.edges[i][1];
      gfx.lineBetween(ptA[0], ptA[1], ptB[0], ptB[1]);
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
  };

  update = (time: number, delta: number) => {
    super.update(time, delta);
    this.player.setDepth(this.player.y + (this.player.height));
    this.player.avatar.setDepth(this.player.avatar.y + (this.player.avatar.height));
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
