import Phaser from 'phaser';
import { COLORS } from '../config';
import { SCENES } from './keys';

export interface LevelSceneData {
  levelId: string;
}

/** Hosts one level: tiles, entities, player, power network. Greybox arrives in Phase 1. */
export class LevelScene extends Phaser.Scene {
  levelId = 'L1';

  constructor() {
    super(SCENES.Level);
  }

  init(data: Partial<LevelSceneData>): void {
    this.levelId = data.levelId ?? 'L1';
  }

  create(): void {
    this.cameras.main.setBackgroundColor(COLORS.real.night);
  }
}
