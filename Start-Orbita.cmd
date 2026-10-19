@echo off
cd /d "%~dp0"
echo Opening ORBITA at http://localhost:4173
node server.mjs --open
pause
