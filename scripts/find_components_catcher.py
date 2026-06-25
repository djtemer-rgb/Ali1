import os
from PIL import Image

def find_components_catcher():
    src_path = "public/images/bonus-games/catcher/02_capybara_kapi.png"
    if not os.path.exists(src_path):
        print("Catcher image not found")
        return
        
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    print(f"Catcher sheet size: {w}x{h}")
    
    # Catcher sheet has transparent background, so alpha > 0 is foreground
    visited = [[False for _ in range(w)] for _ in range(h)]
    components = []
    
    for y in range(h):
        for x in range(w):
            if img.getpixel((x, y))[3] > 0 and not visited[y][x]:
                comp = []
                queue = [(x, y)]
                visited[y][x] = True
                while queue:
                    cx, cy = queue.pop(0)
                    comp.append((cx, cy))
                    for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            if img.getpixel((nx, ny))[3] > 0 and not visited[nx][ny]:
                                visited[nx][ny] = True
                                queue.append((nx, ny))
                if len(comp) > 100:
                    xs = [p[0] for p in comp]
                    ys = [p[1] for p in comp]
                    components.append({
                        'bbox': (min(xs), min(ys), max(xs), max(ys)),
                        'size': len(comp)
                    })
                    
    print(f"Total elements found: {len(components)}")
    for idx, c in enumerate(components):
        bx0, by0, bx1, by1 = c['bbox']
        print(f"  Element {idx}: bbox [{bx0},{by0} to {bx1},{by1}] size {bx1-bx0+1}x{by1-by0+1}")

if __name__ == "__main__":
    find_components_catcher()
