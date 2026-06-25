import os
from PIL import Image

def find_small_components(src_name, label):
    src_dir = "images/5 - jump"
    src_path = os.path.join(src_dir, src_name)
    if not os.path.exists(src_path):
        prefix = src_name.split(" ")[0]
        for f in os.listdir(src_dir):
            if f.startswith(prefix) and f.endswith(".png"):
                src_path = os.path.join(src_dir, f)
                break
    if not os.path.exists(src_path):
        return
        
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    key_color = img.getpixel((0, 0))
    kr, kg, kb = key_color[:3]
    
    tolerance = 45
    mask = [[0 for _ in range(w)] for _ in range(h)]
    for y in range(h):
        for x in range(w):
            p = img.getpixel((x, y))
            dist = ((p[0]-kr)**2 + (p[1]-kg)**2 + (p[2]-kb)**2)**0.5
            if dist >= tolerance:
                mask[y][x] = 1
                
    visited = [[False for _ in range(w)] for _ in range(h)]
    components = []
    
    for y in range(h):
        for x in range(w):
            if mask[y][x] == 1 and not visited[y][x]:
                comp = []
                queue = [(x, y)]
                visited[y][x] = True
                while queue:
                    cx, cy = queue.pop(0)
                    comp.append((cx, cy))
                    for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            if mask[ny][nx] == 1 and not visited[ny][nx]:
                                visited[ny][nx] = True
                                queue.append((nx, ny))
                if len(comp) > 10: # Lower size threshold
                    xs = [p[0] for p in comp]
                    ys = [p[1] for p in comp]
                    components.append({
                        'bbox': (min(xs), min(ys), max(xs), max(ys)),
                        'size': len(comp)
                    })
                    
    print(f"\n--- ALL components in {label} ({len(components)} total) ---")
    components.sort(key=lambda c: c['size'], reverse=True)
    for idx, c in enumerate(components):
        bx0, by0, bx1, by1 = c['bbox']
        cw = bx1 - bx0 + 1
        ch = by1 - by0 + 1
        print(f"  Comp {idx}: bbox [{bx0},{by0} to {bx1},{by1}] size {cw}x{ch} (pixels: {c['size']})")

def main():
    find_small_components("3 - Енотик — Плюш.png", "raccoon")
    # find_small_components("9 - Волчонок — Норд.png", "wolf")

if __name__ == "__main__":
    main()
