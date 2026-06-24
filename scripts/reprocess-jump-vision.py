import os
from PIL import Image

def find_split_y(img, key_color, tolerance=45):
    w, h = img.size
    kr, kg, kb = key_color[0], key_color[1], key_color[2]
    
    # Scan rows from Y=500 to Y=850 to find completely empty rows (chromakey background only)
    empty_rows = []
    for y in range(500, 850):
        is_empty = True
        for x in range(w):
            pixel = img.getpixel((x, y))
            r, g, b = pixel[0], pixel[1], pixel[2]
            dist = ((r - kr)**2 + (g - kg)**2 + (b - kb)**2)**0.5
            if dist > tolerance:
                is_empty = False
                break
        if is_empty:
            empty_rows.append(y)
            
    if empty_rows:
        split_y = (empty_rows[0] + empty_rows[-1]) // 2
        print(f"  Detected Y-split at: {split_y} (empty range: {empty_rows[0]} - {empty_rows[-1]})")
        return split_y
    else:
        print("  Warning: No completely empty row found. Falling back to Y=627")
        return 627

def process_vision(input_path, output_path):
    print(f"Vision processing {os.path.basename(input_path)}...")
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    
    # 1. Sample key color at (0, 0)
    key_color = img.getpixel((0, 0))
    kr, kg, kb = key_color[0], key_color[1], key_color[2]
    print(f"  Sampled key color: R={kr}, G={kg}, B={kb}")
    
    # Determine if green or magenta key
    is_green_key = (kg > 150 and kr < 100 and kb < 100)
    is_magenta_key = (kr > 150 and kb > 150 and kg < 100)
    
    tolerance = 45
    
    # Find the split Y coordinate dynamically
    split_y = find_split_y(img, key_color, tolerance)
    
    # Apply chroma-key background removal and spill suppression to the entire image first
    datas = img.getdata()
    clean_data = []
    for item in datas:
        r, g, b, a = item[0], item[1], item[2], item[3]
        dist = ((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2) ** 0.5
        
        if dist < tolerance:
            # Fully transparent
            clean_data.append((0, 0, 0, 0))
        elif dist < tolerance + 40:
            # Spill suppression for anti-aliasing edge pixels
            if is_green_key:
                if g > r and g > b:
                    g = int((r + b) / 2)
            elif is_magenta_key:
                if r > g and b > g:
                    r = int((r + g) / 2)
                    b = int((b + g) / 2)
            
            # Blend alpha slightly for smooth edge
            factor = (dist - tolerance) / 40.0
            new_a = int(a * factor)
            clean_data.append((r, g, b, new_a))
        else:
            clean_data.append((r, g, b, a))
            
    img.putdata(clean_data)
    
    # 2. Slice into 3x2 grid of cells, aligning back into a standard 418x627 layout
    cell_w = 418
    cell_h = 627
    
    new_img = Image.new("RGBA", (1254, 1254), (0, 0, 0, 0))
    
    for r in range(2):
        for c in range(3):
            # Crop the grid cell from cleaned image based on dynamic Y-split
            x0 = c * cell_w
            x1 = x0 + cell_w
            
            if r == 0:
                y0 = 0
                y1 = split_y
            else:
                y0 = split_y
                y1 = 1254
                
            cell_crop = img.crop((x0, y0, x1, y1))
            
            # Create a core copy and erase borders to sever neighboring cell bleed
            core = cell_crop.copy()
            core_pixels = core.load()
            
            # Erase left/right/top/bottom edges to prevent neighboring graphics bleed
            border_x = 35
            border_y = 25
            cell_w_curr = x1 - x0
            cell_h_curr = y1 - y0
            
            for x in range(cell_w_curr):
                for y in range(cell_h_curr):
                    if x < border_x or x > cell_w_curr - border_x or y < border_y or y > cell_h_curr - border_y:
                        core_pixels[x, y] = (0, 0, 0, 0)
            
            # Find bounding box on the core (no bleed)
            bbox = core.getbbox()
            if not bbox:
                print(f"  Warning: Cell ({r}, {c}) is completely empty after bleed erasure.")
                continue
                
            bx0, by0, bx1, by1 = bbox
            sprite_w = bx1 - bx0
            sprite_h = by1 - by0
            
            # Crop from core to guarantee zero neighbor bleed
            sprite_img = core.crop(bbox)
            
            # Create a clean cell of size 418x627
            clean_cell = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
            
            # Center horizontally
            dest_x = (cell_w - sprite_w) // 2
            
            if r == 0:
                # Character: align bottom with 15px margin to keep feet fully visible
                dest_y = cell_h - sprite_h - 15
            else:
                # Item: center vertically
                dest_y = (cell_h - sprite_h) // 2
                
            clean_cell.paste(sprite_img, (dest_x, dest_y))
            new_img.paste(clean_cell, (c * cell_w, r * cell_h))
            
    # Ensure destination directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    new_img.save(output_path, "PNG")
    print(f"  Successfully processed and saved to {output_path}")

def main():
    src_dir = "images/5 - jump"
    dest_dir = "public/images/bonus-games/jump"
    assets = [
        ("3 - Енотик — Плюш.png", "03_raccoon_plush.png"),
        ("9 - Волчонок — Норд.png", "09_wolf_nord.png"),
        ("12 - Тигрёнок — Рыкс.png", "12_tiger_ryks.png"),
        ("18 - Леопардик — Блиц.png", "18_leopard_blitz.png"),
    ]
    
    for src_name, dest_name in assets:
        src_path = os.path.join(src_dir, src_name)
        dest_path = os.path.join(dest_dir, dest_name)
        
        # Resolve potential naming/normalization issues
        if not os.path.exists(src_path):
            prefix = src_name.split(" ")[0]
            for f in os.listdir(src_dir):
                if f.startswith(prefix) and f.endswith(".png"):
                    src_path = os.path.join(src_dir, f)
                    break
                    
        if os.path.exists(src_path):
            process_vision(src_path, dest_path)
        else:
            print(f"Error: Source asset {src_name} not found.")

if __name__ == "__main__":
    main()
