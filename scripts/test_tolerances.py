import os
from PIL import Image

def test_tolerances(input_path, label, cell_col):
    print(f"\n--- Testing Tolerances for {label} (Col {cell_col}) ---")
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    
    key_color = img.getpixel((0, 0))
    kr, kg, kb = key_color[:3]
    
    for tol in [10, 20, 30, 40, 45, 50, 60]:
        # Create mask
        mask = [[0]*w for _ in range(h)]
        for y in range(h):
            for x in range(w):
                r, g, b = img.getpixel((x, y))[:3]
                dist = ((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2) ** 0.5
                if dist >= tol:
                    mask[y][x] = 1
                    
        # Find components
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
                                    
                    if len(comp) > 100:
                        components.append({
                            'pixels': len(comp),
                            'bbox': (min_x, min_y, max_x + 1, max_y + 1),
                            'cx': sum(p[0] for p in comp) / len(comp)
                        })
                        
        # Find component corresponding to cell_col
        col_comp = None
        for c in components:
            cx = c['cx']
            if cell_col == 0 and cx < 418:
                col_comp = c
            elif cell_col == 1 and 418 <= cx < 836:
                col_comp = c
            elif cell_col == 2 and cx >= 836:
                col_comp = c
                
        if col_comp:
            print(f"  Tolerance {tol:2d}: bbox={col_comp['bbox']} size={col_comp['bbox'][2]-col_comp['bbox'][0]}x{col_comp['bbox'][3]-col_comp['bbox'][1]} pixels={col_comp['pixels']}")
        else:
            print(f"  Tolerance {tol:2d}: NOT FOUND")

test_tolerances("images/5 - jump/9 - Волчонок — Норд.png", "wolf", 2)
test_tolerances("images/5 - jump/18 - Леопардик — Блиц.png", "leopard", 2)
test_tolerances("images/5 - jump/18 - Леопардик — Блиц.png", "leopard", 0) # Idle leopard
