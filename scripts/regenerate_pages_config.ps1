
$srcDir = "src"
$pagesDir = "$srcDir\pages"
$configFile = "$srcDir\pages.config.js"

# 1. Header
$content = @"
/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 */
import Layout from './Layout';

"@

# 2. Collect Pages
$pages = Get-ChildItem -Path $pagesDir -Filter "*.jsx" -Recurse | Where-Object { $_.Name -ne "Layout.jsx" }

$imports = ""
$exports = "export const PAGES = {`n"

foreach ($page in $pages) {
    $name = $page.BaseName
    
    # Calculate relative path from src/pages.config.js
    # $page.FullName is C:\...\src\pages\subdir\Page.jsx
    # We need ./pages/subdir/Page
    
    $relativePath = $page.FullName.Substring((Get-Item $srcDir).FullName.Length)
    $relativePath = $relativePath.Replace("\", "/").Replace(".jsx", "")
    $relativePath = "." + $relativePath
    
    $imports += "import $name from '$relativePath';`n"
    $exports += "    `"$name`": $name,`n"
}

$exports += "};`n"

# 3. Footer and Config
$footer = @"

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: Layout,
};
"@

# 4. Write File
$finalContent = $content + $imports + "`n" + $exports + $footer
Set-Content -Path $configFile -Value $finalContent -Encoding UTF8

Write-Host "Regenerated $configFile with $($pages.Count) pages."
