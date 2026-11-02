import * as THREE from 'three';

export interface TileMeshOptions {
  type: string;
  name: string;
  groupColor?: string;
  subText?: string;
  isBranch?: boolean;
}

export type PropertyBuildingType = 'residential' | 'commercial' | 'special';
export type BuildingLevel = 1 | 2 | 3;

/**
 * 将来の複数マップ拡張に対応するマップテーマ設定インターフェース
 */
export interface MapThemeConfig {
  id: string;
  name: string;
  description: string;
  skyColors: { top: string; bottom: string; fog: number };
  waterColor: number;
  islandColors: { grass: number; stone: number; base: number };
}

export const MAP_THEMES: Record<string, MapThemeConfig> = {
  toytopia_city: {
    id: 'toytopia_city',
    name: 'トイ・トピア (Toytopia City)',
    description: '青空に浮かぶポップなトイブロック都市。大噴水と時計塔が輝くリッチなアイランド。',
    skyColors: { top: '#38bdf8', bottom: '#e0f2fe', fog: 0xdcf0ff },
    waterColor: 0x38bdf8,
    islandColors: { grass: 0x84cc16, stone: 0xf1f5f9, base: 0x334155 },
  },
  magic_sky_islands: {
    id: 'magic_sky_islands',
    name: 'マジック・スカイ・アイランド (Magic Sky)',
    description: '神秘的な夕暮れと魔法のクリスタル、巨木が息づく天空のファンタジー浮遊島。',
    skyColors: { top: '#8b5cf6', bottom: '#fed7aa', fog: 0xf3e8ff },
    waterColor: 0xa855f7,
    islandColors: { grass: 0x10b981, stone: 0xddd6fe, base: 0x4c1d95 },
  },
  cyber_neon_metro: {
    id: 'cyber_neon_metro',
    name: 'サイバー・ネオン・メトロ (Cyber Metro)',
    description: '紫とネオンブルーが交錯する夜景とホログラムタワーの近未来サイバー都市。',
    skyColors: { top: '#0f172a', bottom: '#1e1b4b', fog: 0x0f172a },
    waterColor: 0x06b6d4,
    islandColors: { grass: 0x1e293b, stone: 0x475569, base: 0x020617 },
  },
  tropical_paradise: {
    id: 'tropical_paradise',
    name: 'トロピカル・パラダイス (Tropical Paradise)',
    description: 'エメラルドグリーンの海と白い砂浜、ヤシの木とリゾートホテルが並ぶ常夏の島。',
    skyColors: { top: '#0284c7', bottom: '#bae6fd', fog: 0xecfeff },
    waterColor: 0x06b6d4,
    islandColors: { grass: 0xa3e635, stone: 0xfef08a, base: 0x0f766e },
  },
};

export interface ImageUrls {
  cityPreviewUrl: string;
  characterAvatarUrls: Record<string, string>;
  propertyIllustrationUrls: Record<string, string>;
}

export const propertyIllustrationUrls: Record<string, string> = {
  G_GREEN: '/assets/properties/prop_green.png',
  G_SUN: '/assets/properties/prop_sun.png',
  G_AQUA: '/assets/properties/prop_aqua.png',
  G_METRO: '/assets/properties/prop_metro.png',
  G_ROYAL: '/assets/properties/prop_royal.png',
  G_GOLD: '/assets/properties/prop_gold.png',
  G_SPECIAL: '/assets/properties/prop_special.png',
};

export interface AssetTextures {
  cityPreviewUrl: string;
  characterAvatarUrls: Record<string, string>;
  propertyIllustrationUrls: Record<string, string>;
  grassTexture: THREE.Texture;
  diceFaceMaterials: THREE.MeshStandardMaterial[];
  diceFaceTextures: THREE.MeshStandardMaterial[];
}

export interface AssetManifest {
  imageUrls: ImageUrls;
  textures: AssetTextures;
  cityPreviewUrl: string;
  characterAvatarUrls: Record<string, string>;
  propertyIllustrationUrls: Record<string, string>;
  grassTexture: THREE.Texture;
  diceFaceTextures: THREE.MeshStandardMaterial[];
  createPlayerMesh: (charId: string, colorHex: string, skinId?: string) => THREE.Group;
  createTileMesh: (options: TileMeshOptions) => THREE.Group;
  createBuildingMesh: (
    propertyType: PropertyBuildingType,
    level: BuildingLevel,
    ownerColorHex: string
  ) => THREE.Group;
  createDiceMesh: (size?: number) => THREE.Mesh;
  createCityCenterDiorama: (grassTex?: THREE.Texture) => THREE.Group;
  createOuterTownBuildings: () => THREE.Group;
  createSatelliteIslands: () => THREE.Group;
}

/**
 * 立体ボードゲームコマ（トークン）の高精細SVGイラスト生成（テーマカラー＆特別スキン完全連動）
 */
