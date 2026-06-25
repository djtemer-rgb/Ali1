import os
from PIL import Image

def analyze_cell_components(src_name, label):
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
    key_color = img.getpixel((0, 0))
    kr, kg, kb = key_color[:3]
    
    cell_size = 418
    print(f"\n==================== {label} ====================")
    
    for r in range(3):
        for c in range(3):
            # Crop cell
            x0 = c * cell_size
            y0 = r * cell_size
            x1 = x0 + cell_size
            y1 = y0 + cell_size
            cell = img.crop((x0, y0, x1, y1))
            
            # Make a mask of cell foreground
            w, h = cell.size
            mask = [[0 for _ in range(w)] for _ in range(h)]
            tolerance = 45
            for cy in range(h):
                for cx in range(w):
                    p = cell.getpixel((cx, cy))
                    dist = ((p[0]-kr)**2 + (p[1]-kg)**2 + (p[2]-kb)**2)**0.5
                    if dist >= tolerance:
                        mask[cy][cx] = 1
                        
            # Find components within the cell
            visited = [[False for _ in range(w)] for _ in range(h)]
            comps = []
            for cy in range(h):
                for cx in range(w):
                    if mask[cy][cx] == 1 and not visited[cy][cx]:
                        # BFS
                        comp_pixels = []
                        queue = [(cx, cy)]
                        visited[cy][cx] = True
                        while queue:
                            px, py = queue.pop(0)
                            comp_pixels.append((px, py))
                            for dx, dy in [(-1,0),(1,0),(0,-1),(0,1)]:
                                nx, ny = px + dx, py + dy
                                if 0 <= nx < w and 0 <= ny < h:
                                    if mask[ny][nx] == 1 and not visited[ny][nx]:
                                        visited[ny][nx] = True
                                        queue.append((nx, ny))
                        if len(comp_pixels) > 50: # Ignore noise
                            xs = [p[0] for p in comp_pixels]
                            ys = [p[1] for p in comp_pixels]
                            comps.append({
                                'bbox': (min(xs), min(ys), max(xs), max(ys)),
                                'size': len(comp_pixels)
                            })
            
            print(f"Cell ({r},{c}): found {len(comps)} components")
            for idx, comp in enumerate(comps):
                bx0, by0, bx1, by1 = comp['bbox']
                cw = bx1 - bx0 + 1
                ch = by1 - by0 + 1
                print(f"  Sub-comp {idx}: bbox [{bx0},{by0} to {bx1},{by1}] size {cw}x{ch} (pixels: {comp['size']})")

def main():
    analyze_cell_components("3 - Енотик — Плюш.png", "raccoon")
    analyze_cell_components("9 - Волчонок — Норд.png", "wolf")
    analyze_cell_components("12 - Тигрёнок — Рыкс.png", "tiger")
    analyze_cell_components("18 - Леопардик — Блиц.png", "leopard")

if __name__ == "__main__":
    main()
