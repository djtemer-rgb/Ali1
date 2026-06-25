import os
from PIL import Image

def scan_raw_pixels(image_path, x_range, y_range):
    print(f"\n--- Scanning raw pixels in {os.path.basename(image_path)} ---")
    img = Image.open(image_path).convert("RGBA")
    
    key_color = img.getpixel((0, 0))
    kr, kg, kb = key_color[:3]
    
    found_pixels = 0
    for y in range(y_range[0], y_range[1]):
        row_str = ""
        for x in range(x_range[0], x_range[1]):
            r, g, b = img.getpixel((x, y))[:3]
            dist = ((r - kr)**2 + (g - kg)**2 + (b - kb)**2)**0.5
            # If color is far from key color
            if dist >= 15:
                row_str += "█"
                found_pixels += 1
            else:
                row_str += "."
        # If there's any non-key pixel in the row, print it
        if "█" in row_str:
            print(f"y={y:3d}: {row_str}")
            
    print(f"Total non-key pixels found in region: {found_pixels}")

scan_raw_pixels("images/5 - jump/9 - Волчонок — Норд.png", (790, 815), (140, 580))
scan_raw_pixels("images/5 - jump/18 - Леопардик — Блиц.png", (780, 805), (150, 615))
