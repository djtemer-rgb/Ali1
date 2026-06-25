import os
from PIL import Image

def scan_raw_pixels_wolf(image_path, x_range, y_range):
    print(f"\n--- Scanning raw pixels in {os.path.basename(image_path)} ---")
    img = Image.open(image_path).convert("RGBA")
    
    key_color = img.getpixel((0, 0))
    kr, kg, kb = key_color[:3]
    
    found_pixels = 0
    col_counts = {x: 0 for x in range(x_range[0], x_range[1])}
    for y in range(y_range[0], y_range[1]):
        for x in range(x_range[0], x_range[1]):
            r, g, b = img.getpixel((x, y))[:3]
            dist = ((r - kr)**2 + (g - kg)**2 + (b - kb)**2)**0.5
            if dist >= 15:
                col_counts[x] += 1
                found_pixels += 1
                
    print("Non-key pixel counts per column:")
    for x in sorted(col_counts.keys()):
        print(f"  x={x}: {col_counts[x]} pixels")
    print(f"Total non-key pixels found in region: {found_pixels}")

scan_raw_pixels_wolf("images/5 - jump/9 - Волчонок — Норд.png", (780, 815), (140, 580))
scan_raw_pixels_wolf("images/5 - jump/18 - Леопардик — Блиц.png", (760, 805), (150, 615))
