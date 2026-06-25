import os
from PIL import Image

def inspect_processed_star(image_path):
    print(f"\n--- Processed Star in {os.path.basename(image_path)} ---")
    img = Image.open(image_path).convert("RGBA")
    
    # The cell is at col 1, row 1.
    cell_w, cell_h = 418, 627
    x0, y0 = 1 * cell_w, 1 * cell_h
    cell = img.crop((x0, y0, x0 + cell_w, y0 + cell_h))
    
    # Find bounding box of non-transparent pixels in this cell
    bbox = cell.getbbox()
    if not bbox:
        print("Empty cell!")
        return
        
    print(f"Bbox of non-transparent pixels: {bbox}")
    
    # Check if there are disconnected components in this cell
    w, h = cell.size
    mask = [[0]*w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if cell.getpixel((x, y))[3] > 0:
                mask[y][x] = 1
                
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
                                
                components.append({
                    'pixels': len(comp),
                    'bbox': (min_x, min_y, max_x + 1, max_y + 1)
                })
                
    components.sort(key=lambda x: x['pixels'], reverse=True)
    for i, c in enumerate(components):
        print(f"Sub-component {i}: pixels={c['pixels']}, bbox={c['bbox']}")

inspect_processed_star("public/images/bonus-games/jump/03_raccoon_plush.png")
inspect_processed_star("public/images/bonus-games/jump/09_wolf_nord.png")
inspect_processed_star("public/images/bonus-games/jump/12_tiger_ryks.png")
inspect_processed_star("public/images/bonus-games/jump/18_leopard_blitz.png")
