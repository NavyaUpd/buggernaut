# Builds submission/bloom.gif from the frames captured by scripts/record-gif.mjs (needs Pillow).
import glob
import shutil

from PIL import Image

frames = sorted(glob.glob("submission/_gif/f*.png"))
imgs = [Image.open(f).convert("RGB").resize((640, 360), Image.LANCZOS) for f in frames]
pal = [im.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE) for im in imgs]
durations = [50] * len(pal)
durations[-1] = 1500  # hold on the finished comic panel
pal[0].save("submission/bloom.gif", save_all=True, append_images=pal[1:], duration=durations, loop=0, optimize=True)
shutil.rmtree("submission/_gif")
print("bloom.gif:", len(pal), "frames")
