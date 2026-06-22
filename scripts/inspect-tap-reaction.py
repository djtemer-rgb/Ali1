import os
from PIL import Image

def main():
    src_dir = "images/3 - tap_reaction"
    if not os.path.exists(src_dir):
        print(f"Error: Directory {src_dir} not found.")
        return
        
    for f in os.listdir(src_dir):
        if f.endswith(".png"):
            path = os.path.join(src_dir, f)
            try:
                img = Image.open(path)
                print(f"File: {f}")
                print(f"  Dimensions: {img.size}")
                # Corner pixel colors
                px = img.convert("RGBA").getpixel((0, 0))
                print(f"  Top-left pixel (chromakey candidates): {px}")
            except Exception as e:
                print(f"Error reading {f}: {e}")

if __name__ == "__main__":
    main()
