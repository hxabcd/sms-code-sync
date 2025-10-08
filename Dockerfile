FROM python:3.13.2-alpine

# 设置默认端口和时区
ENV PORT=5000
ENV TZ=Asia/Shanghai

# 安装 tzdata
RUN apk add --no-cache tzdata

# 设置工作目录
WORKDIR /tmp

# 复制并安装依赖
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# 安装 Gunicorn 作为 WSGI 服务器
RUN pip install --no-cache-dir gunicorn

# 复制项目文件
WORKDIR /var/app
COPY . /var/app

# 使用 Gunicorn 启动应用
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:$PORT --workers 4 main:app"]