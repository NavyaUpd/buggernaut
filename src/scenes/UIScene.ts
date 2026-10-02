import Phaser from 'phaser';
import { SCENES } from './keys';

export class UIScene extends Phaser.Scene {
  constructor() {
    super(SCENES.UI);
  }

  create(): void {}
}
