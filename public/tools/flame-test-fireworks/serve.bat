@echo off
cd /d "%~dp0"
echo HKDSE Flame Test Fireworks - local server
echo Open http://localhost:8765 in your browser
start http://localhost:8765
python -m http.server 8765
