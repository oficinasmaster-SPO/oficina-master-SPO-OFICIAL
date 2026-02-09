
$srcDir = "src"

function Restore-Imports {
    param ([string]$Path)
    
    $content = Get-Content $Path -Raw
    
    # Define common UI component paths often lost
    $replacements = @{
        "import \{ Progress \} from ''" = "import { Progress } from '@/components/ui/progress'"
        "import \{ Badge \} from ''" = "import { Badge } from '@/components/ui/badge'"
        "import \{ Button \} from ''" = "import { Button } from '@/components/ui/button'"
        "import \{ Card, CardContent \} from ''" = "import { Card, CardContent } from '@/components/ui/card'"
        "import \{ Card, CardHeader, CardTitle, CardContent \} from ''" = "import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'"
        "import \{ Input \} from ''" = "import { Input } from '@/components/ui/input'"
        "import \{ Label \} from ''" = "import { Label } from '@/components/ui/label'"
        "import \{ Tabs, TabsContent, TabsList, TabsTrigger \} from ''" = "import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'"
    }
    
    $newContent = $content
    
    foreach ($key in $replacements.Keys) {
        # Using regex to replace
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

Write-Host "Restore Complete."