export function renderTokenShowcaseSvg(
  charId: string,
  colorHex = '#3b82f6',
  skinId = 'standard',
  sizePx = 220
): string {
  const uid = `${charId}_${skinId}_${colorHex.replace('#', '')}`;

  // スキン別のメイングラデーション定義
  let mainStop1 = '#ffffff';
  let mainStop2 = colorHex;
  let mainStop3 = '#0f172a';
  let rimStroke = '#ffffff';
  let auraColor = colorHex;
  let badgeOverlay = '';

  if (skinId === 'metallic_gold') {
    mainStop1 = '#fef9c3';
    mainStop2 = '#f59e0b';
    mainStop3 = '#92400e';
    rimStroke = '#fef08a';
    auraColor = '#fbbf24';
    badgeOverlay = `
      <g opacity="0.9">
        <polygon points="44,42 48,52 58,54 50,60 52,70 44,64 36,70 38,60 30,54 40,52" fill="#fef08a" />
        <polygon points="180,58 183,65 190,66 185,71 186,78 180,74 174,78 175,71 170,66 177,65" fill="#fde047" />
      </g>
    `;
  } else if (skinId === 'crystal_prism') {
    mainStop1 = '#ffffff';
    mainStop2 = '#67e8f9';
    mainStop3 = colorHex;
    rimStroke = '#e0f2fe';
    auraColor = '#38bdf8';
    badgeOverlay = `
      <g opacity="0.85">
        <polygon points="175,40 182,54 175,68 168,54" fill="#e0f2fe" />
        <polygon points="46,72 52,82 46,92 40,82" fill="#bae6fd" />
      </g>
    `;
  } else if (skinId === 'neon_cyber') {
    mainStop1 = '#22d3ee';
    mainStop2 = '#1e1b4b';
    mainStop3 = '#090d16';
    rimStroke = '#22d3ee';
    auraColor = '#a855f7';
    badgeOverlay = `
      <circle cx="110" cy="112" r="78" fill="none" stroke="#22d3ee" stroke-width="2.5" stroke-dasharray="10 6" opacity="0.75" />
    `;
  }

  let tokenSilhouettes = '';

  switch (charId) {
    case 'char_2': // GTスポーツカー
      tokenSilhouettes = `
        <!-- 立体レーシングボディ -->
        <path d="M 38 140 L 48 112 L 78 92 L 136 92 L 168 114 L 184 126 L 184 144 Z" fill="url(#bodyGrad_${uid})" stroke="${rimStroke}" stroke-width="3.5" stroke-linejoin="round" />
        <!-- リアGTウイング -->
        <path d="M 34 96 L 56 96 L 52 114 L 40 114 Z" fill="${colorHex}" stroke="${rimStroke}" stroke-width="2.5" />
        <!-- キャノピー（フロント＆サイドガラス） -->
        <path d="M 80 96 L 132 96 L 154 114 L 68 114 Z" fill="#0f172a" stroke="#bae6fd" stroke-width="2.5" />
        <!-- レーシングストライプ＆ヘッドライト -->
        <rect x="162" y="120" width="16" height="8" rx="4" fill="#fef08a" />
        <!-- 前後ホイール -->
        <circle cx="70" cy="142" r="18" fill="#1e293b" stroke="#cbd5e1" stroke-width="4" />
        <circle cx="70" cy="142" r="8" fill="${colorHex}" />
        <circle cx="152" cy="142" r="18" fill="#1e293b" stroke="#cbd5e1" stroke-width="4" />
        <circle cx="152" cy="142" r="8" fill="${colorHex}" />
      `;
      break;

    case 'char_3': // クラウン・ナイト
      tokenSilhouettes = `
        <!-- ナイトの台座ステップ -->
        <rect x="64" y="144" width="92" height="16" rx="8" fill="url(#bodyGrad_${uid})" stroke="${rimStroke}" stroke-width="3" />
        <!-- チェスナイトの彫刻ボディ -->
        <path d="M 76 144 C 72 112, 78 82, 92 60 L 84 44 L 104 50 C 122 46, 142 58, 148 76 C 142 84, 130 88, 118 86 L 132 76 C 122 96, 136 118, 140 144 Z" fill="url(#bodyGrad_${uid})" stroke="${rimStroke}" stroke-width="3.5" stroke-linejoin="round" />
        <!-- 黄金のミニクラウン -->
        <polygon points="88,46 94,28 104,38 114,26 120,46" fill="#fbbf24" stroke="#ffffff" stroke-width="2" />
        <!-- 瞳 -->
        <circle cx="122" cy="64" r="4.5" fill="#fef08a" />
      `;
      break;

    case 'char_4': // スカイ・ジェット
      tokenSilhouettes = `
        <!-- フライトスタンド支柱 -->
        <polygon points="104,118 116,118 124,154 96,154" fill="#cbd5e1" stroke="#64748b" stroke-width="2" />
        <!-- デルタメインウイング -->
        <polygon points="110,58 182,118 110,108 38,118" fill="${colorHex}" stroke="${rimStroke}" stroke-width="3" stroke-linejoin="round" />
        <!-- ジェット機体（フュゼラージュ） -->
        <path d="M 110 34 C 122 56, 124 94, 120 132 L 100 132 C 96 94, 98 56, 110 34 Z" fill="url(#bodyGrad_${uid})" stroke="${rimStroke}" stroke-width="3.5" />
        <!-- コックピットキャノピー -->
        <ellipse cx="110" cy="68" rx="7" ry="16" fill="#0284c7" stroke="#e0f2fe" stroke-width="2" />
        <!-- 垂直尾翼 -->
        <polygon points="110,100 128,136 92,136" fill="#f59e0b" stroke="${rimStroke}" stroke-width="2" />
      `;
      break;

    case 'char_5': // ロイヤル・クルーザー
      tokenSilhouettes = `
        <!-- 波しぶきペデスタル -->
        <path d="M 44 148 Q 78 136, 110 148 T 176 148 L 166 158 L 54 158 Z" fill="#38bdf8" opacity="0.85" />
        <!-- クルーザー船体ハル -->
        <path d="M 36 120 L 186 112 L 164 148 L 52 148 Z" fill="url(#bodyGrad_${uid})" stroke="${rimStroke}" stroke-width="3.5" stroke-linejoin="round" />
        <!-- アッパーデッキ＆ブリッジ -->
        <path d="M 62 116 L 78 90 L 146 90 L 160 114 Z" fill="#ffffff" stroke="${colorHex}" stroke-width="3" />
        <rect x="82" y="96" width="52" height="10" rx="5" fill="#0284c7" />
        <!-- レーダーマスト＆王冠エンブレム -->
        <polygon points="94,90 106,66 122,66 114,90" fill="${colorHex}" stroke="${rimStroke}" stroke-width="2" />
        <circle cx="152" cy="128" r="7" fill="#fbbf24" stroke="#ffffff" stroke-width="2" />
      `;
      break;

    case 'char_6': // エンペラー・クラウン
      tokenSilhouettes = `
        <!-- ロイヤルベルベットクッション台座 -->
        <rect x="56" y="134" width="108" height="22" rx="11" fill="#991b1b" stroke="#fbbf24" stroke-width="3.5" />
        <!-- 皇帝の立体クラウン本体 -->
        <polygon points="54,134 42,68 80,96 110,48 140,96 178,68 166,134" fill="url(#bodyGrad_${uid})" stroke="#fef08a" stroke-width="4" stroke-linejoin="round" />
        <!-- クラウン頂点のオーブ＆クロス -->
        <circle cx="42" cy="64" r="6" fill="#fef08a" />
        <circle cx="110" cy="42" r="8" fill="#fef08a" />
        <circle cx="178" cy="64" r="6" fill="#fef08a" />
        <!-- 宝石ジュエル装飾 -->
        <polygon points="110,92 119,106 110,120 101,106" fill="#ef4444" stroke="#ffffff" stroke-width="2" />
        <circle cx="78" cy="112" r="6" fill="#38bdf8" stroke="#ffffff" stroke-width="1.8" />
        <circle cx="142" cy="112" r="6" fill="#38bdf8" stroke="#ffffff" stroke-width="1.8" />
      `;
      break;

    case 'char_1': // クラシック・ポーン (デフォルト)
    default:
      tokenSilhouettes = `
        <!-- ポーン下部ステップ -->
        <rect x="62" y="142" width="96" height="16" rx="8" fill="url(#bodyGrad_${uid})" stroke="${rimStroke}" stroke-width="3" />
        <!-- テーパードコラム胴体 -->
        <path d="M 74 142 C 78 112, 88 94, 92 78 L 128 78 C 132 94, 142 112, 146 142 Z" fill="url(#bodyGrad_${uid})" stroke="${rimStroke}" stroke-width="3.5" />
        <!-- カラーリング襟 -->
        <ellipse cx="110" cy="78" rx="26" ry="8" fill="${rimStroke}" stroke="${colorHex}" stroke-width="2.5" />
        <!-- 頂点の球体ヘッド -->
        <circle cx="110" cy="52" r="24" fill="url(#bodyGrad_${uid})" stroke="${rimStroke}" stroke-width="3.5" />
        <!-- 光沢ハイライト -->
        <ellipse cx="101" cy="43" rx="8" ry="5" transform="rotate(-25 101 43)" fill="rgba(255,255,255,0.68)" />
      `;
      break;
  }

  return `
    <svg width="${sizePx}" height="${sizePx}" viewBox="0 0 220 200" fill="none" xmlns="http://www.w3.org/2000/svg" class="token-showcase-svg">
      <defs>
        <radialGradient id="auraGrad_${uid}" cx="50%" cy="55%" r="48%">
          <stop offset="0%" stop-color="${auraColor}" stop-opacity="0.48" />
          <stop offset="100%" stop-color="${auraColor}" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="bodyGrad_${uid}" x1="55" y1="30" x2="165" y2="160" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="${mainStop1}" />
          <stop offset="48%" stop-color="${mainStop2}" />
          <stop offset="100%" stop-color="${mainStop3}" />
        </linearGradient>
        <linearGradient id="pedestalGrad_${uid}" x1="40" y1="150" x2="180" y2="185" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#f8fafc" />
          <stop offset="100%" stop-color="#cbd5e1" />
        </linearGradient>
      </defs>

      <!-- 背面発光オーラ -->
      <circle cx="110" cy="108" r="86" fill="url(#auraGrad_${uid})" />

      <!-- 3D円盤ペデスタル台座 -->
      <ellipse cx="110" cy="172" rx="68" ry="16" fill="rgba(15, 23, 42, 0.28)" />
      <ellipse cx="110" cy="164" rx="64" ry="14" fill="url(#pedestalGrad_${uid})" stroke="${colorHex}" stroke-width="4" />
      <ellipse cx="110" cy="160" rx="54" ry="10" fill="#ffffff" stroke="${rimStroke}" stroke-width="2" />

      <!-- トークン本体シルエット -->
      ${tokenSilhouettes}

      <!-- スキンエフェクトオーバーレイ -->
      ${badgeOverlay}
    </svg>
  `;
}

