# DeepSleep Tube 技术实现文档

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      Chrome Extension                        │
├──────────────┬──────────────────┬───────────────────────────┤
│   Popup UI   │  Background SW   │     Content Script        │
│  (设置界面)   │   (后台服务)      │    (音频处理引擎)          │
└──────────────┴──────────────────┴───────────────────────────┘
                                            │
                                            ▼
                              ┌─────────────────────────┐
                              │    Web Audio API 处理链   │
                              └─────────────────────────┘
```

---

## 核心音频处理链

### 信号流图

```
YouTube <video> 元素
        │
        ▼
┌───────────────────────────┐
│ MediaElementAudioSourceNode│  ← 捕获视频音频流
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│   DynamicsCompressorNode   │  ← 动态范围压缩 (防惊吓)
│   • threshold: -50 ~ -10dB │
│   • ratio: 4:1 ~ 20:1      │
│   • attack: 1ms ~ 5ms      │
│   • release: 50ms ~ 250ms  │
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│     BiquadFilterNode       │  ← 低通滤波器 (温暖音色)
│   • type: lowpass          │
│   • frequency: 2000~8000Hz │
│   • Q: 0.7                 │
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│        GainNode            │  ← 淡出 / 广告静音控制
│   • gain: 0.0 ~ 1.0        │
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│     VolumeGainNode         │  ← 音量控制 (dB)
│   • gain: -30dB ~ +6dB     │
│   • 公式: 10^(dB/20)       │
└───────────────────────────┘
        │
        ▼
┌───────────────────────────┐
│   AudioDestinationNode     │  → 扬声器输出
└───────────────────────────┘

        ┌───────────────────┐
        │  Pink Noise 生成器  │  ← 舒适噪音 (可选)
        │  ScriptProcessor   │
        └───────────────────┘
```

---

## 功能模块详解

### 1. 动态范围压缩 (DRC) - 防惊吓系统

**问题**: 视频中突然出现的笑声、掌声、爆炸声会惊醒用户

**解决方案**: 使用 `DynamicsCompressorNode` 实时压缩音频峰值

```javascript
// 参数映射: 安全度 0-100% → 压缩器参数
const threshold = -50 + (safety * 0.4);  // -50dB → -10dB
const ratio = 4 + (safety * 0.16);       // 4:1 → 20:1
const attack = 0.001 + (0.004 * (100 - safety) / 100);  // 1ms → 5ms
```

| 安全度 | 阈值 | 压缩比 | 响应时间 |
|-------|------|--------|---------|
| 100%  | -10dB | 20:1  | 1ms (极快) |
| 70%   | -22dB | 15:1  | 2.2ms |
| 50%   | -30dB | 12:1  | 3ms |

**峰值检测机制**:
```javascript
monitorSpikes() {
  const reduction = this.compressorNode.reduction;  // 实时压缩量
  if (reduction < -6) {  // 压缩超过6dB = 检测到峰值
    this.spikesSuppressed++;
  }
}
```

---

### 2. 温暖滤波器 (Warmth Filter)

**问题**: 高频声音 (齿音、尖锐人声) 让人难以入睡

**解决方案**: 使用 `BiquadFilterNode` 低通滤波器衰减高频

```javascript
// 温暖度 0-100% → 截止频率
const frequency = 8000 - (warmth * 60);  // 8000Hz → 2000Hz
```

| 温暖度 | 截止频率 | 效果 |
|-------|---------|------|
| 0%    | 8000Hz  | 原始音质 |
| 60%   | 4400Hz  | 柔和人声 |
| 100%  | 2000Hz  | 极度温暖/闷声 |

---

### 3. 变速不变调 (Pitch-Constant Speed)

**实现**: 利用浏览器原生 `playbackRate` 属性

```javascript
this.videoElement.playbackRate = settings.speed / 100;  // 0.7 ~ 1.0
```

浏览器自动处理音高补偿,无需额外DSP处理。

---

### 4. 粉红噪音生成器

**问题**: 视频中的静默间隙会产生"绝对寂静焦虑"

**解决方案**: 使用 Voss-McCartney 算法生成粉红噪音

```javascript
// 粉红噪音算法核心
scriptProcessor.onaudioprocess = (e) => {
  const output = e.outputBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    // ... 更多滤波器级联
    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.05;
  }
};
```

粉红噪音特点: 低频能量更高,听感更自然舒适。

---

### 5. 音量控制器 (Volume Control)

**问题**: 不同设备/耳机的输出音量差异大

**解决方案**: 使用 `GainNode` 实现精确的 dB 音量控制

```javascript
// dB 转线性增益公式
const linearGain = Math.pow(10, volumeDb / 20);
this.volumeGainNode.gain.setValueAtTime(linearGain, currentTime);
```

| dB值 | 线性增益 | 效果 |
|-----|---------|------|
| +6dB | 2.0 | 音量加倍 |
| 0dB | 1.0 | 原始音量 |
| -6dB | 0.5 | 音量减半 |
| -20dB | 0.1 | 非常安静 |
| -30dB | 0.032 | 极低音量 |

**dB 刻度优势**: 符合人耳对响度的对数感知特性,调节更自然。

---

### 6. 智能淡出系统

**问题**: 定时器结束时突然停止会惊醒用户

**解决方案**: 在最后2分钟线性降低音量

```javascript
startFadeOut(duration) {
  const fadeSteps = 60;
  const stepDuration = duration / fadeSteps;
  
  this.fadeInterval = setInterval(() => {
    const progress = step / fadeSteps;
    const newGain = startGain * (1 - progress);  // 线性衰减
    this.gainNode.gain.setValueAtTime(newGain, currentTime);
  }, stepDuration);
}
```

淡出曲线:
```
音量 │████████████████████▓▓▓▓▓▓▓▓░░░░░░░░
     └────────────────────────────────────→ 时间
     ^                    ^               ^
   开始                最后2分钟        结束
