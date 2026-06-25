from PIL import Image

def ascii_art_component(image_path, threshold_w=60, threshold_h=30):
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    
    sw = min(w, threshold_w)
    sh = int(h * (sw / w) * 0.5)
    sh = max(1, min(sh, threshold_h))
    
    small_img = img.resize((sw, sh), Image.Resampling.NEAREST)
    
    print(f"\nShape of {image_path} ({w}x{h}):")
    for y in range(sh):
        line = ""
        for x in range(sw):
            p = small_img.getpixel((x, y))
            if p[3] > 10:
                if p[3] > 200:
                    line += "█"
                else:
                    line += "░"
            else:
                line += " "
        print(line)

import os
raccoon_temp_dir = "public/images/bonus-games/jump/temp/raccoon"
for f in sorted(os.listdir(raccoon_temp_dir)):
    if "comp_4" in f: # Star is Component 4
        ascii_art_component(os.path.join(raccoon_temp_dir, f))
