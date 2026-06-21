import os
from PIL import Image

def process_vision(input_path, output_path):
    print(f"Vision processing {os.path.basename(input_path)}...")
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    
    # Chroma-key removal
    datas = img.getdata()
    key_color = datas[0]
    kr, kg, kb = key_color[0], key_color[1], key_color[2]
    tolerance = 45
    
    clean_data = []
    for item in datas:
        r, g, b, a = item[0], item[1], item[2], item[3]
        dist = ((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2) ** 0.5
        if dist < tolerance:
            clean_data.append((0, 0, 0, 0))
        else:
            clean_data.append((r, g, b, a))
            
    img.putdata(clean_data)
    
    # BFS to find connected components
    visited = [[False]*w for _ in range(h)]
    components = []
    
    # Helper binary mask
    mask = [[0]*w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if clean_data[y * w + x][3] > 0:
                mask[y][x] = 1
                
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
                
                # Keep components with > 1000 pixels to filter out noise
                if len(comp) > 1000:
                    components.append({
                        'pixels': comp,
                        'bbox': (min_x, min_y, max_x + 1, max_y + 1)
                    })
                    
    print(f"  Found {len(components)} main sprites.")
    
    # Map components to the 3x2 grid
    # Each cell is 418x627
    cell_w = 418
    cell_h = 627
    
    new_img = Image.new("RGBA", (1254, 1254), (0, 0, 0, 0))
    
    # We will initialize grid cells
    grid = {} # (row, col) -> list of pixels
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
        
    # Reconstruct cells
    for (r, c), pixels in grid.items():
        if not pixels:
            print(f"  Warning: No pixels mapped to cell ({r}, {c})")
            continue
            
        # Find exact bounding box of these pixels
        xs = [p[0] for p in pixels]
        ys = [p[1] for p in pixels]
        x0, x1 = min(xs), max(xs) + 1
        y0, y1 = min(ys), max(ys) + 1
        
        # Crop the sprite from the cleaned image
        sprite_w = x1 - x0
        sprite_h = y1 - y0
        sprite_img = Image.new("RGBA", (sprite_w, sprite_h), (0, 0, 0, 0))
        for p in pixels:
            # get pixel color from img
            color = img.getpixel((p[0], p[1]))
            sprite_img.putpixel((p[0] - x0, p[1] - y0), color)
            
        # Create a new clean cell of size 418x627
        clean_cell = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
        
        # Center horizontally
        dest_x = (cell_w - sprite_w) // 2
        
        if r == 0:
            # Character: align bottom with 20px margin
            dest_y = cell_h - sprite_h - 20
        else:
            # Falling Item: center vertically
            dest_y = (cell_h - sprite_h) // 2
            
        clean_cell.paste(sprite_img, (dest_x, dest_y))
        new_img.paste(clean_cell, (c * cell_w, r * cell_h))
        
    new_img.save(output_path, "PNG")
    print(f"  Successfully processed and saved to {output_path}")

def main():
    src_dir = "images/2 - hunter"
    dest_dir = "public/images/bonus-games/catcher"
    assets = [
        ("2 - Капибара — Капи.png", "02_capybara_kapi.png"),
        ("14 - Буйволёнок — Гром.png", "14_buffalo_grom.png"),
        ("17 - Носорог — Титан.png", "17_rhino_titan.png"),
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
