import Phaser from 'phaser';
import { SCENES } from './keys';

export class CreditsScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Credits);
  }

  create(): void {}
}
