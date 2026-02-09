

$root = "."
$pagesDir = "src\pages"
$functionsDir = "functions"


# --- Helper Functions ---

function Move-FileSmart {
    param (
        [string]$Path,
        [string]$DestinationDir
    )
    if (-not (Test-Path $DestinationDir)) {
        New-Item -ItemType Directory -Force -Path $DestinationDir | Out-Null
    }
    
    $fileName = Split-Path $Path -Leaf
    $destPath = Join-Path $DestinationDir $fileName
    
    # Move File
    Move-Item -Path $Path -Destination $destPath -Force
    
    # Fix Imports in the Moved File
    $content = Get-Content $destPath -Raw
    # Adjust relative imports: ../ becomes ../../
    # But carefully: only imports that look like "../components" or "../lib" etc.
    # Regex to match import ... from '...';
    
    # 1. Imports from sibling pages (e.g., './OtherPage') -> '../OtherPage' if OtherPage wasn't moved to same dir (Risk! Assuming pages don't import pages often)
    # 2. Imports from parent dirs (e.g., '../components') -> '../../components'
    
    $newContent = $content -replace "from\s+['`"]\.\./", "from '../../" `
                           -replace "from\s+['`"]@/", "from '@/" # @ aliases should stay same
                           
    if ($content -ne $newContent) {
        Set-Content -Path $destPath -Value $newContent
    }
    
    Write-Host "Moved $fileName to $DestinationDir"
}

# --- Define Categories for Pages ---

$pageCategories = @{
    "auth" = @("Login*", "Sign*", "ClientRegist*", "Primeiro*", "Recuperar*")
    "dashboard" = @("Home.jsx", "Dashboard*", "Painel*", "Ranking*", "Gamificacao*")
    "operacoes" = @("Tarefas*", "RegistroDiario*", "QGP*", "Technician*", "Dicas*", "VisualizarProcesso*")
    "financeiro" = @("DRE*", "Consolida*", "Graficos*", "Financeiro*", "Credit*", "Receipt*", "DiagnosticoEndividamento*", "DiagnosticoProducao*", "DiagnosticoOS*")
    "rh" = @("Colaborad*", "Convidar*", "Autoavalia*", "Descri*", "MonitoramentoRH*", "Feedbacks*", "Ponto*", "Vacation*", "AprovarColaboradores*", "AnalisesRH*")
    "treinamento" = @("Academia*", "Assistir*", "MeusTreinamentos*", "GerenciarTreinamentos*", "Training*", "AcompanhamentoTreinamento*")
    "clientes" = @("Inteligen*", "Dores*", "RelatoriosIntel*", "MapaCheck*", "Client*", "Duvidas*", "Evolucoes*", "Riscos*", "Desejos*")
    "documentos" = @("Repositorio*", "Manual*", "Evidence*", "Doc*")
    "admin" = @("Admin*", "User*", "Solicitar*", "Audit*", "Config*", "Log*", "System*", "Test*", "Integracoes*")
    "diagnosticos" = @("Diagnostico*", "Select*", "Historico*", "Questionario*", "Responder*")
    "aceleracao" = @("Aceleracao*", "Plano*", "Cronograma*", "ControleAcel*", "GestaoContratos*", "RelatoriosAcel*", "Imp*")
    "cultura_processos" = @("Cultura*", "Missao*", "Rituais*", "Regimento*", "MeusProcessos*", "COEX*", "CDC*")
}

# --- Execute Page Moves ---

foreach ($cat in $pageCategories.Keys) {
    $targetDir = Join-Path $pagesDir $cat
    $patterns = $pageCategories[$cat]
    
    foreach ($pattern in $patterns) {
        Get-ChildItem -Path $pagesDir -Filter $pattern -File | ForEach-Object {
            Move-FileSmart -Path $_.FullName -DestinationDir $targetDir
        }
    }
}

# --- Define Categories for Functions ---

$funcCategories = @{
    "users" = @("*User*", "*Employee*", "*Profile*", "*Permission*", "*Auth*")
    "finance" = @("*Payment*", "*Finance*", "*DRE*", "*Receipt*", "*Money*", "*Cost*")
    "documents" = @("*ClickSign*", "*Document*", "*Contract*", "*PDF*")
    "calendar" = @("*Calendar*", "*Meet*", "*Event*")
    "ai" = @("*AI*", "*LLM*", "*Generate*", "*Analyze*", "*Suggest*", "*Chat*")
    "notifications" = @("*Email*", "*Notification*", "*Whatsapp*", "*Send*")
    "sync" = @("*Sync*", "*Check*", "*Monitor*", "*Validate*", "*Log*", "*Track*")
}

# --- Execute Function Moves ---

# Note: Functions might not need import updates if they don't import each other using relative paths
foreach ($cat in $funcCategories.Keys) {
    $targetDir = Join-Path $functionsDir $cat
    $patterns = $funcCategories[$cat]
    
    foreach ($pattern in $patterns) {
        Get-ChildItem -Path $functionsDir -Filter $pattern -File | ForEach-Object {
            # Simple move for functions
            $fileName = $_.Name
            $destPath = Join-Path $targetDir $fileName
            if (-not (Test-Path $targetDir)) { New-Item -ItemType Directory -Force -Path $targetDir | Out-Null }
            Move-Item -Path $_.FullName -Destination $destPath -Force
            Write-Host "Moved function $fileName to $cat"
        }
    }
}

Write-Host "Reorganization Complete."
