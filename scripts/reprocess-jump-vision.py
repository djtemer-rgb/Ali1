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
    
    # Determine if green or magenta key
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
                                
                if len(comp) > 100:  # Filter out tiny noise specks
                    components.append({
                        'pixels': comp,
                        'bbox': (min_x, min_y, max_x + 1, max_y + 1)
                    })
                    
    print(f"  Found {len(components)} components.")
    
    cell_w = 418
    cell_h = 627
    new_img = Image.new("RGBA", (1254, 1254), (0, 0, 0, 0))
    
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
        
        # Map to col (0, 1, 2)
        if cx < 418:
            col = 0
        elif cx < 836:
            col = 1
        else:
            col = 2
            
        # Map to row (0, 1)
        if cy < 700:
            row = 0
        else:
            row = 1
            
        grid[(row, col)].extend(comp['pixels'])
        
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
            
        # Scale down character or resize items
        if r == 0:
            # Character: Scale down if it exceeds the cell width to prevent boundary clipping
            max_w = 405
            if sprite_w > max_w:
                scale_ratio = max_w / sprite_w
                new_w = max_w
                new_h = int(sprite_h * scale_ratio)
                sprite_img = sprite_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
                sprite_w = new_w
                sprite_h = new_h
                
            # Create clean standard cell
            clean_cell = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
            
            # Center horizontally and bottom-align
            dest_x = (cell_w - sprite_w) // 2
            dest_y = cell_h - sprite_h - 15
            clean_cell.paste(sprite_img, (dest_x, dest_y))
        else:
            if c == 0:
                # Platform: Exactly 418x220
                target_w, target_h = 418, 220
                sprite_img = sprite_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
                clean_cell = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
                clean_cell.paste(sprite_img, (0, 0))
            else:
                # Star/Bomb: Exactly 390x390, centered horizontally
                target_w, target_h = 390, 390
                sprite_img = sprite_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
                clean_cell = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
                dest_x = (cell_w - target_w) // 2
                clean_cell.paste(sprite_img, (dest_x, 0))
            
        new_img.paste(clean_cell, (c * cell_w, r * cell_h))
        
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
