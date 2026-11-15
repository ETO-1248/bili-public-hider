# BiliPublicHider

**B站公共大屏隐私隐藏插件** / **Public-screen privacy hider for Bilibili**

[简体中文](#简体中文) · [English](#english)

![BiliPublicHider 图标 / BiliPublicHider icon](icons/icon128.png)

---

## 简体中文

适合教室、会议室、展厅等公用电脑：减少误触三连，并收起个人主页、历史记录、收藏夹、追番、投稿和创作中心等入口。当前版本 **1.1.0**。

- 项目仓库：<https://github.com/ETO-1248/bili-public-hider>
- 作者 B 站主页：<https://space.bilibili.com/1645082697>

### 功能

| 开关 | 默认 | 作用 |
| --- | --- | --- |
| 公共大屏模式 | 开启 | 总开关；关闭后所有隐藏规则暂停 |
| 视频三连按钮 | 开启 | 隐藏点赞、投币、收藏按钮，避免误触 |
| 个人主页 | 开启 | 隐藏头像、个人中心、空间入口 |
| 历史记录 | 开启 | 隐藏顶栏、菜单与站内历史链接 |
| 收藏夹 | 开启 | 隐藏顶栏、菜单、收藏夹链接与空间收藏区 |
| 点赞记录 | 开启 | 隐藏个人主页与空间中的点赞视频 |
| 主页投稿视频 | 开启 | 隐藏个人主页的投稿视频区 |
| 追番 / 番剧 | 开启 | 隐藏追番、番剧、我的追番入口与空间追番区 |
| 投稿入口 | 开启 | 隐藏投稿按钮与投稿管理入口 |
| 创作中心 | 开启 | 隐藏创作中心与创作者后台 |
| 动态 | 开启 | 隐藏动态入口及动态页主页链接 |
| 消息 | 开启 | 隐藏消息、私信与通知入口 |

另外提供：

- **关于页面**：弹窗右上角「关于」可查看项目仓库、作者 B 站主页与开源许可；页面每次使用一张内置插画铺满全屏背景。
- **设置页背景**：设置弹窗和扩展选项页默认随机使用一张内置插画，也可选择关闭或指定。
- **设置密码**：设置后，打开弹窗需要先解锁，才能修改以上开关。
- **首次安装向导**：安装后自动打开，按「全面保护 / 仅防三连 / 只收隐私」快速配置，并可顺手设置密码。
- **单独控制**：十一个隐藏项可以独立开关，也可以一键暂停全部规则。
- **自动跟随页面**：使用 `MutationObserver` 监听 B 站单页应用更新，切换视频、打开新页面后仍然生效。
- **点击兜底**：即使 B 站改版导致样式选择器失效，脚本也会拦截指向历史记录、收藏夹、点赞记录、追番、投稿、创作中心、动态和消息等页面的可见链接点击。
- **不联网、不收集数据**：权限只有 `storage`，没有网络请求、没有遥测。

### 安装

#### Chrome / Edge / 其他 Chromium 浏览器

1. 解压 `BiliPublicHider-v1.1.0.zip`，得到 `BiliPublicHider` 文件夹。
2. 打开 `chrome://extensions`（Edge 为 `edge://extensions`）。
3. 打开右上角的「开发者模式」。
4. 点击「加载已解压的扩展程序」，选择 `BiliPublicHider` 文件夹。
5. 打开 B 站任意页面，点击地址栏右侧的 BiliPublicHider 图标即可调整设置。

要求 Chromium 105 或更高版本（使用了 `:has()` 选择器）。

扩展选项页可从 `chrome://extensions` → BiliPublicHider →「扩展选项」打开；它和工具栏弹窗共用设置、密码状态与背景图。

### 首次设置向导

初次安装或浏览器启动时会自动打开 `welcome.html` 设置向导：

- **全面保护**：默认开启全部 11 项隐藏规则。
- **仅防三连**：只隐藏点赞、投币和收藏按钮。
- **只收隐私**：隐藏主页、历史、收藏、点赞、投稿视频、追番、动态和消息等私人内容，保留互动按钮。
- **可选密码**：在向导最后一步设置；不设置也可以直接完成。
- 完成后会记录 `bphOnboardingDone`，以后启动不再自动打开。点「跳过向导」也会记录完成状态。
- 弹窗「关于」旁新增「向导」入口，可随时重新运行；如果已经设置密码，需要先输入密码解锁。

### 设置密码

1. 点击扩展图标，在「设置密码」区域点击「设置密码」。
2. 输入至少 4 位、最多 64 位的密码，并再次确认。
3. 设置完成后，可以点「锁定」立即锁定；下次打开弹窗会先出现解锁页。

密码使用 **PBKDF2-SHA-256、210,000 次迭代、随机 16 字节盐** 派生后保存在 `chrome.storage.local`，不保存明文，也不会上传。

> **忘记密码**：密码没有找回服务器。只能打开 `chrome://extensions` 移除扩展，再重新加载扩展文件夹；这会清除全部设置和密码。也可以在「忘记密码？」中查看说明。

> **安全边界**：设置密码用于防止同学、访客日常误改开关，不是加密保险箱。能打开开发者工具、修改扩展文件或删除扩展的人仍然可以绕过。

### 隐私与权限

- `storage`：保存各开关状态（`chrome.storage.sync`）和密码派生记录（`chrome.storage.local`）。
- 内容脚本只在 `bilibili.com` 及其子域运行，用于查找并隐藏页面上的按钮和隐私入口；不会读取 Cookie、账号资料，也不发送任何数据。
- 设置密码只保存在当前浏览器配置文件，不随 Chrome 同步。
- 扩展不修改 B 站账号数据，不会取消已有点赞、投币或收藏。

### 兼容性与限制

- 适配 B 站网页端当前常见的顶栏和视频工具栏结构，并对按钮文字做了兜底识别。
- 如果 B 站大改版导致某个入口仍然显示，可以提交页面结构或选择器，更新 `content.css` / `content.js`。
- **不拦截地址栏直接输入**：本扩展隐藏的是页面入口和可见链接，不会阻止在地址栏手动输入历史记录、收藏夹、点赞记录、个人追番、个人投稿、创作者后台、动态或消息地址。若要彻底阻断，需要配合浏览器的 URL 拦截策略（如企业策略 `URLBlocklist`）。
- 不处理移动端网页、B 站客户端或第三方嵌入播放器。
- 收藏夹相关规则会隐藏包含 `medialist` / `favlist` 的站内链接，可能同时隐藏合集/收藏列表入口，这是有意的隐私保护行为。
- 「追番 / 番剧」会同时隐藏顶栏的「番剧」公共导航；「创作中心」会隐藏创作中心相关链接；「投稿」会隐藏上传/投稿管理链接。

### 关于页面

弹窗右上角的「关于」会打开扩展内的 `about.html`，其中包含：

- GitHub 仓库：<https://github.com/ETO-1248/bili-public-hider>
- 作者 B 站主页：<https://space.bilibili.com/1645082697>
- 随机插画全屏背景，可点「换一张」重新抽取
- 页面内直接展示 MIT License 英文原文、简体中文参考译本和图标 CC0 1.0 说明，无需下载

### 文件结构

```text
BiliPublicHider/
├── manifest.json          # Manifest V3，版本 1.1.0，default_locale = zh_CN
├── _locales/zh_CN/
│   └── messages.json      # 扩展名称、简介与按钮标题的简体中文本地化
├── background.js          # 首次安装/启动时打开设置向导
├── welcome.html           # 首次设置向导
├── welcome.css
├── welcome.js
├── content.js             # 页面扫描、隐藏与链接拦截
├── content.css            # 所有隐藏规则（默认不生效，按设置开启）
├── popup.html             # 设置弹窗 / 扩展选项页
├── popup.css
├── popup.js               # 开关、背景选择、锁定页、密码对话框
├── password.js            # PBKDF2 密码派生与校验
├── about.html             # 关于页面：仓库、B站主页、开源许可
├── about.css
├── about.js               # 关于页随机背景图
├── backgrounds.js         # 9 张内置背景插画的清单与随机逻辑
├── pictures/              # bg-01.jpg … bg-09.jpg
│   └── thumbs/            # 背景选择器使用的预览缩略图
├── LICENSE                # MIT License（英文原文）
├── LICENSE_Zh-Hans        # MIT License 简体中文参考译本
├── icons/
│   ├── icon.svg           # 自绘图标源文件（CC0）
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   ├── icon300.png       # 300px export / 300px 展示图
│   └── LICENSE.txt
└── README.md
```

### 开发与测试

测试脚本位于扩展目录之外，不会被打包：

```bash
node tests/password.test.js
node tests/popup.test.js
node tests/content.test.js
node tests/about.test.js
node tests/background.test.js
```

### 图标素材

图标为项目自绘的原创几何图形（粉色盾牌 + 播放符号），不含第三方素材，采用 **CC0 1.0 公共领域贡献**。源文件见 [`icons/icon.svg`](icons/icon.svg)。

### 背景插画

`pictures/` 中的 9 张背景插画随扩展本地加载，仅用于关于页和设置页的界面装饰；它们不适用应用图标的 CC0 许可，相关权利归原权利人。

### 许可

- 代码：MIT License，Copyright © 2026 ETO-1248。英文原文见 [`LICENSE`](LICENSE)，简体中文参考译本见 [`LICENSE_Zh-Hans`](LICENSE_Zh-Hans)。
- 图标：CC0 1.0，详见 [`icons/LICENSE.txt`](icons/LICENSE.txt)。

> `LICENSE_Zh-Hans` 仅为方便阅读的参考译本；如与英文 [`LICENSE`](LICENSE) 存在歧义，以英文原文为准。

---

## English

A privacy-focused extension for shared and public computers running Bilibili, such as classroom, meeting-room, and exhibition machines. It prevents accidental triple actions and hides entry points to the user's profile, history, favorites, anime list, uploads, and Creator Center. Current version: **1.1.0**.

- Repository: <https://github.com/ETO-1248/bili-public-hider>
- Author on Bilibili: <https://space.bilibili.com/1645082697>

### Features

| Toggle | Default | Effect |
| --- | --- | --- |
| Public-screen mode | On | Master switch; turning it off suspends every hiding rule |
| Triple-action buttons | On | Hides Like, Coin, and Favorite buttons to prevent accidental clicks |
| Profile | On | Hides the avatar, personal center, and profile-space entries |
| History | On | Hides the top-bar, menu, and in-site history links |
| Favorites | On | Hides favorites links and the favorites area on profile pages |
| Liked videos | On | Hides liked videos on profile and space pages |
| Profile uploads | On | Hides the uploaded-video area on profile home pages |
| Anime | On | Hides anime tracking, the anime nav, "My Anime", and the anime area on profile pages |
| Upload entry | On | Hides upload buttons and upload-management entries |
| Creator Center | On | Hides Creator Center and creator-dashboard entries |
| Dynamics | On | Hides the Dynamics entry and profile links on the Dynamics page |
| Messages | On | Hides messages, direct messages, and notification entries |

Additional behavior:

- **About page**: the "About" button in the popup opens the repository, the author's Bilibili profile, and the open-source licenses, with a random built-in illustration filling the page background.
- **Settings-page background**: the popup and extension options page use a random built-in illustration by default; you can also disable it or pick a specific image.
- **Settings password**: when set, the popup must be unlocked before any toggle can be changed.
- **First-run wizard**: opens automatically after installation with Full protection, Triple-action only, and Privacy-only presets, plus an optional password.
- **Independent controls**: the eleven hiding toggles can be used separately, or all suspended with the master switch.
- **SPA-aware**: a `MutationObserver` keeps the rules applied while navigating between videos and pages.
- **Click fallback**: if Bilibili changes its markup and a selector no longer matches, visible links to history, favorites, liked videos, anime, uploads, Creator Center, Dynamics, and Messages are still blocked.
- **No network, no telemetry**: the only permission is `storage`.

### Installation

#### Chrome / Edge / other Chromium browsers

1. Extract `BiliPublicHider-v1.1.0.zip` to a folder named `BiliPublicHider`.
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the `BiliPublicHider` folder.
5. Open any Bilibili page and click the BiliPublicHider icon in the toolbar.

Requires Chromium 105 or newer (the styles use `:has()`).

Open the extension options page from `chrome://extensions` → BiliPublicHider → **Extension options**. It shares settings, password state, and background selection with the toolbar popup.

### First-run setup wizard

On first installation or browser startup, `welcome.html` opens automatically:

- **Full protection**: enables all 11 hiding rules.
- **Triple-action only**: hides only Like, Coin, and Favorite buttons.
- **Privacy only**: hides private profile, history, favorites, liked videos, profile uploads, anime, Dynamics, and Messages content while keeping interaction buttons.
- **Optional password**: configure it on the final step; it can also be left blank.
- Finishing stores `bphOnboardingDone`, so the wizard will not open automatically again. **Skip wizard** also marks onboarding as complete.
- A **Wizard** link next to **About** in the popup reruns the setup at any time; if a settings password is configured, it must be entered first.

### Settings password

1. Open the popup and click **Set password** in the password card.
2. Enter a password of 4–64 characters and confirm it.
3. Click **Lock** to lock immediately; the unlock screen appears the next time the popup opens.

Passwords are derived with **PBKDF2-SHA-256, 210,000 iterations, and a random 16-byte salt**, then stored in `chrome.storage.local`. Plaintext passwords are never stored or transmitted.

> **Forgot password?** There is no recovery server. Remove the extension at `chrome://extensions`, then load the folder again; this clears all settings and the password. The in-app **Forgot password?** dialog explains the same steps.

> **Security boundary**: the password prevents casual changes by classmates or visitors. It is not a secure vault; anyone with developer tools, file-system access, or permission to remove the extension can bypass it.

### Privacy and permissions

- `storage` stores the toggle state (`chrome.storage.sync`) and the password derivation record (`chrome.storage.local`).
- The content script runs only on `bilibili.com` and its subdomains. It inspects buttons and links solely to hide them; it does not read cookies or account data and sends nothing anywhere.
- The password record stays in the current browser profile and is not synced by Chrome.
- The extension never modifies Bilibili account data and does not undo existing likes, coins, or favorites.

### Compatibility and limitations

- Targets the current common Bilibili header and video-toolbar structure, with text-based fallbacks for buttons.
- If a Bilibili redesign leaves an entry visible, open an issue with the page structure or selectors so `content.css` / `content.js` can be updated.
- **Direct address-bar navigation is not blocked**: the extension hides entries and visible links, but it does not prevent manually typing a history, favorites, liked-video, personal anime, personal uploads, creator-dashboard, Dynamics, or Messages URL. Combine it with browser URL policies (for example, enterprise `URLBlocklist`) if hard blocking is required.
- Mobile pages, the Bilibili desktop app, and third-party embedded players are not covered.
- Favorites rules hide in-site links containing `medialist` / `favlist`, which may also hide collection or playlist entries by design.
- The Anime toggle also hides the public "Anime" nav in the header; Creator Center hides creator-related links; Uploads hides upload and upload-management links.

### About page

The **About** button in the popup opens `about.html`, which contains:

- GitHub repository: <https://github.com/ETO-1248/bili-public-hider>
- Author's Bilibili profile: <https://space.bilibili.com/1645082697>
- A random full-page illustration background, with a **Shuffle** button
- The full MIT License (English original), the Simplified Chinese reference translation, and the CC0 1.0 artwork notice, all displayed inline with no download required

### Project structure

```text
BiliPublicHider/
├── manifest.json          # Manifest V3, version 1.1.0, default_locale = zh_CN
├── _locales/zh_CN/
│   └── messages.json      # Simplified Chinese localization for name, description, and action title
├── background.js          # Opens the setup wizard on install/startup
├── welcome.html           # First-run setup wizard
├── welcome.css
├── welcome.js
├── content.js             # Page scanning, hiding, and link blocking
├── content.css            # All hiding rules (inactive until enabled)
├── popup.html             # Settings popup / extension options page
├── popup.css
├── popup.js               # Toggles, background selector, lock screen, and password dialogs
├── password.js            # PBKDF2 password derivation and verification
├── about.html             # About page: repository, Bilibili profile, licenses
├── about.css
├── about.js               # Random About-page background
├── backgrounds.js         # List of 9 built-in backgrounds and random logic
├── pictures/              # bg-01.jpg … bg-09.jpg
│   └── thumbs/            # Preview thumbnails for the background selector
├── LICENSE                # MIT License (English original)
├── LICENSE_Zh-Hans        # Simplified Chinese reference translation of MIT
├── icons/
│   ├── icon.svg           # Original self-drawn icon (CC0)
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   ├── icon300.png       # 300px export / 300px 展示图
│   └── LICENSE.txt
└── README.md
```

### Development and tests

Test scripts live outside the extension folder and are not packaged:

```bash
node tests/password.test.js
node tests/popup.test.js
node tests/content.test.js
node tests/about.test.js
node tests/background.test.js
```

### Icon

The icon is original artwork drawn for this project: a pink shield with a play symbol. It contains no third-party artwork and is dedicated to the public domain under **CC0 1.0**. The source is [`icons/icon.svg`](icons/icon.svg).

### Background illustrations

The nine background illustrations in `pictures/` are loaded locally and used only as decorative UI backgrounds on the About and settings pages. They are not covered by the CC0 icon dedication; rights remain with their respective owners.

### License

- Code: MIT License, Copyright © 2026 ETO-1248. See the English original [`LICENSE`](LICENSE) and the Simplified Chinese reference translation [`LICENSE_Zh-Hans`](LICENSE_Zh-Hans).
- Icon: CC0 1.0; see [`icons/LICENSE.txt`](icons/LICENSE.txt).

> `LICENSE_Zh-Hans` is provided for convenience only. If it conflicts with the English [`LICENSE`](LICENSE), the English original governs.
