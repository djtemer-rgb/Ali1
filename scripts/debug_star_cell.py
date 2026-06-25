import os
from PIL import Image

def analyze_cell_components(image_path, r, c):
    print(f"\n--- Analyzing components in cell r{r}c{c} of {os.path.basename(image_path)} ---")
    img = Image.open(image_path).convert("RGBA")
    cell_size = 418
    x0, y0 = c * cell_size, r * cell_size
    cell = img.crop((x0, y0, x0 + cell_size, y0 + cell_size))
    
    key_color = img.getpixel((0, 0))
    kr, kg, kb = key_color[:3]
    tolerance = 45
    
    w, h = cell.size
    mask = [[0]*w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            pixel = cell.getpixel((x, y))
            pr, pg, pb = pixel[:3]
            dist = ((pr - kr)**2 + (pg - kg)**2 + (pb - kb)**2)**0.5
            if dist >= tolerance:
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
                    'pixels_count': len(comp),
                    'bbox': (min_x, min_y, max_x + 1, max_y + 1)
                })
                
    components.sort(key=lambda x: x['pixels_count'], reverse=True)
    for i, comp in enumerate(components):
        print(f"Component {i}: pixels={comp['pixels_count']}, bbox={comp['bbox']}")

analyze_cell_components("images/5 - jump/3 - Енотик — Плюш.png", 2, 1)
analyze_cell_components("images/5 - jump/9 - Волчонок — Норд.png", 2, 1)
analyze_cell_components("images/5 - jump/12 - Тигрёнок — Рыкс.png", 2, 1)
analyze_cell_components("images/5 - jump/18 - Леопардик — Блиц.png", 2, 1)
