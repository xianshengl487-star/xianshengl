Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
$TextureRoot = Join-Path $Root "src/main/resources/assets/homelander_maomao/textures"
$SkinDir = Join-Path $TextureRoot "skin"
$ArmorDir = Join-Path $TextureRoot "models/armor"
$EntityDir = Join-Path $TextureRoot "entity"
$ItemDir = Join-Path $TextureRoot "item"

New-Item -ItemType Directory -Force -Path $SkinDir, $ArmorDir, $EntityDir, $ItemDir | Out-Null

function Color($hex) {
    return [System.Drawing.ColorTranslator]::FromHtml($hex)
}

function SolidBrush($hex) {
    return New-Object System.Drawing.SolidBrush (Color $hex)
}

function FillRect($g, [int]$x, [int]$y, [int]$w, [int]$h, [string]$hex) {
    $brush = SolidBrush $hex
    try {
        $g.FillRectangle($brush, $x, $y, $w, $h)
    } finally {
        $brush.Dispose()
    }
}

function StrokeRect($g, [int]$x, [int]$y, [int]$w, [int]$h, [string]$hex) {
    $pen = New-Object System.Drawing.Pen (Color $hex), 1
    try {
        $g.DrawRectangle($pen, $x, $y, $w - 1, $h - 1)
    } finally {
        $pen.Dispose()
    }
}

function CopyPixels($src, $dst, [int]$sx, [int]$sy, [int]$w, [int]$h, [int]$dx, [int]$dy) {
    for ($yy = 0; $yy -lt $h; $yy++) {
        for ($xx = 0; $xx -lt $w; $xx++) {
            $dst.SetPixel($dx + $xx, $dy + $yy, $src.GetPixel($sx + $xx, $sy + $yy))
        }
    }
}

function CopyRectAlpha($src, $dst, [int]$sx, [int]$sy, [int]$w, [int]$h, [int]$dx, [int]$dy) {
    for ($yy = 0; $yy -lt $h; $yy++) {
        for ($xx = 0; $xx -lt $w; $xx++) {
            $pixel = $src.GetPixel($sx + $xx, $sy + $yy)
            if ($pixel.A -gt 0) {
                $dst.SetPixel($dx + $xx, $dy + $yy, $pixel)
            }
        }
    }
}

function ClearBitmap($bmp) {
    $transparent = [System.Drawing.Color]::FromArgb(0, 0, 0, 0)
    for ($y = 0; $y -lt $bmp.Height; $y++) {
        for ($x = 0; $x -lt $bmp.Width; $x++) {
            $bmp.SetPixel($x, $y, $transparent)
        }
    }
}

function FillCubemap($g, [int]$x, [int]$y, [int]$sideW, [int]$sideH, [string]$main, [string]$dark, [string]$light) {
    # Minecraft cubemap layout:
    # top:    x+sideW,y      size sideW x sideW
    # bottom: x+sideW*2,y    size sideW x sideW
    # right:  x,y+sideW
    # front:  x+sideW,y+sideW
    # left:   x+sideW*2,y+sideW
    # back:   x+sideW*3,y+sideW
    FillRect $g ($x + $sideW) $y $sideW $sideW $light
    FillRect $g ($x + $sideW * 2) $y $sideW $sideW $dark
    FillRect $g $x ($y + $sideW) $sideW $sideH $dark
    FillRect $g ($x + $sideW) ($y + $sideW) $sideW $sideH $main
    FillRect $g ($x + $sideW * 2) ($y + $sideW) $sideW $sideH $main
    FillRect $g ($x + $sideW * 3) ($y + $sideW) $sideW $sideH $dark
}

function FillBodyCubemap($g, [int]$x, [int]$y, [string]$main, [string]$dark, [string]$light) {
    # Body is 8 wide, 4 deep, 12 high.
    FillRect $g ($x + 4) $y 8 4 $light
    FillRect $g ($x + 12) $y 8 4 $dark
    FillRect $g $x ($y + 4) 4 12 $dark
    FillRect $g ($x + 4) ($y + 4) 8 12 $main
    FillRect $g ($x + 12) ($y + 4) 4 12 $main
    FillRect $g ($x + 16) ($y + 4) 8 12 $dark
}

