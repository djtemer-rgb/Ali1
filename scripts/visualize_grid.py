import os
from PIL import Image, ImageDraw

def draw_grid(src_name, label):
    src_dir = "images/5 - jump"
    src_path = os.path.join(src_dir, src_name)
    if not os.path.exists(src_path):
        prefix = src_name.split(" ")[0]
        for f in os.listdir(src_dir):
            if f.startswith(prefix) and f.endswith(".png"):
                src_path = os.path.join(src_dir, f)
                break
    if not os.path.exists(src_path):
        print(f"Not found: {src_name}")
        return
        
    img = Image.open(src_path).convert("RGBA")
    draw = ImageDraw.Draw(img)
    w, h = img.size
    
    # Draw red grid lines at 418, 836
    draw.line([(418, 0), (418, h)], fill="red", width=3)
    draw.line([(836, 0), (836, h)], fill="red", width=3)
    draw.line([(0, 418), (w, 418)], fill="red", width=3)
    draw.line([(0, 836), (w, 836)], fill="red", width=3)
    
    # Save the result
    out_dir = "public/images/bonus-games/jump/temp"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"grid_{label}.png")
    img.save(out_path)
    print(f"Saved grid visualization to {out_path}")

def main():
    draw_grid("3 - Енотик — Плюш.png", "raccoon")
    draw_grid("9 - Волчонок — Норд.png", "wolf")
    draw_grid("12 - Тигрёнок — Рыкс.png", "tiger")
    draw_grid("18 - Леопардик — Блиц.png", "leopard")

if __name__ == "__main__":
    main()
