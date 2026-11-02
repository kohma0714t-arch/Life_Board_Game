/**
 * Life Board - ゲームルール定数・マスターデータ定義
 * 確定仕様書 (online_board_game_spec_summary.md / docs/gdd.md) 100%準拠
 * 金額単位はすべて「万円」（例: 1000 = 1,000万円）
 */

// ==========================================
// 1. 基本ルール定数
// ==========================================
export const INITIAL_CASH = 1000; // 初期所持金: 1,000万円
export const INITIAL_PROPERTY_LIMIT = 2; // 初期物件所有上限: 2件
export const MAX_PROPERTY_LIMIT_CAP = 9; // 不動産ブローカーRank3(8件) + 不動産資格証(+1)
export const MAX_ITEM_LIMIT = 3; // アイテム所持上限: 消費型・永続型合わせて最大3個

export const TURN_TIME_LIMIT_SEC = 90; // 1ターンの思考制限時間: 90秒
export const AFK_TIME_LIMIT_SEC = 5; // 放置（AFK）状態時の短縮制限時間: 5秒
export const AFK_CONSECUTIVE_TIMEOUTS = 2; // 連続タイムアウトによるAFK移行回数: 2回
export const TRADE_RESPONSE_TIME_SEC = 20; // プレイヤー間取引の応答制限時間: 20秒
export const AUCTION_BID_TIME_SEC = 15; // 公開競売の1手あたり思考制限時間: 15秒

export const JAIL_BAIL_COST = 300; // 刑務所の保釈金: 300万円
export const JAIL_MAX_TURNS = 3; // 刑務所の最大拘束ターン数: 3ターン
export const JAIL_ESCAPE_DICE_TARGET = 6; // 刑務所脱出ルーレット成功出目: 6

export const UNEMPLOYED_FIRST_ALLOWANCE = 100; // 無職初回スタート通過時の失業手当: 100万円
export const SPOUSE_LIVING_COST = 50; // 配偶者の生活費（スタート通過時）: 50万円
export const CHILD_LIVING_COST = 50; // 子供1人あたりの生活費（スタート通過時）: 50万円
export const MAX_CHILDREN = 3; // 子供の最大人数: 3人

export const MARRIAGE_GIFT_BONUS = 300; // 結婚時のご祝儀ボーナス: 300万円
export const CHILDBIRTH_GIFT_BONUS = 200; // 出産時の出産祝い金・育児手当: 200万円
export const FAMILY_BOND_BONUS_PER_MEMBER = 150; // 家族イベント時の家族1人あたりボーナス: 150万円

export const AUCTION_START_RATIO = 0.5; // 競売開始価格倍率: 基本購入価格の50%
export const AUCTION_MIN_INCREMENT = 50; // 競売の最低入札引き上げ単位: 50万円
export const BANK_SELL_RATIO = 0.7; // 銀行売却時の換金率: 総投資額の70%
export const ITEM_SHOP_SELL_RATIO = 0.5; // ショップでのアイテム売却・下取り換金率: 50%
export const GROUP_MONOPOLY_MULTIPLIER = 1.5; // エリア独占時の収益倍率: 1.5倍

export const EVENT_RANDOM_RATIO = 0.6; // イベントマスでのランダム即時イベント発生率: 60%
export const EVENT_CHOICE_RATIO = 0.4; // イベントマスでの選択型イベント発生率: 40%

export const TURN_MODE_OPTIONS = [10, 20, 30, 50] as const;
export const TIME_MODE_OPTIONS_MIN = [15, 30, 45] as const;

// ==========================================
// 2. 立体コマ（ポーン）＆テーマカラー＆特別スキン定義
// ==========================================
export type CharacterId =
  | 'char_1'
  | 'char_2'
  | 'char_3'
  | 'char_4'
  | 'char_5'
  | 'char_6';

export type TokenSkinId =
  | 'standard'
  | 'metallic_gold'
  | 'crystal_prism'
  | 'neon_cyber';

export interface CharacterDefinition {
  id: CharacterId;
  name: string;
  title: string;
  description: string;
  defaultColorId: ThemeColorId;
  avatarKey: string;
  iconEmoji: string;
  unlockCostCoins: number;
  isInitialUnlocked: boolean;
}

