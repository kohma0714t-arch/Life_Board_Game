import {
  BANK_SELL_RATIO,
  GROUP_MONOPOLY_MULTIPLIER,
  JobId,
} from '../config/constants';

export type TileType =
  | 'start'
  | 'property'
  | 'event'
  | 'career'
  | 'family'
  | 'bonus'
  | 'shop'
  | 'tax'
  | 'jail'
  | 'branch';

export type PropertyType = 'residential' | 'commercial' | 'special';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface BoardTile {
  id: number;
  name: string;
  type: TileType;
  position: Vec3;
  nextTileIds: number[];
  branchNames?: string[];
  isBranchSubTile?: boolean;

  // 物件マス専用プロパティ
  propertyType?: PropertyType;
  groupId?: string;
  groupName?: string;
  groupColor?: string;
  basePrice?: number;
  ownerId?: string | null;
  level?: 1 | 2 | 3;
}

interface PropertyTemplate {
  name: string;
  propertyType: PropertyType;
  groupId: string;
  groupName: string;
  groupColor: string;
  basePrice: number;
}

const PROPERTY_TEMPLATES: PropertyTemplate[] = [
  // Group A: グリーンヒルズ（序盤住宅街・2件）
  {
    name: 'ひまわりコーポ',
    propertyType: 'residential',
    groupId: 'G_GREEN',
    groupName: 'グリーンヒルズ',
    groupColor: '#22c55e',
    basePrice: 200,
  },
  {
    name: '若葉テラスハウス',
    propertyType: 'residential',
    groupId: 'G_GREEN',
    groupName: 'グリーンヒルズ',
    groupColor: '#22c55e',
    basePrice: 240,
  },
  // Group B: サンシャイン商業区（序盤商業・2件）
  {
    name: '駅前ベーカリーカフェ',
    propertyType: 'commercial',
    groupId: 'G_SUN',
    groupName: 'サンシャイン通り',
    groupColor: '#f59e0b',
    basePrice: 260,
  },
  {
    name: 'サニーサイドマルシェ',
    propertyType: 'commercial',
    groupId: 'G_SUN',
    groupName: 'サンシャイン通り',
    groupColor: '#f59e0b',
    basePrice: 300,
  },
  // Group C: アクアベイエリア（中盤住宅・3件）
  {
    name: '潮風シーサイドヴィラ',
    propertyType: 'residential',
    groupId: 'G_AQUA',
    groupName: 'アクアベイエリア',
    groupColor: '#06b6d4',
    basePrice: 320,
  },
  {
    name: 'マリンビューマンション',
    propertyType: 'residential',
    groupId: 'G_AQUA',
    groupName: 'アクアベイエリア',
    groupColor: '#06b6d4',
    basePrice: 360,
  },
  {
    name: 'ハーバーフロントレジデンス',
    propertyType: 'residential',
    groupId: 'G_AQUA',
    groupName: 'アクアベイエリア',
    groupColor: '#06b6d4',
    basePrice: 400,
  },
  // Group D: メトロ商業センター（中盤商業・2件）
  {
    name: 'シネマコンプレックス',
    propertyType: 'commercial',
    groupId: 'G_METRO',
    groupName: 'メトロ商業地区',
    groupColor: '#ec4899',
    basePrice: 380,
  },
  {
    name: 'グランドデパートメント',
    propertyType: 'commercial',
    groupId: 'G_METRO',
    groupName: 'メトロ商業地区',
    groupColor: '#ec4899',
    basePrice: 440,
  },
  // Group E: ロイヤルハイツ（高級住宅・3件）
  {
    name: '白金ガーデンコート',
    propertyType: 'residential',
    groupId: 'G_ROYAL',
    groupName: 'ロイヤルハイツ',
    groupColor: '#8b5cf6',
    basePrice: 480,
  },
  {
    name: 'ペントハウス迎賓館',
    propertyType: 'residential',
    groupId: 'G_ROYAL',
    groupName: 'ロイヤルハイツ',
    groupColor: '#8b5cf6',
    basePrice: 540,
  },
  {
    name: 'スカイクラウンタワー',
    propertyType: 'residential',
    groupId: 'G_ROYAL',
    groupName: 'ロイヤルハイツ',
    groupColor: '#8b5cf6',
    basePrice: 600,
  },
  // Group F: ゴールド金融街（高級商業・2件）
  {
    name: 'セントラル証券ビル',
    propertyType: 'commercial',
    groupId: 'G_GOLD',
    groupName: 'ゴールド金融街',
    groupColor: '#eab308',
    basePrice: 520,
  },
  {
    name: 'ワールドトレードプラザ',
    propertyType: 'commercial',
    groupId: 'G_GOLD',
    groupName: 'ゴールド金融街',
    groupColor: '#eab308',
    basePrice: 640,
  },
  // Group S: 特殊ランドマーク（特殊物件・3件）
  {
    name: 'セントラル高速鉄道駅',
    propertyType: 'special',
    groupId: 'G_SPECIAL',
    groupName: '都市インフラ・特区',
    groupColor: '#3b82f6',
    basePrice: 400,
  },
  {
    name: 'ベイエリアテーマパーク',
    propertyType: 'special',
    groupId: 'G_SPECIAL',
    groupName: '都市インフラ・特区',
    groupColor: '#3b82f6',
    basePrice: 500,
  },
  {
    name: '未来ITメガコーポ本社',
    propertyType: 'special',
    groupId: 'G_SPECIAL',
    groupName: '都市インフラ・特区',
    groupColor: '#3b82f6',
    basePrice: 600,
  },
];

