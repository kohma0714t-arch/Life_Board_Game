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

export interface ImageUrls {
  cityPreviewUrl: string;
  characterAvatarUrls: Record<string, string>;
}

export interface AssetTextures {
  cityPreviewUrl: string;
  characterAvatarUrls: Record<string, string>;
  grassTexture: THREE.Texture;
  diceFaceMaterials: THREE.MeshStandardMaterial[];
  diceFaceTextures: THREE.MeshStandardMaterial[];
}

export interface AssetManifest {
  imageUrls: ImageUrls;
  textures: AssetTextures;
  cityPreviewUrl: string;
  characterAvatarUrls: Record<string, string>;
  grassTexture: THREE.Texture;
  diceFaceTextures: THREE.MeshStandardMaterial[];
  createPlayerMesh: (charId: string, colorHex: string) => THREE.Group;
  createTileMesh: (options: TileMeshOptions) => THREE.Group;
  createBuildingMesh: (
    propertyType: PropertyBuildingType,
    level: BuildingLevel,
    ownerColorHex: string
  ) => THREE.Group;
  createDiceMesh: (size?: number) => THREE.Mesh;
  createCityCenterDiorama: (grassTex?: THREE.Texture) => THREE.Group;
}

export const imageUrls: ImageUrls = {
  cityPreviewUrl: '/assets/textures/city_preview.png',
  characterAvatarUrls: {
    char_1: '/assets/textures/char_1.png',
    char_2: '/assets/textures/char_2.png',
    char_3: '/assets/textures/char_3.png',
    char_4: '/assets/textures/char_4.png',
  },
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
 * 1. プレイヤーの3Dデフォルメキャラクターコマ生成ファクトリ
 * char_1: スポーティなフード・短髪青年
 * char_2: ポニーテール・プリーツスカート少女
 * char_3: 丸メガネフレーム・知的なセーター青年
 * char_4: セミロングヘア・フレアワンピース女性
 */
export function createPlayerMesh(charId: string, colorHex: string): THREE.Group {
  const group = new THREE.Group();
  group.name = `player_${charId}`;

  const themeColor = new THREE.Color(colorHex || '#2998ff');
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xffe0c8,
    roughness: 0.45,
    metalness: 0.05,
  });
  const themeMat = new THREE.MeshStandardMaterial({
    color: themeColor,
    roughness: 0.35,
    metalness: 0.15,
  });
  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.1,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x243040,
    roughness: 0.5,
    metalness: 0.1,
  });
  const glowRingMat = new THREE.MeshStandardMaterial({
    color: themeColor,
    emissive: themeColor,
    emissiveIntensity: 0.65,
    roughness: 0.2,
    metalness: 0.3,
  });

  // --- 足元の発光リング台座 ---
  const baseCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.52, 0.12, 24),
    whiteMat
  );
  baseCylinder.position.y = 0.06;
  group.add(baseCylinder);

  const glowTorus = new THREE.Mesh(
    new THREE.TorusGeometry(0.49, 0.045, 12, 32),
    glowRingMat
  );
  glowTorus.rotation.x = Math.PI / 2;
  glowTorus.position.y = 0.11;
  group.add(glowTorus);

  // --- 靴＆脚部 ---
  const shoeGeo = new THREE.BoxGeometry(0.16, 0.1, 0.24);
  const leftShoe = new THREE.Mesh(shoeGeo, themeMat);
  leftShoe.position.set(-0.12, 0.17, 0.03);
  const rightShoe = new THREE.Mesh(shoeGeo, themeMat);
  rightShoe.position.set(0.12, 0.17, 0.03);
  group.add(leftShoe, rightShoe);

  const legGeo = new THREE.CylinderGeometry(0.065, 0.06, 0.28, 12);
  const legMat = charId === 'char_2' || charId === 'char_4' ? skinMat : darkMat;
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.12, 0.34, 0);
  const rightLeg = new THREE.Mesh(legGeo, legMat);
  rightLeg.position.set(0.12, 0.34, 0);
  group.add(leftLeg, rightLeg);

  // --- 胴体＆腕部 ---
  if (charId === 'char_4') {
    // ワンピース造形（フレアスカート＋トップス）
    const dressSkirt = new THREE.Mesh(
      new THREE.ConeGeometry(0.34, 0.52, 20),
      themeMat
    );
    dressSkirt.position.y = 0.66;
    group.add(dressSkirt);

    const dressTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.32, 16),
      themeMat
    );
    dressTop.position.y = 0.88;
    group.add(dressTop);

    // ウエストリボン
    const ribbonBelt = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.03, 8, 24),
      whiteMat
    );
    ribbonBelt.rotation.x = Math.PI / 2;
    ribbonBelt.position.y = 0.76;
    group.add(ribbonBelt);
  } else if (charId === 'char_2') {
    // 制服少女（プリーツスカート＋ブレザー＋赤いリボン）
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.31, 0.26, 16),
      darkMat
    );
    skirt.position.y = 0.55;
    group.add(skirt);

    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.18, 0.38, 16),
      themeMat
    );
    torso.position.y = 0.84;
    group.add(torso);

    const collar = new THREE.Mesh(
      new THREE.ConeGeometry(0.21, 0.12, 4),
      whiteMat
    );
    collar.rotation.y = Math.PI / 4;
    collar.position.set(0, 0.98, 0.02);
    group.add(collar);

    const tieMat = new THREE.MeshStandardMaterial({ color: 0xff3b5c, roughness: 0.3 });
    const bowTie = new THREE.Mesh(new THREE.OctahedronGeometry(0.065), tieMat);
    bowTie.position.set(0, 0.93, 0.19);
    group.add(bowTie);
  } else {
    // char_1 (スポーティパーカー) / char_3 (知的セーター＆シャツ襟)
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.19, 0.5, 16),
      themeMat
    );
    torso.position.y = 0.74;
    group.add(torso);

    if (charId === 'char_1') {
      // スポーティな白フード襟＆ポケット
      const hoodRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.055, 10, 20),
        whiteMat
      );
      hoodRing.rotation.x = Math.PI / 2 - 0.25;
      hoodRing.position.set(0, 0.98, -0.04);
      group.add(hoodRing);

      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.36, 0.4),
        whiteMat
      );
      stripe.position.set(0, 0.74, 0.02);
      group.add(stripe);
    } else {
      // char_3: Vネックシャツ＆ネクタイ
      const vNeck = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.2, 12),
        whiteMat
      );
      vNeck.rotation.x = Math.PI;
      vNeck.position.set(0, 0.92, 0.12);
      group.add(vNeck);
    }
  }

  // 両腕
  const armGeo = new THREE.CapsuleGeometry(0.058, 0.24, 8, 12);
  const leftArm = new THREE.Mesh(armGeo, themeMat);
  leftArm.position.set(-0.27, 0.78, 0);
  leftArm.rotation.z = 0.24;

  const rightArm = new THREE.Mesh(armGeo, themeMat);
  rightArm.position.set(0.27, 0.78, 0);
  rightArm.rotation.z = -0.24;

  const handGeo = new THREE.SphereGeometry(0.065, 12, 12);
  const leftHand = new THREE.Mesh(handGeo, skinMat);
  leftHand.position.set(-0.32, 0.62, 0);
  const rightHand = new THREE.Mesh(handGeo, skinMat);
  rightHand.position.set(0.32, 0.62, 0);
  group.add(leftArm, rightArm, leftHand, rightHand);

  // --- 頭部・顔パーツ ---
  const headGroup = new THREE.Group();
  headGroup.position.y = 1.26;

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 24), skinMat);
  headGroup.add(headMesh);

  // 目＆笑顔
  const eyeGeo = new THREE.SphereGeometry(0.032, 12, 12);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a222d, roughness: 0.1 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.09, 0.03, 0.235);
  leftEye.scale.set(1, 1.3, 0.6);

  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.09, 0.03, 0.235);
  rightEye.scale.set(1, 1.3, 0.6);
  headGroup.add(leftEye, rightEye);

  // ほっぺの赤み
  const cheekMat = new THREE.MeshStandardMaterial({ color: 0xff94a2, roughness: 0.6 });
  const cheekGeo = new THREE.SphereGeometry(0.032, 10, 10);
  const leftCheek = new THREE.Mesh(cheekGeo, cheekMat);
  leftCheek.position.set(-0.15, -0.03, 0.21);
  leftCheek.scale.set(1.2, 0.7, 0.5);
  const rightCheek = new THREE.Mesh(cheekGeo, cheekMat);
  rightCheek.position.set(0.15, -0.03, 0.21);
  rightCheek.scale.set(1.2, 0.7, 0.5);
  headGroup.add(leftCheek, rightCheek);

  // 笑顔の口元
  const smileGeo = new THREE.TorusGeometry(0.045, 0.012, 8, 16, Math.PI);
  const smileMat = new THREE.MeshStandardMaterial({ color: 0xd9534f, roughness: 0.4 });
  const smile = new THREE.Mesh(smileGeo, smileMat);
  smile.rotation.x = Math.PI;
  smile.position.set(0, -0.04, 0.245);
  headGroup.add(smile);

  // --- キャラクター別のヘアスタイル＆アクセサリー ---
  if (charId === 'char_1') {
    // 茶髪の爽やかショートスパイクヘア
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x5c3828, roughness: 0.45 });
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.275, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    hairCap.rotation.x = -0.15;
    headGroup.add(hairCap);

    // 前髪タフト
    for (let i = -1; i <= 1; i++) {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.16, 8), hairMat);
      tuft.position.set(i * 0.09, 0.18, 0.21);
      tuft.rotation.x = 0.65;
      tuft.rotation.z = -i * 0.25;
      headGroup.add(tuft);
    }
  } else if (charId === 'char_2') {
    // 明るいチェスナットブラウン＋元気なポニーテール
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x7a422c, roughness: 0.4 });
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.275, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMat
    );
    hairCap.rotation.x = -0.1;
    headGroup.add(hairCap);

    // ポニーテール＆シュシュ
    const scrunchie = new THREE.Mesh(
      new THREE.TorusGeometry(0.065, 0.025, 10, 16),
      themeMat
    );
    scrunchie.position.set(0, 0.1, -0.26);
    headGroup.add(scrunchie);

    const ponyTail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.34, 14), hairMat);
    ponyTail.position.set(0, 0.02, -0.38);
    ponyTail.rotation.x = -0.85;
    headGroup.add(ponyTail);
  } else if (charId === 'char_3') {
    // 黒髪マッシュ＋知的な丸メガネフレーム
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x222630, roughness: 0.35 });
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.6),
      hairMat
    );
    hairCap.rotation.x = -0.05;
    headGroup.add(hairCap);

    // 丸メガネフレーム
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x11161d,
      metalness: 0.7,
      roughness: 0.2,
    });
    const leftFrame = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.01, 8, 20), glassMat);
    leftFrame.position.set(-0.095, 0.035, 0.255);
    const rightFrame = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.01, 8, 20), glassMat);
    rightFrame.position.set(0.095, 0.035, 0.255);
    const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 8), glassMat);
    bridge.rotation.z = Math.PI / 2;
    bridge.position.set(0, 0.035, 0.255);
    headGroup.add(leftFrame, rightFrame, bridge);
  } else {
    // char_4: 華やかなハニーブラウンのセミロングヘア＋カチューシャ
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x8d5232, roughness: 0.38 });
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.278, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.6),
      hairMat
    );
    headGroup.add(hairCap);

    // セミロングのサイド＆バックヘア
    const backHair = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.29, 0.36, 16, 1, false, Math.PI * 0.65, Math.PI * 1.7),
      hairMat
    );
    backHair.position.set(0, -0.1, -0.03);
    headGroup.add(backHair);

    // 白いカチューシャ
    const headband = new THREE.Mesh(
      new THREE.TorusGeometry(0.275, 0.022, 10, 24, Math.PI),
      whiteMat
    );
    headband.position.set(0, 0.05, 0.02);
    headGroup.add(headband);
  }

  group.add(headGroup);
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

  // --- 1. 立体ホワイトベースフレーム ---
  const baseGeo = new THREE.BoxGeometry(2.15, 0.34, 2.15);
  const baseMat = new THREE.MeshStandardMaterial({
    color: isBranch ? 0xe0f7fa : 0xf8fafc,
    roughness: 0.35,
    metalness: 0.08,
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = 0.17;
  group.add(baseMesh);

  // サイドのカラーリム帯
  const rimGeo = new THREE.BoxGeometry(2.2, 0.1, 2.2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.3,
    metalness: 0.15,
  });
  const rimMesh = new THREE.Mesh(rimGeo, rimMat);
  rimMesh.position.y = 0.26;
  group.add(rimMesh);

  // --- 2. Canvas2Dでくっきり描画した天面ラベルプレート ---
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // プレート背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 256);

    // 上部カラーヘッダー帯
    ctx.fillStyle = accentHex;
    ctx.fillRect(10, 10, 236, 68);

    // 外枠ボーダー
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, 236, 236);

    // マス種別アイコンまたはシンボル描画
    const iconMap: Record<string, string> = {
      start: 'START',
      property: 'ESTATE',
      residential: 'HOME',
      commercial: 'BIZ',
      special: 'STAR',
      event: 'EVENT',
      career: 'WORK',
      family: 'LOVE',
      bonus: 'BONUS',
      shop: 'SHOP',
      tax: 'TAX',
      jail: 'JAIL',
      branch: 'ROUTE',
    };
    const badgeLabel = iconMap[type.toLowerCase()] || type.toUpperCase();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Segoe UI", "Hiragino Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeLabel, 128, 44);

    // マス名（複数行折り返し対応）
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 28px "Segoe UI", "Hiragino Sans", sans-serif';
    const maxChars = 6;
    if (name.length > maxChars) {
      const line1 = name.slice(0, maxChars);
      const line2 = name.slice(maxChars, maxChars * 2);
      ctx.fillText(line1, 128, 120);
      ctx.fillText(line2, 128, 156);
    } else {
      ctx.fillText(name, 128, 136);
    }

    // サブテキスト（価格・給料・効果など）
    if (subText) {
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 24px "Segoe UI", "Hiragino Sans", sans-serif';
      ctx.fillText(subText, 128, 206);
    }
  }

  const labelTex = new THREE.CanvasTexture(canvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;
  labelTex.needsUpdate = true;

  const topPlateGeo = new THREE.BoxGeometry(1.96, 0.06, 1.96);
  const sidePlateMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const topLabelMat = new THREE.MeshStandardMaterial({
    map: labelTex,
    roughness: 0.25,
    metalness: 0.05,
  });

  const topPlate = new THREE.Mesh(topPlateGeo, [
    sidePlateMat,
    sidePlateMat,
    topLabelMat,
    sidePlateMat,
    sidePlateMat,
    sidePlateMat,
  ]);
  topPlate.position.y = 0.36;
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
 * 5. ボード中央空間を彩る箱庭都市ジオラマ生成ファクトリ
 * 緑の芝生アイランド台座、十字道路、横断歩道、中央の噴水広場、大小の背景ビル群、24本の丸い街路樹、街灯、水辺を複合配置
 */
export function createCityCenterDiorama(grassTex?: THREE.Texture): THREE.Group {
  const diorama = new THREE.Group();
  diorama.name = 'city_center_diorama';

  const activeGrassTex = grassTex || grassTexture;

  // --- 1. 緑の芝生アイランド台座 & 水辺 ---
  const islandBase = new THREE.Mesh(
    new THREE.BoxGeometry(15.6, 0.45, 15.6),
    new THREE.MeshStandardMaterial({
      map: activeGrassTex,
      color: 0x7be382,
      roughness: 0.65,
      metalness: 0.05,
    })
  );
  islandBase.position.y = -0.05;
  islandBase.receiveShadow = true;
  diorama.add(islandBase);

  // 土台の白い縁取りフレーム
  const islandBorder = new THREE.Mesh(
    new THREE.BoxGeometry(16.0, 0.32, 16.0),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 })
  );
  islandBorder.position.y = -0.14;
  diorama.add(islandBorder);

  // --- 2. 十字のアスファルト道路＆横断歩道 ---
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6 });
  const roadNS = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.04, 15.4), roadMat);
  roadNS.position.y = 0.19;
  const roadEW = new THREE.Mesh(new THREE.BoxGeometry(15.4, 0.04, 2.2), roadMat);
  roadEW.position.y = 0.19;
  diorama.add(roadNS, roadEW);

  // 白い破線＆横断歩道
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
  for (let i = -6; i <= 6; i += 2) {
    if (Math.abs(i) <= 2) continue;
    const dash1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.8), stripeMat);
    dash1.position.set(0, 0.2, i);
    const dash2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.14), stripeMat);
    dash2.position.set(i, 0.2, 0);
    diorama.add(dash1, dash2);
  }

  // --- 3. 中央の噴水広場（サークルプラザ＆3段噴水） ---
  const plazaCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 2.5, 0.12, 32),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35 })
  );
  plazaCylinder.position.y = 0.22;
  diorama.add(plazaCylinder);

  const waterPool = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.75, 0.14, 28),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.2,
      emissive: 0x0284c7,
      emissiveIntensity: 0.2,
    })
  );
  waterPool.position.y = 0.28;
  diorama.add(waterPool);

  const fountainPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.42, 0.95, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 })
  );
  fountainPillar.position.y = 0.72;
  const fountainBowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.35, 0.22, 20),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 })
  );
  fountainBowl.position.y = 0.92;
  const waterTop = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.45,
      roughness: 0.1,
    })
  );
  waterTop.position.y = 1.28;
  diorama.add(fountainPillar, fountainBowl, waterTop);

  // --- 4. 4区画の背景シティビル群（窓明かりテクスチャ付き） ---
  const buildingSpecs: Array<{
    x: number;
    z: number;
    w: number;
    h: number;
    d: number;
    color: string;
    roofColor: number;
  }> = [
    // 北西ブロック
    { x: -4.8, z: -4.8, w: 1.8, h: 3.8, d: 1.8, color: '#93c5fd', roofColor: 0x2563eb },
    { x: -2.8, z: -5.2, w: 1.4, h: 2.5, d: 1.4, color: '#e2e8f0', roofColor: 0x0ea5e9 },
    { x: -5.4, z: -2.7, w: 1.5, h: 2.9, d: 1.5, color: '#bae6fd', roofColor: 0x3b82f6 },
    // 北東ブロック
    { x: 4.8, z: -4.8, w: 1.9, h: 4.2, d: 1.9, color: '#7dd3fc', roofColor: 0x0284c7 },
    { x: 2.9, z: -5.0, w: 1.5, h: 2.7, d: 1.4, color: '#f1f5f9', roofColor: 0xf59e0b },
    { x: 5.2, z: -2.7, w: 1.4, h: 2.2, d: 1.4, color: '#fed7aa', roofColor: 0xea580c },
    // 南西ブロック
    { x: -4.6, z: 4.6, w: 1.7, h: 3.1, d: 1.7, color: '#c7d2fe', roofColor: 0x6366f1 },
    { x: -2.7, z: 4.9, w: 1.3, h: 2.0, d: 1.3, color: '#fecdd3', roofColor: 0xf43f5e },
    // 南東ブロック（水辺の公園＆タワー）
    { x: 4.9, z: 4.8, w: 1.8, h: 3.5, d: 1.8, color: '#a7f3d0', roofColor: 0x10b981 },
  ];

  for (const b of buildingSpecs) {
    const bTex = createBuildingWindowTexture(b.color, '#ffffff', 0.8, 4, 7);
    const bMat = new THREE.MeshStandardMaterial({
      map: bTex,
      roughness: 0.25,
      metalness: 0.2,
    });
    const bMesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), bMat);
    bMesh.position.set(b.x, b.h / 2 + 0.18, b.z);
    diorama.add(bMesh);

    const roofCap = new THREE.Mesh(
      new THREE.BoxGeometry(b.w * 0.82, 0.22, b.d * 0.82),
      new THREE.MeshStandardMaterial({ color: b.roofColor, roughness: 0.3 })
    );
    roofCap.position.set(b.x, b.h + 0.29, b.z);
    diorama.add(roofCap);
  }

  // 南東ブロックの爽やかなラグーン池
  const pond = new THREE.Mesh(
    new THREE.CylinderGeometry(1.5, 1.5, 0.08, 24),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.15 })
  );
  pond.position.set(3.1, 0.2, 3.2);
  diorama.add(pond);

  // --- 5. 丸くて可愛いスタイライズド街路樹（24本） ---
  const treeCoords: Array<[number, number, number]> = [
    [-6.4, -6.4, 1.1],
    [-3.8, -6.5, 0.9],
    [-6.5, -4.0, 1.0],
    [-3.2, -3.1, 0.85],
    [-1.7, -3.5, 0.8],
    [-1.7, -6.2, 0.95],
    [6.4, -6.4, 1.1],
    [3.8, -6.5, 0.9],
    [6.5, -4.0, 1.0],
    [3.2, -3.1, 0.85],
    [1.7, -3.5, 0.8],
    [1.7, -6.2, 0.95],
    [-6.4, 6.4, 1.1],
    [-3.8, 6.5, 0.9],
    [-6.5, 3.8, 1.0],
    [-3.2, 3.1, 0.85],
    [-1.7, 3.5, 0.8],
    [-6.2, 1.8, 0.95],
    [6.4, 6.4, 1.1],
    [3.6, 6.4, 0.9],
    [6.5, 3.6, 1.0],
    [2.2, 4.8, 0.85],
    [1.7, 2.8, 0.8],
    [4.6, 2.3, 0.95],
  ];

  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78472a, roughness: 0.7 });
  const leafColors = [0x34d399, 0x22c55e, 0x4ade80, 0x10b981];

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

  // --- 6. 街灯（8基） ---
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

  applyShadows(diorama, true, true);
  return diorama;
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
    imageUrls,
    textures: {
      ...textures,
      grassTexture: loadedGrass,
    },
    cityPreviewUrl: imageUrls.cityPreviewUrl,
    characterAvatarUrls: imageUrls.characterAvatarUrls,
    grassTexture: loadedGrass,
    diceFaceTextures,
    createPlayerMesh,
    createTileMesh,
    createBuildingMesh,
    createDiceMesh,
    createCityCenterDiorama,
  };
}
