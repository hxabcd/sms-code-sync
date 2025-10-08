FROM alpine:latest

# 设置默认端口和时区
ENV PORT=5000
ENV TZ=Asia/Shanghai

# 安装依赖包
RUN apk add --no-cache \
    tzdata \
    build-base \
    libffi-dev \
    openssl-dev \
    zlib-dev \
    bzip2-dev \
    readline-dev \
    sqlite-dev \
    linux-headers

# 下载并编译 Python 3.13.2
WORKDIR /tmp
RUN wget https://www.python.org/ftp/python/3.13.2/Python-3.13.2.tgz && \
    tar -xzf Python-3.13.2.tgz && \
    cd Python-3.13.2 && \
    ./configure --enable-optimizations --enable-shared && \
    make -j$(nproc) && \
    make altinstall

# 设置 Python 3.13.2 为默认 Python 版本
ENV LD_LIBRARY_PATH=/usr/local/lib
RUN ln -s /usr/local/bin/python3.13 /usr/local/bin/python && \
    ln -s /usr/local/bin/pip3.13 /usr/local/bin/pip

# 安装项目依赖
WORKDIR /tmp
COPY requirements.txt ./
RUN pip install -r requirements.txt

# 安装 Gunicorn 作为 WSGI 服务器
RUN pip install gunicorn

# 复制项目文件
WORKDIR /var/app
COPY . /var/app

# 使用 Gunicorn 启动应用
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:$PORT --workers 4 main:app"]