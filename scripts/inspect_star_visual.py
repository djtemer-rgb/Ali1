import os
from PIL import Image

def ascii_art_component(image_path, threshold_w=80, threshold_h=40):
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    
    # Scale down for console view
    sw = min(w, threshold_w)
    sh = int(h * (sw / w) * 0.5) # 0.5 factor for font aspect ratio
    sh = max(1, min(sh, threshold_h))
    
    small_img = img.resize((sw, sh), Image.Resampling.NEAREST)
    
    print(f"\nShape of {os.path.basename(image_path)} ({w}x{h}):")
    for y in range(sh):
        line = ""
        for x in range(sw):
            p = small_img.getpixel((x, y))
            if p[3] > 10:
                # Use different characters for opacity
                if p[3] > 200:
                    line += "█"
                else:
                    line += "░"
            else:
                line += " "
        print(line)

# Let's find the raccoon star image
raccoon_temp_dir = "public/images/bonus-games/jump/temp/raccoon"
for f in sorted(os.listdir(raccoon_temp_dir)):
    if "comp_4" in f: # Star is Component 4
        ascii_art_component(os.path.join(raccoon_temp_dir, f))

# Let's also check wolf star
wolf_temp_dir = "public/images/bonus-games/jump/temp/wolf"
for f in sorted(os.listdir(wolf_temp_dir)):
    if "comp_4" in f: # Star is Component 4
        ascii_art_component(os.path.join(wolf_temp_dir, f))
