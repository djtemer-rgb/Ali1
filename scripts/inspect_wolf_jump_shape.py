import os
from PIL import Image

def inspect_component_edges(image_path, min_x_val):
    print(f"\n--- Edge Analysis of {os.path.basename(image_path)} (original min_x={min_x_val}) ---")
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    
    # Let's count non-transparent pixels in each column from left to right
    col_counts = []
    for x in range(w):
        count = sum(1 for y in range(h) if img.getpixel((x, y))[3] > 0)
        col_counts.append(count)
        
    print("Non-transparent pixel counts for the first 30 columns:")
    print(col_counts[:30])
    
    print("Non-transparent pixel counts for the last 30 columns:")
    print(col_counts[-30:])

inspect_component_edges("public/images/bonus-games/jump/temp/wolf/comp_1_bbox_811_149_1204_579.png", 811)
inspect_component_edges("public/images/bonus-games/jump/temp/leopard/comp_0_bbox_804_155_1236_614.png", 804)
