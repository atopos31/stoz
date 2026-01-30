# STOZ - Synology 到 ZimaOS 迁移工具

[English](README.md) | [中文](README_zh.md)

---

STOZ 是一个基于 Docker 的应用程序，可简化从 Synology NAS 到 ZimaOS 系统的数据迁移，并内置文件完整性校验功能。

## 功能特性

- **自动卷扫描**：自动发现和扫描所有 Synology 卷
- **选择性迁移**：通过直观的 UI 选择要迁移的特定文件夹
- **实时进度跟踪**：通过详细统计信息监控迁移进度
- **文件校验**：上传后进行三层完整性验证（大小 + 时间戳 + MD5）
- **暂停/恢复支持**：完全控制迁移任务
- **错误处理**：可配置的错误处理和重试逻辑
- **持久化状态**：任务在容器重启后仍然保留
- **Web UI**：基于 React 的现代化界面，易于操作
- **回收站支持**：可选择性迁移 Synology `#recycle` 目录

## 架构

- **后端**：Go + Gin 框架 + SQLite + GORM
- **前端**：React 19 + TypeScript + Vite 7 + Tailwind CSS
- **部署**：Docker + Docker Compose

## 快速开始

### 前置要求

- 已安装 Docker 和 Docker Compose
- 在 Synology NAS 或挂载了 Synology 卷的系统上运行
- ZimaOS 系统可通过网络访问

### 安装步骤

1. 克隆仓库：
```bash
git clone https://github.com/atopos31/stoz.git
cd stoz
```

2. 启动应用：
```bash
docker-compose up -d
```

3. 访问 Web 界面：
```
http://localhost:8080
```

## 配置说明

环境变量可以在 `docker-compose.yml` 或 `.env` 文件中配置（参考 `.env.example`）：

```bash
# 应用程序设置
GIN_MODE=release              # Gin 模式：debug/release
SERVER_PORT=8080              # 服务器端口
LOG_LEVEL=info                # 日志级别：debug/info/warn/error

# 数据库
DB_PATH=/data/stoz.db         # SQLite 数据库路径

# 扫描
HOST_PATH=/host               # 主机挂载点（不要更改）
SCAN_CACHE_TTL=300            # 扫描缓存 TTL（秒）

# Worker 配置
WORKER_COUNT=3                # Worker 协程数量
CONCURRENT_FILES=3            # 并发上传文件数
CHUNK_SIZE=10485760           # 上传块大小（10MB）
MAX_RETRIES=3                 # 失败上传的最大重试次数

# 文件校验（新功能）
ENABLE_VERIFICATION=true      # 启用上传后文件校验
VERIFY_CHUNK_SIZE=1048576     # 校验块大小（1MB）

# ZimaOS
ZIMAOS_TIMEOUT=30             # 登录超时时间（秒）
```

## 使用方法

### 步骤 1：扫描卷

应用程序会自动扫描 `/host/volume*` 目录，并显示所有非 `@` 前缀的文件夹。

### 步骤 2：选择文件夹

从发现的卷中选择要迁移的文件夹。

### 步骤 3：配置连接

输入 ZimaOS 连接详情：
- 主机地址（例如：`http://192.168.1.100` 或 `http://zimaos.local`）
- 用户名
- 密码
- ZimaOS 上的基础路径（默认：`/media/ZimaOS-HD`）

配置迁移选项：
- **覆盖现有文件**：替换 ZimaOS 上已存在的文件
- **跳过错误并继续**：即使某些文件失败也继续迁移
- **保留文件时间戳**：保持原始文件修改时间
- **包含回收站**：迁移 Synology `#recycle` 目录

继续之前请测试连接。

### 步骤 4：监控迁移

实时查看进度，包括：
- 整体进度百分比
- 已处理文件 / 总文件数
- 已传输数据 / 总数据量
- 当前传输速度
- 预计剩余时间（ETA）
- 失败文件数
- **校验进度**（启用时）

控制迁移：
- **暂停**：临时停止迁移
- **恢复**：继续暂停的迁移
- **取消**：停止并取消迁移

## 文件校验

在所有文件上传完成后，STOZ 会使用三层方法自动验证文件完整性：

1. **大小检查**：比较本地和远程文件的大小
2. **时间戳检查**：验证修改时间是否匹配（允许 ±1 秒误差）
3. **MD5 哈希检查**：比较文件前 1MB 内容的 MD5 哈希值

**优势**：
- 确保数据完整性，无需下载整个文件
- 最小化带宽使用（每个文件仅 1MB）
- 即使对大文件也能快速验证
- 任何验证失败都会将任务标记为失败，并提供详细错误日志

