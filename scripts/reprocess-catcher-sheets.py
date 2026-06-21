import os
from PIL import Image

def clean_and_center_spritesheet(input_path, output_path):
    print(f"Reprocessing {os.path.basename(input_path)}...")
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    cell_w = 418
    cell_h = 627
    
    new_img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    
    for row in range(2):
        for col in range(3):
            # Crop the original cell
            cell = img.crop((col * cell_w, row * cell_h, (col + 1) * cell_w, (row + 1) * cell_h))
            
            # Create a copy to find the true bounding box by erasing borders
            core = cell.copy()
            core_pixels = core.load()
            
            # Erase borders to sever bleed
            border_x = 24
            border_y = 24
            for x in range(cell_w):
                for y in range(cell_h):
                    if x < border_x or x > cell_w - border_x or y < border_y or y > cell_h - border_y:
                        core_pixels[x, y] = (0, 0, 0, 0)
                        
            # Get bounding box of the isolated object
            bbox = core.getbbox()
            if bbox:
                # Crop from the core image where borders are erased to guarantee zero bleed
                obj = core.crop(bbox)
                
                # Create a new blank cell
                new_cell = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
                
                # Center horizontally
                obj_w, obj_h = obj.size
                dest_x = (cell_w - obj_w) // 2
                
                if row == 0:
                    # Character: align bottom to preserve ground height
                    dest_y = cell_h - obj_h - 20
                else:
                    # Falling Item: center vertically
                    dest_y = (cell_h - obj_h) // 2
                    
                new_cell.paste(obj, (dest_x, dest_y))
                new_img.paste(new_cell, (col * cell_w, row * cell_h))
            else:
                print(f"  Warning: No bounding box found for cell at row {row}, col {col}")
                
    new_img.save(output_path, "PNG")
    print(f"Saved reprocessed spritesheet to {output_path}")

def main():
    dest_dir = "public/images/bonus-games/catcher"
    files = ["02_capybara_kapi.png", "14_buffalo_grom.png", "17_rhino_titan.png"]
    for f in files:
        path = os.path.join(dest_dir, f)
        if os.path.exists(path):
            clean_and_center_spritesheet(path, path)
        else:
            print(f"Error: {path} does not exist.")

if __name__ == "__main__":
    main()
