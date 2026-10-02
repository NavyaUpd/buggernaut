import Phaser from 'phaser';
import { SCENES } from './keys';

export class PauseScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Pause);
  }

  create(): void {}
}
