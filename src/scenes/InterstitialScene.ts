import Phaser from 'phaser';
import { SCENES } from './keys';

export class InterstitialScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Interstitial);
  }

  create(): void {}
}
