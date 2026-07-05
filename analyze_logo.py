import sys
from PIL import Image

def analyze_image(path):
    img = Image.open(path).convert("RGBA")
    width, height = img.size
    print(f"Original size: {width}x{height}")
    
    # Get bounding box of non-transparent pixels
    bbox = img.getbbox()
    if bbox:
        print(f"Bounding box (left, top, right, bottom): {bbox}")
        # Let's crop it to the bbox to see the aspect ratio
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        print(f"Bbox size: {w}x{h}")
        print(f"Bbox aspect ratio: {w/h:.2f}")
    else:
        print("Image is completely transparent")

analyze_image("/Users/michaelng/Desktop/ai-marketing-studio/public/alchemy-logo-original.png")