/**
 * Mulberry32 シード付き疑似乱数生成器
 * 同一シード値から全クライアントで完全一致する乱数列を生成する
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * シード付き配列シャッフル
 */
function seededShuffle<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}

export class MapGenerator {
  /**
   * 3Dボードマップ生成（メインループ32マス ＋ 分岐サブルート6マス ＝ 全38マス）
   * - メイン外周: 1辺8マスの正方形ループ (Tile 0 〜 Tile 31)
   * - 分岐1 (キャリア・ファミリー重視ルート): Tile 6 から分岐 → Tile 32, 33, 34 → Tile 12 に合流
   * - 分岐2 (不動産・商業ハイリスクルート): Tile 22 から分岐 → Tile 35, 36, 37 → Tile 28 に合流
   */
  public static generateBoard(seed: number): BoardTile[] {
    const rng = createSeededRandom(seed);

    // メインループ32マスの3D座標を計算（1辺8マス、半径14ユニットの正方形外周）
    const mainPositions: Vec3[] = [];
    const halfSpan = 14;
    const step = (halfSpan * 2) / 8; // 3.5 units

    // 辺0 (南辺: 左下(-14, 14) -> 右下(14, 14)) : Tile 0..7
    for (let i = 0; i < 8; i++) {
      mainPositions.push({ x: -halfSpan + i * step, y: 0, z: halfSpan });
    }
    // 辺1 (東辺: 右下(14, 14) -> 右上(14, -14)) : Tile 8..15
    for (let i = 0; i < 8; i++) {
      mainPositions.push({ x: halfSpan, y: 0, z: halfSpan - i * step });
    }
    // 辺2 (北辺: 右上(14, -14) -> 左上(-14, -14)) : Tile 16..23
    for (let i = 0; i < 8; i++) {
      mainPositions.push({ x: halfSpan - i * step, y: 0, z: -halfSpan });
    }
    // 辺3 (西辺: 左上(-14, -14) -> 左下(-14, 14)) : Tile 24..31
    for (let i = 0; i < 8; i++) {
      mainPositions.push({ x: -halfSpan, y: 0, z: -halfSpan + i * step });
    }

    // 分岐1 (Tile 6 -> [32, 33, 34] -> Tile 12): 南東ショートカット高架ルート
    const branch1Positions: Vec3[] = [
      { x: 7.5, y: 0.45, z: 9.8 }, // Tile 32
      { x: 9.2, y: 0.65, z: 5.5 }, // Tile 33
      { x: 10.2, y: 0.45, z: 1.8 }, // Tile 34
    ];

    // 分岐2 (Tile 22 -> [35, 36, 37] -> Tile 28): 北西ショートカット高架ルート
    const branch2Positions: Vec3[] = [
      { x: -7.5, y: 0.45, z: -9.8 }, // Tile 35
      { x: -9.2, y: 0.65, z: -5.5 }, // Tile 36
      { x: -10.2, y: 0.45, z: -1.8 }, // Tile 37
    ];

    // 固定要所マス:
    // 0: start
    // 6: branch (第1分岐)
    // 16: jail (刑務所)
    // 22: branch (第2分岐)
    // 分岐1 (32, 33, 34): キャリア・ファミリー・ボーナス重視
    // 分岐2 (35, 36, 37): 高級物件・ショップ・ハイリスク重視

    // 残りメイン28枠 + 分岐6枠 = 34枠の割り当て
    // 分岐1の3枠は ['career', 'family', 'bonus'] をシャッフル配置
    const branch1Types = seededShuffle<TileType>(['career', 'family', 'bonus'], rng);
    // 分岐2の3枠は ['property', 'property', 'shop'] をシャッフル配置
    const branch2Types = seededShuffle<TileType>(['property', 'property', 'shop'], rng);

    // メインループの空き28枠に配置するマス種別プール:
    // property: 15件 (分岐2の2件と合わせて計17件 = 44.7%)
    // event: 6件 (15.8%)
    // career: 2件 + family: 2件 (分岐1と合わせて計6件 = 15.8%)
    // bonus: 2件, shop: 1件, tax: 2件
    // ※ただし序盤(Tile 1, 2, 4)には就職しやすいようキャリアマスを優先配置しつつシード乱数で変化させる
    const earlyMainIndices = [1, 2, 3, 4, 5];
    const midLateMainIndices: number[] = [];
    for (let i = 1; i < 32; i++) {
      if (i === 6 || i === 16 || i === 22) continue;
      if (!earlyMainIndices.includes(i)) {
        midLateMainIndices.push(i);
      }
    }

    // 序盤5マス用プール（必ずキャリア1・物件2・イベント1・ファミリー1を含める）
    const earlyPool = seededShuffle<TileType>(
      ['career', 'property', 'property', 'event', 'family'],
      rng
    );

    // 中盤〜終盤23マス用プール（物件13, イベント5, キャリア1, ファミリー1, ボーナス2, ショップ1, 税金2 = 25? Wait: 28 - 5 = 23枠）
    // 内訳調整: property 13 + event 4 + career 1 + family 1 + bonus 1 + shop 1 + tax 2 = 23枠！
    const mainPool = seededShuffle<TileType>(
      [
        'property',
        'property',
        'property',
        'property',
        'property',
        'property',
        'property',
        'property',
        'property',
        'property',
        'property',
        'property',
        'property',
        'event',
        'event',
        'event',
        'event',
        'career',
        'family',
        'bonus',
        'shop',
        'tax',
        'tax',
      ],
      rng
    );

    const tileTypesById: Record<number, TileType> = {
      0: 'start',
      6: 'branch',
      16: 'jail',
      22: 'branch',
    };

    earlyMainIndices.forEach((tileIdx, idx) => {
      tileTypesById[tileIdx] = earlyPool[idx];
    });

    midLateMainIndices.forEach((tileIdx, idx) => {
      tileTypesById[tileIdx] = mainPool[idx];
    });

    // 分岐1 (32, 33, 34)
    tileTypesById[32] = branch1Types[0];
    tileTypesById[33] = branch1Types[1];
    tileTypesById[34] = branch1Types[2];

    // 分岐2 (35, 36, 37)
    tileTypesById[35] = branch2Types[0];
    tileTypesById[36] = branch2Types[1];
    tileTypesById[37] = branch2Types[2];

    // 物件テンプレート（計17件）を進み具合に合わせて割り当て（最後の2件は分岐2の高級物件枠にもなる）
    let propCursor = 0;
    const tiles: BoardTile[] = [];

    const buildTile = (
      id: number,
      pos: Vec3,
      nextTileIds: number[],
      isBranchSubTile = false
    ): BoardTile => {
      const type = tileTypesById[id];

      if (type === 'start') {
        return {
          id,
          name: 'スタートゲート',
          type: 'start',
          position: pos,
          nextTileIds,
        };
      }

      if (type === 'branch') {
        const isFirstBranch = id === 6;
        return {
          id,
          name: isFirstBranch ? 'ライフスタイル分岐点' : 'メトロポリス分岐点',
          type: 'branch',
          position: pos,
          nextTileIds,
          branchNames: isFirstBranch
            ? ['外周メイン通り（商業・標準）', '内周キャリア＆ファミリールート']
            : ['外周メイン通り（バランス）', '内周ハイリスク特区ルート'],
        };
      }

      if (type === 'jail') {
        return {
          id,
          name: '中央刑務所',
          type: 'jail',
          position: pos,
          nextTileIds,
        };
      }

      if (type === 'property') {
        const tpl = PROPERTY_TEMPLATES[propCursor % PROPERTY_TEMPLATES.length];
        propCursor++;
        return {
          id,
          name: tpl.name,
          type: 'property',
          position: pos,
          nextTileIds,
          isBranchSubTile,
          propertyType: tpl.propertyType,
          groupId: tpl.groupId,
          groupName: tpl.groupName,
          groupColor: tpl.groupColor,
          basePrice: tpl.basePrice,
          ownerId: null,
          level: 1,
        };
      }

      const typeNameMap: Record<Exclude<TileType, 'start' | 'branch' | 'jail' | 'property'>, string> = {
        event: 'ハプニング＆チャンス',
        career: 'キャリアセンター',
        family: 'ファミリープラザ',
        bonus: 'トレジャーボーナス',
        shop: 'セレクトショップ',
        tax: '税務署・資産課税',
      };

      return {
        id,
        name: typeNameMap[type],
        type,
        position: pos,
        nextTileIds,
        isBranchSubTile,
      };
    };

    // メインループ (0..31) の生成
    for (let i = 0; i < 32; i++) {
      const nextMain = (i + 1) % 32;
      let nextIds = [nextMain];
      if (i === 6) {
        nextIds = [7, 32]; // 7: 外周メイン, 32: 分岐1
      } else if (i === 22) {
        nextIds = [23, 35]; // 23: 外周メイン, 35: 分岐2
      }
      tiles.push(buildTile(i, mainPositions[i], nextIds, false));
    }

    // 分岐1 (32 -> 33 -> 34 -> 12)
    tiles.push(buildTile(32, branch1Positions[0], [33], true));
    tiles.push(buildTile(33, branch1Positions[1], [34], true));
    tiles.push(buildTile(34, branch1Positions[2], [12], true));

    // 分岐2 (35 -> 36 -> 37 -> 28)
    tiles.push(buildTile(35, branch2Positions[0], [36], true));
    tiles.push(buildTile(36, branch2Positions[1], [37], true));
    tiles.push(buildTile(37, branch2Positions[2], [28], true));

    return tiles;
  }
}