function svgToDataUrl(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString.trim())}`;
}

export const imageUrls: ImageUrls = {
  cityPreviewUrl: '/assets/textures/city_preview.png',
  characterAvatarUrls: {
    char_1: svgToDataUrl(renderTokenShowcaseSvg('char_1', '#3b82f6', 'standard', 120)),
    char_2: svgToDataUrl(renderTokenShowcaseSvg('char_2', '#ef4444', 'standard', 120)),
    char_3: svgToDataUrl(renderTokenShowcaseSvg('char_3', '#10b981', 'standard', 120)),
    char_4: svgToDataUrl(renderTokenShowcaseSvg('char_4', '#f59e0b', 'standard', 120)),
    char_5: svgToDataUrl(renderTokenShowcaseSvg('char_5', '#0284c7', 'metallic_gold', 120)),
    char_6: svgToDataUrl(renderTokenShowcaseSvg('char_6', '#a855f7', 'metallic_gold', 120)),
  },
  propertyIllustrationUrls,
};

export const cityPreviewUrl = imageUrls.cityPreviewUrl;
export const characterAvatarUrls = imageUrls.characterAvatarUrls;

/**
 * 芝生のフォールバック用プロシージャルCanvasテクスチャを生成
 */
export function createProceduralGrassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#5ec962');
    grad.addColorStop(0.5, '#4db853');
    grad.addColorStop(1, '#43a849');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // 芝生の細かなブレード模様
    for (let i = 0; i < 3200; i++) {
      const x = (i * 73) % 512;
      const y = (i * 137) % 512;
      const h = 4 + (i % 6);
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(130, 230, 110, 0.35)' : 'rgba(45, 135, 55, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + ((i % 5) - 2), y - h);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * サイコロ1〜6の目を描画した高解像度Canvasマテリアル配列を生成
 * BoxGeometryの面順序: +X(1), -X(6), +Y(2), -Y(5), +Z(3), -Z(4) または 1〜6インデックス
 */
export function createDiceFaceMaterials(): THREE.MeshStandardMaterial[] {
  const drawFace = (faceValue: number): THREE.CanvasTexture => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // ベース背景（清潔感のあるアイボリーホワイト）
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // 外周の立体感ある角丸フレーム
      const pad = 14;
      const radius = 36;
      ctx.strokeStyle = '#dce4ec';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.roundRect(pad, pad, size - pad * 2, size - pad * 2, radius);
      ctx.stroke();

      // 内側のほんのりグラデーション
      const innerGrad = ctx.createRadialGradient(
        size / 2,
        size / 2,
        10,
        size / 2,
        size / 2,
        size / 2
      );
      innerGrad.addColorStop(0, '#ffffff');
      innerGrad.addColorStop(1, '#f3f7fa');
      ctx.fillStyle = innerGrad;
      ctx.fill();

      // ピップ座標定義 (正規化0〜1)
      const pipCoords: Record<number, Array<[number, number]>> = {
        1: [[0.5, 0.5]],
        2: [
          [0.28, 0.28],
          [0.72, 0.72],
        ],
        3: [
          [0.26, 0.26],
          [0.5, 0.5],
          [0.74, 0.74],
        ],
        4: [
          [0.28, 0.28],
          [0.72, 0.28],
          [0.28, 0.72],
          [0.72, 0.72],
        ],
        5: [
          [0.26, 0.26],
          [0.74, 0.26],
          [0.5, 0.5],
          [0.26, 0.74],
          [0.74, 0.74],
        ],
        6: [
          [0.28, 0.24],
          [0.72, 0.24],
          [0.28, 0.5],
          [0.72, 0.5],
          [0.28, 0.76],
          [0.72, 0.76],
        ],
      };

      const coords = pipCoords[faceValue] ?? pipCoords[1];
      for (const [nx, ny] of coords) {
        const cx = nx * size;
        const cy = ny * size;
        const r = faceValue === 1 ? 42 : 22;

        // ピップのドロップシャドウ（彫り込み感）
        ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
        ctx.beginPath();
        ctx.arc(cx + 2, cy + 3, r, 0, Math.PI * 2);
        ctx.fill();

        // ピップ本体（1の目は鮮やかなレッド、2〜6はダークネイビー）
        const pipGrad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.1, cx, cy, r);
        if (faceValue === 1) {
          pipGrad.addColorStop(0, '#ff4d4d');
          pipGrad.addColorStop(1, '#d91b1b');
        } else {
          pipGrad.addColorStop(0, '#2c3e50');
          pipGrad.addColorStop(1, '#141e28');
        }
        ctx.fillStyle = pipGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    return texture;
  };

  // 1〜6の面マテリアル配列
  return [1, 2, 3, 4, 5, 6].map(
    (num) =>
      new THREE.MeshStandardMaterial({
        map: drawFace(num),
        roughness: 0.22,
        metalness: 0.05,
      })
  );
}

export const diceFaceTextures: THREE.MeshStandardMaterial[] = createDiceFaceMaterials();
export const grassTexture: THREE.Texture = createProceduralGrassTexture();

export const textures: AssetTextures = {
  cityPreviewUrl: imageUrls.cityPreviewUrl,
  characterAvatarUrls: imageUrls.characterAvatarUrls,
  propertyIllustrationUrls,
  grassTexture,
  diceFaceMaterials: diceFaceTextures,
  diceFaceTextures,
};

/**
 * ビル壁面用の窓明かりプロシージャルテクスチャを生成
 */
function createBuildingWindowTexture(
  baseColorHex: string,
  windowColorHex = '#dff6ff',
  litRatio = 0.7,
  cols = 4,
  rows = 8
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseColorHex;
    ctx.fillRect(0, 0, 256, 512);

    const padX = 20;
    const padY = 24;
    const cellW = (256 - padX * 2) / cols;
    const cellH = (512 - padY * 2) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hash = ((r * 31 + c * 17) % 100) / 100;
        const isLit = hash < litRatio;
        ctx.fillStyle = isLit ? windowColorHex : '#5a738e';
        const wx = padX + c * cellW + 5;
        const wy = padY + r * cellH + 6;
        const ww = Math.max(8, cellW - 10);
        const wh = Math.max(10, cellH - 12);
        ctx.fillRect(wx, wy, ww, wh);

        // 窓のハイライト反射
        if (isLit) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.fillRect(wx + 2, wy + 2, ww * 0.35, wh - 4);
        }
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * 全子メッシュにシャドウ設定を適用するヘルパー
 */
function applyShadows(group: THREE.Object3D, cast = true, receive = true): void {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.castShadow = cast;
      obj.receiveShadow = receive;
    }
  });
}

/**
 * 1. プレイヤーの3D王道ボードゲーム立体コマ（トークン）生成ファクトリ
 * char_1: クラシック・ポーン (Classic Pawn)
 * char_2: GTスポーツカー (GT Sports Car)
 * char_3: クラウン・ナイト (Crown Knight)
 * char_4: スカイ・ジェット (Sky Jet)
 * char_5: ロイヤル・クルーザー (Royal Cruiser)
 * char_6: エンペラー・クラウン (Emperor Crown)
 */
export function createPlayerMesh(
  charId: string,
  colorHex: string,
  skinId = 'standard'
): THREE.Group {
  const group = new THREE.Group();
  group.name = `player_${charId}_${skinId}`;

  const themeColor = new THREE.Color(colorHex || '#2998ff');

  // スキン別のメインマテリアル生成
  let mainMat: THREE.MeshStandardMaterial;
  let accentMat: THREE.MeshStandardMaterial;

  if (skinId === 'metallic_gold') {
    mainMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: new THREE.Color(0x78350f),
      emissiveIntensity: 0.25,
      roughness: 0.14,
      metalness: 0.92,
    });
    accentMat = new THREE.MeshStandardMaterial({
      color: themeColor,
      roughness: 0.22,
      metalness: 0.65,
    });
  } else if (skinId === 'crystal_prism') {
    mainMat = new THREE.MeshStandardMaterial({
      color: themeColor.clone().lerp(new THREE.Color('#e0f2fe'), 0.42),
      emissive: themeColor,
      emissiveIntensity: 0.32,
      roughness: 0.08,
      metalness: 0.2,
      transparent: true,
      opacity: 0.88,
    });
    accentMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.35,
      roughness: 0.1,
      metalness: 0.4,
    });
  } else if (skinId === 'neon_cyber') {
    mainMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      emissive: themeColor,
      emissiveIntensity: 0.55,
      roughness: 0.2,
      metalness: 0.8,
    });
    accentMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.9,
      roughness: 0.15,
      metalness: 0.5,
    });
  } else {
    // standard (グロス・スタンダード)
    mainMat = new THREE.MeshStandardMaterial({
      color: themeColor,
      roughness: 0.2,
      metalness: 0.22,
    });
    accentMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.15,
    });
  }

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.22,
    metalness: 0.82,
  });
  const darkGlassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.12,
    metalness: 0.6,
  });
  const glowRingMat = new THREE.MeshStandardMaterial({
    color: skinId === 'metallic_gold' ? 0xfbbf24 : themeColor,
    emissive: skinId === 'neon_cyber' ? new THREE.Color(0x22d3ee) : themeColor,
    emissiveIntensity: skinId === 'neon_cyber' ? 1.0 : 0.68,
    roughness: 0.2,
    metalness: 0.3,
  });

  // --- 共通：足元の重厚なボードゲーム円盤台座＆発光リング ---
  const baseDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.54, 0.12, 28),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.15 })
  );
  baseDisc.position.y = 0.06;
  group.add(baseDisc);

  const innerStep = new THREE.Mesh(
    new THREE.CylinderGeometry(0.41, 0.45, 0.08, 28),
    accentMat
  );
  innerStep.position.y = 0.14;
  group.add(innerStep);

  const glowTorus = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.042, 12, 32),
    glowRingMat
  );
  glowTorus.rotation.x = Math.PI / 2;
  glowTorus.position.y = 0.11;
  group.add(glowTorus);

  // --- トークン種類別の3D造形 ---
  switch (charId) {
    case 'char_2': {
      // 🏎️ GTスポーツカー
      const carGroup = new THREE.Group();
      carGroup.position.y = 0.26;

      // ロアシャシー
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.18, 0.96), mainMat);
      chassis.position.y = 0.14;
      carGroup.add(chassis);

      // フロントノーズ（流線型スロープ）
      const nose = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.14, 0.36), mainMat);
      nose.position.set(0, 0.13, 0.38);
      nose.rotation.x = 0.22;
      carGroup.add(nose);

      // コックピットキャノピー
      const cabin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.26, 0.46, 16),
        darkGlassMat
      );
      cabin.rotation.x = Math.PI / 2;
      cabin.scale.set(1.0, 1.0, 0.68);
      cabin.position.set(0, 0.25, -0.02);
      carGroup.add(cabin);

      // センターレーシングストライプ
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.19, 0.94), accentMat);
      stripe.position.set(0, 0.145, 0.02);
      carGroup.add(stripe);

      // リアGTウイング
      const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.16), accentMat);
      wingBlade.position.set(0, 0.34, -0.42);
      const wingLeftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.08), mainMat);
      wingLeftPillar.position.set(-0.2, 0.26, -0.4);
      const wingRightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.08), mainMat);
      wingRightPillar.position.set(0.2, 0.26, -0.4);
      carGroup.add(wingBlade, wingLeftPillar, wingRightPillar);

      // 4輪タイヤ＆ゴールドホイールリム
      const tireGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.1, 16);
      tireGeo.rotateZ(Math.PI / 2);
      const wheelCoords: Array<[number, number, number]> = [
        [-0.29, 0.13, 0.28],
        [0.29, 0.13, 0.28],
        [-0.29, 0.13, -0.28],
        [0.29, 0.13, -0.28],
      ];
      for (const [wx, wy, wz] of wheelCoords) {
        const tire = new THREE.Mesh(tireGeo, darkGlassMat);
        tire.position.set(wx, wy, wz);
        carGroup.add(tire);
      }

      group.add(carGroup);
      break;
    }

    case 'char_3': {
      // 🐴 クラウン・ナイト（チェス騎士＋黄金の王冠）
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.36, 0.22, 20),
        mainMat
      );
      pedestal.position.y = 0.28;
      group.add(pedestal);

      // 騎士の首・胸元の立体アーチ
      const neck = new THREE.Mesh(
        new THREE.ConeGeometry(0.26, 0.72, 16),
        mainMat
      );
      neck.position.set(0, 0.68, -0.02);
      neck.rotation.x = 0.18;
      group.add(neck);

      // たてがみクレスト
      const mane = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.56, 0.18),
        accentMat
      );
      mane.position.set(0, 0.78, -0.14);
      mane.rotation.x = 0.15;
      group.add(mane);

      // ナイトの頭部＆マズル
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 18, 18), mainMat);
      head.position.set(0, 1.02, 0.04);
      const snout = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.16, 0.3, 14),
        mainMat
      );
      snout.rotation.x = Math.PI / 2 + 0.32;
      snout.position.set(0, 0.96, 0.22);
      group.add(head, snout);

      // 頂点のゴールドクラウン
      const crownRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.11, 0.14, 8),
        goldTrimMat
      );
      crownRing.position.set(0, 1.24, 0.02);
      group.add(crownRing);
      break;
    }

    case 'char_4': {
      // ✈️ スカイ・ジェット
      // フライトスタンド支柱
      const stand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.09, 0.52, 12),
        accentMat
      );
      stand.position.y = 0.42;
      stand.rotation.x = -0.15;
      group.add(stand);

      const jetGroup = new THREE.Group();
      jetGroup.position.set(0, 0.74, 0);
      jetGroup.rotation.x = -0.18; // 大空へ上昇する躍動アングル

      // 機体フュゼラージュ
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.14, 0.62, 12, 20),
        mainMat
      );
      body.rotation.x = Math.PI / 2;
      jetGroup.add(body);

      // コックピットガラス
      const canopy = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.085, 0.24, 10, 16),
        darkGlassMat
      );
      canopy.rotation.x = Math.PI / 2;
      canopy.position.set(0, 0.09, 0.14);
      jetGroup.add(canopy);

      // 主翼（デルタスイープウイング）
      const mainWing = new THREE.Mesh(
        new THREE.BoxGeometry(0.96, 0.04, 0.28),
        accentMat
      );
      mainWing.position.set(0, 0, -0.02);
      jetGroup.add(mainWing);

      // 垂直尾翼
      const tailFin = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.26, 0.22),
        goldTrimMat
      );
      tailFin.position.set(0, 0.16, -0.32);
      tailFin.rotation.x = -0.3;
      jetGroup.add(tailFin);

      group.add(jetGroup);
      break;
    }

    case 'char_5': {
      // 🛥️ ロイヤル・クルーザー（報酬トークン）
      const waveBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.4, 0.14, 20),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.3 })
      );
      waveBase.position.y = 0.24;
      group.add(waveBase);

      const yachtGroup = new THREE.Group();
      yachtGroup.position.y = 0.34;

      // 船体ハル
      const hull = new THREE.Mesh(
        new THREE.ConeGeometry(0.34, 0.96, 4),
        mainMat
      );
      hull.rotation.x = Math.PI / 2;
      hull.rotation.z = Math.PI / 4;
      hull.scale.set(0.95, 1.0, 0.48);
      hull.position.set(0, 0.16, 0.06);
      yachtGroup.add(hull);

      // ラグジュアリーアッパーデッキ
      const deck1 = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.52), accentMat);
      deck1.position.set(0, 0.3, -0.04);
      const bridgeWindow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.36), darkGlassMat);
      bridgeWindow.position.set(0, 0.4, -0.02);
      const radarArch = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.08), goldTrimMat);
      radarArch.position.set(0, 0.52, -0.14);
      radarArch.rotation.x = -0.3;

      yachtGroup.add(deck1, bridgeWindow, radarArch);
      group.add(yachtGroup);
      break;
    }

    case 'char_6': {
      // 👑 エンペラー・クラウン（最高位報酬トークン）
      // ロイヤルベルベットクッション台座
      const cushion = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.32, 0.22, 24),
        new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.55, metalness: 0.1 })
      );
      cushion.position.y = 0.28;
      group.add(cushion);

      // クラウンベースバンド
      const crownBase = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.29, 0.28, 24),
        skinId === 'standard' ? goldTrimMat : mainMat
      );
      crownBase.position.y = 0.52;
      group.add(crownBase);

      // 王冠の6本のスパイク＆真珠オーブ
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const r = 0.29;
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.34, 10),
          skinId === 'standard' ? goldTrimMat : mainMat
        );
        spike.position.set(Math.cos(angle) * r, 0.78, Math.sin(angle) * r);
        const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), accentMat);
        pearl.position.set(Math.cos(angle) * r, 0.96, Math.sin(angle) * r);
        group.add(spike, pearl);
      }

      // センターの皇帝宝珠＆クロストップ
      const centerDome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 18), mainMat);
      centerDome.position.y = 0.68;
      const topOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), goldTrimMat);
      topOrb.position.y = 1.06;
      group.add(centerDome, topOrb);
      break;
    }

    case 'char_1': // ♟️ クラシック・ポーン (デフォルト)
    default: {
      // ポーンの下部ボウル
      const lowerBulb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.36, 0.24, 24),
        mainMat
      );
      lowerBulb.position.y = 0.28;
      group.add(lowerBulb);

      // テーパードコラム（美しいくびれのある柱）
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.23, 0.52, 24),
        mainMat
      );
      column.position.y = 0.64;
      group.add(column);

      // 首元のカラーリング（襟）
      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(0.17, 0.04, 12, 24),
        accentMat
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.9;
      group.add(collar);

      // 頂点の光沢スフィア（ポーンヘッド）
      const topSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.23, 24, 24),
        mainMat
      );
      topSphere.position.y = 1.12;
      group.add(topSphere);
      break;
    }
  }

  applyShadows(group, true, true);
  return group;
}

/**
 * 2. ボードの1マスを表す立体タイル生成ファクトリ
 */
export function createTileMesh(options: TileMeshOptions): THREE.Group {
  const { type, name, groupColor, subText, isBranch } = options;
  const group = new THREE.Group();
  group.name = `tile_${name}`;

  // マス種別に応じたデフォルトテーマカラー
  const typeColorMap: Record<string, string> = {
    start: '#ffb800',
    property: groupColor || '#2ea8ff',
    residential: groupColor || '#34c759',
    commercial: groupColor || '#2ea8ff',
    special: groupColor || '#af52de',
    event: '#ff9500',
    career: '#007aff',
    family: '#ff5e97',
    bonus: '#ffcc00',
    shop: '#a855f7',
    tax: '#64748b',
    jail: '#334155',
    branch: '#06b6d4',
  };

  const accentHex = groupColor || typeColorMap[type.toLowerCase()] || '#38bdf8';
  const accentColor = new THREE.Color(accentHex);

  // --- 1. 立体トイブロック・ベースフレーム（二重成型・厚みと手触り感） ---
  const baseGeo = new THREE.BoxGeometry(2.24, 0.38, 2.24);
  const baseMat = new THREE.MeshStandardMaterial({
    color: isBranch ? 0xe0f2fe : 0xffffff,
    roughness: 0.3,
    metalness: 0.05,
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = 0.19;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // 中間アクセントカラー・ベベルリング
  const rimGeo = new THREE.BoxGeometry(2.18, 0.14, 2.18);
  const rimMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.25,
    metalness: 0.12,
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.y = 0.33;
  rimMesh.castShadow = true;
  group.add(rimMesh);

  // --- 2. 高精細Canvas2Dで描画したトイプレート（角丸ヘッダー・ピクトグラム・バッジ） ---
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // プレート背景（わずかにウォームな光沢ホワイト）
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.roundRect(12, 12, 488, 488, 36);
    ctx.fill();

    // 外枠ホワイト＆アクセント二重ボーダー
    ctx.lineWidth = 14;
    ctx.strokeStyle = accentHex;
    ctx.stroke();

    // 上部カラーヘッダー帯（角丸）
    ctx.fillStyle = accentHex;
    ctx.beginPath();
    ctx.roundRect(22, 22, 468, 136, [26, 26, 12, 12]);
    ctx.fill();

    // ヘッダー上面の光沢ハイライト
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.roundRect(30, 28, 452, 38, [18, 18, 6, 6]);
    ctx.fill();

    // マス種別バッジラベル＆ピクトグラム
    const iconMap: Record<string, { label: string; icon: string }> = {
      start: { label: 'START', icon: '★' },
      property: { label: 'ESTATE', icon: '◆' },
      residential: { label: 'RESIDENCE', icon: '⌂' },
      commercial: { label: 'BUSINESS', icon: '▲' },
      special: { label: 'LANDMARK', icon: '✦' },
      event: { label: 'EVENT', icon: '!' },
      career: { label: 'CAREER', icon: '💼' },
      family: { label: 'FAMILY', icon: '♥' },
      bonus: { label: 'BONUS', icon: '🪙' },
      shop: { label: 'SHOP', icon: '🛒' },
      tax: { label: 'TAX', icon: '%' },
      jail: { label: 'JAIL', icon: '🔒' },
      branch: { label: 'BRANCH', icon: '➔' },
    };
    const badge = iconMap[type.toLowerCase()] || { label: type.toUpperCase(), icon: '●' };

    // バッジアイコン描画
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px "Fredoka", "Arial Rounded MT Bold", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowOffsetY = 3;
    ctx.shadowBlur = 4;
    ctx.fillText(`${badge.icon} ${badge.label}`, 256, 90);
    ctx.shadowColor = 'transparent';

    // マス名（太字・視認性の高いトイタイポグラフィ）
    ctx.fillStyle = '#0f172a';
    ctx.font = '900 48px "Fredoka", "Hiragino Sans", "Segoe UI", sans-serif';
    const maxChars = 6;
    if (name.length > maxChars) {
      const line1 = name.slice(0, maxChars);
      const line2 = name.slice(maxChars, maxChars * 2);
      ctx.fillText(line1, 256, 230);
      ctx.fillText(line2, 256, 290);
    } else {
      ctx.fillText(name, 256, 255);
    }

    // サブテキスト（ピル型バッジ背景に太字で収める）
    if (subText) {
      ctx.fillStyle = accentHex;
      ctx.beginPath();
      ctx.roundRect(86, 380, 340, 84, 42);
      ctx.fill();

      // ピルバッジの内側シャドウと文字
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 44px "Fredoka", "Arial Rounded MT Bold", sans-serif';
      ctx.fillText(subText, 256, 424);
    }
  }

  const labelTex = new THREE.CanvasTexture(canvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  labelTex.needsUpdate = true;

  const topPlateGeo = new THREE.BoxGeometry(2.04, 0.06, 2.04);
  const sidePlateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
  const topLabelMat = new THREE.MeshStandardMaterial({
    map: labelTex,
    roughness: 0.2,
    metalness: 0.04,
  });

  const topPlate = new THREE.Mesh(topPlateGeo, [
    sidePlateMat,
    sidePlateMat,
    topLabelMat,
    sidePlateMat,
    sidePlateMat,
    sidePlateMat,
  ]);
  topPlate.position.y = 0.42;
  topPlate.castShadow = true;
  topPlate.receiveShadow = true;
  group.add(topPlate);

  // --- 3. マス種別ごとの立体3D装飾ギミック ---
  const lowerType = type.toLowerCase();
  if (lowerType === 'start') {
    // スタートマス：ゴールド＆ホワイトの立体ゲートアーチ
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffc400,
      metalness: 0.55,
      roughness: 0.25,
    });
    const pillarGeo = new THREE.CylinderGeometry(0.11, 0.13, 1.65, 16);
    const leftPillar = new THREE.Mesh(pillarGeo, goldMat);
    leftPillar.position.set(-0.88, 1.15, 0);
    const rightPillar = new THREE.Mesh(pillarGeo, goldMat);
    rightPillar.position.set(0.88, 1.15, 0);

    const archBeam = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.32, 0.28), goldMat);
    archBeam.position.set(0, 1.98, 0);

    const starCrown = new THREE.Mesh(new THREE.OctahedronGeometry(0.24), goldMat);
    starCrown.position.set(0, 2.32, 0);
    group.add(leftPillar, rightPillar, archBeam, starCrown);
  } else if (lowerType === 'jail') {
    // 刑務所マス：コーナーの鉄格子ケージ装飾
    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.7,
      roughness: 0.3,
    });
    const cageGroup = new THREE.Group();
    for (const pos of [
      [-0.75, -0.75],
      [0.75, -0.75],
      [-0.75, 0.75],
      [0.75, 0.75],
    ]) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8), ironMat);
      bar.position.set(pos[0], 0.8, pos[1]);
      cageGroup.add(bar);
    }
    const topFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 1.6), ironMat);
    topFrame.position.y = 1.25;
    cageGroup.add(topFrame);
    group.add(cageGroup);
  } else if (lowerType === 'shop') {
    // ショップマス：小さな屋根付きマルシェワゴン装飾
    const boothGroup = new THREE.Group();
    boothGroup.position.set(-0.72, 0.4, -0.72);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 0.28, 8),
      new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.3 })
    );
    roof.position.y = 0.45;
    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.24, 0.32, 12),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 })
    );
    stand.position.y = 0.16;
    boothGroup.add(stand, roof);
    group.add(boothGroup);
  } else if (isBranch || lowerType === 'branch') {
    // 分岐マス：発光する方向サインポール
    const signPost = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.06, 0.95, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
    );
    signPost.position.set(0.78, 0.85, -0.78);
    const arrowBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.2, 0.1),
      new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.4,
      })
    );
    arrowBoard.position.set(0.78, 1.25, -0.78);
    group.add(signPost, arrowBoard);
  }

  applyShadows(group, true, true);
  return group;
}

/**
 * 3. 物件購入・強化（Lv1〜Lv3）で段階的に豪華になる立体建物モデル生成ファクトリ
 */
export function createBuildingMesh(
  propertyType: PropertyBuildingType,
  level: BuildingLevel,
  ownerColorHex: string
): THREE.Group {
  const group = new THREE.Group();
  group.name = `building_${propertyType}_lv${level}`;

  const ownerColor = new THREE.Color(ownerColorHex || '#2ea8ff');
  const ownerMat = new THREE.MeshStandardMaterial({
    color: ownerColor,
    roughness: 0.3,
    metalness: 0.15,
  });
  const whiteWallMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.4,
    metalness: 0.05,
  });

  // 芝生・石畳ベースプレート
  const plotBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.1, 1.5),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 })
  );
  plotBase.position.y = 0.05;
  group.add(plotBase);

  if (propertyType === 'residential') {
    // === 住宅物件 (Residential) ===
    if (level === 1) {
      // Lv1: 三角屋根の可愛い一戸建てハウス
      const houseBody = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.65, 0.82), whiteWallMat);
      houseBody.position.y = 0.42;
      group.add(houseBody);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.52, 4), ownerMat);
      roof.position.y = 1.0;
      roof.rotation.y = Math.PI / 4;
      group.add(roof);

      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.35, 0.16), ownerMat);
      chimney.position.set(0.25, 1.05, -0.18);
      group.add(chimney);

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.36, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.6 })
      );
      door.position.set(0, 0.28, 0.42);
      group.add(door);
    } else if (level === 2) {
      // Lv2: バルコニー付き3階建てマンション
      const aptTex = createBuildingWindowTexture('#f1f5f9', '#bae6fd', 0.85, 3, 4);
      const aptMat = new THREE.MeshStandardMaterial({ map: aptTex, roughness: 0.35 });
      const mainBlock = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.45, 0.9), aptMat);
      mainBlock.position.y = 0.82;
      group.add(mainBlock);

      // 各階バルコニー
      for (let f = 0; f < 3; f++) {
        const balcony = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.08, 0.18), ownerMat);
        balcony.position.set(0, 0.45 + f * 0.42, 0.5);
        group.add(balcony);
      }

      const roofCap = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.12, 0.98), ownerMat);
      roofCap.position.y = 1.6;
      group.add(roofCap);
    } else {
      // Lv3: ペントハウス＆屋上庭園付き高級タワーレジデンス
      const towerTex = createBuildingWindowTexture('#e2e8f0', '#fef08a', 0.9, 4, 8);
      const towerMat = new THREE.MeshStandardMaterial({
        map: towerTex,
        roughness: 0.25,
        metalness: 0.2,
      });
      const towerBody = new THREE.Mesh(new THREE.BoxGeometry(1.12, 2.35, 1.12), towerMat);
      towerBody.position.y = 1.25;
      group.add(towerBody);

      const penthouse = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.45, 0.78), whiteWallMat);
      penthouse.position.y = 2.65;
      group.add(penthouse);

      const gardenCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.14, 16), ownerMat);
      gardenCrown.position.y = 2.94;
      group.add(gardenCrown);

      // 屋上のシンボルツリー
      const roofTree = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.4 })
      );
      roofTree.position.set(0, 3.16, 0);
      group.add(roofTree);
    }
  } else if (propertyType === 'commercial') {
    // === 商業施設 (Commercial) ===
    if (level === 1) {
      // Lv1: オーニング付きおしゃれカフェ＆ショップ
      const shopTex = createBuildingWindowTexture('#ffffff', '#7dd3fc', 0.95, 2, 2);
      const shopBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.98, 0.78, 0.88),
        new THREE.MeshStandardMaterial({ map: shopTex, roughness: 0.3 })
      );
      shopBody.position.y = 0.48;
      group.add(shopBody);

      // ストライプ風オーニング（ひさし）
      const awning = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.14, 0.36), ownerMat);
      awning.position.set(0, 0.56, 0.54);
      awning.rotation.x = 0.35;
      group.add(awning);

      // ルーフ看板
      const signBoard = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.24, 0.1), ownerMat);
      signBoard.position.set(0, 1.0, 0.25);
      group.add(signBoard);
    } else if (level === 2) {
      // Lv2: ガラス張り中層デパート
      const deptTex = createBuildingWindowTexture('#bae6fd', '#ffffff', 0.85, 4, 5);
      const deptMat = new THREE.MeshStandardMaterial({
        map: deptTex,
        roughness: 0.18,
        metalness: 0.35,
      });
      const deptBody = new THREE.Mesh(new THREE.BoxGeometry(1.16, 1.65, 1.05), deptMat);
      deptBody.position.y = 0.92;
      group.add(deptBody);

      const atriumDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
        ownerMat
      );
      atriumDome.position.y = 1.75;
      group.add(atriumDome);
    } else {
      // Lv3: ネオンサイン＆展望ドーム付き大型商業ランドマークタワー
      const skyTex = createBuildingWindowTexture('#38bdf8', '#fef9c3', 0.92, 5, 10);
      const skyMat = new THREE.MeshStandardMaterial({
        map: skyTex,
        roughness: 0.15,
        metalness: 0.45,
      });

      const lowerMall = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.75, 1.25), ownerMat);
      lowerMall.position.y = 0.45;
      group.add(lowerMall);

      const mainTower = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, 2.3, 20), skyMat);
      mainTower.position.y = 1.95;
      group.add(mainTower);

      const neonRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.52, 0.05, 12, 28),
        new THREE.MeshStandardMaterial({
          color: ownerColor,
          emissive: ownerColor,
          emissiveIntensity: 0.85,
        })
      );
      neonRing.rotation.x = Math.PI / 2;
      neonRing.position.y = 2.95;
      group.add(neonRing);

      const spire = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.7, 12), ownerMat);
      spire.position.y = 3.45;
      group.add(spire);
    }
  } else {
    // === 特殊物件 (Special: 時計台・ステーション・シンボルタワー) ===
    const totalHeight = 0.9 + level * 0.65;
    const basePillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.52, totalHeight, 8),
      whiteWallMat
    );
    basePillar.position.y = totalHeight / 2 + 0.1;
    group.add(basePillar);

    const clockCube = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.55, 0.68),
      ownerMat
    );
    clockCube.position.y = totalHeight + 0.25;
    group.add(clockCube);

    const goldSpire = new THREE.Mesh(
      new THREE.ConeGeometry(0.48, 0.65 + level * 0.15, 8),
      new THREE.MeshStandardMaterial({ color: 0xffc400, metalness: 0.5, roughness: 0.2 })
    );
    goldSpire.position.y = totalHeight + 0.85;
    group.add(goldSpire);
  }

  // 所有者カラーのフラッグ（旗）を屋上脇に設置
  const flagHeight = level === 1 ? 1.35 : level === 2 ? 2.05 : 3.25;
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8),
    whiteWallMat
  );
  pole.position.set(0.42, flagHeight, 0.42);
  const flagCloth = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.2, 0.03), ownerMat);
  flagCloth.position.set(0.58, flagHeight + 0.15, 0.42);
  group.add(pole, flagCloth);

  applyShadows(group, true, true);
  return group;
}

/**
 * 4. 6面に1〜6のCanvasテクスチャマテリアルを貼り付けた立体3Dサイコロメッシュ
 */
export function createDiceMesh(size = 1.1): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(size, size, size);
  const materials = createDiceFaceMaterials();
  const diceMesh = new THREE.Mesh(geometry, materials);
  diceMesh.name = 'dice_3d';
  diceMesh.castShadow = true;
  diceMesh.receiveShadow = true;
  return diceMesh;
}

/**
 * 5. 新世代 3D都市ジオラマ生成ファクトリ (Toytopia City - 第1マップ)
 * - 中央グランド・クリスタル大噴水広場 ＆ トイ・クロックタワー（時計塔）
 * - 4大エリア景観（グリーンヒルズ風車・サンシャインカフェ・アクアベイ灯台とヨット・ロイヤル大理石アーチ）
 * - 環状道路を周回するミニチュアカー（イエローキャブ ＆ 2階建てトイバス）
 * - 街路樹、街灯、ダイススタジアム、アニメーション連動プロパティ
 */
export function createCityCenterDiorama(grassTex?: THREE.Texture): THREE.Group {
  const diorama = new THREE.Group();
  diorama.name = 'city_center_diorama';

  const activeGrassTex = grassTex || grassTexture;

  // 動的アニメーションオブジェクトの格納配列
  const cars: Array<{ mesh: THREE.Group; progress: number; speed: number; radiusX: number; radiusZ: number }> = [];
  const windmillBlades: THREE.Group[] = [];
  let fountainCrystal: THREE.Mesh | null = null;

  // --- 1. 緑のみずみずしい芝生アイランド台座 ---
  const islandBase = new THREE.Mesh(
    new THREE.BoxGeometry(16.2, 0.46, 16.2),
    new THREE.MeshStandardMaterial({
      map: activeGrassTex,
      color: 0x84cc16,
      roughness: 0.6,
      metalness: 0.05,
    })
  );
  islandBase.position.y = -0.05;
  islandBase.receiveShadow = true;
  diorama.add(islandBase);

  // 台座のクリーンなホワイトベベルフレーム
  const islandBorder = new THREE.Mesh(
    new THREE.BoxGeometry(16.6, 0.32, 16.6),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.08 })
  );
  islandBorder.position.y = -0.16;
  diorama.add(islandBorder);

  // --- 2. 十字＆環状のアスファルト道路と横断歩道 ---
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65 });
  const roadNS = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.05, 15.8), roadMat);
  roadNS.position.y = 0.19;
  const roadEW = new THREE.Mesh(new THREE.BoxGeometry(15.8, 0.05, 2.4), roadMat);
  roadEW.position.y = 0.19;
  diorama.add(roadNS, roadEW);

  // 白い破線レーンマーク
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
  for (let i = -6; i <= 6; i += 2.2) {
    if (Math.abs(i) <= 2.5) continue;
    const dash1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.9), stripeMat);
    dash1.position.set(0, 0.2, i);
    const dash2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.14), stripeMat);
    dash2.position.set(i, 0.2, 0);
    diorama.add(dash1, dash2);
  }

  // --- 3. 【中央シンボル】グランド・クリスタル大噴水広場 ---
  const fountainGroup = new THREE.Group();
  fountainGroup.position.set(0, 0.19, -0.2);

  // 噴水の大理石円形プール（2段リング）
  const poolOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.7, 0.32, 32),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.25, metalness: 0.1 })
  );
  poolOuter.position.y = 0.16;
  poolOuter.castShadow = true;
  poolOuter.receiveShadow = true;

  // プール内のきらめく水面
  const waterMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(2.35, 2.35, 0.08, 32),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.2,
      opacity: 0.88,
      transparent: true,
    })
  );
  waterMesh.position.y = 0.28;

  // 中央の噴水台座
  const fountainCenterPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.9, 0.55, 16),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3, metalness: 0.15 })
  );
  fountainCenterPedestal.position.y = 0.45;
  fountainCenterPedestal.castShadow = true;

  // 浮遊回転するグランドクリスタルモニュメント（八面体ジュエル）
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x0284c7,
    emissiveIntensity: 0.4,
    roughness: 0.15,
    metalness: 0.3,
  });
  fountainCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.55), crystalMat);
  fountainCrystal.position.set(0, 1.15, 0);
  fountainCrystal.castShadow = true;

  // 噴水水流（半透明のアーチ状シリンダー）
  const waterJetMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.75,
    roughness: 0.2,
  });
  for (let a = 0; a < 4; a++) {
    const angle = (a * Math.PI) / 2;
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.08, 0.65, 8), waterJetMat);
    jet.position.set(Math.cos(angle) * 0.9, 0.65, Math.sin(angle) * 0.9);
    jet.rotation.z = Math.cos(angle) * 0.35;
    jet.rotation.x = Math.sin(angle) * 0.35;
    fountainGroup.add(jet);
  }

  fountainGroup.add(poolOuter, waterMesh, fountainCenterPedestal, fountainCrystal);
  diorama.add(fountainGroup);

  // --- 4. 【中央南部】ダイススタジアム（ゴールド縁取りトレイ ＆ イベントカード） ---
  const stadiumBorder = new THREE.Mesh(
    new THREE.BoxGeometry(4.4, 0.24, 3.2),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35, metalness: 0.4 })
  );
  stadiumBorder.position.set(0, 0.22, 4.2);
  stadiumBorder.receiveShadow = true;
  stadiumBorder.castShadow = true;
  diorama.add(stadiumBorder);

  const stadiumGround = new THREE.Mesh(
    new THREE.BoxGeometry(4.1, 0.25, 2.9),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.45 })
  );
  stadiumGround.position.set(0, 0.23, 4.2);
  stadiumGround.receiveShadow = true;
  diorama.add(stadiumGround);

  // 立体カードデッキ
  const deckBase = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.4, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 })
  );
  deckBase.position.set(0, 0.52, 4.2);
  deckBase.castShadow = true;
  diorama.add(deckBase);

  // クエスチョンカード天面
  const cardCanvas = document.createElement('canvas');
  cardCanvas.width = 256;
  cardCanvas.height = 256;
  const cctx = cardCanvas.getContext('2d');
  if (cctx) {
    cctx.fillStyle = '#a855f7';
    cctx.fillRect(0, 0, 256, 256);
    cctx.strokeStyle = '#ffffff';
    cctx.lineWidth = 14;
    cctx.strokeRect(16, 16, 224, 224);
    cctx.fillStyle = '#ffffff';
    cctx.font = '900 130px "Fredoka", "Arial Rounded MT Bold", sans-serif';
    cctx.textAlign = 'center';
    cctx.textBaseline = 'middle';
    cctx.fillText('?', 128, 136);
  }
  const cardTex = new THREE.CanvasTexture(cardCanvas);
  cardTex.colorSpace = THREE.SRGBColorSpace;
  const topCard = new THREE.Mesh(
    new THREE.BoxGeometry(2.15, 0.04, 1.55),
    [
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
      new THREE.MeshStandardMaterial({ map: cardTex, roughness: 0.25 }),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
    ]
  );
  topCard.position.set(0, 0.74, 4.2);
  topCard.castShadow = true;
  diorama.add(topCard);

  // --- 5. 【北側シンボル】トイ・クロックタワー（時計塔） ---
  const towerGroup = new THREE.Group();
  towerGroup.position.set(0, 0.19, -4.6);

  // タワー本体（オフホワイト＆レンガ帯）
  const towerBody = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 3.8, 1.6),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 })
  );
  towerBody.position.y = 1.9;
  towerBody.castShadow = true;
  towerBody.receiveShadow = true;

  // レンガアクセントライン
  const towerTrim = new THREE.Mesh(
    new THREE.BoxGeometry(1.72, 0.22, 1.72),
    new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.4 })
  );
  towerTrim.position.y = 2.4;

  // 時計文字盤
  const clockMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xfef08a,
    emissiveIntensity: 0.3,
    roughness: 0.2,
  });
  const clockFaceF = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 20), clockMat);
  clockFaceF.rotation.x = Math.PI / 2;
  clockFaceF.position.set(0, 3.1, 0.82);

  // 赤い三角錐屋根
  const towerRoof = new THREE.Mesh(
    new THREE.ConeGeometry(1.25, 1.5, 4),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
  );
  towerRoof.position.y = 4.45;
  towerRoof.rotation.y = Math.PI / 4;
  towerRoof.castShadow = true;

  towerGroup.add(towerBody, towerTrim, clockFaceF, towerRoof);
  diorama.add(towerGroup);

  // --- 6. 【4大エリア景観】 ---

  // [エリア1: 北西 グリーンヒルズ - トイ風車＆花壇並木]
  const windmillGroup = new THREE.Group();
  windmillGroup.position.set(-4.8, 0.19, -4.8);

  const millBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.95, 2.2, 12),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 })
  );
  millBase.position.y = 1.1;
  millBase.castShadow = true;

  const millRoof = new THREE.Mesh(
    new THREE.ConeGeometry(0.75, 0.8, 8),
    new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3 })
  );
  millRoof.position.y = 2.5;

  const bladesGroup = new THREE.Group();
  bladesGroup.position.set(0, 2.0, 0.68);
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  for (let b = 0; b < 4; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.3, 0.04), bladeMat);
    blade.position.y = 0.55;
    const bArm = new THREE.Group();
    bArm.rotation.z = (b * Math.PI) / 2;
    bArm.add(blade);
    bladesGroup.add(bArm);
  }
  windmillGroup.add(millBase, millRoof, bladesGroup);
  windmillBlades.push(bladesGroup);
  diorama.add(windmillGroup);

  // 花壇ブロック（色とりどりの小花トイ）
  const flowerBed = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.16, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 })
  );
  flowerBed.position.set(-5.0, 0.25, -2.6);
  diorama.add(flowerBed);
  const flowerColors = [0xf43f5e, 0xfacc15, 0xec4899, 0x38bdf8];
  for (let f = 0; f < 6; f++) {
    const fl = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 8),
      new THREE.MeshStandardMaterial({ color: flowerColors[f % flowerColors.length] })
    );
    fl.position.set(-5.8 + f * 0.32, 0.38, -2.6 + (f % 2 === 0 ? 0.2 : -0.2));
    diorama.add(fl);
  }

  // [エリア2: 北東 サンシャイン通り - オーニングカフェ＆ネオンテラス]
  const cafeGroup = new THREE.Group();
  cafeGroup.position.set(4.8, 0.19, -4.8);

  const cafeBuilding = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 2.8, 2.2),
    new THREE.MeshStandardMaterial({ color: 0xfed7aa, roughness: 0.35 })
  );
  cafeBuilding.position.y = 1.4;
  cafeBuilding.castShadow = true;

  // ストライプオーニング（ひさし）
  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.12, 0.85),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
  );
  awning.position.set(0, 1.5, 1.2);
  awning.rotation.x = 0.25;

  // カフェテーブル＆パラソル
  const parasol = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 0.3, 10),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 })
  );
  parasol.position.set(-1.2, 0.9, 1.4);
  const parasolPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  parasolPole.position.set(-1.2, 0.5, 1.4);

  cafeGroup.add(cafeBuilding, awning, parasol, parasolPole);
  diorama.add(cafeGroup);

  // [エリア3: 南西 アクアベイ - ウッドデッキ波止場＆灯台とミニヨット]
  const bayGroup = new THREE.Group();
  bayGroup.position.set(-4.8, 0.19, 4.8);

  // 波止場ラグーン水面
  const bayLagoon = new THREE.Mesh(
    new THREE.CylinderGeometry(2.1, 2.1, 0.08, 24),
    new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.12, metalness: 0.15 })
  );
  bayLagoon.position.set(0, 0.05, 0);

  // 木製ウッドデッキ
  const dock = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.14, 2.2),
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 })
  );
  dock.position.set(0.6, 0.14, -0.4);

  // トイ灯台（赤白ストライプ塔）
  const lighthouse = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.48, 2.6, 12),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
  );
  lighthouse.position.set(-1.1, 1.3, -1.1);
  lighthouse.castShadow = true;

  const lhStripe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.4, 0.45, 12),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
  );
  lhStripe.position.set(-1.1, 1.4, -1.1);

  // 灯台の回転発光ドーム
  const lhDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 10, 10),
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfde047,
      emissiveIntensity: 0.8,
    })
  );
  lhDome.position.set(-1.1, 2.7, -1.1);

  // ミニヨット
  const boat = new THREE.Group();
  boat.position.set(-0.3, 0.12, 0.8);
  const boatHull = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.18, 0.9),
    new THREE.MeshStandardMaterial({ color: 0xffffff })
  );
  const boatSail = new THREE.Mesh(
    new THREE.ConeGeometry(0.3, 0.65, 3),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3 })
  );
  boatSail.position.set(0, 0.4, 0);
  boat.add(boatHull, boatSail);

  bayGroup.add(bayLagoon, dock, lighthouse, lhStripe, lhDome, boat);
  diorama.add(bayGroup);

  // [エリア4: 南東 ロイヤル＆ゴールドヒルズ - 大理石アーチ＆黄金オベリスク]
  const royalGroup = new THREE.Group();
  royalGroup.position.set(4.8, 0.19, 4.8);

  const marbleBase = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.15, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.1 })
  );
  marbleBase.position.y = 0.08;

  // 黄金オベリスク
  const goldObelisk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.32, 2.6, 4),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.6, roughness: 0.25 })
  );
  goldObelisk.position.y = 1.38;
  goldObelisk.rotation.y = Math.PI / 4;
  goldObelisk.castShadow = true;

  // 大理石ピラー4本
  const pillarGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.2, 10);
  const pMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  for (const [px, pz] of [
    [-0.8, -0.8],
    [0.8, -0.8],
    [-0.8, 0.8],
    [0.8, 0.8],
  ]) {
    const pil = new THREE.Mesh(pillarGeo, pMat);
    pil.position.set(px, 0.65, pz);
    pil.castShadow = true;
    royalGroup.add(pil);
  }

  royalGroup.add(marbleBase, goldObelisk);
  diorama.add(royalGroup);

  // --- 7. 丸くて可愛いスタイライズド街路樹（16本） ---
  const treeCoords: Array<[number, number, number]> = [
    [-6.2, -6.2, 1.1],
    [-3.5, -6.3, 0.9],
    [-6.3, -3.5, 1.0],
    [-2.6, -3.2, 0.85],
    [6.2, -6.2, 1.1],
    [3.5, -6.3, 0.9],
    [6.3, -3.5, 1.0],
    [2.6, -3.2, 0.85],
    [-6.2, 6.2, 1.1],
    [-3.5, 6.3, 0.9],
    [-6.3, 3.5, 1.0],
    [-2.6, 3.2, 0.85],
    [6.2, 6.2, 1.1],
    [3.5, 6.3, 0.9],
    [6.3, 3.5, 1.0],
    [2.6, 3.2, 0.85],
  ];

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 });
  const leafColors = [0x22c55e, 0x10b981, 0x4ade80, 0x84cc16];

  treeCoords.forEach(([tx, tz, scale], idx) => {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(tx, 0.18, tz);
    treeGroup.scale.setScalar(scale);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.45, 8), trunkMat);
    trunk.position.y = 0.22;
    treeGroup.add(trunk);

    const leafMat = new THREE.MeshStandardMaterial({
      color: leafColors[idx % leafColors.length],
      roughness: 0.45,
    });
    const canopyMain = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 14), leafMat);
    canopyMain.position.y = 0.62;
    const canopyTop = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 12), leafMat);
    canopyTop.position.set(0.06, 0.88, -0.04);
    treeGroup.add(canopyMain, canopyTop);

    diorama.add(treeGroup);
  });

  // --- 8. 街灯（8基） ---
  const lampPostMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6, roughness: 0.3 });
  const lampBulbMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 0.8,
  });
  const lampCoords: Array<[number, number]> = [
    [-1.35, -2.6],
    [1.35, -2.6],
    [-1.35, 2.6],
    [1.35, 2.6],
    [-2.6, -1.35],
    [2.6, -1.35],
    [-2.6, 1.35],
    [2.6, 1.35],
  ];
  for (const [lx, lz] of lampCoords) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.85, 8), lampPostMat);
    post.position.set(lx, 0.6, lz);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), lampBulbMat);
    bulb.position.set(lx, 1.05, lz);
    diorama.add(post, bulb);
  }

  // --- 9. 【動的ライフ演出】ミニチュアカー（イエローキャブ2台 ＆ 赤い2階建てバス） ---
  const taxiMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.3 });
  const taxiGlassMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.1 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });

  const createTaxiModel = () => {
    const taxi = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.26, 0.48), taxiMat);
    body.position.y = 0.2;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.42), taxiGlassMat);
    cabin.position.set(-0.05, 0.4, 0);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.07, 0.12),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfef08a, emissiveIntensity: 0.6 })
    );
    sign.position.set(-0.05, 0.54, 0);

    const wheelGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.07, 12);
    for (const [wx, wz] of [
      [0.26, 0.23],
      [-0.26, 0.23],
      [0.26, -0.23],
      [-0.26, -0.23],
    ]) {
      const wh = new THREE.Mesh(wheelGeo, wheelMat);
      wh.rotation.x = Math.PI / 2;
      wh.position.set(wx, 0.09, wz);
      taxi.add(wh);
    }
    taxi.add(body, cabin, sign);
    taxi.scale.setScalar(0.85);
    applyShadows(taxi, true, true);
    return taxi;
  };

  const createBusModel = () => {
    const bus = new THREE.Group();
    const busMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.25, metalness: 0.2 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.72, 0.52), busMat);
    body.position.y = 0.44;
    const win1 = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.16, 0.54), taxiGlassMat);
    win1.position.set(0.02, 0.38, 0);
    const win2 = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.16, 0.54), taxiGlassMat);
    win2.position.set(0.02, 0.62, 0);

    const wheelGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12);
    for (const [wx, wz] of [
      [0.42, 0.25],
      [-0.42, 0.25],
      [0.42, -0.25],
      [-0.42, -0.25],
    ]) {
      const wh = new THREE.Mesh(wheelGeo, wheelMat);
      wh.rotation.x = Math.PI / 2;
      wh.position.set(wx, 0.1, wz);
      bus.add(wh);
    }
    bus.add(body, win1, win2);
    bus.scale.setScalar(0.82);
    applyShadows(bus, true, true);
    return bus;
  };

  const car1 = createTaxiModel();
  const car2 = createTaxiModel();
  const car3 = createBusModel();
  diorama.add(car1, car2, car3);

  // 環状道路走行用のパラメータ
  cars.push(
    { mesh: car1, progress: 0.0, speed: 0.16, radiusX: 6.8, radiusZ: 6.8 },
    { mesh: car2, progress: 0.5, speed: 0.16, radiusX: 6.8, radiusZ: 6.8 },
    { mesh: car3, progress: 0.25, speed: 0.12, radiusX: 6.8, radiusZ: 6.8 }
  );

  // アニメーション更新用参照を userData に保存
  diorama.userData.animatedCity = {
    cars,
    windmillBlades,
    crystal: fountainCrystal,
  };

  applyShadows(diorama, true, true);
  return diorama;
}

/**
 * 6. 盤面外郭タウン建物群生成ファクトリ (Outer Town Buildings)
 * プレイヤーが周回する外周マスの外側（半径17.5〜19.0）に4大エリア連動の街並みを配置
 */
export function createOuterTownBuildings(): THREE.Group {
  const outerTown = new THREE.Group();
  outerTown.name = 'outer_town_buildings';

  const windowTex = createBuildingWindowTexture('#38bdf8', '#ffffff', 0.85, 4, 8);
  const orangeWindowTex = createBuildingWindowTexture('#f59e0b', '#ffffff', 0.85, 4, 8);

  // [北西外郭: グリーンヒルズ住宅街コテージ & 並木]
  // コテージ住宅（3軒）
  const cottageMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.35 });
  const roofRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 });
  const roofBlueMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3 });
  const chimneyMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.6 });

  const cottageCoords: Array<{ x: number; z: number; rot: number; roofMat: THREE.Material }> = [
    { x: -17.8, z: -11.0, rot: Math.PI / 2, roofMat: roofRedMat },
    { x: -17.8, z: -7.0, rot: Math.PI / 2, roofMat: roofBlueMat },
    { x: -11.0, z: -17.8, rot: 0, roofMat: roofRedMat },
    { x: -7.0, z: -17.8, rot: 0, roofMat: roofBlueMat },
  ];

  for (const c of cottageCoords) {
    const house = new THREE.Group();
    house.position.set(c.x, 0.22, c.z);
    house.rotation.y = c.rot;

    const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 1.8), cottageMat);
    base.position.y = 0.7;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.1, 4), c.roofMat);
    roof.position.y = 1.95;
    roof.rotation.y = Math.PI / 4;
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.8, 0.35), chimneyMat);
    chimney.position.set(0.65, 1.9, 0.2);

    house.add(base, roof, chimney);
    outerTown.add(house);
  }

  // [北東外郭: サンシャイン商業ビル & スカイライン]
  const skyBuildingSpecs: Array<{ x: number; z: number; w: number; h: number; d: number; color: string; roofColor: number }> = [
    { x: 17.8, z: -11.0, w: 2.2, h: 4.8, d: 2.2, color: '#f59e0b', roofColor: 0xd97706 },
    { x: 17.8, z: -6.5, w: 2.0, h: 3.6, d: 2.0, color: '#38bdf8', roofColor: 0x0284c7 },
    { x: 11.0, z: -17.8, w: 2.4, h: 5.2, d: 2.2, color: '#fbbf24', roofColor: 0xb45309 },
    { x: 6.5, z: -17.8, w: 1.9, h: 3.9, d: 1.9, color: '#ec4899', roofColor: 0xbe185d },
  ];

  for (const sb of skyBuildingSpecs) {
    const bMat = new THREE.MeshStandardMaterial({
      map: orangeWindowTex,
      roughness: 0.25,
      metalness: 0.2,
    });
    const bMesh = new THREE.Mesh(new THREE.BoxGeometry(sb.w, sb.h, sb.d), bMat);
    bMesh.position.set(sb.x, sb.h / 2 + 0.22, sb.z);

    const roofCap = new THREE.Mesh(
      new THREE.BoxGeometry(sb.w * 0.88, 0.3, sb.d * 0.88),
      new THREE.MeshStandardMaterial({ color: sb.roofColor, roughness: 0.3 })
    );
    roofCap.position.set(sb.x, sb.h + 0.35, sb.z);

    outerTown.add(bMesh, roofCap);
  }

  // [南西外郭: アクアベイ港湾倉庫 & マリーナドック]
  const warehouseMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 });
  const warehouseRoofMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
  const whCoords: Array<{ x: number; z: number; rot: number }> = [
    { x: -17.8, z: 7.0, rot: Math.PI / 2 },
    { x: -17.8, z: 11.5, rot: Math.PI / 2 },
    { x: -7.0, z: 17.8, rot: 0 },
    { x: -11.5, z: 17.8, rot: 0 },
  ];

  for (const wh of whCoords) {
    const whGroup = new THREE.Group();
    whGroup.position.set(wh.x, 0.22, wh.z);
    whGroup.rotation.y = wh.rot;

    const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, 1.9), warehouseMat);
    b.position.y = 0.65;
    const r = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.4, 2.05), warehouseRoofMat);
    r.position.y = 1.45;
    whGroup.add(b, r);
    outerTown.add(whGroup);
  }

  // [南東外郭: ロイヤル大理石タワー & ゴールドドームパレス]
  const royalSpecs: Array<{ x: number; z: number; rot: number }> = [
    { x: 17.8, z: 7.0, rot: Math.PI / 2 },
    { x: 17.8, z: 11.5, rot: Math.PI / 2 },
    { x: 7.0, z: 17.8, rot: 0 },
    { x: 11.5, z: 17.8, rot: 0 },
  ];

  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2, metalness: 0.1 });
  const domeGoldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.5 });

  for (const r of royalSpecs) {
    const palGroup = new THREE.Group();
    palGroup.position.set(r.x, 0.22, r.z);
    palGroup.rotation.y = r.rot;

    const tower = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.8, 2.2), marbleMat);
    tower.position.y = 1.9;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 16), domeGoldMat);
    dome.position.y = 4.3;
    palGroup.add(tower, dome);
    outerTown.add(palGroup);
  }

  // 外郭並木樹木（四辺に配置）
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.45 });
  for (let s = -16; s <= 16; s += 4) {
    if (Math.abs(s) <= 2) continue;
    // 北辺と南辺の外郭樹木
    const tN = new THREE.Group();
    tN.position.set(s, 0.22, -18.2);
    const tr1 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.5, 8), trunkMat);
    tr1.position.y = 0.25;
    const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 12), leafMat);
    c1.position.y = 0.7;
    tN.add(tr1, c1);

    const tS = tN.clone();
    tS.position.set(s, 0.22, 18.2);

    outerTown.add(tN, tS);
  }

  applyShadows(outerTown, true, true);
  return outerTown;
}

/**
 * 7. 四方に浮かぶサテライトミニ浮島生成ファクトリ (Satellite Islands)
 * - 北西: 風車の丘島
 * - 北東: スカイタワー電波島
 * - 南西: アクアラグーン孤島
 * - 南東: ゴールドクラウン島
 */
export function createSatelliteIslands(): THREE.Group {
  const satelliteGroup = new THREE.Group();
  satelliteGroup.name = 'satellite_islands';

  const islandGrassMat = new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.6 });
  const islandStoneMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 });
  const islandBaseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });

  const createMiniIslandBase = (radius: number, height: number): THREE.Group => {
    const isg = new THREE.Group();
    // 浮遊スレート底
    const b = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.9, radius * 0.4, height, 20), islandBaseMat);
    b.position.y = -height / 2;
    b.receiveShadow = true;
    // ホワイトストーンリム
    const s = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.95, 0.35, 20), islandStoneMat);
    s.position.y = 0.15;
    s.receiveShadow = true;
    // 芝生天面
    const g = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.94, radius * 0.94, 0.15, 20), islandGrassMat);
    g.position.y = 0.3;
    g.receiveShadow = true;
    isg.add(b, s, g);
    return isg;
  };

  // 1. 北西サテライト: 風車の丘島 [-26, -0.4, -24]
  const isleNW = createMiniIslandBase(3.8, 1.8);
  isleNW.position.set(-26, -0.3, -24);
  const wm = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.6, 2.2, 10),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 })
  );
  wm.position.y = 1.4;
  const wmRoof = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 0.7, 8),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
  );
  wmRoof.position.y = 2.75;
  isleNW.add(wm, wmRoof);
  satelliteGroup.add(isleNW);

  // 2. 北東サテライト: スカイタワー電波島 [26, -0.4, -25]
  const isleNE = createMiniIslandBase(3.8, 1.8);
  isleNE.position.set(26, -0.3, -25);
  // 赤白アンテナ塔
  const antennaPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.18, 4.2, 8),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 })
  );
  antennaPole.position.y = 2.4;
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xef4444, emissiveIntensity: 0.8 })
  );
  beacon.position.y = 4.5;
  isleNE.add(antennaPole, beacon);
  satelliteGroup.add(isleNE);

  // 3. 南西サテライト: アクアラグーン孤島 [-27, -0.4, 25]
  const isleSW = createMiniIslandBase(3.8, 1.8);
  isleSW.position.set(-27, -0.3, 25);
  // ミニ白い灯台
  const lh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.42, 2.4, 10),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
  );
  lh.position.y = 1.5;
  const lhDome = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfacc15, emissiveIntensity: 0.8 })
  );
  lhDome.position.y = 2.8;
  isleSW.add(lh, lhDome);
  satelliteGroup.add(isleSW);

  // 4. 南東サテライト: ゴールドクラウン島 [26, -0.4, 26]
  const isleSE = createMiniIslandBase(3.8, 1.8);
  isleSE.position.set(26, -0.3, 26);
  // 黄金王冠クラウン
  const crownMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.6, roughness: 0.25 });
  const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, 0.6, 8), crownMat);
  crownBase.position.y = 0.6;
  const crownJewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.4), crownMat);
  crownJewel.position.y = 1.2;
  isleSE.add(crownBase, crownJewel);
  satelliteGroup.add(isleSE);

  applyShadows(satelliteGroup, true, true);
  return satelliteGroup;
}

/**
 * 非同期アセットマニフェストローダー
 * `/assets/textures/grass_tile.png` をロードし、失敗時でもプロシージャル芝生テクスチャに安全にフォールバック
 */
export async function loadAssetManifest(): Promise<AssetManifest> {
  const textureLoader = new THREE.TextureLoader();

  const loadGrassWithFallback = (): Promise<THREE.Texture> => {
    return new Promise((resolve) => {
      textureLoader.load(
        '/assets/textures/grass_tile.png',
        (tex) => {
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(8, 8);
          tex.colorSpace = THREE.SRGBColorSpace;
          textures.grassTexture = tex;
          resolve(tex);
        },
        undefined,
        () => {
          // ロード失敗時はプロシージャル芝生テクスチャを使用
          resolve(grassTexture);
        }
      );
    });
  };

  const loadedGrass = await loadGrassWithFallback();

  return {
    imageUrls: {
      ...imageUrls,
      propertyIllustrationUrls,
    },
    textures: {
      ...textures,
      propertyIllustrationUrls,
      grassTexture: loadedGrass,
    },
    cityPreviewUrl: imageUrls.cityPreviewUrl,
    characterAvatarUrls: imageUrls.characterAvatarUrls,
    propertyIllustrationUrls,
    grassTexture: loadedGrass,
    diceFaceTextures,
    createPlayerMesh,
    createTileMesh,
    createBuildingMesh,
    createDiceMesh,
    createCityCenterDiorama,
    createOuterTownBuildings,
    createSatelliteIslands,
  };
}
