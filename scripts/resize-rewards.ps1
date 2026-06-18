# PowerShell script to resize reward images to 900x900 while keeping transparency
Add-Type -AssemblyName System.Drawing

$srcDir = "C:\Users\user\Desktop\SelfDev\Ali1\images\rewards"
$destDir = "C:\Users\user\Desktop\SelfDev\Ali1\public\images\rewards"

if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

$files = Get-ChildItem -Path $srcDir -Filter "*.png"

foreach ($file in $files) {
    # Extract number from filename (e.g. "1 - Пандочка — Бамбу.png" -> "1")
    if ($file.BaseName -match '^(\d+)\s*-') {
        $num = $Matches[1]
        $destPath = Join-Path $destDir "$num.png"
        
        Write-Host "Resizing $($file.Name) to $destPath ..."
        
        # Load source image
        $srcImg = [System.Drawing.Image]::FromFile($file.FullName)
        
        # Create target bitmap
        $destBmp = New-Object System.Drawing.Bitmap(750, 750)
        
        # Draw source image onto target bitmap with high quality
        $g = [System.Drawing.Graphics]::FromImage($destBmp)
        $g.Clear([System.Drawing.Color]::Transparent)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
        # Calculate aspect ratio preserving fit
        $srcWidth = $srcImg.Width
        $srcHeight = $srcImg.Height
        $ratioX = 750 / $srcWidth
        $ratioY = 750 / $srcHeight
        $ratio = if ($ratioX -lt $ratioY) { $ratioX } else { $ratioY }
        
        $newWidth = [int]($srcWidth * $ratio)
        $newHeight = [int]($srcHeight * $ratio)
        
        $posX = [int]((750 - $newWidth) / 2)
        $posY = [int]((750 - $newHeight) / 2)
        
        $g.DrawImage($srcImg, $posX, $posY, $newWidth, $newHeight)
        
        # Clean up graphics and source image
        $g.Dispose()
        $srcImg.Dispose()
        
        # Save as PNG
        $destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
        $destBmp.Dispose()
        
        # Check output file size
        $outSize = (Get-Item $destPath).Length / 1MB
        Write-Host "Done! Size: $('{0:N2}' -f $outSize) MB"
    } else {
        Write-Warning "Skipped: $($file.Name) (doesn't match naming convention)"
    }
}
