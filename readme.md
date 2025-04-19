
# SMS Code Sync (Server)

一个用于远程接收验证码的解决方案，可同步手机验证码至服务器并在网页查看（这里是后端）

## 概述

是否还在苦恼登录需要验证码，手机却不在身边？

SMS Code Sync 为了解决**远程接收验证码**的困难应运而生。本项目提供一个可行的解决方案，让手机端提交短信验证码至服务器，然后在网站上轻松查看验证码。

目前仅有 TOTP 验证器这一种验证方式。你可以通过携带密钥搭配在线生成器，或是使用像小米手环这一类的设备生成验证代码。

**此仓库存储的是 SMS Code Sync 的后端代码**，使用 Python 编写。你可以通过像 Zeabur 这一类的平台快速部署，或者部署在你自己的服务器或设备上。

## 使用

### 手机端

使用 「[通知滤盒](https://coolapk.com/apk/com.catchingnow.np)」 的 「增强 - Webhook 功能」，向服务器发送含验证码的短信或电子邮件

创建 Webhook 规则，详细配置如下：

#### 通知内容

* App 包含: 选中你要识别的 App，如短信，电子邮件等

* 关键字 包含其一: `验证` `代码`（可自行修改）

#### WEBHOOK 设置

* URL: `https://api.xxtsoft.top/sms/submit-message`

* HEADERS: `Content-Type: application/json; charset=utf-8`

* Request method: `POST`

* BODY:

```json
{
    "profile": "NAME", // 填入你的对应档案名
    "message": "{android.bigText}",
    "provider": "{filterbox.field.PACKAGE_NAME}",
    "title": "{android.title}"
}
```

### 后端

#### 使用 Zeabur 或类似平台部署

Fork 本仓库（记得设置为 Private），并修改好配置文件，然后在 Zeabur 中选择你的仓库进行部署

#### 手动部署

安装好运行环境和 `requirements.txt` 中的模块后，准备一个 `config.json` 即可直接运行后端。默认端口为 5052，会被环境变量 `PORT` 覆盖。

此方法不适合用于生产环境，实际部署时请使用 `gunicorn`，并且自行设置自启动（详情请自行上网查阅或向 AI 寻求帮助）

#### 编写配置文件

下面是一个示例配置文件

```json
{
    "port": 5052, // 端口配置，无实际作用，仅能通过修改环境变量 PORT 配置
    "regex": {
        "code": "\\d{4,8}", // 从短信内容中匹配验证码的正则表达式
        "sender": "[\\[【](.*?)[\\]】]" // 从短信内容中匹配发送者的正则表达式
    },
    "mail_providers": [ // 邮件验证码的发送源（包名）
        "com.android.email", 
        "com.microsoft.office.outlook",
        "com.google.android.gm",
        "com.netease.mail",
        "com.tencent.androidqqmail",
        "net.thunderbird.android"
    ],
    "profiles": [ // 用户档案，可存在多个
        {
            "name": "NAME", // 档案名
            "secret": "TOTP_SECRET", // TOTP 密钥
            "window": 180, // 单次登录有效窗口时长
            "maxlen": 3 // 最大同时存储的验证码条数
        }
    ]
}
```

### 前端

将 [前端仓库](https://github.com/hxabcd/sms-code-sync-client) 的代码部署到服务器，（理论上也可以直接使用 html 文件，但不保证可用性），即可访问验证码。使用前需要修改 `script.js` 中的 `API_DOMAIN` 变量为自己后端的域名，方可正常使用

## 开发

使用 **Python 3.13.2** 开发

使用到的模块：

* Flask
* pyotp

推荐使用 [**Zeabur**](https://zeabur.com) 部署（需绑定自己的服务器）
