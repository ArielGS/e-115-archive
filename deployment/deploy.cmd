@echo off
rem Double-click or run from a terminal: deployment\deploy.cmd [up^|down^|restart^|logs^|status^|test]
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" %*
if errorlevel 1 pause
