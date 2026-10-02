import Phaser from 'phaser';
import { SCENES } from './keys';

/** Generates SVG/procedural textures, then hands off to the title. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Boot);
  }

  create(): void {
    this.scene.start(SCENES.Title);
  }
}
