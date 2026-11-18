@echo off
:: =========================================================================
:: PERUM LPPNPI CABANG TARAKAN - JALANKAN LOCAL SERVER
:: =========================================================================
title Server K3 Perum LPPNPI Cabang Tarakan
echo =========================================================
echo   PERUM LPPNPI CABANG TARAKAN
echo   Menjalankan Server Lokal Sistem Inventaris K3...
echo =========================================================
echo.
echo Server akan aktif di: http://localhost:8080/
echo Jendela ini jangan ditutup selama menggunakan web server.
echo Tekan Ctrl+C untuk menghentikan server.
echo.
start "" "http://localhost:8080/index.html"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