function AddSuitMarks($g, $spec) {
    # Head front is 8,8..15,15
    FillRect $g 10 10 2 2 $spec.eye
    FillRect $g 14 10 2 2 $spec.eye
    FillRect $g 11 14 4 1 $spec.trim

    # Hat/helmet front overlay is 40,8..47,15
    FillRect $g 40 8 8 2 $spec.trim
    FillRect $g 40 8 1 8 $spec.shadow
    FillRect $g 47 8 1 8 $spec.shadow

    # Body front is 20,20..27,31
    FillRect $g 23 20 2 12 $spec.trim
    FillRect $g 20 24 8 2 $spec.accent
    FillRect $g 21 21 2 3 $spec.secondary
    FillRect $g 25 21 2 3 $spec.secondary

    # Right/left arm front strips.
    FillRect $g 45 21 2 9 $spec.trim
    FillRect $g 37 53 2 9 $spec.trim

    # Right/left leg front strips.
    FillRect $g 5 21 2 10 $spec.trim
    FillRect $g 21 53 2 10 $spec.trim

    # Overlay body front and leg fronts, used by real 64x64 skins and by armor conversion.
    FillRect $g 20 36 8 2 $spec.accent
    FillRect $g 23 36 2 12 $spec.trim
    FillRect $g 4 36 4 10 $spec.trim
    FillRect $g 20 52 4 10 $spec.trim
    FillRect $g 44 36 4 10 $spec.trim
    FillRect $g 52 52 4 10 $spec.trim
}

function NewStandardSkin($name, $spec) {
    $bmp = New-Object System.Drawing.Bitmap 64, 64, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    ClearBitmap $bmp
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    try {
        # Base head and helmet overlay.
        FillCubemap $g 0 0 8 8 $spec.face $spec.faceDark $spec.faceLight
        FillCubemap $g 32 0 8 8 $spec.helmet $spec.shadow $spec.trim

        # Base body, right arm, right leg.
        FillCubemap $g 0 16 4 12 $spec.leg $spec.shadow $spec.highlight
        FillBodyCubemap $g 16 16 $spec.body $spec.shadow $spec.highlight
        FillCubemap $g 40 16 4 12 $spec.arm $spec.shadow $spec.highlight

        # Overlay right leg, body, right arm.
        FillCubemap $g 0 32 4 12 $spec.legOverlay $spec.shadow $spec.highlight
        FillBodyCubemap $g 16 32 $spec.bodyOverlay $spec.shadow $spec.highlight
        FillCubemap $g 40 32 4 12 $spec.armOverlay $spec.shadow $spec.highlight

        # Base left leg and left arm.
        FillCubemap $g 16 48 4 12 $spec.leg $spec.shadow $spec.highlight
        FillCubemap $g 32 48 4 12 $spec.arm $spec.shadow $spec.highlight

        # Overlay left leg and left arm.
        FillCubemap $g 0 48 4 12 $spec.legOverlay $spec.shadow $spec.highlight
        FillCubemap $g 48 48 4 12 $spec.armOverlay $spec.shadow $spec.highlight

        AddSuitMarks $g $spec
    } finally {
        $g.Dispose()
    }
    $skinPath = Join-Path $SkinDir "$name.png"
    $bmp.Save($skinPath, [System.Drawing.Imaging.ImageFormat]::Png)
    return $bmp
}

