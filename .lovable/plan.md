## 问题诊断

控制台错误显示：
```
NotAllowedError: Failed to execute 'readText' on 'Clipboard':
The Clipboard API has been blocked because of a permissions policy applied to the current document.
```

预览环境（iframe）阻止了 `navigator.clipboard.readText()`，导致决策表的**粘贴**功能完全失效。复制在部分浏览器也可能因 `writeText` 权限受限而静默失败。当前 `useClipboard.ts` 仅依赖 `navigator.clipboard` API，没有降级方案。

## 修复方案

改造 `src/components/decision-table/useClipboard.ts` 与 `DecisionTableEditor.tsx`，使剪贴板功能在受限环境下依然可用。

### 1. 粘贴（核心修复）

不再主动调用 `navigator.clipboard.readText()`，改为**监听原生 `paste` 事件**从 `ClipboardEvent.clipboardData` 读取数据（浏览器允许，无需权限）：

- 在 `DecisionTableEditor` 上挂载 `onPaste` handler（或 window paste 监听，仅当有选区时生效）
- Ctrl/Cmd+V 触发浏览器原生 paste 事件，自动进入 handler
- 工具栏"粘贴"按钮：改为聚焦一个隐藏 textarea 并提示用户按 Ctrl+V，或直接尝试 `navigator.clipboard.readText()` 并 catch 失败后回退到提示

### 2. 复制

- 优先使用 `navigator.clipboard.writeText()`
- 失败时降级到 `document.execCommand('copy')`（临时 textarea + select + execCommand）

### 3. 从 Excel 导入

同粘贴：改为通过 `paste` 事件读取，或使用一个 modal 让用户在 textarea 中粘贴后确认导入。

### 4. 错误提示

所有 clipboard 操作失败时通过 `toast` 明确提示原因，而不是仅在 console 报错。

## 涉及文件

| 文件 | 修改 |
|---|---|
| `src/components/decision-table/useClipboard.ts` | 拆分：`pasteFromClipboard` 改为接收字符串参数；新增 `copyText` 带 execCommand 回退 |
| `src/components/decision-table/DecisionTableEditor.tsx` | 增加 `onPaste` 事件处理；工具栏"粘贴"/"从 Excel 导入"按钮改为提示用户使用 Ctrl+V，或弹出简单输入框 |

## 技术细节

`paste` 事件读取方式：
```ts
const handlePaste = (e: ClipboardEvent) => {
  if (selectedCells.size === 0) return;
  const text = e.clipboardData?.getData('text/plain');
  if (text) {
    e.preventDefault();
    pasteText(text);
  }
};
```

复制回退：
```ts
try { await navigator.clipboard.writeText(text); }
catch {
  const ta = document.createElement('textarea');
  ta.value = text; document.body.appendChild(ta);
  ta.select(); document.execCommand('copy');
  document.body.removeChild(ta);
}
```

不改动数据结构、UI 样式或其他组件逻辑。