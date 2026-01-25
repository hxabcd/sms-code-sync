# SMS Code Sync

一个用于远程接收验证码的解决方案，可同步手机验证码至服务器并在网页实时查看。

## 概述

SMS Code Sync 旨在解决**远程接收验证码**的困难。通过手机端自动提交短信/邮件验证码至服务器，并在现代化 Web 界面实时接收通知。

**主要特性：**
- **实时同步**：基于 Server-Sent Events (SSE)，验证码秒级推送到网页。
- **安全性**：支持 TOTP 身份验证及 API Key 保护。
- **环境隔离**：支持通过环境变量存储敏感密钥（如 TOTP Secret）。
- **模块化架构**：基于 Flask 工厂模式，易于扩展和维护。

## 快速开始

### 1. 服务端部署

#### 修改配置文件 `config.json`
```json
{
    "api_key": "YourSecretApiKey", // 用于提交验证码的密钥
    "profiles": [
        {
            "name": "MyPhone",     // 档案名
            "secret": "TOTP_SECRET", // TOTP 密钥（也可通过环境变量设置）
            "window": 180,         // 登录有效期（秒）
            "maxlen": 3            // 验证码存储上限
        }
    ]
}
```

#### 安全建议：使用环境变量
为了安全起见，建议将敏感信息放入环境变量中：
- `API_KEY`: 覆盖 `config.json` 中的 `api_key`。
- `SECRET_<NAME>`: 覆盖对应档案的 `secret`。例如 `SECRET_MYPHONE=JBSW...`。

#### 部署

##### 使用 Docker 部署
你也可以使用 Docker 来部署本应用。~~镜像中已包含 Gunicorn 作为 WSGI 服务器，用于生产环境部署~~有点问题，先删掉了。首先从 GHCR 拉取镜像：

```bash
# 从 GHCR 拉取镜像
docker pull ghcr.io/hxabcd/sms-code-sync:latest

# 如果你的网络连接 GHCR 很慢，可以从南京大学镜像站拉取
docker pull ghcr.nju.edu.cn/hxabcd/sms-code-sync:latest
```

然后运行容器，需要设置环境变量并挂载配置文件：

```bash
# 如果你从 GHCR 拉取镜像，请使用 `ghcr.io/hxabcd/sms-code-sync:latest`：
docker run -d \
  --name SMS-Code-Sync \
  -p 5000:5000 \
  -e TZ=Asia/Shanghai \
  -e PORT=5000 \
  -v /opt/sms-code-sync/config.json:/var/app/config.json \
  ghcr.io/hxabcd/sms-code-sync:latest

  # 如果你从南京大学镜像站拉取镜像，请使用 `ghcr.nju.edu.cn/hxabcd/sms-code-sync:latest`：
docker run -d \
  --name SMS-Code-Sync \
  -p 5000:5000 \
  -e TZ=Asia/Shanghai \
  -e PORT=5000 \
  -v /opt/sms-code-sync/config.json:/var/app/config.json \
  ghcr.nju.edu.cn/hxabcd/sms-code-sync:latest
```

参数说明：
- `-p 5000:5000` 将容器的 5000 端口映射到主机的 5000 端口

- `-e TZ=Asia/Shanghai` 设置时区（可选，默认为 Asia/Shanghai）

- `-e PORT=5000` 设置应用运行端口（可选，默认为 5000）

  **端口配置说明：**
  - 默认情况下，需要确保此环境变量设置的端口与 `-p` 参数映射的端口一致
  - 如果使用 `--network=host` 模式运行容器，则此端口设置应与系统实际开放的端口对应

- `-v /opt/sms-code-sync/config.json:/var/app/config.json` 挂载配置文件，冒号前的是你的配置文件路径（此处以 `/opt/sms-code-sync/config.json` 为例），冒号后的是在容器中的位置，如果你没有移动过容器的文件，请不要更改，这会导致程序无法获取到正确的配置。

注意：由于配置文件在运行目录的根目录，如果挂载整个目录会导致程序无法运行，所以需要单独挂载配置文件。

##### 手动部署
```bash
pip install -r requirements.txt
python launcher.py
```

### 2. 手机端配置 (以通知滤盒为例)
创建 Webhook 规则：
- **URL**: `http://你的地址/api/profiles/档案名/messages`
- **Headers**: `X-API-Key: 你的接口密钥`
- **Body (JSON)**:
```json
{
    "message": "{android.bigText}",
    "provider": "{filterbox.field.PACKAGE_NAME}",
    "title": "{android.title}"
}
```

---

## API 文档

所有 API 均以 `/api` 开头。

### 核心接口

#### 1. 提交验证码
- **路径**: `POST /api/profiles/<name>/messages`
- **鉴权**: 请求头需包含 `X-API-Key` 或参数包含 `api_key`。
- **Body**:
  ```json
  {
    "message": "您的验证码是 123456",
    "provider": "com.android.mms",
    "title": "10086"
  }
  ```

#### 2. 建立实时流 (SSE)
- **路径**: `GET /api/stream`
- **描述**: 网页端用于监听新消息的持久连接。

### 档案管理 (需 Session 验证)

#### 3. 获取档案列表
- **路径**: `GET /api/profiles`

#### 4. 身份验证 (Login)
- **路径**: `POST /api/profiles/<name>/session`
- **Body**: `{"token": "123456"}` (TOTP Code)

#### 5. 获取验证码列表
- **路径**: `GET /api/profiles/<name>/codes`

#### 6. 注销登录
- **路径**: `DELETE /api/profiles/<name>/session`

#### 7. 清空代码
- **路径**: `DELETE /api/profiles/<name>/codes`

---

## 开发

使用 **Python 3.13+** 开发。项目采用以下结构：
- `/app`: 核心包
    - `/routes`: API 与 Web 路由
    - `/services`: 业务逻辑 (Message/SSE)
    - `/models`: 数据结构
- `/templates` & `/static`: 前端资源
