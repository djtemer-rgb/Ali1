import os
from PIL import Image

def process_cell(cell, key_color, tolerance=45):
    # cell is RGBA
    w, h = cell.size
    datas = cell.getdata()
    clean_data = []
    kr, kg, kb = key_color[0], key_color[1], key_color[2]
    for item in datas:
        r, g, b, a = item[0], item[1], item[2], item[3]
        dist = ((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2) ** 0.5
        if dist < tolerance:
            clean_data.append((0, 0, 0, 0))
        else:
            clean_data.append((r, g, b, a))
    
    clean_cell = Image.new("RGBA", (w, h))
    clean_cell.putdata(clean_data)
    return clean_cell

def main():
    src_dir = "images/5 - jump"
    temp_dir = "public/images/bonus-games/jump/temp"
    os.makedirs(temp_dir, exist_ok=True)
    
    assets = [
        ("3 - Енотик — Плюш.png", "raccoon"),
        ("9 - Волчонок — Норд.png", "wolf"),
        ("12 - Тигрёнок — Рыкс.png", "tiger"),
        ("18 - Леопардик — Блиц.png", "leopard"),
    ]
    
    for src_name, label in assets:
        src_path = os.path.join(src_dir, src_name)
        # Resolve potential naming/normalization issues
        if not os.path.exists(src_path):
            prefix = src_name.split(" ")[0]
            for f in os.listdir(src_dir):
                if f.startswith(prefix) and f.endswith(".png"):
                    src_path = os.path.join(src_dir, f)
                    break
        
        if not os.path.exists(src_path):
            print(f"Skipping {src_name} - not found")
            continue
            
        print(f"Slicing {src_path}...")
        img = Image.open(src_path).convert("RGBA")
        key_color = img.getpixel((0, 0))
        cell_size = 418
        
        for r in range(3):
            for c in range(3):
                x0 = c * cell_size
                y0 = r * cell_size
                x1 = x0 + cell_size
                y1 = y0 + cell_size
                
                cell = img.crop((x0, y0, x1, y1))
                clean_cell = process_cell(cell, key_color)
                
                bbox = clean_cell.getbbox()
                if bbox:
                    bbox_str = f"{bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]} (size: {bbox[2]-bbox[0]}x{bbox[3]-bbox[1]})"
                else:
                    bbox_str = "empty"
                
                # Save cell
                out_path = os.path.join(temp_dir, f"{label}_r{r}_c{c}.png")
                clean_cell.save(out_path)
                print(f"  Saved cell r{r} c{c} -> {out_path} (bbox: {bbox_str})")

if __name__ == "__main__":
    main()
