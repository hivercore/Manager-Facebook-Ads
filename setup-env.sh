#!/bin/bash
# Script tạo file .env từ env.example

echo "Đang tạo file .env..."

# Frontend
if [ -f "frontend/env.example" ]; then
    cp frontend/env.example frontend/.env
    echo "✓ Đã tạo frontend/.env"
else
    echo "✗ Không tìm thấy frontend/env.example"
fi

# Backend
if [ -f "backend/env.example" ]; then
    cp backend/env.example backend/.env
    echo "✓ Đã tạo backend/.env"
else
    echo "✗ Không tìm thấy backend/env.example"
fi

echo ""
echo "Hoàn thành! Vui lòng mở file .env và điền thông tin cấu hình."
echo "Frontend: frontend/.env"
echo "Backend: backend/.env"

