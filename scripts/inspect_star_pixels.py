import os
from PIL import Image

def analyze_star_cell(src_path, label):
    print(f"\n================= {label} =================")
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    
    key_color = img.getpixel((0, 0))
    kr, kg, kb = key_color[:3]
    tolerance = 45
    
    # Crop the star cell r2c1
    cell_size = 418
    r, c = 2, 1
    x0, y0 = c * cell_size, r * cell_size
    cell = img.crop((x0, y0, x0 + cell_size, y0 + cell_size))
    
    # Save the raw cropped star cell with chromakey removed
    temp_dir = "public/images/bonus-games/jump/temp"
    os.makedirs(temp_dir, exist_ok=True)
    
    cw, ch = cell.size
    clean_cell = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    for y in range(ch):
        for x in range(cw):
            p = cell.getpixel((x, y))
            pr, pg, pb, pa = p
            dist = ((pr - kr)**2 + (pg - kg)**2 + (pb - kb)**2)**0.5
            if dist >= tolerance:
                clean_cell.putpixel((x, y), p)
                
    clean_cell.save(os.path.join(temp_dir, f"clean_{label}_star_cell.png"))
    print(f"Saved clean star cell to temp/clean_{label}_star_cell.png")

analyze_star_cell("images/5 - jump/3 - Енотик — Плюш.png", "raccoon")
analyze_star_cell("images/5 - jump/9 - Волчонок — Норд.png", "wolf")
analyze_star_cell("images/5 - jump/12 - Тигрёнок — Рыкс.png", "tiger")
analyze_star_cell("images/5 - jump/18 - Леопардик — Блиц.png", "leopard")
