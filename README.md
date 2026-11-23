# 生態園區 APP（蝶影浮生 · 地圖）

獨立的網站專案。母網站「蝶影浮生」第 06 區「地圖」點下去會開啟這裡；這裡左上角的 LOGO／頁尾連結回到母網站。

## 資料夾

```
butterfly-map/
├─ index.html        頁面：頂部列／滿版 3D 地圖／展區清單／展區面板
├─ css/map.css       樣式（配色沿用蝶影浮生）
├─ js/zones.js       展區資料：名稱、說明、位置、顏色、分類、照片 ← 正式內容填這裡
├─ js/park.js        3D 場景與互動（three.js r128，從 CDN 載入）
└─ assets/
   ├─ logo.png       蝶影浮生 LOGO
   ├─ models/        3D 模型（.glb）
   ├─ textures/      貼圖
   └─ images/        展區照片
```

## 版面架構

1. 頂部列：LOGO（回母網站）、重設視角、展區清單
2. 滿版 3D 地圖：左上大標題＋「開始導覽／展區清單」；右上探索進度；下方工具列（回到全景／導覽／展區清單）
3. 地圖上的編號標記：點了鏡頭飛過去、打開展區面板；標記互相不重疊
4. 導覽：一站一站自動前進（進度條、上一站／暫停／下一站／結束，拖曳地圖會暫停，Esc 結束）
5. 展區清單：卡片＋搜尋＋分類篩選
6. 展區面板：電腦版在右上、手機版是底部抽屜
7. 網址加 `#zone-a` 可以直接打開某一區

## 待補內容（請用正式確認過的資料，不要自行編寫）

- `js/zones.js`：各展區的正式名稱、英文名、介紹、分類、照片、在園區裡的位置（目前是「展區 A～E（待命名）」佔位）
- 3D 模型：放進 `assets/models/`，在 `js/park.js` 填 `MODEL = 'assets/models/檔名.glb'`，
  並在 `index.html` 的 OrbitControls 下面加：
  `<script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js"></script>`

## 和母網站的連結（上傳後要改）

目前兩邊都用「桌面上的相對路徑」互連，在自己電腦上直接打開就能互通：

- 這裡 → 母網站：`index.html` 裡的 `../site/index-original.html#map`（共 2 處）
- 母網站 → 這裡：`site/index-original.html` 地圖區塊的 `../butterfly-map/index.html`

兩個專案各自上傳成 GitHub Pages 之後，把上面兩個連結換成正式網址即可。