export interface TokenSkinDefinition {
  id: TokenSkinId;
  name: string;
  subtitle: string;
  description: string;
  badgeEmoji: string;
  unlockCostCoins: number;
  isInitialUnlocked: boolean;
  requiresLogin: boolean;
}

export type ThemeColorId = 'blue' | 'red' | 'green' | 'yellow' | 'purple';

export interface ThemeColorDefinition {
  id: ThemeColorId;
  name: string;
  hex: string;
  lightHex: string;
  darkHex: string;
}

export const THEME_COLORS: Record<ThemeColorId, ThemeColorDefinition> = {
  blue: {
    id: 'blue',
    name: 'スカイブルー',
    hex: '#3b82f6',
    lightHex: '#93c5fd',
    darkHex: '#1d4ed8',
  },
  red: {
    id: 'red',
    name: 'コーラルレッド',
    hex: '#ef4444',
    lightHex: '#fca5a5',
    darkHex: '#b91c1c',
  },
  green: {
    id: 'green',
    name: 'エメラルドグリーン',
    hex: '#22c55e',
    lightHex: '#86efac',
    darkHex: '#15803d',
  },
  yellow: {
    id: 'yellow',
    name: 'サンシャインイエロー',
    hex: '#eab308',
    lightHex: '#fde047',
    darkHex: '#a16207',
  },
  purple: {
    id: 'purple',
    name: 'ロイヤルパープル',
    hex: '#a855f7',
    lightHex: '#d8b4fe',
    darkHex: '#7e22ce',
  },
};

export const THEME_COLOR_LIST: ThemeColorDefinition[] = Object.values(THEME_COLORS);

export const CHARACTERS: Record<CharacterId, CharacterDefinition> = {
  char_1: {
    id: 'char_1',
    name: 'クラシック・ポーン',
    title: '王道ボードゲームの象徴',
    description: '手になじむ流線型シルエット。どんな盤面でも安定した存在感を放つ王道立体ピン。',
    defaultColorId: 'blue',
    avatarKey: 'char_1',
    iconEmoji: '♟️',
    unlockCostCoins: 0,
    isInitialUnlocked: true,
  },
  char_2: {
    id: 'char_2',
    name: 'GTスポーツカー',
    title: 'ハイウェイを駆ける疾風',
    description: '人生ゲームの華！エアロフォルムとリアウイングが輝く流線型スポーツカー立体コマ。',
    defaultColorId: 'red',
    avatarKey: 'char_2',
    iconEmoji: '🏎️',
    unlockCostCoins: 0,
    isInitialUnlocked: true,
  },
  char_3: {
    id: 'char_3',
    name: 'クラウン・ナイト',
    title: '知略と誇りの騎士紋章',
    description: 'チェスの騎士（ナイト）と王冠レリーフを融合した、戦略家にふさわしい気品ある立体コマ。',
    defaultColorId: 'green',
    avatarKey: 'char_3',
    iconEmoji: '🐴',
    unlockCostCoins: 0,
    isInitialUnlocked: true,
  },
  char_4: {
    id: 'char_4',
    name: 'スカイ・ジェット',
    title: '大空を制するプライベート機',
    description: '世界中の都市とリゾートを飛び回る、流線型ウィングのプライベートジェット立体コマ。',
    defaultColorId: 'yellow',
    avatarKey: 'char_4',
    iconEmoji: '✈️',
    unlockCostCoins: 0,
    isInitialUnlocked: true,
  },
  char_5: {
    id: 'char_5',
    name: 'ロイヤル・クルーザー',
    title: '大海原のラグジュアリー艇',
    description: '【報酬解放コマ】成功者の証である3デッキ仕様の豪華モーターヨット立体コマ。',
    defaultColorId: 'purple',
    avatarKey: 'char_5',
    iconEmoji: '🛥️',
    unlockCostCoins: 300,
    isInitialUnlocked: false,
  },
  char_6: {
    id: 'char_6',
    name: 'エンペラー・クラウン',
    title: '覇者の至高王冠モノリス',
    description: '【報酬解放コマ】盤面の支配者にのみ許された、宝石と黄金の翼が輝く皇帝クラウン立体コマ。',
    defaultColorId: 'yellow',
    avatarKey: 'char_6',
    iconEmoji: '👑',
    unlockCostCoins: 500,
    isInitialUnlocked: false,
  },
};

