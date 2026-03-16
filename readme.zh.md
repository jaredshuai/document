# OnlyOffice Web

<p align="center">
  <a href="https://github.com/ranuts/document/actions/workflows/ci.yml">
    <img src="https://github.com/ranuts/document/actions/workflows/ci.yml/badge.svg" alt="CI Status">
  </a>
  <a href="https://github.com/ranuts/document/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/ranuts/document" alt="授权许可">
  </a>
  <a href="https://github.com/ranuts/document/releases">
    <img src="https://img.shields.io/github/v/release/ranuts/document" alt="版本">
  </a>
  <a href="https://ranuts.github.io/document/">
    <img src="https://img.shields.io/badge/在线-体验-brightgreen" alt="在线体验">
  </a>
  <img src="https://img.shields.io/badge/覆盖率-100%25-brightgreen" alt="测试覆盖率">
</p>

<p align="center">
  <a href="readme.md">English</a> | <b>中文</b>
</p>

基于 OnlyOffice 的本地网页文档编辑器，让您直接在浏览器中编辑文档，无需服务器端处理，保护您的隐私安全。

## ✨ 主要特性

- 🔒 **隐私优先**: 所有文档处理都在浏览器本地进行，不上传到任何服务器
- 📝 **多格式支持**: 支持 DOCX、XLSX、PPTX、CSV 等多种文档格式
- ⚡ **实时编辑**: 提供流畅的实时文档编辑体验
- 🚀 **无需部署**: 纯前端实现，无需服务器端处理
- 🎯 **即开即用**: 打开网页即可开始编辑文档
- 🌐 **URL 打开**: 通过 URL 参数直接从远程地址加载文档
- 🌍 **多语言支持**: 支持多种语言（英文、中文），轻松切换界面语言

## 📖 使用方法

### 基本使用

