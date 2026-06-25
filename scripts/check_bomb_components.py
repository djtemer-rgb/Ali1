import os
from PIL import Image

def analyze_bomb_component(image_path, label):
    print(f"\n--- Analyzing Bomb Component {os.path.basename(image_path)} ---")
    img = Image.open(image_path).convert("RGBA")
    w, h = img.size
    
    # We want to see if the shape looks like a single round bomb or if it has another piece.
    # Let's count non-transparent pixels per row from top to bottom
    row_counts = []
    for y in range(h):
        count = sum(1 for x in range(w) if img.getpixel((x, y))[3] > 0)
        row_counts.append(count)
        
    print(f"Height: {h}, Width: {w}")
    print("Non-transparent pixel counts per row (first 50 rows):")
    print(row_counts[:50])
    
    print("Non-transparent pixel counts per row (last 50 rows):")
    print(row_counts[-50:])

# Find the bomb component file in temp/wolf/
wolf_temp_dir = "public/images/bonus-games/jump/temp/wolf"
for f in os.listdir(wolf_temp_dir):
    if "comp_3" in f:
        analyze_bomb_component(os.path.join(wolf_temp_dir, f), "wolf")

# Let's also check leopard
leopard_temp_dir = "public/images/bonus-games/jump/temp/leopard"
for f in os.listdir(leopard_temp_dir):
    if "comp_3" in f:
        analyze_bomb_component(os.path.join(leopard_temp_dir, f), "leopard")