// ==========================================
// 物件収益・評価額・強化費用計算ヘルパー関数群 (仕様書5章・7章準拠)
// ==========================================

/**
 * 指定されたグループIDの物件をすべて同一プレイヤーが所有（独占）しているか判定
 */
export function isGroupMonopolized(
  allTiles: BoardTile[],
  groupId: string | undefined,
  ownerId: string | null | undefined
): boolean {
  if (!groupId || !ownerId) return false;
  const groupTiles = allTiles.filter((t) => t.type === 'property' && t.groupId === groupId);
  if (groupTiles.length === 0) return false;
  return groupTiles.every((t) => t.ownerId === ownerId);
}

/**
 * 同一プレイヤーが所有している特殊物件の総数を取得
 */
export function countOwnedSpecialProperties(
  allTiles: BoardTile[],
  ownerId: string | null | undefined
): number {
  if (!ownerId) return 0;
  return allTiles.filter(
    (t) => t.type === 'property' && t.propertyType === 'special' && t.ownerId === ownerId
  ).length;
}

/**
 * 物件の基本購入費用を計算（不動産ブローカー15%割引、物件割引チケット30%割引対応）
 */
export function calculatePropertyPurchaseCost(
  tile: BoardTile,
  buyerJobId: JobId,
  hasDiscountTicket = false
): number {
  const base = tile.basePrice ?? 0;
  let multiplier = 1.0;
  if (buyerJobId === 'real_estate') {
    multiplier *= 0.85; // 不動産ブローカー: 15%割引
  }
  if (hasDiscountTicket) {
    multiplier *= 0.7; // 物件割引チケット: 30%割引
  }
  return Math.max(10, Math.round((base * multiplier) / 10) * 10);
}

