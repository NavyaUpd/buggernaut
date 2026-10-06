import Phaser from 'phaser';
import { ensureCrayonTextures, pngKey, type CrayonName } from '../render/crayonArt';
import { SCENES } from './keys';

/**
 * Hand-drawn crayon PNGs that ship in public/art/crayon/ (§9.6). Add a name here when you add its PNG; every page not
 * listed uses the procedural crayon fallback. (Listing only shipped files keeps the browser console free of 404s.)
 */
const SHIPPED_PNGS: readonly CrayonName[] = [];

/** Loads the team's crayon PNGs, bakes the procedural fallbacks for the rest, then the title. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.Boot);
  }

  preload(): void {
    // Missing or broken PNGs are fine: the procedural crayon page is used instead.
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.info(`[boot] no crayon PNG for ${file.key}, using the generated page`);
    });
    for (const name of SHIPPED_PNGS) this.load.image(pngKey(name), `art/crayon/${name}.png`);
  }

  create(): void {
    ensureCrayonTextures(this);
    this.scene.start(SCENES.Title);
  }
}