```

---

### 7. 广告检测与静音

**实现**: 监听 YouTube DOM 的广告状态类名

```javascript
observeAds() {
  const isAdPlaying = 
    document.querySelector('.ad-showing') !== null ||
    document.querySelector('.ytp-ad-player-overlay') !== null;
  
  if (isAdPlaying && this.settings.adMute) {
    this.gainNode.gain.setTargetAtTime(0.1, currentTime, 0.1);  // 降至10%
  }
}
```

---

## 数据流与通信

```
┌─────────┐    chrome.storage.local    ┌─────────────┐
│  Popup  │ ◄─────────────────────────► │   设置存储   │
└────┬────┘                             └──────┬──────┘
     │                                         │
     │ chrome.tabs.sendMessage                 │ chrome.storage.local.get
     ▼                                         ▼
┌─────────────────────────────────────────────────────┐
│                   Content Script                     │
│                  (音频处理引擎)                       │
└─────────────────────────────────────────────────────┘
```

### 消息类型

| 类型 | 方向 | 用途 |
|-----|------|------|
| `SETTINGS_UPDATE` | Popup → Content | 实时更新设置 |
| `GET_STATS` | Popup → Content | 请求统计数据 |

---

## 性能优化

### 延迟控制
- Web Audio API 原生延迟: ~5-10ms
- 总处理延迟: <20ms (满足唇音同步要求)

### CPU 优化
- 使用原生 AudioNode,硬件加速处理
- 避免 ScriptProcessorNode (仅用于粉红噪音)
- requestAnimationFrame 节流峰值监测

### 内存管理
```javascript
detachAudioProcessing() {
  this.sourceNode.disconnect();
  this.pinkNoiseNode?.stop();
  this.isProcessing = false;
}
```

---

## 文件结构

```
deepsleep-chrome/
├── manifest.json        # Manifest V3 配置
├── background/
│   └── background.js    # Service Worker (设置初始化/徽章更新)
├── content/
│   ├── content.js       # 核心音频处理引擎 (DeepSleepAudio 类)
│   └── content.css      # 月亮图标样式
├── popup/
│   ├── popup.html       # OLED黑色主题界面
│   ├── popup.css        # 深色UI样式
│   └── popup.js         # 设置控制逻辑
└── icons/               # 扩展图标
```

---

## 浏览器兼容性

| 特性 | Chrome | Edge | Firefox |
|-----|--------|------|---------|
| Web Audio API | ✅ | ✅ | ✅ |
| Manifest V3 | ✅ | ✅ | ⚠️ 部分 |
| MediaElementSource | ✅ | ✅ | ✅ |

---

## 未来优化方向

1. **AI 语音检测** - 区分人声与背景音乐,针对性处理
2. **LUFS 响度标准化** - 跨视频一致音量
3. **频谱可视化** - 实时显示音频处理效果
4. **自定义 EQ 曲线** - 高级用户自定义频率响应