/**
 * 物件の強化費用を計算
 * - Lv1 -> Lv2: 基本価格 × 50%
 * - Lv2 -> Lv3: 基本価格 × 100%
 * - 不動産ブローカーは15%割引、割引チケット使用時は30%割引
 */
export function calculateUpgradeCost(
  tile: BoardTile,
  ownerJobId: JobId,
  hasDiscountTicket = false
): number {
  const base = tile.basePrice ?? 0;
  const currentLevel = tile.level ?? 1;
  if (currentLevel >= 3) return 0;

  const baseUpgradeCost = currentLevel === 1 ? base * 0.5 : base * 1.0;
  let multiplier = 1.0;
  if (ownerJobId === 'real_estate') {
    multiplier *= 0.85;
  }
  if (hasDiscountTicket) {
    multiplier *= 0.7;
  }
  return Math.max(10, Math.round((baseUpgradeCost * multiplier) / 10) * 10);
}

/**
 * 物件の評価額（基本購入価格 + 累積強化費用）を計算
 * - Lv1: 基本価格 × 100%
 * - Lv2: 基本価格 × 150%
 * - Lv3: 基本価格 × 250%
 */
export function calculatePropertyValuation(tile: BoardTile): number {
  const base = tile.basePrice ?? 0;
  const level = tile.level ?? 1;
  if (level === 1) return base;
  if (level === 2) return Math.round(base * 1.5);
  return Math.round(base * 2.5);
}