function ExportArmorLayers($name, $skin) {
    # Vanilla armor layers use a 64x32 HumanoidModel UV sheet. The 64x64 source
    # skin is the source of truth, but forcing 64x64 directly into armor would
    # vertically mis-sample because the baked armor model has textureHeight=32.
    $layer1 = New-Object System.Drawing.Bitmap 64, 32, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $layer2 = New-Object System.Drawing.Bitmap 64, 32, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    ClearBitmap $layer1
    ClearBitmap $layer2

    # Helmet/head/hat, chest, arms, boots: exact upper-half player UV.
    CopyPixels $skin $layer1 0 0 64 32 0 0
    # Add overlay details into the same armor-readable UV slots.
    CopyRectAlpha $skin $layer1 32 0 32 16 32 0
    CopyRectAlpha $skin $layer1 16 32 24 16 16 16
    CopyRectAlpha $skin $layer1 40 32 16 16 40 16
    CopyRectAlpha $skin $layer1 0 32 16 16 0 16

    # Leggings layer: body and right-leg UV positions are the only positions
    # read by the vanilla inner armor model. Copy from standard overlay/base
    # into those exact upper-half coordinates.
    CopyPixels $skin $layer2 16 16 24 16 16 16
    CopyPixels $skin $layer2 0 16 16 16 0 16
    CopyRectAlpha $skin $layer2 16 32 24 16 16 16
    CopyRectAlpha $skin $layer2 0 32 16 16 0 16

    PaintArmorDetails $layer1 $name
    PaintArmorDetails $layer2 $name

    $layer1.Save((Join-Path $ArmorDir "${name}_layer_1.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $layer2.Save((Join-Path $ArmorDir "${name}_layer_2.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $layer1.Dispose()
    $layer2.Dispose()
}

function PaintArmorDetails($bmp, $name) {
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    try {
        switch ($name) {
            "homelander" {
                FillRect $g 32 1 16 2 "#F4D35E"
                FillRect $g 32 3 16 1 "#9B1E2B"
                StrokeRect $g 19 19 10 13 "#0F214A"
                FillRect $g 20 20 8 2 "#C61F2F"
                FillRect $g 23 16 2 16 "#F4D35E"
                FillRect $g 44 21 8 2 "#C61F2F"
                FillRect $g 4 21 4 2 "#C61F2F"
                FillRect $g 0 27 16 1 "#0F214A"
                FillRect $g 16 27 16 1 "#0F214A"
                FillRect $g 40 27 16 1 "#0F214A"
            }
            "starlight" {
                FillRect $g 32 1 16 2 "#FFF5C6"
                FillRect $g 32 3 16 1 "#F9E076"
                StrokeRect $g 19 19 10 13 "#8A6E27"
                FillRect $g 20 20 8 2 "#FFD24D"
                FillRect $g 23 16 2 16 "#FFFFFF"
                FillRect $g 44 21 8 2 "#FFD24D"
                FillRect $g 4 21 4 2 "#F9E076"
                FillRect $g 0 27 16 1 "#8A6E27"
                FillRect $g 16 27 16 1 "#8A6E27"
                FillRect $g 40 27 16 1 "#8A6E27"
            }
            "a_train" {
                FillRect $g 32 1 16 2 "#FFFFFF"
                FillRect $g 32 3 16 1 "#E3242B"
                StrokeRect $g 19 19 10 13 "#15377F"
                FillRect $g 20 20 8 2 "#E3242B"
                FillRect $g 23 16 2 16 "#FFFFFF"
                FillRect $g 44 21 8 2 "#E3242B"
                FillRect $g 4 21 4 2 "#E3242B"
                FillRect $g 0 27 16 1 "#15377F"
                FillRect $g 16 27 16 1 "#15377F"
                FillRect $g 40 27 16 1 "#15377F"
            }
            "noir" {
                FillRect $g 32 1 16 2 "#C9CED6"
                FillRect $g 32 3 16 1 "#30343D"
                StrokeRect $g 19 19 10 13 "#050505"
                FillRect $g 20 20 8 2 "#3B4250"
                FillRect $g 23 16 2 16 "#C9CED6"
                FillRect $g 44 21 8 2 "#3B4250"
                FillRect $g 4 21 4 2 "#3B4250"
                FillRect $g 0 27 16 1 "#050505"
                FillRect $g 16 27 16 1 "#050505"
                FillRect $g 40 27 16 1 "#050505"
            }
            "deep" {
                FillRect $g 32 1 16 2 "#64E4E2"
                FillRect $g 32 3 16 1 "#0B5B68"
                StrokeRect $g 19 19 10 13 "#043039"
                FillRect $g 20 20 8 2 "#0E9E9A"
                FillRect $g 23 16 2 16 "#FFD96A"
                FillRect $g 44 21 8 2 "#0E9E9A"
                FillRect $g 4 21 4 2 "#0E9E9A"
                FillRect $g 0 27 16 1 "#043039"
                FillRect $g 16 27 16 1 "#043039"
                FillRect $g 40 27 16 1 "#043039"
            }
            "translucent" {
                FillRect $g 32 1 16 2 "#FFFFFF"
                FillRect $g 32 3 16 1 "#A7E8FF"
                StrokeRect $g 19 19 10 13 "#5F7E88"
                FillRect $g 20 20 8 2 "#DDF8FF"
                FillRect $g 23 16 2 16 "#FFFFFF"
                FillRect $g 44 21 8 2 "#A7E8FF"
                FillRect $g 4 21 4 2 "#A7E8FF"
                FillRect $g 0 27 16 1 "#5F7E88"
                FillRect $g 16 27 16 1 "#5F7E88"
                FillRect $g 40 27 16 1 "#5F7E88"
            }
            "maeve" {
                FillRect $g 32 1 16 2 "#F0C45A"
                FillRect $g 32 3 16 1 "#C61F2F"
                StrokeRect $g 19 19 10 13 "#2A0A12"
                FillRect $g 20 20 8 2 "#C61F2F"
                FillRect $g 23 16 2 16 "#F0C45A"
                FillRect $g 44 21 8 2 "#C61F2F"
                FillRect $g 4 21 4 2 "#C61F2F"
                FillRect $g 0 27 16 1 "#2A0A12"
                FillRect $g 16 27 16 1 "#2A0A12"
                FillRect $g 40 27 16 1 "#2A0A12"
            }
            Default {
                FillRect $g 32 1 16 2 "#FFFFFF"
                FillRect $g 32 3 16 1 "#A0A0A0"
                StrokeRect $g 19 19 10 13 "#000000"
            }
        }
    } finally {
        $g.Dispose()
    }
}

function ExportArmorItems($name, $spec) {
    $parts = @{
        "helmet" = @($spec.helmet, $spec.trim, $spec.shadow)
        "chestplate" = @($spec.body, $spec.accent, $spec.trim)
        "leggings" = @($spec.leg, $spec.trim, $spec.shadow)
        "boots" = @($spec.legOverlay, $spec.accent, $spec.shadow)
    }
    foreach ($part in $parts.Keys) {
        $bmp = New-Object System.Drawing.Bitmap 32, 32, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
        ClearBitmap $bmp
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        try {
            $colors = $parts[$part]
            FillRect $g 8 6 16 20 $colors[0]
            StrokeRect $g 8 6 16 20 $colors[2]
            FillRect $g 12 8 8 3 $colors[1]
            FillRect $g 15 11 2 13 $colors[1]
            FillRect $g 9 24 14 2 $colors[1]
        } finally {
            $g.Dispose()
        }
        $bmp.Save((Join-Path $ItemDir "${name}_${part}.png"), [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose()
    }
}

$skins = @{
    "homelander" = @{
        face="#F0C29B"; faceDark="#7A4E38"; faceLight="#FFD9B8"; eye="#35D8FF"; helmet="#123B7A"; body="#183E89"; bodyOverlay="#1B4DAA"; arm="#173872"; armOverlay="#204D9E"; leg="#172D5F"; legOverlay="#1F458E"; secondary="#C61F2F"; accent="#B51626"; trim="#F4D35E"; shadow="#0C1733"; highlight="#4E86D8"
    }
    "starlight" = @{
        face="#F3D0B5"; faceDark="#A46A43"; faceLight="#FFE1C8"; eye="#FFF7AE"; helmet="#F8F2D8"; body="#FFF1B8"; bodyOverlay="#F6D66A"; arm="#F7E7A5"; armOverlay="#FFF6D3"; leg="#EED071"; legOverlay="#FFF0AC"; secondary="#FFFFFF"; accent="#F9E076"; trim="#FFD24D"; shadow="#8A6E27"; highlight="#FFFFFF"
    }
    "a_train" = @{
        face="#8B5A44"; faceDark="#33231C"; faceLight="#B47A5C"; eye="#BFE9FF"; helmet="#172F75"; body="#1D4FBA"; bodyOverlay="#2A70FF"; arm="#173D90"; armOverlay="#2867DC"; leg="#15377F"; legOverlay="#214FB2"; secondary="#BFC7D4"; accent="#E3242B"; trim="#FFFFFF"; shadow="#071633"; highlight="#65B3FF"
    }
    "noir" = @{
        face="#161616"; faceDark="#050505"; faceLight="#2A2A2A"; eye="#E5E7EB"; helmet="#090B0F"; body="#101318"; bodyOverlay="#171C24"; arm="#0E1117"; armOverlay="#1A202A"; leg="#0D1015"; legOverlay="#151A22"; secondary="#30343D"; accent="#3B4250"; trim="#C9CED6"; shadow="#000000"; highlight="#4A5261"
    }
    "deep" = @{
        face="#D3A37D"; faceDark="#594238"; faceLight="#F0C6A6"; eye="#94F0FF"; helmet="#0B5B68"; body="#0C7C83"; bodyOverlay="#0E9E9A"; arm="#0A6A73"; armOverlay="#12A6A2"; leg="#095761"; legOverlay="#0B7C83"; secondary="#17404C"; accent="#C9A24A"; trim="#FFD96A"; shadow="#043039"; highlight="#64E4E2"
    }
    "translucent" = @{
        face="#CFE8F2"; faceDark="#7EA0A8"; faceLight="#FFFFFF"; eye="#FFFFFF"; helmet="#D7F7FF"; body="#BBDCE6"; bodyOverlay="#DDF8FF"; arm="#B5D6DF"; armOverlay="#D9F6FF"; leg="#ACCBD6"; legOverlay="#D2F0FA"; secondary="#FFFFFF"; accent="#A7E8FF"; trim="#F6FFFF"; shadow="#5F7E88"; highlight="#FFFFFF"
    }
    "maeve" = @{
        face="#D0A07B"; faceDark="#5A3628"; faceLight="#F1C6A6"; eye="#FFE8A3"; helmet="#7A1C28"; body="#8B1E34"; bodyOverlay="#A92640"; arm="#6F1728"; armOverlay="#9B2636"; leg="#641324"; legOverlay="#851C2E"; secondary="#2E2A36"; accent="#C99A39"; trim="#F0C45A"; shadow="#2A0A12"; highlight="#D96473"
    }
    "vought_hunter" = @{
        face="#20242A"; faceDark="#07090C"; faceLight="#3B4651"; eye="#F7FF6A"; helmet="#1B222A"; body="#202B35"; bodyOverlay="#253746"; arm="#1B2530"; armOverlay="#223342"; leg="#18222D"; legOverlay="#22313D"; secondary="#38D8FF"; accent="#38D8FF"; trim="#F7FF6A"; shadow="#07090C"; highlight="#6AE8FF"
    }
    "v_overdose_mutant" = @{
        face="#2B1337"; faceDark="#100517"; faceLight="#5C2B73"; eye="#FF2938"; helmet="#31124A"; body="#3B145B"; bodyOverlay="#541B80"; arm="#35134F"; armOverlay="#5E1D8B"; leg="#2D103F"; legOverlay="#48146C"; secondary="#88FF4A"; accent="#B6FF3E"; trim="#FF2938"; shadow="#0B0410"; highlight="#B6FF3E"
    }
}

foreach ($name in $skins.Keys) {
    $spec = [pscustomobject]$skins[$name]
    $skin = NewStandardSkin $name $spec
    if ($name -in @("homelander", "starlight", "a_train", "noir", "deep", "translucent", "maeve")) {
        ExportArmorLayers $name $skin
        ExportArmorItems $name $spec
    }
    if ($name -in @("vought_hunter", "v_overdose_mutant")) {
        $skin.Save((Join-Path $EntityDir "$name.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    }
    $skin.Dispose()
}

Write-Host "Generated standard 64x64 skins and armor layers from exact Minecraft UV coordinates."
