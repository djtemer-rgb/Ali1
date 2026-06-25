import os
from PIL import Image

def inspect_star_left_edge(image_path):
    print(f"\n--- Star Left Edge Analysis of {os.path.basename(image_path)} ---")
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    
    col_counts = []
    for x in range(w):
        count = sum(1 for y in range(h) if img.getpixel((x, y))[3] > 0)
        col_counts.append(count)
        
    print("Non-transparent pixel counts for the first 50 columns:")
    print(col_counts[:50])

raccoon_temp_dir = "public/images/bonus-games/jump/temp/raccoon"
for f in sorted(os.listdir(raccoon_temp_dir)):
    if "comp_4" in f:
        inspect_star_left_edge(os.path.join(raccoon_temp_dir, f))
        
leopard_temp_dir = "public/images/bonus-games/jump/temp/leopard"
for f in sorted(os.listdir(leopard_temp_dir)):
    if "comp_5" in f:
        inspect_star_left_edge(os.path.join(leopard_temp_dir, f))
