#!/usr/bin/env python3
"""
Create a simple WATAM AI icon
Requires: pip install pillow
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import os
    
    # Create 1024x1024 image
    size = 1024
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw rounded rectangle background with gradient effect
    # Purple gradient
    for i in range(size):
        color_val = int(139 + (236 - 139) * (i / size))
        color = (139, 92, 246, 255) if i < size // 2 else (236, 72, 153, 255)
        draw.rectangle([0, i, size, i+1], fill=color)
    
    # Draw rounded corners (simple approach)
    corner_radius = 180
    draw.ellipse([0, 0, corner_radius*2, corner_radius*2], fill=(139, 92, 246, 255))
    draw.ellipse([size-corner_radius*2, 0, size, corner_radius*2], fill=(139, 92, 246, 255))
    draw.ellipse([0, size-corner_radius*2, corner_radius*2, size], fill=(236, 72, 153, 255))
    draw.ellipse([size-corner_radius*2, size-corner_radius*2, size, size], fill=(236, 72, 153, 255))
    
    # Draw "W" text
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 600)
    except:
        font = ImageFont.load_default()
    
    text = "W"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - 50
    
    draw.text((x, y), text, fill=(255, 255, 255, 255), font=font)
    
    # Save as PNG
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'electron', 'build')
    os.makedirs(output_dir, exist_ok=True)
    
    # Save different sizes
    img.save(os.path.join(output_dir, 'icon-1024.png'))
    
    # Create 512x512
    img_512 = img.resize((512, 512), Image.Resampling.LANCZOS)
    img_512.save(os.path.join(output_dir, 'icon-512.png'))
    
    # Create 256x256
    img_256 = img.resize((256, 256), Image.Resampling.LANCZOS)
    img_256.save(os.path.join(output_dir, 'icon-256.png'))
    
    print("✅ Icons created successfully!")
    print("   - icon-1024.png")
    print("   - icon-512.png")
    print("   - icon-256.png")
    
except ImportError:
    print("⚠️  Pillow not installed. Creating placeholder icons...")
    print("   Run: pip3 install pillow")
    print("   Or use the placeholder icons for now.")