1. 访问 [在线编辑器](https://ranuts.github.io/document/)
2. 上传您的文档文件或从 URL 打开文档
3. 直接在浏览器中编辑
4. 下载编辑后的文档

### 离线使用 (PWA)

本应用通过 PWA（渐进式 Web 应用）技术支持离线使用。

1. 使用支持的浏览器（Chrome、Edge 等）通过 **HTTPS**（或 localhost）访问编辑器。
2. 点击地址栏中的**安装**图标进行安装。
3. 安装后，可以从应用程序菜单启动编辑器，且在断网状态下也能正常工作。

**注意**：由于浏览器安全限制，Service Worker（离线支持所需）在直接从文件系统打开 `index.html`（`file://` 协议）时无法工作。您必须使用本地服务器或已安装的 PWA。

### URL 参数

| 参数     | 说明                        | 值/类型    | 优先级 |
| -------- | --------------------------- | ---------- | ------ |
| `locale` | 设置界面语言                | `en`, `zh` | -      |
| `src`    | 从 URL 打开文档（推荐）     | URL 字符串 | 低     |
| `file`   | 从 URL 打开文档（向后兼容） | URL 字符串 | 高     |

**示例：**

```bash
# 设置语言
?locale=zh

# 从 URL 打开文档
?src=https://example.com/document.docx

# 组合使用
?locale=zh&src=https://example.com/doc.docx
```

**注意**: 当同时提供 `file` 和 `src` 参数时，`file` 参数优先。远程 URL 必须支持 CORS。

### 嵌入宿主页

您可以把编辑器作为 iframe 嵌入到宿主页中，并通过同源 API 或轻量级 `postMessage` 消息桥主动控制编辑器行为。

#### 快速示例页

本地启动后，直接访问 `/embed-demo.html` 即可看到一个完整可运行的宿主页示例。该页面演示了：

- 在宿主页中 iframe 嵌入编辑器
- 通过 `postMessage` 发送 `CREATE_NEW` 和 `OPEN_DOCUMENT_URL` 控制命令
- 用接近真实插件集成的方式驱动 iframe 内编辑器

#### 方式 A：同源直接调用

```html
<iframe id="office-editor" src="/"></iframe>
<button onclick="openWord()">新建 Word</button>

<script>
  async function openWord() {
    const editorWindow = document.getElementById('office-editor').contentWindow;
    await editorWindow.onCreateNew('.docx');
  }
</script>
```

#### 方式 B：postMessage 消息桥

```html
<iframe id="office-editor" src="https://editor.example.com/"></iframe>
<script src="https://editor.example.com/embed-host-sdk.js"></script>
<button onclick="openWordViaMessage()">新建 Word</button>

<script>
  const bridge = window.DocumentEditorHostBridge.create({
    iframe: document.getElementById('office-editor'),
    targetOrigin: 'https://editor.example.com',
  });

  bridge.onHostEvent(({ event, data }) => {
    console.log('Editor host event:', event, data);
  });

  async function openWordViaMessage() {
    await bridge.createNew('.docx');
  }
</script>
```

当前支持的宿主命令：

- `PING`
- `CREATE_NEW`，payload 形如 `{ ext: '.docx' | '.xlsx' | '.pptx' }`
- `OPEN_DOCUMENT_URL`，payload 形如 `{ url: 'https://example.com/file.docx', fileName?: 'custom.docx' }`
- `CLOSE_EDITOR`

宿主 SDK 文件：

- `/embed-host-sdk.js`

当前通过 `postMessage` 回传给宿主的事件：

- `BRIDGE_READY`
- `DOCUMENT_READY`
- `DOCUMENT_OPEN_FAILED`
- `EDITOR_CLOSED`

#### 接入注意事项

- 宿主页直接调用编辑器方法时，iframe 必须与宿主页保持 **同源**
- 更接近插件化集成的场景，建议优先使用 `postMessage` 控制
- 通过 URL 打开远程文档时，远程文件服务器仍需允许 **CORS**
- 如果想在 iframe 初始加载时就打开文档，可以把地址设置为 `/?src=<编码后的文档地址>`

### 作为组件库使用

本项目为 [@ranui/preview](https://www.npmjs.com/package/@ranui/preview) WebComponent 组件库提供文档预览组件的基础服务支持。

📚 **预览组件文档**: [https://chaxus.github.io/ran/src/ranui/preview/](https://chaxus.github.io/ran/src/ranui/preview/)

## 🛠️ 技术架构

- **OnlyOffice SDK**: 提供强大的文档编辑能力
- **WebAssembly**: 通过 x2t-wasm 实现文档格式转换
- **纯前端架构**: 所有功能都在浏览器中运行

## 🚀 部署说明

### Docker

```bash
# docker run
docker run -d --name document -p 8080:80 ghcr.io/ranuts/document:latest

# docker compose
services:
  document:
    image: ghcr.io/ranuts/document:latest
    container_name: document
    ports:
      - 8080:80
```

#### 进阶配置

```yaml
name: document
services:
  document:
    image: ghcr.io/ranuts/document:latest
    container_name: document
    ports:
      - 8080:80
    # 进阶配置
    volumes:
      # 添加证书
      - 证书路径:/ssl
    environment:
      # 设置账号
      # 格式用户名:密码，必须使用 BCrypt 密码哈希函数对密码进行编码。
      # 获取 BCrypt 加密的结果，把加密结果中的$替换成$$转义。
      SERVER_BASIC_AUTH: '用户名:BCrypt 加密密码'
      # 使用证书
      SERVER_HTTP2_TLS: true
      SERVER_HTTP2_TLS_CERT: 证书路径
      SERVER_HTTP2_TLS_KEY: 私钥路径
```

### 重要提示

- **CORS**: 使用 `src` 或 `file` 参数时，远程服务器必须支持 CORS
- **文件大小**: 大文件可能需要较长时间加载

## 🔧 本地开发

```bash
git clone https://github.com/ranuts/document.git
cd document
npm install
npm run dev
```

### 运行测试

项目使用 [Vitest](https://vitest.dev/) 进行测试。测试文件位于 `lib/__tests__/` 目录。

```bash
# 运行所有测试
pnpm test

# 以监视模式运行测试
pnpm test:watch

# 运行测试并生成覆盖率报告
pnpm test:coverage
```

#### 测试覆盖率

项目专注于测试可以可靠进行单元测试的纯工具函数：

| 模块 | 覆盖率 | 说明 |
|------|--------|------|
| `lib/file-types.ts` | 100% | 文件类型常量和反向映射 |
| `lib/url-utils.ts` | 100% | URL/文件名解析、语言标准化、文件名清理 |
| `lib/language-types.ts` | 100% | 语言代码枚举和工具函数 |
| `lib/conversion-utils.ts` | 100% | 文档转换参数生成 |
| `lib/conversion-paths.ts` | 100% | X2T 虚拟文件系统路径 |
| `lib/i18n-messages.ts` | 100% | 国际化消息和验证 |
| `lib/type-guards.ts` | 100% | 外部数据的运行时类型验证 |
| `lib/error-utils.ts` | 100% | 错误处理、格式化和分类 |
| `lib/byte-utils.ts` | 100% | UTF-8 BOM 处理、字节编码/解码 |
| `lib/empty_bin.ts` | 100% | 新文件的空文档模板 |
| `lib/document-utils.ts` | 100% | 文档类型检测、MIME 类型 |
| `lib/render-workflow.ts` | 100% | 分块文档加载工作流 |
| `lib/document-template.ts` | 100% | 新文档模板工具 |
| `lib/save-format.ts` | 100% | 保存格式确定 |
| `lib/editor-utils.ts` | 100% | 编辑器延迟工具 |
| `lib/editor-config.ts` | 100% | 编辑器配置助手 |
| `lib/operation-queue.ts` | 100% | 顺序异步操作队列 |
| `lib/file-picker.ts` | 100% | 文件系统 API 选择器工具 |
| `lib/media-url.ts` | 100% | 编辑器媒体 URL 工具 |
| `store/index.ts` | 100% | 状态管理存储 |

**主要可测试函数** (`lib/url-utils.ts`):
- `sanitizeFileName()` - 清理文件名，移除非法字符
- `getMimeType()` - 根据文件扩展名返回 MIME 类型
- `getFileDescription()` - 返回文件类型的人类可读描述
- `extractFileType()` - 从 MIME 类型或文件名提取文件类型
- `normalizeLanguage()` - 标准化语言代码 (zh-CN → zh)
- `determineFilename()` - 按优先级确定文件名

**类型守卫** (`lib/type-guards.ts`):
- `isValidRenderOfficeData()` - 验证来自消息编解码器的分块文件数据
- `isValidChunkSequence()` - 验证分块数组的完整性
- `isValidFile()` - 验证文件名和大小约束

**错误处理工具** (`lib/error-utils.ts`):
- `formatErrorMessage()` - 从未知值安全提取错误消息
- `isNetworkError()` - 分类网络相关错误
- `isFileError()` - 分类文件相关错误
- `safeAsync()` - 包装异步函数实现安全错误处理

**注意**：依赖浏览器的模块（UI、OnlyOffice 集成、DOM 操作）未进行单元测试，因为它们需要浏览器环境。重点是测试可测试的纯函数。

CI 会在每次推送和拉取请求时自动运行测试。覆盖率报告作为 CI 流水线的一部分生成。

## 🔤 字体管理

### 项目中的字体文件

本项目作为开源项目，为了符合开源许可要求，**不包含**受版权保护的字体文件，如 **Arial**、**Times New Roman**、**微软雅黑**、**宋体** 等 Windows 系统字体。这些字体的名称引用仍保留在配置文件中，以确保与现有文档的兼容性，但实际的字体文件已被移除，以符合开源许可要求。

### 添加字体

要为项目中已配置的字体（如 Arial、Times New Roman 等）添加字体文件，只需将字体文件放置在 `public/fonts/` 目录下，并重命名为对应的数字索引。该索引对应 `public/sdkjs/common/AllFonts.js` 文件中 `__fonts_files` 数组的索引位置。

**示例：添加 Arial 字体**

如果您想为项目添加 Arial 字体：

1. 查看 `AllFonts.js` 文件，找到 Arial 常规字体在 `__fonts_files` 数组中使用的索引是 `223`
2. 将您的 Arial 字体文件放置在 `public/fonts/` 目录下，并重命名为 `223`（无需扩展名）
3. 字体文件应位于 `public/fonts/223`
4. 当应用程序引用索引 `223` 时，会自动从 `public/fonts/223` 加载该字体文件

其他 Arial 字体变体同样处理：

- Arial 粗体使用索引 `226` → 将字体文件放置为 `public/fonts/226`
- Arial 斜体使用索引 `224` → 将字体文件放置为 `public/fonts/224`
- Arial 粗斜体使用索引 `225` → 将字体文件放置为 `public/fonts/225`

您可以通过查看 `AllFonts.js` 文件中的 `__fonts_infos` 数组来查找任何字体的索引，每个字体条目都指定了其常规、粗体、斜体和粗斜体变体的索引。

**注意**：请仅使用开源字体或您拥有合法使用许可的字体。在添加任何字体文件之前，请确保符合字体许可条款。

## 📚 参考资料

- [onlyoffice-x2t-wasm](https://github.com/cryptpad/onlyoffice-x2t-wasm) - 基于 WebAssembly 的文档转换器
- [se-office](https://github.com/Qihoo360/se-office) - 安全文档编辑器
- [web-apps](https://github.com/ONLYOFFICE/web-apps) - OnlyOffice 网页应用
- [sdkjs](https://github.com/ONLYOFFICE/sdkjs) - OnlyOffice JavaScript SDK
- [onlyoffice-web-local](https://github.com/sweetwisdom/onlyoffice-web-local) - 本地网页版 OnlyOffice 实现

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目！

## 📄 许可证

详情请参阅 [LICENSE](LICENSE) 文件。