export const CHARACTER_LIST: CharacterDefinition[] = Object.values(CHARACTERS);

export const TOKEN_SKINS: Record<TokenSkinId, TokenSkinDefinition> = {
  standard: {
    id: 'standard',
    name: 'スタンダード（グロス塗装）',
    subtitle: '初期装備',
    description: 'テーマカラーが鮮やかに発色する、ボードゲーム王道の艶ありグロス仕上げ。',
    badgeEmoji: '🎨',
    unlockCostCoins: 0,
    isInitialUnlocked: true,
    requiresLogin: false,
  },
  metallic_gold: {
    id: 'metallic_gold',
    name: '純金ゴールド（24K Gold）',
    subtitle: '要ログイン・報酬解放',
    description: 'コマ全体が眩い24Kゴールドの金属光沢を放ち、台座に黄金リングが輝く特別スキン。',
    badgeEmoji: '✨',
    unlockCostCoins: 250,
    isInitialUnlocked: false,
    requiresLogin: true,
  },
  crystal_prism: {
    id: 'crystal_prism',
    name: 'クリスタル・プリズム',
    subtitle: '要ログイン・報酬解放',
    description: '透き通る宝石クリスタル調の光沢とプリズム反射を備えた神秘的な特別スキン。',
    badgeEmoji: '💎',
    unlockCostCoins: 350,
    isInitialUnlocked: false,
    requiresLogin: true,
  },
  neon_cyber: {
    id: 'neon_cyber',
    name: 'ネオン・サイバーグロウ',
    subtitle: '要ログイン・報酬解放',
    description: '高輝度ネオンエネルギーが脈動し、3Dボード上で鮮烈な発光オーラを放つ特別スキン。',
    badgeEmoji: '⚡',
    unlockCostCoins: 400,
    isInitialUnlocked: false,
    requiresLogin: true,
  },
};

export const TOKEN_SKIN_LIST: TokenSkinDefinition[] = Object.values(TOKEN_SKINS);

// ==========================================
// 3. 職業定義 (全8職種・仕様書7.1完全準拠)
// ==========================================
export type JobId =
  | 'unemployed'
  | 'office_worker'
  | 'civil_servant'
  | 'engineer'
  | 'doctor'
  | 'real_estate'
  | 'investor'
  | 'celebrity';

export type JobRank = 1 | 2 | 3;

export interface JobDefinition {
  id: JobId;
  name: string;
  rankNames: [string, string, string];
  category: string;
  salaries: [number, number, number]; // Rank 1, 2, 3
  propertyLimits: [number, number, number]; // Rank 1, 2, 3
  passiveSummary: string;
  icon: string;
}

