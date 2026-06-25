import os
from PIL import Image

def analyze_sheet(src_name, label):
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
    key_color = img.getpixel((0, 0))
    kr, kg, kb = key_color[:3]
    print(f"\n--- Analyzing {label} (Key Color: {kr},{kg},{kb}) ---")
    
    cell_size = 418
    # We will try different chromakey tolerances to see how bbox changes
    for r in range(3):
        for c in range(3):
            x0 = c * cell_size
            y0 = r * cell_size
            x1 = x0 + cell_size
            y1 = y0 + cell_size
            
            cell = img.crop((x0, y0, x1, y1))
            
            # Let's count non-key pixels for tolerance=45 and see where they are
            # We want to find the bounding box of non-key pixels
            non_key_pixels = []
            for y in range(cell_size):
                for x in range(cell_size):
                    pixel = cell.getpixel((x, y))
                    pr, pg, pb = pixel[:3]
                    dist = ((pr - kr)**2 + (pg - kg)**2 + (pb - kb)**2)**0.5
                    if dist >= 45:
                        non_key_pixels.append((x, y))
            
            if not non_key_pixels:
                print(f"  Cell r{r}c{c}: EMPTY")
                continue
                
            xs = [p[0] for p in non_key_pixels]
            ys = [p[1] for p in non_key_pixels]
            min_x, max_x = min(xs), max(xs)
            min_y, max_y = min(ys), max(ys)
            
            # Check how many non-key pixels touch the borders of the cell
            touch_left = sum(1 for p in non_key_pixels if p[0] == 0)
            touch_right = sum(1 for p in non_key_pixels if p[0] == cell_size - 1)
            touch_top = sum(1 for p in non_key_pixels if p[1] == 0)
            touch_bottom = sum(1 for p in non_key_pixels if p[1] == cell_size - 1)
            
            print(f"  Cell r{r}c{c}: bbox [{min_x},{min_y} to {max_x},{max_y}] size {max_x-min_x+1}x{max_y-min_y+1}")
            print(f"    Touches: Left={touch_left}, Right={touch_right}, Top={touch_top}, Bottom={touch_bottom}")

def main():
    analyze_sheet("3 - Енотик — Плюш.png", "raccoon")
    analyze_sheet("9 - Волчонок — Норд.png", "wolf")
    analyze_sheet("12 - Тигрёнок — Рыкс.png", "tiger")
    analyze_sheet("18 - Леопардик — Блиц.png", "leopard")

if __name__ == "__main__":
    main()
