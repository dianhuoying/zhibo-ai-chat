
## 2026-06-06 ReceiveAINode 双输出点问题

- **现象**：eceive-ai（AI图片接收）节点右侧出现2个 source Handle（image + 通用"输出"），连线时容易接错。
- **根因**：InteriorNode.tsx 作为包装器对所有节点无条件渲染了一个通用 source Handle，而 ReceiveAINode.tsx 内部自己也有一个 id="image" 的 source Handle，两个并存。
- **解决**：在 InteriorNode.tsx 中对 
odeType === "receive-ai" 条件隐藏通用 source Handle，只保留子组件自带的 image 输出点。
- **教训**：InteriorNode 包装器提供的通用 Handle 与子组件自定义 Handle 可能冲突，其他节点类型（如 inpaint-result）也可能存在同类问题，需逐一排查。

## 2026-06-06 ReceiveAINode 添加放大/下载/替换按钮

- **踩坑**：PowerShell 内联长字符串有长度限制（约3000字符），无法直接拼接太长的 JSX 代码。
  - 解决：改用 Python 脚本文件 (_patch_rx*.py) 分段写入，写完删除。
- **踩坑**：中文 title 属性（如"局部重绘"）在不同编码间不一致，PowerShell .Replace() 匹配不到。
  - 解决：Python 中先用原中文匹配再替换，避免编码转义问题。
- **踩坑**：.relative wrapper 的闭合 </div> 容易漏掉，导致 DOM 结构错乱。
  - 用行号精确插入闭合标签。
- **教训**：对含中文的 React 组件做字符串替换时，优先用 Python 脚本而非 PowerShell 内联。

## 2026-06-06 ReceiveAINode 下游自动上传+传播

- **需求**：当 receive-ai 节点连接了下游时，自动将图片上传到 ziyuan 目录，然后传给下游节点。
- **实现**：
  1. 从 store 订阅 edges，筛选出 source === nodeId 的连线
  2. 当 hasDownstream && images 存在且未上传时（无 ziyuanUrl/ziyuanPath），触发 useEffect
  3. 逐张调用 /api/upload/from-url 上传，获得固定路径 URL
  4. 写回当前节点 data.{images, _aiImages}
  5. 遍历下游边，将 {id, dataUrl: ziyuanUrl, name, origin: 'ai-generated'} 写入下游节点 data.images
- **格式对齐**：下游传播格式与 workflowStore.ts 中 onConnect/loadWorkflow 的 _aiImages→images 映射一致。
- **防重复**：通过检查 img.ziyuanUrl/ziyuanPath 跳过已上传图片。
- **踩坑**：hooks 规则——useWorkflowStore 订阅必须在组件顶层调用，不能在 useEffect 内部直接 getState()。但项目中模式是用 getState() 做写操作（非响应式读取），所以符合惯例。

## 2026-06-06 StyleTransferNode 累积生成历史

- **改动点**：
  1. useNodeGenerate.ts:176-179 — _aiImages: ziyuanImages (覆盖) 改为 _aiImages: existingAi.concat(taggedImages) (追加)
  2. 每批追加的图片自动附带 atchId (Date.now) 和 createdAt (ISO 时间戳)
  3. StyleTransferNode.tsx:168-173 — 新增清空历史按钮和"共N张历史生成"计数
- **展示**：ImageResultViewer 已内置多图横向滚动视图，esultImages 从 _aiImages 初始化时自动恢复全量历史
- **清空**：调用 updateNodeData(nodeId, { _aiImages: [] }) 清除，然后 ump() 触发重渲染
- **踩坑**：useNodeGenerate.ts 是 hook 文件但 handleGenerate 在 useCallback 闭包外，不能用 get() 而是用 useWorkflowStore.getState() 读 store


## 2026-06-06 全节点拖拽传图

- **实现方案**：
  1. 新建 useDragImageTransfer.ts 共享 hook（MIME 'application/x-interior-image'），导出 getDragImageProps 和 useDropZone
  2. 用正则批量给所有节点 <img> 标签加 draggable + onDragStart（序列化 { dataUrl, name, id } 到 dataTransfer）
  3. 对已有 onDrop/onDragOver 上传区的节点，增强 onDrop 逻辑：先检测跨节点图片（从 dataTransfer.getData 读 JSON），有则转 File 传给 addImgs；否则走原生文件拖放
- **涉及的节点**：InputImageNode、InputVideoNode、InputPPTNode、StyleTransferNode、InpaintGenNode（有上传框+增强拖入）、ReceiveAINode、CompareNode、InpaintResultNode、ImageResultViewer（给图片加拖出）
- **MultiRenderNode** 通过 ImageResultViewer 共享，无需单独修改
- **踩坑**：Python 脚本含中文会 SyntaxError，需加 # -*- coding: utf-8 -*- 或用 \u 转义
- **踩坑**：批量正则替换 img 标签时需小心，不要影响 lightbox 超大预览图（已注入了但可接受：最大化预览时拖拽也是合理的）

## 2026-06-06 ReceiveAINode 无法连线 — Handle 配置与 Validator 不匹配

- **现象**：AI图片接收节点无法与其他节点建立连线（作为目标或源都无法连接）。
- **根因**：两层不匹配：
  1. InteriorNode.tsx 对 receive-ai 渲染了 image_normal / srefs / oref 三个 target handle（走 ALL_SLOTS.slice(0,3) 兜底逻辑）
  2. useConnectionValidator.ts 中 TYPE_COMPAT 只允许 receive-ai 接受 ai-image 槽位
  3. 用户也要求在 InteriorNode 中对 receive-ai 隐藏通用 source handle（已做）
- **解决**：在 InteriorNode.tsx 的三元链中新增 receive-ai 分支，渲染单个 {id:"ai-image", label:"AI图片", color:"#ec4899", yPct:50} 的 target handle
- **代码位置**：InteriorNode.tsx handle 渲染和 label 渲染两处（2 occurrences）
- **改动前**：
odeType==="input-video" || nodeType==="input-ppt" ? [...] : ALL_SLOTS.slice(0,3)
- **改动后**：
odeType==="receive-ai" ? [{id:"ai-image",...}] : nodeType==="input-video" || nodeType==="input-ppt" ? [...] : ALL_SLOTS.slice(0,3)
- **教训**：InteriorNode 作为统一包装器，其 handle 渲染逻辑是一个递增的三元链，添加新节点类型时必须同步让 wrapper 知道该渲染哪些 target handle，且这些 handle id 必须在 useConnectionValidator 的 TYPE_COMPAT 中有对应条目，否则 React Flow 不会显示有效的连接锚点。