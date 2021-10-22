import Phaser from 'phaser';
import { BehaviorTree } from './BehaviorTree';
import throttle from './throttle';
import { Enemy } from './Enemy';
import { Chicken } from './Chicken';
import Blackboard from './Blackboard';
import { TomatoCrop } from './TomatoCrop';
import { LocalPlayer, rand } from './main';
import { Woodsman } from './Woodsman';
import { ActualTree } from './ActualTree';

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
  public registerBehavior = (obj:{ai: BehaviorTree}) => {
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

  createEnv = () => {
    for (let i = 0; i < 3; i++) {
      const img = this.add.image(Math.random() * this.scale.width, Math.random() * this.scale.height, 'env', 'Tree').setScale(3);
      img.setDepth(img.y + (img.height * 0.5));
    }
  };

  create = () => {
    // this.createEnv();

    const bg = this.add.tileSprite(0, 0, this.scale.width, this.scale.height, 'env', 'Tiles-5').setOrigin(0, 0);

    this.aiBlackboard = new Blackboard();
    this.aiBlackboard.set('hasDaylight', true);

    this.input.mouse.disableContextMenu();
    this.physics.world.setBounds(0, 0, 1024, 768);

    // const bg = this.add.image(0, 0, 'background').setOrigin(0, 0).setDisplaySize(1024, 768).setDepth(-1).setAlpha(0.3);
    const house = this.add.image(128, 128, 'env', 'House1').setScale(3);
    house.setDepth(house.y + (house.height * 0.5));

    const lp = new LocalPlayer(this, 128, 256);
    const player = this.physics.add.existing(lp).setDisplaySize(32, 32).setCollideWorldBounds(true).setMaxVelocity(100, 100);
    this.player = player;
    this.aiBlackboard.tagObject(['humanoid'], player);


    (player.body as Phaser.Physics.Arcade.Body).syncBounds = true;


    for (let i = 0; i < 5; i++) {
      const plant = new TomatoCrop(this, rand() * this.scale.width, rand() * this.scale.height, this.aiBlackboard);
      this.physics.add.existing(plant).setCollideWorldBounds(true).setMaxVelocity(150, 150).setImmovable(false).setPushable(true);
      this.npcList.push(plant);

      this.aiBlackboard.tagObject(['crop'], plant);
    }

    for (let i = 0; i < 5; i++) {
      const tree = new ActualTree(this, rand() * this.scale.width, rand() * this.scale.height, this.aiBlackboard);
      // tree.setDisplaySize(32, 32).setDepth(10);
      this.physics.add.existing(tree).setCollideWorldBounds(true).setMaxVelocity(150, 150).setImmovable(false).setPushable(true);

      this.aiBlackboard.tagObject(['tree', 'tree:grown'], tree);

      this.npcList.push(tree);

      // this.aiBlackboard.tagObject(['food'], chicken);
    }

    for (let i = 0; i < 35; i++) {
      const chicken = new Chicken(this, Math.random() * this.scale.width, Math.random() * this.scale.height, player, this.aiBlackboard);
      chicken.setDisplaySize(32, 32).setDepth(10);
      this.physics.add.existing(chicken).setCollideWorldBounds(true).setMaxVelocity(150, 150).setImmovable(false).setPushable(true);
      this.npcList.push(chicken);

      // this.aiBlackboard.tagObject(['food'], chicken);
    }

    for (let i = 0; i < 0; i++) {
      // continue;
      const enemy = new Enemy(this, Math.random() * this.scale.width, Math.random() * this.scale.height, player, this.aiBlackboard).setDisplaySize(32, 32).setDepth(10);
      this.physics.add.existing(enemy).setCollideWorldBounds(true).setMaxVelocity(75, 75).setImmovable(false).setPushable(true);
      this.enemies.push(enemy);
      this.npcList.push(enemy);
      this.aiBlackboard.tagObject(['humanoid'], enemy);
    }



    for (let i = 0; i < 1; i++) {
      // continue;
      const woodsman = new Woodsman(this, Math.random() * this.scale.width, Math.random() * this.scale.height, player, this.aiBlackboard).setDisplaySize(32, 32).setDepth(10);

      this.sys.updateList.add(woodsman);

      this.physics.add.existing(woodsman).setCollideWorldBounds(true).setMaxVelocity(75, 75).setImmovable(false).setPushable(true);
      this.npcList.push(woodsman);
      this.aiBlackboard.tagObject(['humanoid'], woodsman);
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

  update = (time:number, delta:number) => {
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
