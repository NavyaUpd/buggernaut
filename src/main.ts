import Phaser from 'phaser';
import { COLORS, MOVE, VIEW } from './config';
import { installDebugAPI } from './debug/DebugAPI';
import { BootScene } from './scenes/BootScene';
import { CreditsScene } from './scenes/CreditsScene';
import { FinaleScene } from './scenes/FinaleScene';
import { InterstitialScene } from './scenes/InterstitialScene';
import { LevelScene } from './scenes/LevelScene';
import { PauseScene } from './scenes/PauseScene';
import { TitleScene } from './scenes/TitleScene';
import { UIScene } from './scenes/UIScene';

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: VIEW.width,
  height: VIEW.height,
  backgroundColor: COLORS.real.night,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: MOVE.real.gravity }, debug: false },
  },
  scene: [BootScene, TitleScene, LevelScene, UIScene, PauseScene, InterstitialScene, FinaleScene, CreditsScene],
});

installDebugAPI(game);
