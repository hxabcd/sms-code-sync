# 已经 vibe 成一坨石山了，停止维护

一个用于远程接收验证码的解决方案，可同步手机验证码至服务器并在网页实时查看。

## 概述
SMS Code Sync 旨在解决**远程接收验证码**的困难。通过手机端自动提交短信/邮件验证码至服务器，并在现代化 Web 界面实时接收通知。
为确保安全，目前仅有 TOTP 验证器这一种验证方式。你可以通过携带密钥搭配在线生成器，或是使用像小米手环（BandTOTP）这一类的设备生成验证代码。

**主要特性：**
- **实时同步**：基于 Server-Sent Events (SSE)，验证码秒级推送到网页。
- **安全性**：支持 TOTP 身份验证及 API Key 保护。
- **模块化架构**：基于 Flask 工厂模式，易于扩展和维护。

**界面截图：**

![AuthPage](https://github.com/user-attachments/assets/bd4bd747-7959-413a-a1b8-7de15cd68486)

![ViewPage](https://github.com/user-attachments/assets/8086e5d7-b0cf-41aa-b061-4e70bb2cd3bc)

## 快速开始

### 服务端部署

#### 1. 编辑配置
创建配置文件 `config.json`

```jsonc
{
    "api_key": "YOUR_API_KEY_HERE",      // 用于提交验证码的密钥
    "regex": {
        "code": "\\d{4,8}",              // 从短信内容中匹配发送者的正则表达式
        "sender": "[\\[【](.*?)[\\]】]"  // 从短信内容中匹配验证码的正则表达式
    },
    "mail_providers": [                  // 匹配邮件验证码的发送源（包名）
        "com.android.email",
        "com.microsoft.office.outlook",
        "com.google.android.gm",
        "com.netease.mail",
        "com.tencent.androidqqmail",
        "net.thunderbird.android"
    ],
    "profiles": [                        // 用户档案，可配置多个
        {
            "name": "PROFILE_NAME",      // 档案名
            "secret": "TOTP_SECRET",     // TOTP 密钥（也可通过环境变量设置）
            "window": 180,               // 登录有效期（秒）
            "maxlen": 3                  // 验证码存储上限
        }
    ]
}

```

> [!WARNING]
> 为了安全起见，建议将敏感信息放入环境变量中：
> - `API_KEY`: 覆盖 `config.json` 中的 `api_key`。
> - `SECRET_<NAME>`: 覆盖对应档案的 `secret`。例如 `SECRET_NAME=VALUE...`。

#### 2. 部署

##### 使用 Docker 部署
你可以使用 Docker 来部署本应用。首先从 GHCR 拉取镜像：

> [!NOTE]
> 如果你的网络连接 GHCR 很慢，可以从南京大学镜像站拉取。仅需将 `ghcr.io` 替换为 `ghcr.nju.edu.cn` 即可。

```bash
# 从 GHCR 拉取镜像
docker pull ghcr.io/hxabcd/sms-code-sync:latest
```

然后运行容器，需要设置环境变量并挂载配置文件：

```bash
docker run -d \
  --name SMS-Code-Sync \
  -p 5074:5074 \
  -e TZ=Asia/Shanghai \
  -e PORT=5074 \
  -v /opt/sms-code-sync/config.json:/var/app/config.json \
  ghcr.io/hxabcd/sms-code-sync:latest
```

参数说明：
- `-p 5074:5074` 将容器的 5074 端口映射到主机的 5074 端口

- `-e TZ=Asia/Shanghai` 设置时区（可选，默认为 Asia/Shanghai）

- `-e PORT=5074` 设置应用运行端口（可选，默认为 5074）

  **端口配置说明：**
  - 默认情况下，需要确保此环境变量设置的端口与 `-p` 参数映射的端口一致
  - 如果使用 `--network=host` 模式运行容器，则此端口设置应与系统实际开放的端口对应

- `-v /opt/sms-code-sync/config.json:/var/app/config.json` 挂载配置文件，冒号前的是你的配置文件路径（此处以 `/opt/sms-code-sync/config.json` 为例），冒号后的是在容器中的位置，如果你没有移动过容器的文件，请不要更改，这会导致程序无法获取到正确的配置。

注意：由于配置文件在运行目录的根目录，如果挂载整个目录会导致程序无法运行，所以需要单独挂载配置文件。

##### 手动部署

```bash
pip install -r requirements.txt
python main.py
```

实际生产环境中建议配置好 WSGI Server。

### 手机端配置

使用 「[通知滤盒](https://coolapk.com/apk/com.catchingnow.np)」 的 「增强 - Webhook 功能」，向服务器发送含验证码的短信或电子邮件。（高级版功能，但试用期配置好后过期仍可用（存疑））

除此之外，你也可以使用诸如 MarcoDroid, Tasker 这类自动化软件达到同样的效果，这里以通知滤盒为例进行配置，对于这两款软件的方法亦有说明。

创建 Webhook 规则，详细配置如下：

#### 通知内容

* App 包含: 选中你要识别的 App，如短信，电子邮件等

* 关键字 包含其一: `验证` `代码`（可自行修改）

（如果是 MacroDroid 或 Taske 等软件，仅需将同样的条件应用于“收到通知”事件）

#### WEBHOOK 设置

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

（如果是 MacroDroid 或 Tasker 等软件，仅需使用 HTTP 请求并填入上方内容即可，配置关键基本一致，**注意把请求体中花括号的内容替换为你使用的软件提供的消息文本变量**。如果不需要邮件验证码，包名可直接填`com.android.mms`）

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
    "message": "[Inmsoft] 您的验证码是 114514",
    "provider": "com.android.mms",
    "title": "Inmsoft"
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

### 目录结构
- `/app`: 核心包
    - `/routes`: API 与 Web 路由
    - `/services`: 业务逻辑 (Message/SSE)
    - `/models`: 数据结构
- `/frontend`: 前端
- `/main.py`: 项目入口

### 前端开发与构建
项目前端采用了 React 框架，需要构建后才能集成到 Flask 中。

1. **安装依赖**:
   ```bash
   cd frontend
   npm install
   ```

2. **开发模式**:
   ```bash
   npm run dev
   ```

3. **生产构建**:
   ```bash
   npm run build
   ```
   构建产物将存放在 `frontend/dist` 目录下，Flask 会自动加载该目录下的文件。

