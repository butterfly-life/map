/* 木生昆蟲館 3D 生態園區：展區資料
   ─────────────────────────────────────────────
   ★ 目前全部是「佔位內容」：名稱、說明請換成館方確認過的正式資料，不要自行編寫。
   欄位：
     id     英文代號（不重複，用在網址 #zone-id）
     name   展區名稱
     en     英文名稱
     desc   介紹文字
     pos    在地圖上的位置 [x, z]，地面範圍約 -40 ~ 40（0, 0 是中心）
     color  標記顏色
     group  分類（展區清單的分類篩選用；待補）
     img    展區照片（放在 map/assets/images/，沒有就留空字串）
   之後若有 3D 模型（.glb），在 park.js 的 MODEL 設定路徑即可，這裡的位置不用改。 */
window.PARK_ZONES = [
  { id: 'zone-a', name: '展區 A（待命名）', en: 'ZONE A', desc: '待補：展區介紹。', pos: [-18, -12], color: '#0F7652', group: '待分類', img: '' },
  { id: 'zone-b', name: '展區 B（待命名）', en: 'ZONE B', desc: '待補：展區介紹。', pos: [16, -16], color: '#72B47E', group: '待分類', img: '' },
  { id: 'zone-c', name: '展區 C（待命名）', en: 'ZONE C', desc: '待補：展區介紹。', pos: [22, 10], color: '#E8C68C', group: '待分類', img: '' },
  { id: 'zone-d', name: '展區 D（待命名）', en: 'ZONE D', desc: '待補：展區介紹。', pos: [-6, 20], color: '#D9772F', group: '待分類', img: '' },
  { id: 'zone-e', name: '展區 E（待命名）', en: 'ZONE E', desc: '待補：展區介紹。', pos: [-26, 8], color: '#5E8C5A', group: '待分類', img: '' }
];
