import Phaser from 'phaser';

export class Food extends Phaser.Physics.Arcade.Image {
  public readonly id: string;
  constructor(scene: Phaser.Scene, x: number, y: number, texture: string, frame: string) {
    super(scene, x, y, texture, frame);
    this.id = Math.random().toString(32).slice(2);
  }
}
