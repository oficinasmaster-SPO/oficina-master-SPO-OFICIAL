@echo off
echo Gerando versao final do sistema (Build)...
echo.
echo Isso pode levar alguns segundos...
call npm run build
echo.
echo ==========================================
echo CONCLUIDO!
echo ==========================================
echo.
echo Os arquivos para rodar "a parte" estao na pasta: \dist
echo.
echo Para testar, voce pode instalar um servidor simples:
echo npm install -g serve
echo serve -s dist
echo.
pause
