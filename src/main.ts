import Phaser from 'phaser';
import { audio } from './audio';
import { COLORS, VIEW } from './config';
import { installDebugAPI } from './debug/DebugAPI';
import { input } from './input';
import { BootScene } from './scenes/BootScene';
import { ChapterCardScene } from './scenes/ChapterCardScene';
import { CreditsScene } from './scenes/CreditsScene';
import { FinaleScene } from './scenes/FinaleScene';
import { PauseScene } from './scenes/PauseScene';
import { PhoneScene } from './scenes/PhoneScene';
import { RoomScene } from './scenes/RoomScene';
import { TitleScene } from './scenes/TitleScene';

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  parent: 'game',
  width: VIEW.width,
  height: VIEW.height,
  backgroundColor: COLORS.real.night,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { keyboard: false, mouse: false, touch: false },
  render: { antialias: true, pixelArt: false },
  scene: [BootScene, TitleScene, ChapterCardScene, RoomScene, PhoneScene, FinaleScene, CreditsScene, PauseScene],
});

// Audio starts on the first key press (§11). Fresh presses are cleared after every game step.
input.onKey(() => audio.start());
game.events.on(Phaser.Core.Events.POST_STEP, () => input.endFrame());

installDebugAPI(game);
