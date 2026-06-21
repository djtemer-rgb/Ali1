import os
from PIL import Image

def process_chroma_key(input_path, output_path):
    print(f"Processing {os.path.basename(input_path)}...")
    img = Image.open(input_path)
    # Ensure standard RGBA mode
    img = img.convert("RGBA")
    
    # Extract data
    datas = img.getdata()
    
    new_data = []
    
    # Detect background color using top-left corner color as the key
    key_color = datas[0] # (R, G, B, A)
    kr, kg, kb = key_color[0], key_color[1], key_color[2]
    
    # Chroma key threshold tolerance
    tolerance = 45
    
    for item in datas:
        r, g, b, a = item[0], item[1], item[2], item[3]
        
        # Calculate distance to chroma key color
        dist = ((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2) ** 0.5
        
        if dist < tolerance:
            # Replace background with complete transparent black
            new_data.append((0, 0, 0, 0))
        else:
            new_data.append((r, g, b, a))
            
    img.putdata(new_data)
    
    # Ensure target folder directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path, "PNG")
    print(f"Saved transparent sprite sheet to {output_path}")

def main():
    src_dir = "images/2 - hunter"
    dest_dir = "public/images/bonus-games/catcher"
    
    # Map reward IDs/characters to actual source names
    assets = [
        ("2 - Капибара — Капи.png", "02_capybara_kapi.png"),
        ("14 - Буйволёнок — Гром.png", "14_buffalo_grom.png"),
        ("17 - Носорог — Титан.png", "17_rhino_titan.png"),
    ]
    
    for src_name, dest_name in assets:
        src_path = os.path.join(src_dir, src_name)
        dest_path = os.path.join(dest_dir, dest_name)
        
        if os.path.exists(src_path):
            process_chroma_key(src_path, dest_path)
        else:
            # Check other possible forms or normalisation issues
            found = False
            prefix = src_name.split(" ")[0]
            for f in os.listdir(src_dir):
                if f.startswith(prefix) and f.endswith(".png"):
                    process_chroma_key(os.path.join(src_dir, f), dest_path)
                    found = True
                    break
            if not found:
                print(f"Error: Source asset {src_name} not found in {src_dir}")

if __name__ == "__main__":
    main()
