#!/usr/bin/env python3
"""Create Windows .ico file from PNG"""

try:
    from PIL import Image
    import os
    
    # Load the 1024x1024 PNG
    icon_path = os.path.join(os.path.dirname(__file__), '..', 'electron', 'build', 'icon-1024.png')
    img = Image.open(icon_path)
    
    # Create different sizes including larger ones for Windows
    sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    images = []
    
    for size in sizes:
        resized = img.resize(size, Image.Resampling.LANCZOS)
        images.append(resized)
    
    # Save as .ico with proper format
    output_path = os.path.join(os.path.dirname(__file__), '..', 'electron', 'build', 'icon.ico')
    
    # Save with all sizes embedded
    img_256 = img.resize((256, 256), Image.Resampling.LANCZOS)
    img_256.save(output_path, format='ICO', sizes=[(256, 256)])
    
    print("✅ Windows icon created: icon.ico (256x256)")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print("   Make sure Pillow is installed: pip3 install pillow")


