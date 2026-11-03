Add-Type -AssemblyName System.Drawing

$out = Join-Path $PSScriptRoot 'icons'
New-Item -ItemType Directory -Force -Path $out | Out-Null

foreach ($size in 16, 32, 48, 128) {
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.Clear([System.Drawing.Color]::Transparent)

  $bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 22, 25, 34))
  $g.FillRectangle($bg, 0, 0, $size, $size)

  $font = New-Object System.Drawing.Font('Segoe UI Symbol', [single]($size * 0.66), [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $fg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 242, 163, 60))

  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center

  $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
  $g.DrawString([string][char]0x265E, $font, $fg, $rect, $fmt)

  $path = Join-Path $out "$size.png"
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)

  $g.Dispose(); $bmp.Dispose(); $font.Dispose(); $fg.Dispose(); $bg.Dispose()
  Write-Host "wrote $path"
}