export const JOBS: Record<JobId, JobDefinition> = {
  unemployed: {
    id: 'unemployed',
    name: '無職（フリーター）',
    rankNames: ['新卒・求職中', 'フリーター', 'フリーター'],
    category: '初期状態／失業状態',
    salaries: [100, 0, 0], // 初回通過のみ100万円、2回目以降0円
    propertyLimits: [2, 2, 2],
    passiveSummary: 'なし（初回スタート通過のみ失業手当100万円、2回目以降0円）',
    icon: '🎒',
  },
  office_worker: {
    id: 'office_worker',
    name: '会社員',
    rankNames: ['一般社員', '課長・マネージャー', '執行役員'],
    category: 'バランス・安定型',
    salaries: [200, 350, 500],
    propertyLimits: [3, 4, 5],
    passiveSummary: '失業イベント無効化、家族の生活費10%軽減',
    icon: '💼',
  },
  civil_servant: {
    id: 'civil_servant',
    name: '公務員',
    rankNames: ['行政職員', '係長・主査', '局長・審議官'],
    category: '堅実・守備型',
    salaries: [200, 300, 450],
    propertyLimits: [3, 4, 5],
    passiveSummary: '税金マスの支払い額30%〜50%軽減（Rank1:30%, Rank2:40%, Rank3:50%）',
    icon: '🏛️',
  },
  engineer: {
    id: 'engineer',
    name: 'エンジニア',
    rankNames: ['Webエンジニア', 'テックリード', 'CTO（最高技術責任者）'],
    category: '成長・イベント有利型',
    salaries: [250, 450, 700],
    propertyLimits: [3, 4, 5],
    passiveSummary: '選択型イベントの成功判定ルーレットに出目+1補正',
    icon: '💻',
  },
  doctor: {
    id: 'doctor',
    name: '医者',
    rankNames: ['研修医・勤務医', '専門医・医長', '大学病院院長'],
    category: '高給・エリート型',
    salaries: [400, 700, 1000],
    propertyLimits: [3, 4, 4],
    passiveSummary: '病気・怪我・事故系のマイナスイベント無効化',
    icon: '🩺',
  },
  real_estate: {
    id: 'real_estate',
    name: '不動産ブローカー',
    rankNames: ['宅建エージェント', '不動産コンサルタント', '都市開発デベロッパー'],
    category: '不動産特化型',
    salaries: [150, 250, 400],
    propertyLimits: [5, 6, 8],
    passiveSummary: '物件の基本購入価格・強化費用が15%割引',
    icon: '🏢',
  },
  investor: {
    id: 'investor',
    name: '投資家・実業家',
    rankNames: ['個人投資家', 'ベンチャーキャピタリスト', 'ファンド創業者'],
    category: '商業・資産運用型',
    salaries: [200, 350, 600],
    propertyLimits: [4, 6, 7],
    passiveSummary: '商業施設の定期収益が1.2倍に増加',
    icon: '📈',
  },
  celebrity: {
    id: 'celebrity',
    name: '芸能人',
    rankNames: ['新人タレント', '人気俳優・モデル', '国民的スーパースター'],
    category: 'ハイリスク・高爆発力',
    salaries: [300, 600, 1200],
    propertyLimits: [3, 4, 5],
    passiveSummary: 'ボーナスマスおよびプラスイベントの報酬1.5倍',
    icon: '🌟',
  },
};

export const EMPLOYABLE_JOB_IDS: JobId[] = [
  'office_worker',
  'civil_servant',
  'engineer',
  'doctor',
  'real_estate',
  'investor',
  'celebrity',
];

// ==========================================
// 4. アイテム定義 (仕様書10章準拠)
// ==========================================
export type ItemId =
  | 'dice_select'
  | 'toll_shield'
  | 'discount_ticket'
  | 'jail_free'
  | 'luxury_watch'
  | 'realtor_license'
  | 'private_cruiser';

export type ItemCategory = 'consumable' | 'permanent';

export interface ItemDefinition {
  id: ItemId;
  name: string;
  category: ItemCategory;
  price: number; // ショップ購入価格（万円）
  assetValue: number; // 純資産評価額（永続型は価格と同額、消費型は0）
  description: string;
  icon: string;
  usableInPreMove: boolean; // Phase 2で能動使用するか
}

