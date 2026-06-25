import os
from PIL import Image

def process_vision(input_path, output_path):
    print(f"Vision processing {os.path.basename(input_path)}...")
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    
    # 1. Sample key color at (0, 0)
    key_color = img.getpixel((0, 0))
    kr, kg, kb = key_color[0], key_color[1], key_color[2]
    print(f"  Sampled key color: R={kr}, G={kg}, B={kb}")
    
    # Determine key type
    is_green_key = (kg > 150 and kr < 100 and kb < 100)
    is_magenta_key = (kr > 150 and kb > 150 and kg < 100)
    
    tolerance = 45
    
    # Remove chromakey background and apply spill suppression
    datas = img.getdata()
    clean_data = []
    for item in datas:
        r, g, b, a = item[0], item[1], item[2], item[3]
        dist = ((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2) ** 0.5
        
        if dist < tolerance:
            clean_data.append((0, 0, 0, 0))
        elif dist < tolerance + 40:
            # Spill suppression
            if is_green_key:
                if g > r and g > b:
                    g = int((r + b) / 2)
            elif is_magenta_key:
                if r > g and b > g:
                    r = int((r + g) / 2)
                    b = int((b + g) / 2)
            factor = (dist - tolerance) / 40.0
            new_a = int(a * factor)
            clean_data.append((r, g, b, new_a))
        else:
            clean_data.append((r, g, b, a))
            
    img.putdata(clean_data)
    
    # Create binary mask for BFS
    mask = [[0]*w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if clean_data[y * w + x][3] > 0:
                mask[y][x] = 1
                
    # BFS to find connected components
    visited = [[False]*w for _ in range(h)]
    components = []
    
    for y in range(h):
        for x in range(w):
            if mask[y][x] == 1 and not visited[y][x]:
                comp = []
                queue = [(x, y)]
                visited[y][x] = True
                min_x, max_x = x, x
                min_y, max_y = y, y
                
                while queue:
                    cx, cy = queue.pop(0)
                    comp.append((cx, cy))
                    min_x = min(min_x, cx)
                    max_x = max(max_x, cx)
                    min_y = min(min_y, cy)
                    max_y = max(max_y, cy)
                    
                    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            if mask[ny][nx] == 1 and not visited[ny][nx]:
                                visited[ny][nx] = True
                                queue.append((nx, ny))
                                
                if len(comp) > 100:  # Filter out tiny noise
                    components.append({
                        'pixels': comp,
                        'bbox': (min_x, min_y, max_x + 1, max_y + 1)
                    })
                    
    print(f"  Found {len(components)} components.")
    
    cell_w = 418
    cell_h = 627
    new_img = Image.new("RGBA", (1254, 1254), (0, 0, 0, 0))
    
    # Grid setup for output
    grid = {}
    for r in range(2):
        for c in range(3):
            grid[(r, c)] = []
            
    for comp in components:
        # Calculate center of mass
        sum_x = sum(p[0] for p in comp['pixels'])
        sum_y = sum(p[1] for p in comp['pixels'])
        n = len(comp['pixels'])
        cx = sum_x / n
        cy = sum_y / n
        
        # Mapping rules based on the 3x3 layout of the source sheet
        # Column 0 & 1 (x: 0..836) has the 3 Hero flight frames stacked vertically
        # Column 2 (x: 836..1254) has Portal, Star, Danger stacked vertically
        
        if cx < 836:
            # Hero Frames
            row_out = 0
            if cy < 418:
                col_out = 0  # Frame 1
            elif cy < 836:
                col_out = 1  # Frame 2
            else:
                col_out = 2  # Frame 3
        else:
            # Items
            row_out = 1
            if cy < 418:
                col_out = 0  # Portal
            elif cy < 836:
                col_out = 1  # Star
            else:
                col_out = 2  # Danger
                
        grid[(row_out, col_out)].extend(comp['pixels'])
        
    for (r, c), pixels in grid.items():
        if not pixels:
            print(f"  Warning: No pixels mapped to cell ({r}, {c})")
            continue
            
        # Find exact bounding box of these pixels
        xs = [p[0] for p in pixels]
        ys = [p[1] for p in pixels]
        x0, x1 = min(xs), max(xs) + 1
        y0, y1 = min(ys), max(ys) + 1
        
        sprite_w = x1 - x0
        sprite_h = y1 - y0
        sprite_img = Image.new("RGBA", (sprite_w, sprite_h), (0, 0, 0, 0))
        for p in pixels:
            color = img.getpixel((p[0], p[1]))
            sprite_img.putpixel((p[0] - x0, p[1] - y0), color)
            
        # Create clean standard cell
        clean_cell = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
        
        if r == 0:
            # Character frames: Scale down if they exceed 405 width
            max_w = 405
            if sprite_w > max_w:
                scale_ratio = max_w / sprite_w
                new_w = max_w
                new_h = int(sprite_h * scale_ratio)
                sprite_img = sprite_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                sprite_w = new_w
                sprite_h = new_h
                
            # Center horizontally and vertically inside 418x627
            dest_x = (cell_w - sprite_w) // 2
            dest_y = (cell_h - sprite_h) // 2
            clean_cell.paste(sprite_img, (dest_x, dest_y))
        else:
            # Items
            if c == 0:
                # Portal: exactly 350x550, centered inside 418x627
                target_w, target_h = 350, 550
                sprite_img = sprite_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
                dest_x = (cell_w - target_w) // 2
                dest_y = (cell_h - target_h) // 2
                clean_cell.paste(sprite_img, (dest_x, dest_y))
            else:
                # Star/Danger: exactly 390x390, centered horizontally inside 418x418 area at the top
                target_w, target_h = 390, 390
                sprite_img = sprite_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
                dest_x = (cell_w - target_w) // 2
                dest_y = 14  # top padding
                clean_cell.paste(sprite_img, (dest_x, dest_y))
                
        new_img.paste(clean_cell, (c * cell_w, r * cell_h))
        
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    new_img.save(output_path, "PNG")
    print(f"  Successfully processed and saved to {output_path}")

def main():
    src_dir = "images/4 - flight"
    dest_dir = "public/images/bonus-games/flight"
    assets = [
        ("6 - Ледяной дракончик — Кристалл.png", "06_ice_dragon_crystal.png"),
        ("11 - Огненный дракончик — Искрик.png", "11_fire_dragon_iskrik.png"),
        ("13 - Орлёнок — Скай.png", "13_eaglet_sky.png"),
        ("16 - Лесной дракончик — Вердан.png.png", "16_forest_dragon_verdan.png"),
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
