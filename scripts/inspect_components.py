import os
from PIL import Image

def inspect_components(input_path):
    print(f"\n--- Components in {os.path.basename(input_path)} ---")
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
                    
                    # Limit queue size in search to avoid infinite loops if any
                    if len(queue) > 50000:
                        break
                    
                    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            if mask[ny][nx] == 1 and not visited[ny][nx]:
                                visited[ny][nx] = True
                                queue.append((nx, ny))
                                
                if len(comp) > 100:  # Filter out noise
                    components.append({
                        'pixels_count': len(comp),
                        'bbox': (min_x, min_y, max_x + 1, max_y + 1),
                        'cx': sum(p[0] for p in comp) / len(comp),
                        'cy': sum(p[1] for p in comp) / len(comp)
                    })
                    
    for i, c in enumerate(components):
        print(f"Component {i}: pixels={c['pixels_count']}, bbox={c['bbox']}, center=({c['cx']:.1f}, {c['cy']:.1f})")

src_dir = "images/5 - jump"
for f in sorted(os.listdir(src_dir)):
    if f.endswith(".png"):
        inspect_components(os.path.join(src_dir, f))
