from PIL import Image
import os
import sys

def optimize_image(input_path, output_path, target_size_kb=95):
    """
    Optimize an image to be under the target size in KB.
    
    Args:
        input_path: Path to the input image
        output_path: Path to save the optimized image
        target_size_kb: Target size in KB (default: 95KB to be safely under 100KB)
    """
    # Open the image
    img = Image.open(input_path)
    
    # Start with quality 85
    quality = 85
    
    # Save with initial quality
    img.save(output_path, optimize=True, quality=quality)
    
    # Check file size
    file_size_kb = os.path.getsize(output_path) / 1024
    
    # If file is still too large, reduce quality until it's under target size
    while file_size_kb > target_size_kb and quality > 10:
        quality -= 5
        img.save(output_path, optimize=True, quality=quality)
        file_size_kb = os.path.getsize(output_path) / 1024
    
    # If still too large, resize the image
    if file_size_kb > target_size_kb:
        # Get original dimensions
        width, height = img.size
        
        # Reduce size by 10% until file is small enough
        while file_size_kb > target_size_kb and width > 100 and height > 100:
            width = int(width * 0.9)
            height = int(height * 0.9)
            
            resized_img = img.resize((width, height), Image.LANCZOS)
            resized_img.save(output_path, optimize=True, quality=quality)
            
            file_size_kb = os.path.getsize(output_path) / 1024
    
    return file_size_kb, quality, img.size

def main():
    # Directory containing the images
    image_dir = "app/static/images"
    
    # Create a directory for optimized images if it doesn't exist
    optimized_dir = os.path.join(image_dir, "optimized")
    os.makedirs(optimized_dir, exist_ok=True)
    
    # Get all PNG files in the directory
    png_files = [f for f in os.listdir(image_dir) if f.endswith(".png") and "The" in f]
    
    print(f"Found {len(png_files)} PNG files to optimize")
    
    for png_file in png_files:
        input_path = os.path.join(image_dir, png_file)
        output_path = os.path.join(optimized_dir, png_file)
        
        original_size_kb = os.path.getsize(input_path) / 1024
        print(f"Optimizing {png_file} (Original size: {original_size_kb:.2f} KB)...")
        
        new_size_kb, quality, dimensions = optimize_image(input_path, output_path)
        
        print(f"  Optimized to {new_size_kb:.2f} KB (quality: {quality}, dimensions: {dimensions[0]}x{dimensions[1]})")
        print(f"  Reduction: {(1 - new_size_kb/original_size_kb) * 100:.2f}%")
    
    print("\nOptimization complete. Optimized images are in the 'optimized' subdirectory.")
    print("To replace the original images with the optimized ones, run:")
    print("  mv app/static/images/optimized/* app/static/images/")

if __name__ == "__main__":
    main()
