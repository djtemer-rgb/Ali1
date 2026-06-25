from PIL import Image
import os

def ascii_art_cell(image_path, row, col, label, threshold_w=50, threshold_h=25):
    img = Image.open(image_path).convert("RGBA")
    cell_w, cell_h = 418, 627
    x0, y0 = col * cell_w, row * cell_h
    cell = img.crop((x0, y0, x0 + cell_w, y0 + cell_h))
    
    # Find bounding box of non-transparent pixels in this cell
    bbox = cell.getbbox()
    if not bbox:
        print(f"\nCell r{row}c{col} of {label} is empty!")
        return
        
    # Crop to content for ascii art
    content = cell.crop(bbox)
    w, h = content.size
    
    sw = min(w, threshold_w)
    sh = int(h * (sw / w) * 0.5)
    sh = max(1, min(sh, threshold_h))
    
    small_img = content.resize((sw, sh), Image.Resampling.NEAREST)
    
    print(f"\n--- {label} Row {row} Col {col} (bbox: {bbox}) ---")
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

# Let's inspect wolf jump cell (row 0, col 2)
ascii_art_cell("public/images/bonus-games/jump/09_wolf_nord.png", 0, 2, "wolf_jump")
# Let's inspect leopard jump cell (row 0, col 2)
ascii_art_cell("public/images/bonus-games/jump/18_leopard_blitz.png", 0, 2, "leopard_jump")
# Let's inspect leopard idle cell (row 0, col 0)
ascii_art_cell("public/images/bonus-games/jump/18_leopard_blitz.png", 0, 0, "leopard_idle")
