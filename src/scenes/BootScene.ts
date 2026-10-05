import Phaser from 'phaser';
import { CRAYON_NAMES, ensureCrayonTextures, pngKey } from '../render/crayonArt';
import { SCENES } from './keys';

/** Loads the team's crayon PNGs if they exist (§9.6), bakes the procedural fallbacks for the rest, then the title. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Boot);
  }

  preload(): void {
    // Missing or broken PNGs are fine: the procedural crayon page is used instead.
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.info(`[boot] no crayon PNG for ${file.key}, using the generated page`);
    });
    for (const name of CRAYON_NAMES) this.load.image(pngKey(name), `art/crayon/${name}.png`);
  }

  create(): void {
    ensureCrayonTextures(this);
    this.scene.start(SCENES.Title);
  }
}
