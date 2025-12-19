# Script tạo file .env từ env.example
Write-Host "Đang tạo file .env..." -ForegroundColor Green

# Frontend
if (Test-Path "frontend\env.example") {
    Copy-Item -Path "frontend\env.example" -Destination "frontend\.env" -Force
    Write-Host "✓ Đã tạo frontend/.env" -ForegroundColor Green
} else {
    Write-Host "✗ Không tìm thấy frontend/env.example" -ForegroundColor Red
}

# Backend
if (Test-Path "backend\env.example") {
    Copy-Item -Path "backend\env.example" -Destination "backend\.env" -Force
    Write-Host "✓ Đã tạo backend/.env" -ForegroundColor Green
} else {
    Write-Host "✗ Không tìm thấy backend/env.example" -ForegroundColor Red
}

Write-Host "`nHoàn thành! Vui lòng mở file .env và điền thông tin cấu hình." -ForegroundColor Yellow
Write-Host "Frontend: frontend/.env" -ForegroundColor Cyan
Write-Host "Backend: backend/.env" -ForegroundColor Cyan