export const ITEMS: Record<ItemId, ItemDefinition> = {
  dice_select: {
    id: 'dice_select',
    name: '指定出目カード',
    category: 'consumable',
    price: 200,
    assetValue: 0,
    description: '移動前に使用すると、今回のルーレット出目を1〜6から自由に指定できる。',
    icon: '🎯',
    usableInPreMove: true,
  },
  toll_shield: {
    id: 'toll_shield',
    name: '通行料半減シールド',
    category: 'consumable',
    price: 150,
    assetValue: 0,
    description: '使用するとシールドを展開し、次回他プレイヤーに支払う通行料を50%軽減する（所持中自動発動も可）。',
    icon: '🛡️',
    usableInPreMove: true,
  },
  discount_ticket: {
    id: 'discount_ticket',
    name: '物件割引チケット',
    category: 'consumable',
    price: 150,
    assetValue: 0,
    description: '使用すると割引バフを付与し、次回の物件購入または強化費用を30%割引する（所持中自動発動も可）。',
    icon: '🎫',
    usableInPreMove: true,
  },
  jail_free: {
    id: 'jail_free',
    name: '脱獄カード',
    category: 'consumable',
    price: 150,
    assetValue: 0,
    description: '刑務所収監時のターン開始時に使用すると、保釈金なしで即座に釈放される。',
    icon: '🗝️',
    usableInPreMove: false,
  },
  luxury_watch: {
    id: 'luxury_watch',
    name: '高級腕時計',
    category: 'permanent',
    price: 300,
    assetValue: 300,
    description: '【永続資産：評価額300万円】所持している間、選択型イベントの成功判定ルーレットに出目+1補正。',
    icon: '⌚',
    usableInPreMove: false,
  },
  realtor_license: {
    id: 'realtor_license',
    name: '不動産資格証',
    category: 'permanent',
    price: 500,
    assetValue: 500,
    description: '【永続資産：評価額500万円】所持している間、物件の所有上限が常時 +1件 拡張される。',
    icon: '📜',
    usableInPreMove: false,
  },
  private_cruiser: {
    id: 'private_cruiser',
    name: '自家用クルーザー',
    category: 'permanent',
    price: 1000,
    assetValue: 1000,
    description: '【永続資産：評価額1,000万円】所持している間、ボーナスマスでの獲得収益が +50% 増加する。',
    icon: '🛥️',
    usableInPreMove: false,
  },
};

export const ITEM_LIST: ItemDefinition[] = Object.values(ITEMS);

// ==========================================
// 5. イベント定義 (ランダム60% / 選択型40%)
// ==========================================
export type RandomEventEffectType =
  | 'cash_gain'
  | 'cash_loss'
  | 'medical_expense' // 医者は無効化
  | 'layoff' // 会社員は無効化
  | 'inheritance'
  | 'lottery'
  | 'item_grant'
  | 'family_bonus'
  | 'send_to_jail';

export interface RandomEventDefinition {
  id: string;
  title: string;
  description: string;
  effectType: RandomEventEffectType;
  amount: number; // 現金増減額（万円）
  grantItemId?: ItemId;
  isPositive: boolean;
}

export const RANDOM_EVENTS: RandomEventDefinition[] = [
  {
    id: 'rand_bonus_project',
    title: 'プロジェクト大成功！',
    description: '関わっていた大型案件が大ヒットし、特別賞与250万円を獲得した！',
    effectType: 'cash_gain',
    amount: 250,
    isPositive: true,
  },
  {
    id: 'rand_lottery_win',
    title: 'ジャンボ宝くじ当選！',
    description: '気まぐれで買った宝くじが見事当選！賞金400万円を手に入れた！',
    effectType: 'lottery',
    amount: 400,
    isPositive: true,
  },
  {
    id: 'rand_inheritance',
    title: '遠縁からの遺産相続',
    description: '資産家だった親戚から遺産300万円を相続することになった。',
    effectType: 'inheritance',
    amount: 300,
    isPositive: true,
  },
  {
    id: 'rand_media_appearance',
    title: 'トレンド特集に出演',
    description: '街頭インタビューやSNS特集で話題になり、出演料150万円を獲得！',
    effectType: 'cash_gain',
    amount: 150,
    isPositive: true,
  },
  {
    id: 'rand_found_item',
    title: '福引で特賞チケット当選！',
    description: '商店街のガラポン抽選会で「物件割引チケット」を引き当てた！',
    effectType: 'item_grant',
    amount: 100,
    grantItemId: 'discount_ticket',
    isPositive: true,
  },
  {
    id: 'rand_medical_injury',
    title: '急病と入院治療',
    description: '過労と怪我で緊急入院することに…。治療費200万円を支払う（※医者は固有能力で完全無効化）。',
    effectType: 'medical_expense',
    amount: 200,
    isPositive: false,
  },
  {
    id: 'rand_traffic_accident',
    title: '追突事故の示談・修理費',
    description: '不運な接触事故に巻き込まれ、修理・治療費150万円を支払う（※医者は固有能力で完全無効化）。',
    effectType: 'medical_expense',
    amount: 150,
    isPositive: false,
  },
  {
    id: 'rand_company_layoff',
    title: '突然の業績悪化とリストラ',
    description: '業界再編の波に飲まれて失業（無職）になってしまった…（※会社員は雇用保証パッシブで完全無効化）。',
    effectType: 'layoff',
    amount: 0,
    isPositive: false,
  },
  {
    id: 'rand_home_repair',
    title: '大型台風による修繕出費',
    description: '暴風雨の影響で自宅設備の修理が必要になり、150万円を支払った。',
    effectType: 'cash_loss',
    amount: 150,
    isPositive: false,
  },
  {
    id: 'rand_tax_audit',
    title: '不慮の交通違反・反則金',
    description: 'うっかり進入禁止エリアに入ってしまい、反則金とレッカー代100万円を支払った。',
    effectType: 'cash_loss',
    amount: 100,
    isPositive: false,
  },
];

