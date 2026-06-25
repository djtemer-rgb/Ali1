import os
from PIL import Image, ImageDraw

def find_components(src_name, label):
    src_dir = "images/5 - jump"
    src_path = os.path.join(src_dir, src_name)
    if not os.path.exists(src_path):
        prefix = src_name.split(" ")[0]
        for f in os.listdir(src_dir):
            if f.startswith(prefix) and f.endswith(".png"):
                src_path = os.path.join(src_dir, f)
                break
    if not os.path.exists(src_path):
        print(f"{label} not found")
        return
        
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    key_color = img.getpixel((0, 0))
    kr, kg, kb = key_color[:3]
    
    # 1. Create a binary mask: 1 for foreground, 0 for chromakey
    # We use a simple threshold
    tolerance = 45
    mask = []
    for y in range(h):
        row = []
        for x in range(w):
            pixel = img.getpixel((x, y))
            pr, pg, pb = pixel[:3]
            dist = ((pr - kr)**2 + (pg - kg)**2 + (pb - kb)**2)**0.5
            if dist >= tolerance:
                row.append(1)
            else:
                row.append(0)
        mask.append(row)
        
    # 2. Find connected components using BFS/DFS
    visited = [[False for _ in range(w)] for _ in range(h)]
    components = []
    
    for y in range(h):
        for x in range(w):
            if mask[y][x] == 1 and not visited[y][x]:
                # Start new component
                comp = []
                queue = [(x, y)]
                visited[y][x] = True
                
                while queue:
                    cx, cy = queue.pop(0)
                    comp.append((cx, cy))
                    
                    # 8-connectivity or 4-connectivity (4 is fine)
                    for dx, dy in [(-1,0), (1,0), (0,-1), (0,1)]:
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            if mask[ny][nx] == 1 and not visited[ny][nx]:
                                visited[ny][nx] = True
                                queue.append((nx, ny))
                
                # Check component size
                if len(comp) > 100: # Ignore tiny noise components
                    xs = [p[0] for p in comp]
                    ys = [p[1] for p in comp]
                    min_x, max_x = min(xs), max(xs)
                    min_y, max_y = min(ys), max(ys)
                    components.append({
                        'bbox': (min_x, min_y, max_x, max_y),
                        'size': len(comp),
                        'w': max_x - min_x + 1,
                        'h': max_y - min_y + 1
                    })
                    
    print(f"\n--- Components in {label} ({src_name}) ---")
    print(f"Total elements found: {len(components)}")
    
    # Sort components by their center Y then center X
    components.sort(key=lambda c: (c['bbox'][1] + c['bbox'][3], c['bbox'][0] + c['bbox'][2]))
    
    for idx, c in enumerate(components):
        bx0, by0, bx1, by1 = c['bbox']
        print(f"  Element {idx}: bbox [{bx0},{by0} to {bx1},{by1}] size {c['w']}x{c['h']} (pixels: {c['size']})")

def main():
    find_components("3 - Енотик — Плюш.png", "raccoon")
    find_components("9 - Волчонок — Норд.png", "wolf")
    find_components("12 - Тигрёнок — Рыкс.png", "tiger")
    find_components("18 - Леопардик — Блиц.png", "leopard")

if __name__ == "__main__":
    main()
