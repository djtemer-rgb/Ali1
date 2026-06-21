import os
from PIL import Image

def clean_and_center_spritesheet_v3(input_path, output_path):
    print(f"Reprocessing spritesheet {os.path.basename(input_path)} with v3 layout...")
    img = Image.open(input_path).convert("RGBA")
    
    # Chroma-key background extraction
    datas = img.getdata()
    key_color = datas[0]
    kr, kg, kb = key_color[0], key_color[1], key_color[2]
    tolerance = 45
    
    clean_data = []
    for item in datas:
        r, g, b, a = item[0], item[1], item[2], item[3]
        dist = ((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2) ** 0.5
        if dist < tolerance:
            clean_data.append((0, 0, 0, 0))
        else:
            clean_data.append((r, g, b, a))
    
    img.putdata(clean_data)
    
    w, h = img.size
    cell_w = 418
    # Row 0: Character height 836. Row 1: Item height 418.
    row0_h = 836
    row1_h = 418
    
    new_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    
    # Process Row 0 (Characters)
    for col in range(3):
        cell = img.crop((col * cell_w, 0, (col + 1) * cell_w, row0_h))
        core = cell.copy()
        core_pixels = core.load()
        
        # Erase borders to sever bleed
        border_x = 22
        border_y = 22
        for x in range(cell_w):
            for y in range(row0_h):
                if x < border_x or x > cell_w - border_x or y < border_y or y > row0_h - border_y:
                    core_pixels[x, y] = (0, 0, 0, 0)
                    
        bbox = core.getbbox()
        if bbox:
            obj = core.crop(bbox)
            new_cell = Image.new("RGBA", (cell_w, row0_h), (0, 0, 0, 0))
            obj_w, obj_h = obj.size
            dest_x = (cell_w - obj_w) // 2
            # Align character bottom with a 20px ground margin
            dest_y = row0_h - obj_h - 20
            new_cell.paste(obj, (dest_x, dest_y))
            new_img.paste(new_cell, (col * cell_w, 0))
        else:
            print(f"  Warning: No character found in column {col}")
            
    # Process Row 1 (Falling Items)
    for col in range(3):
        cell = img.crop((col * cell_w, row0_h, (col + 1) * cell_w, row0_h + row1_h))
        core = cell.copy()
        core_pixels = core.load()
        
        # Erase borders to sever bleed
        border_x = 22
        border_y = 22
        for x in range(cell_w):
            for y in range(row1_h):
                if x < border_x or x > cell_w - border_x or y < border_y or y > row1_h - border_y:
                    core_pixels[x, y] = (0, 0, 0, 0)
                    
        bbox = core.getbbox()
        if bbox:
            obj = core.crop(bbox)
            new_cell = Image.new("RGBA", (cell_w, row1_h), (0, 0, 0, 0))
            obj_w, obj_h = obj.size
            dest_x = (cell_w - obj_w) // 2
            # Center item vertically in its square cell
            dest_y = (row1_h - obj_h) // 2
            new_cell.paste(obj, (dest_x, dest_y))
            new_img.paste(new_cell, (col * cell_w, row0_h))
        else:
            print(f"  Warning: No item found in column {col}")
            
    new_img.save(output_path, "PNG")
    print(f"Successfully saved clean v3 spritesheet to {output_path}")

def main():
    src_dir = "images/2 - hunter"
    dest_dir = "public/images/bonus-games/catcher"
    assets = [
        ("2 - Капибара — Капи.png", "02_capybara_kapi.png"),
        ("14 - Буйволёнок — Гром.png", "14_buffalo_grom.png"),
        ("17 - Носорог — Титан.png", "17_rhino_titan.png"),
    ]
    
    for src_name, dest_name in assets:
        src_path = os.path.join(src_dir, src_name)
        dest_path = os.path.join(dest_dir, dest_name)
        
        # Resolve potential naming/normalization issues
        if not os.path.exists(src_path):
            prefix = src_name.split(" ")[0]
            for f in os.listdir(src_dir):
                if f.startswith(prefix) and f.endswith(".png"):
                    src_path = os.path.join(src_dir, f)
                    break
                    
        if os.path.exists(src_path):
            clean_and_center_spritesheet_v3(src_path, dest_path)
        else:
            print(f"Error: Source asset {src_name} not found.")

if __name__ == "__main__":
    main()