export interface ChoiceEventOption {
  id: string;
  label: string;
  description: string;
  cost: number; // 参加費用（0なら無料）
  minSuccessRoll: number; // 1〜6のルーレットでこの値以上なら成功（0ならルーレットなしで確定成功）
  successCash: number; // 成功時の獲得金額（万円）
  successPromote?: boolean; // 成功時に昇進するか
  successItemId?: ItemId; // 成功時に獲得するアイテム
  failCashLoss: number; // 失敗時の追加損失（万円）
  failSendToJail?: boolean; // 失敗時に刑務所送りになるか
}

export interface ChoiceEventDefinition {
  id: string;
  title: string;
  description: string;
  options: ChoiceEventOption[];
}

export const CHOICE_EVENTS: ChoiceEventDefinition[] = [
  {
    id: 'choice_venture_invest',
    title: 'AIスタートアップへの出資話',
    description: '急成長中のAIベンチャー企業からエンジェル出資の勧誘を受けた。どう行動する？',
    options: [
      {
        id: 'venture_high',
        label: '大口出資で勝負する（出目4〜6で成功）',
        description: '成功すれば+500万円の大リターン！失敗すると200万円の損失。',
        cost: 0,
        minSuccessRoll: 4,
        successCash: 500,
        failCashLoss: 200,
      },
      {
        id: 'venture_safe',
        label: '少額の堅実ファンドにする（確定成功）',
        description: 'リスクなしで確実に+100万円の配当を受け取る。',
        cost: 0,
        minSuccessRoll: 0,
        successCash: 100,
        failCashLoss: 0,
      },
      {
        id: 'venture_skip',
        label: '投資を見送る',
        description: '手元資金を温存して何もしない。',
        cost: 0,
        minSuccessRoll: 0,
        successCash: 0,
        failCashLoss: 0,
      },
    ],
  },
  {
    id: 'choice_qualification_exam',
    title: '難関キャリア資格試験への挑戦',
    description: '合格すれば昇進＆報奨金が出る国家資格試験が開催される。挑戦する？',
    options: [
      {
        id: 'exam_challenge',
        label: '猛勉強して受験する（出目3〜6で成功）',
        description: '成功で報奨金250万円＋現職ランク昇進！失敗すると受験・講座費用100万円を失う。',
        cost: 0,
        minSuccessRoll: 3,
        successCash: 250,
        successPromote: true,
        failCashLoss: 100,
      },
      {
        id: 'exam_seminar',
        label: '実務セミナーだけ受講する（確定成功）',
        description: '確実にスキルアップ手当80万円を獲得する。',
        cost: 0,
        minSuccessRoll: 0,
        successCash: 80,
        failCashLoss: 0,
      },
      {
        id: 'exam_pass',
        label: '今回は見送る',
        description: '受験せずに休養を取る。',
        cost: 0,
        minSuccessRoll: 0,
        successCash: 0,
        failCashLoss: 0,
      },
    ],
  },
  {
    id: 'choice_real_estate_auction',
    title: 'リゾート開発プロジェクト参画',
    description: '海沿いの大型リゾート開発コンペが開催中。どのプランで参画する？',
    options: [
      {
        id: 'resort_main',
        label: 'メインスポンサーとして参画（出目4〜6で成功）',
        description: '成功で開発利益450万円＋「物件割引チケット」獲得！失敗で150万円の損失。',
        cost: 0,
        minSuccessRoll: 4,
        successCash: 450,
        successItemId: 'discount_ticket',
        failCashLoss: 150,
      },
      {
        id: 'resort_sub',
        label: 'アドバイザーとして協力（出目2〜6で成功）',
        description: '高確率で成功し、謝礼200万円を獲得（失敗時は50万円損失）。',
        cost: 0,
        minSuccessRoll: 2,
        successCash: 200,
        failCashLoss: 50,
      },
      {
        id: 'resort_pass',
        label: '参画しない',
        description: 'リスクを避けて見送る。',
        cost: 0,
        minSuccessRoll: 0,
        successCash: 0,
        failCashLoss: 0,
      },
    ],
  },
  {
    id: 'choice_audition_stage',
    title: '全国メディア大型オーディション',
    description: '地上波CM＆特番のメインキャスト選考会！一躍スターダムに駆け上がるチャンス！',
    options: [
      {
        id: 'audition_lead',
        label: '主役枠に全力エントリー（出目5〜6で成功）',
        description: '成功すれば契約金600万円！失敗するとレッスン・衣装費150万円の負担。',
        cost: 0,
        minSuccessRoll: 5,
        successCash: 600,
        failCashLoss: 150,
      },
      {
        id: 'audition_sub',
        label: '準レギュラー枠を狙う（出目3〜6で成功）',
        description: '成功で出演料250万円！失敗時は50万円の負担。',
        cost: 0,
        minSuccessRoll: 3,
        successCash: 250,
        failCashLoss: 50,
      },
      {
        id: 'audition_skip',
        label: '辞退する',
        description: '今回は見送る。',
        cost: 0,
        minSuccessRoll: 0,
        successCash: 0,
        failCashLoss: 0,
      },
    ],
  },
  {
    id: 'choice_watch_bargain',
    title: 'オークションハウスの掘り出し物',
    description: '限定モデルの時計や優待カードが出品されている。鑑定眼を試すチャンス！',
    options: [
      {
        id: 'watch_bid',
        label: '真贋鑑定に挑んで落札（出目4〜6で成功）',
        description: '成功すれば永続資産「高級腕時計（評価額300万）」を無償獲得！失敗で150万円損失。',
        cost: 0,
        minSuccessRoll: 4,
        successCash: 50,
        successItemId: 'luxury_watch',
        failCashLoss: 150,
      },
      {
        id: 'card_bid',
        label: '指定出目カードを狙う（出目3〜6で成功）',
        description: '成功すれば「指定出目カード」を獲得！失敗で80万円損失。',
        cost: 0,
        minSuccessRoll: 3,
        successCash: 0,
        successItemId: 'dice_select',
        failCashLoss: 80,
      },
      {
        id: 'bargain_pass',
        label: '手を出さない',
        description: '怪しい出品には手を出さず立ち去る。',
        cost: 0,
        minSuccessRoll: 0,
        successCash: 0,
        failCashLoss: 0,
      },
    ],
  },
  {
    id: 'choice_offshore_deal',
    title: 'グレーゾーンの超裏口投資案件',
    description: '「絶対に儲かる」と噂の海外裏ファンドの話が舞い込んだ。危険な香りがするが…？',
    options: [
      {
        id: 'offshore_gamble',
        label: '一攫千金を狙って乗る（出目5〜6で成功）',
        description: '成功すれば+700万円の莫大な利益！ただし失敗すると当局に摘発され刑務所送り＋100万円没収！',
        cost: 0,
        minSuccessRoll: 5,
        successCash: 700,
        failCashLoss: 100,
        failSendToJail: true,
      },
      {
        id: 'offshore_report',
        label: '健全な国債運用に切り替える（確定成功）',
        description: '安全第一で運用益100万円を受け取る。',
        cost: 0,
        minSuccessRoll: 0,
        successCash: 100,
        failCashLoss: 0,
      },
      {
        id: 'offshore_ignore',
        label: 'きっぱり断る',
        description: '関わらずにその場を去る。',
        cost: 0,
        minSuccessRoll: 0,
        successCash: 0,
        failCashLoss: 0,
      },
    ],
  },
];