**配置**：
- 设置 `ENABLE_VERIFICATION=false` 可禁用校验
- 调整 `VERIFY_CHUNK_SIZE` 可更改校验数据大小（默认：1MB）

## API 端点

### 健康检查
```
GET /api/v1/health
```

### 扫描
```
GET /api/v1/scan
POST /api/v1/folder/details
```

### ZimaOS 连接
```
POST /api/v1/zimaos/test
```

### 迁移管理
```
POST /api/v1/migration              # 创建迁移任务
GET /api/v1/migration/:taskId       # 获取任务状态
GET /api/v1/migrations              # 列出所有任务
POST /api/v1/migration/:taskId/pause    # 暂停任务
POST /api/v1/migration/:taskId/resume   # 恢复任务
POST /api/v1/migration/:taskId/cancel   # 取消任务
```

## 开发

### 前置要求

- Go 1.25+
- Node.js 20+
- npm 或 yarn

### 构建后端

```bash
go mod download
go build -o stoz .
```

### 构建前端

```bash
cd webui
npm install
npm run build
```

### 本地运行

```bash
# 终端 1：启动后端
export DB_PATH=./data/stoz.db
export HOST_PATH=/
./stoz

# 终端 2：启动前端开发服务器
cd webui
npm run dev
```

### 构建 Docker 镜像

```bash
docker build -t stoz:latest .
```

## 项目结构

```
stoz/
├── main.go                     # 应用入口
├── config/                     # 配置管理
├── models/                     # 数据库模型
├── handler/                    # HTTP 处理器
├── service/                    # 业务逻辑
│   ├── scanner_service.go      # 卷扫描
│   ├── migration_service.go    # 任务管理
│   └── zimaos_client.go        # ZimaOS API 客户端
├── worker/                     # 迁移 Worker 池
├── middleware/                 # HTTP 中间件
├── common/                     # 工具（日志、错误）
├── webui/                      # React 前端
│   ├── src/
│   │   ├── api/               # API 客户端
│   │   ├── pages/             # 页面组件
│   │   ├── components/        # 可重用组件
│   │   └── types/             # TypeScript 类型
│   └── dist/                  # 构建的前端资源
├── Dockerfile                  # 多阶段构建
├── docker-compose.yml          # Docker Compose 配置
└── README.md                   # 本文件
```

## 技术细节

### 迁移流程

1. 用户选择文件夹并配置 ZimaOS 连接
2. 在 SQLite 数据库中创建任务
3. 将任务提交到 Worker 池队列
4. Worker 协程处理任务：
   - 登录到 ZimaOS
   - 递归扫描源文件夹
   - 在 ZimaOS 上创建目录结构
   - 使用分块和重试逻辑上传文件
   - 实时更新进度
5. **文件校验阶段**（如果启用）：
   - 遍历所有已上传的文件
   - 通过 ZimaOS API 检索远程文件元数据
   - 比较大小、时间戳和 MD5 哈希
   - 实时更新校验进度
   - 如果任何文件校验失败，将任务标记为失败
6. 前端每秒轮询一次状态

### 关键特性

- **Worker 池**：固定数量的协程并发处理任务
- **任务持久化**：所有任务存储在 SQLite 中，重启后可恢复
- **分块上传**：大文件以 10MB 块上传
- **指数退避**：失败的上传会以指数延迟重试
- **进度跟踪**：实时进度，包含速度和 ETA 计算
- **错误日志**：所有错误记录到数据库，带错误类型（upload/verify）
- **部分下载**：使用 HTTP Range 请求进行高效校验

## 故障排除

### 容器无法访问 Synology 卷

确保挂载了根文件系统：
```yaml
volumes:
  - /:/host:ro
```

### 连接测试失败

- 验证 Docker 容器可以访问 ZimaOS
- 检查防火墙设置
- 确保凭据正确
- 尝试手动访问 ZimaOS API：`curl http://<host>/v1/users/login`

### 迁移速度慢

- 增加 `CONCURRENT_FILES` 以实现更多并行上传
- 检查 Synology 和 ZimaOS 之间的网络带宽
- 验证 ZimaOS 系统未过载

### 校验失败

- 检查 STOZ 和 ZimaOS 之间的网络稳定性
- 验证 ZimaOS 有足够的存储空间
- 在 UI 中查看错误日志以了解具体文件错误
- 考虑使用 `ENABLE_VERIFICATION=false` 临时禁用校验

### 数据库锁定错误

- 确保只运行一个 STOZ 实例
- 检查 `/data` 目录的文件权限

## 许可证

MIT License

## 贡献

欢迎贡献！请随时提交 Pull Request。

## 支持

如有问题，请在 GitHub 上提出 issue。
