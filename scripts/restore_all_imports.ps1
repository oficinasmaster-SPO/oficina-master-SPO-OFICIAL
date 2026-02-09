
$srcDir = "src"

function Restore-Imports {
    param ([string]$Path)
    
    $content = Get-Content $Path -Raw
    
    # Define expanded list of component paths often lost
    # ORDER MATTERS: Specific imports should be handled carefully if they share keywords, though full string match is safer.
    $replacements = @{
        "import \{ createPageUrl \} from ''" = "import { createPageUrl } from '@/utils'"
        "import \{ base44 \} from ''" = "import { base44 } from '@/api/base44Client'"
        
        "import \{ Card, CardContent, CardHeader, CardTitle \} from ''" = "import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'"
        "import \{ Card, CardContent \} from ''" = "import { Card, CardContent } from '@/components/ui/card'"
        "import \{ Card, CardHeader, CardTitle \} from ''" = "import { Card, CardHeader, CardTitle } from '@/components/ui/card'"
        "import \{ Card \} from ''" = "import { Card } from '@/components/ui/card'"
        
        "import \{ ScrollArea \} from ''" = "import { ScrollArea } from '@/components/ui/scroll-area'"
        "import \{ Separator \} from ''" = "import { Separator } from '@/components/ui/separator'"
        "import \{ Textarea \} from ''" = "import { Textarea } from '@/components/ui/textarea'"
        "import \{ RadioGroup, RadioGroupItem \} from ''" = "import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'"
    }
    
    $newContent = $content
    
    foreach ($key in $replacements.Keys) {
        $newContent = $newContent -replace $key, $replacements[$key]
    }
    
    if ($content -ne $newContent) {
        Set-Content -Path $Path -Value $newContent -Encoding UTF8
        Write-Host "Restored imports in $Path"
    }
}

Get-ChildItem -Path $srcDir -Include "*.jsx","*.js" -Recurse | ForEach-Object {
    Restore-Imports -Path $_.FullName
}

Write-Host "Detailed Restore Complete."
