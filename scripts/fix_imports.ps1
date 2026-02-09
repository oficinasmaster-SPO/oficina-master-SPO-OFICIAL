
$srcDir = "src"

function Fix-File {
    param ([string]$Path)
    
    $content = Get-Content $Path -Raw
    
    # Fix: from 'something" -> from 'something'
    # Regex explanation:
    # from\s+   : matches "from "
    # '         : matches opening single quote
    # ([^'"]*)  : captures content that isn't a quote
    # "         : matches closing double quote
    
    $newContent = $content -replace "from\s+'([^`"']*)`"", "from '$1'"
    
    if ($content -ne $newContent) {
        Set-Content -Path $Path -Value $newContent -Encoding UTF8
        Write-Host "Fixed $Path"
    }
}

Get-ChildItem -Path $srcDir -Include "*.jsx","*.js" -Recurse | ForEach-Object {
    Fix-File -Path $_.FullName
}

Write-Host "Fix Complete."
