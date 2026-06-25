import os
from PIL import Image

def check_raw_cut(image_path, label):
    print(f"\n--- Checking raw cut-off in {os.path.basename(image_path)} ---")
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    
    key_color = img.getpixel((0, 0))
    kr, kg, kb = key_color[:3]
    tolerance = 45
    
    # We want to check the column x = 836 (border between Col 1 and Col 2)
    # and x = 418 (border between Col 0 and Col 1)
    # Let's count how many non-transparent pixels touch these vertical borders in rows 0 and 1 (y from 0 to 836).
    for border_x in [418, 836]:
        border_pixels = []
        for y in range(836):
            # Check a small window of 5 pixels around the border
            for dx in [-2, -1, 0, 1, 2]:
                px = border_x + dx
                if 0 <= px < w:
                    r, g, b, a = img.getpixel((px, y))[:4]
                    dist = ((r - kr)**2 + (g - kg)**2 + (b - kb)**2)**0.5
                    if dist >= tolerance:
                        border_pixels.append((px, y, r, g, b))
                        
        print(f"Border x={border_x}: found {len(border_pixels)} non-key pixels in y=[0, 836].")
        if border_pixels:
            y_coords = [p[1] for p in border_pixels]
            print(f"  y range: {min(y_coords)} to {max(y_coords)}")

check_raw_cut("images/5 - jump/3 - Енотик — Плюш.png", "raccoon")
check_raw_cut("images/5 - jump/9 - Волчонок — Норд.png", "wolf")
check_raw_cut("images/5 - jump/12 - Тигрёнок — Рыкс.png", "tiger")
check_raw_cut("images/5 - jump/18 - Леопардик — Блиц.png", "leopard")
