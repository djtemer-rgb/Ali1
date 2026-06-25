import os
from PIL import Image

def save_component_crops(input_path, label):
    print(f"\nCropping components from {os.path.basename(input_path)}...")
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    
    key_color = img.getpixel((0, 0))
    kr, kg, kb = key_color[0], key_color[1], key_color[2]
    
    tolerance = 45
    datas = img.getdata()
    mask = [[0]*w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            r, g, b, a = datas[y * w + x][:4]
            dist = ((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2) ** 0.5
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
                                
                if len(comp) > 100:  # Filter out noise
                    components.append({
                        'pixels': comp,
                        'bbox': (min_x, min_y, max_x + 1, max_y + 1)
                    })
                    
    temp_dir = f"public/images/bonus-games/jump/temp/{label}"
    os.makedirs(temp_dir, exist_ok=True)
    
    for i, c in enumerate(components):
        bbox = c['bbox']
        cw = bbox[2] - bbox[0]
        ch = bbox[3] - bbox[1]
        comp_img = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        for p in c['pixels']:
            color = img.getpixel((p[0], p[1]))
            comp_img.putpixel((p[0] - bbox[0], p[1] - bbox[1]), color)
        out_path = os.path.join(temp_dir, f"comp_{i}_bbox_{bbox[0]}_{bbox[1]}_{bbox[2]}_{bbox[3]}.png")
        comp_img.save(out_path)
        print(f"Saved component {i} -> {out_path}")

save_component_crops("images/5 - jump/3 - Енотик — Плюш.png", "raccoon")
save_component_crops("images/5 - jump/9 - Волчонок — Норд.png", "wolf")
save_component_crops("images/5 - jump/12 - Тигрёнок — Рыкс.png", "tiger")
save_component_crops("images/5 - jump/18 - Леопардик — Блиц.png", "leopard")