/**
 * 銀行への売却価格を計算（物件評価額 × 70%）
 */
export function calculateBankSellValue(tile: BoardTile): number {
  const valuation = calculatePropertyValuation(tile);
  return Math.round((valuation * BANK_SELL_RATIO) / 10) * 10;
}

/**
 * 住宅地・特殊物件・商業施設マス停止時の通行料を計算
 * - 住宅地: Lv1=20%, Lv2=50%, Lv3=100% (グループ独占時は ×1.5)
 * - 特殊物件: 基本価格 × 0.25 × 所有特殊物件数 (Lv2時は×1.25, Lv3時は×1.5補正)
 * - 商業施設: 主収益はターン開始時の定期収益だが、他プレイヤー停止時にも基本価格の10%(Lv1)/15%(Lv2)/20%(Lv3)の利用料が発生
 */
export function calculatePropertyToll(
  tile: BoardTile,
  allTiles: BoardTile[],
  hasTollShield = false
): number {
  if (tile.type !== 'property' || !tile.ownerId || !tile.basePrice) return 0;

  const base = tile.basePrice;
  const level = tile.level ?? 1;
  let rawToll = 0;

  if (tile.propertyType === 'residential') {
    const rate = level === 1 ? 0.2 : level === 2 ? 0.5 : 1.0;
    rawToll = base * rate;
    if (isGroupMonopolized(allTiles, tile.groupId, tile.ownerId)) {
      rawToll *= GROUP_MONOPOLY_MULTIPLIER;
    }
  } else if (tile.propertyType === 'special') {
    const specialCount = Math.max(1, countOwnedSpecialProperties(allTiles, tile.ownerId));
    const levelBoost = level === 1 ? 1.0 : level === 2 ? 1.25 : 1.5;
    rawToll = base * 0.25 * specialCount * levelBoost;
  } else {
    // commercial: 他プレイヤー立ち寄り時の施設利用料（主収益は定期収益）
    const rate = level === 1 ? 0.15 : level === 2 ? 0.3 : 0.5;
    rawToll = base * rate;
    if (isGroupMonopolized(allTiles, tile.groupId, tile.ownerId)) {
      rawToll *= GROUP_MONOPOLY_MULTIPLIER;
    }
  }

  if (hasTollShield) {
    rawToll *= 0.5; // 通行料半減シールド
  }

  return Math.max(10, Math.round(rawToll / 10) * 10);
}

/**
 * 商業施設のターン開始時定期収益を計算
 * - Lv1: 基本購入価格の 10%
 * - Lv2: 基本購入価格の 20%
 * - Lv3: 基本購入価格の 30%
 * - グループ独占時は ×1.5
 * - 投資家・実業家（investor）はパッシブ能力で ×1.2
 */
export function calculateCommercialRegularIncome(
  tile: BoardTile,
  allTiles: BoardTile[],
  ownerJobId: JobId
): number {
  if (tile.type !== 'property' || tile.propertyType !== 'commercial' || !tile.ownerId || !tile.basePrice) {
    return 0;
  }
  const base = tile.basePrice;
  const level = tile.level ?? 1;
  const rate = level === 1 ? 0.1 : level === 2 ? 0.2 : 0.3;
  let income = base * rate;

  if (isGroupMonopolized(allTiles, tile.groupId, tile.ownerId)) {
    income *= GROUP_MONOPOLY_MULTIPLIER;
  }
  if (ownerJobId === 'investor') {
    income *= 1.2;
  }

  return Math.max(10, Math.round(income / 10) * 10);
}
