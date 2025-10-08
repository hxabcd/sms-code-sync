# SMS Code Sync

一个用于远程接收验证码的解决方案，可同步手机验证码至服务器并在网页查看

## 概述

是否还在苦恼登录需要验证码，手机却不在身边？

SMS Code Sync 为了解决**远程接收验证码**的困难应运而生。本项目提供一个可行的解决方案，通过手机端自动提交短信验证码至服务器，然后在网站上轻松查看验证码。

为确保安全，目前仅有 TOTP 验证器这一种验证方式。你可以通过携带密钥搭配在线生成器，或是使用像小米手环（BandTOTP）这一类的设备生成验证代码。

本项目使用 Python Flask 编写。你可以通过像 Zeabur 这一类的平台快速部署（需要服务器），或者手动部署在你自己的服务器/设备上。

~~更多验证方式什么的，在做了在做了~~

~~至于PC端，还在新建文件夹（~~

## 使用

### 服务端

#### 使用平台快速部署

Fork 本仓库，并修改好配置文件，然后在对应平台选择你的仓库进行部署。

#### 使用 Docker 部署

你也可以使用 Docker 来部署本应用。镜像中已包含 Gunicorn 作为 WSGI 服务器，用于生产环境部署。首先从 GHCR 拉取镜像：

```bash
# 从 GHCR 拉取镜像
docker pull ghcr.io/hxabcd/sms-code-sync:latest
```

然后运行容器，需要设置环境变量并挂载配置文件：

```bash
docker run -d \
  --name sms-code-sync \
  -p 5000:5000 \
  -e TZ=Asia/Shanghai \
  -e PORT=5000 \
  -v /var/app/config:/opt/sms-code-sync/config.json \
  ghcr.io/hxabcd/sms-code-sync:latest
```

参数说明：
- `-p 5000:5000` 将容器的 5000 端口映射到主机的 5000 端口

- `-e TZ=Asia/Shanghai` 设置时区（可选，默认为 Asia/Shanghai）

- `-e PORT=5000` 设置应用运行端口（可选，默认为 5000）

  **端口配置说明：**
  - 默认情况下，需要确保此环境变量设置的端口与 `-p` 参数映射的端口一致
  - 如果使用 `--network=host` 模式运行容器，则此端口设置应与系统实际开放的端口对应

- `-v /var/app/config:/opt/sms-code-sync/config.json` 挂载配置文件

注意：由于配置文件在运行目录的根目录，如果挂载整个目录会导致程序无法运行，所以需要单独挂载配置文件。

#### 手动部署

1. 安装 Python 运行环境

2. 创建虚拟环境并激活

3. 使用 `pip install -r requirements.txt` 安装依赖

4. 修改 `config.json` 进行配置

至此便已配置完成。默认端口为 5000，会被环境变量 `PORT` 覆盖。接下来你可以为程序设置自启动（对于服务器，可以创建守护进程）

注意：**直接运行不适用于生产环境**，实际部署时请尽量配置好 WSGI Server，并且自行设置自启动（详情请自行上网查阅或向 AI 寻求帮助）。

#### 修改配置文件

按照下面的注释修改好默认配置文件。大部分配置无需更改，仅需填写档案配置中的档案名和密钥。

```json5
{
    "regex": {
        "code": "\\d{4,8}", /* 从短信内容中匹配验证码的正则表达式 */
        "sender": "[\\[【](.*?)[\\]】]" /* 从短信内容中匹配发送者的正则表达式 */
    },
    "mail_providers": [ /* 邮件验证码的发送源（包名） */
        "com.android.email", 
        "com.microsoft.office.outlook",
        "com.google.android.gm",
        "com.netease.mail",
        "com.tencent.androidqqmail",
        "net.thunderbird.android"
    ],
    "profiles": [ /* 用户档案，可存在多个 */
        {
            "name": "NAME", /* 档案名 */
            "secret": "TOTP_SECRET", /* TOTP 密钥 */
            "window": 180, /* 单次登录有效窗口时长 */
            "maxlen": 3 /* 最大同时存储的验证码条数 */
        }
    ]
}
```

### 手机端

使用 「[通知滤盒](https://coolapk.com/apk/com.catchingnow.np)」 的 「增强 - Webhook 功能」，向服务器发送含验证码的短信或电子邮件。（高级版功能，但试用期配置好后过期仍可用（存疑））

除此之外，你也可以使用诸如 MarcoDroid, Tasker 这类自动化软件达到同样的效果，这里以通知滤盒为例进行配置，对于这两款软件的方法亦有说明。

创建 Webhook 规则，详细配置如下：

#### 通知内容

* App 包含: 选中你要识别的 App，如短信，电子邮件等

* 关键字 包含其一: `验证` `代码`（可自行修改）

（如果是 MacroDroid 或 Taske 等软件r，仅需将同样的条件应用于“收到通知”事件）

#### WEBHOOK 设置

* URL: `这里是你自己的服务的网址`

* HEADERS: `Content-Type: application/json; charset=utf-8`

* Request method: `POST`

* BODY:

```json5
{
    "profile": "NAME", // 填入你的对应档案名
    "message": "{android.bigText}",
    "provider": "{filterbox.field.PACKAGE_NAME}",
    "title": "{android.title}"
}
```

（如果是 MacroDroid 或 Tasker 等软件，仅需使用 HTTP 请求并填入上方内容即可，配置关键基本一致，**注意把请求体中花括号的内容替换为你使用的软件提供的消息文本变量**。如果不需要邮件验证码，包名直接填`com.android.mms`）

## 开发

使用 **Python 3.13.2** 开发

使用到的模块：

* Flask
* pyotp