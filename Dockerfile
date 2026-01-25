# Stage 1: Build Frontend
FROM node:20-alpine AS build-stage
WORKDIR /frontend-build
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Production
FROM python:3.13-alpine AS production-stage

# 设置环境变量
ENV PORT=5074
ENV TZ=Asia/Shanghai
ENV PYTHONUNBUFFERED=1

# 安装运行所需的依赖 (tzdata 用于时区)
RUN apk add --no-cache tzdata

WORKDIR /var/app

# 首先复制依赖文件以利用 Docker 缓存
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY app/ ./app/
COPY main.py ./

# 从构建阶段复制前端产物
# 假设 Flask 应用配置为在 frontend/dist 中查找静态文件
COPY --from=build-stage /frontend-build/dist ./frontend/dist

# 暴露端口
EXPOSE ${PORT}

# 启动应用
# 使用 gunicorn 并配置 threads 以支持 SSE
CMD gunicorn --bind 0.0.0.0:${PORT} --workers 1 --threads 32 "app:create_app()"
