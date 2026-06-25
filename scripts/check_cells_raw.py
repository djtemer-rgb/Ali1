import os
from PIL import Image

def analyze_cells_raw(src_name, label):
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
    
    cell_size = 418
    print(f"\n--- Raw Cells in {label} ---")
    for r in range(3):
        for c in range(3):
            x0 = c * cell_size
            y0 = r * cell_size
            x1 = x0 + cell_size
            y1 = y0 + cell_size
            cell = img.crop((x0, y0, x1, y1))
            
            # Count pixels that are NOT the key color (tolerance 45)
            non_key_count = 0
            for cy in range(cell_size):
                for cx in range(cell_size):
                    p = cell.getpixel((cx, cy))
                    dist = ((p[0]-kr)**2 + (p[1]-kg)**2 + (p[2]-kb)**2)**0.5
                    if dist >= 45:
                        non_key_count += 1
            print(f"  Cell ({r},{c}): {non_key_count} non-key pixels")

def main():
    analyze_cells_raw("3 - Енотик — Плюш.png", "raccoon")
    analyze_cells_raw("9 - Волчонок — Норд.png", "wolf")
    analyze_cells_raw("12 - Тигрёнок — Рыкс.png", "tiger")
    analyze_cells_raw("18 - Леопардик — Блиц.png", "leopard")

if __name__ == "__main__":
    main()
