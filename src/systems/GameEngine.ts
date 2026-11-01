import {
  AFK_CONSECUTIVE_TIMEOUTS,
  AFK_TIME_LIMIT_SEC,
  AUCTION_BID_TIME_SEC,
  AUCTION_MIN_INCREMENT,
  AUCTION_START_RATIO,
  CHOICE_EVENTS,
  CHILDBIRTH_GIFT_BONUS,
  CharacterId,
  ChoiceEventDefinition,
  EMPLOYABLE_JOB_IDS,
  EVENT_RANDOM_RATIO,
  FAMILY_BOND_BONUS_PER_MEMBER,
  INITIAL_CASH,
  ITEMS,
  ITEM_LIST,
  ITEM_SHOP_SELL_RATIO,
  ItemId,
  JAIL_BAIL_COST,
  JAIL_ESCAPE_DICE_TARGET,
  JAIL_MAX_TURNS,
  JOBS,
  JobId,
  JobRank,
  MARRIAGE_GIFT_BONUS,
  MAX_CHILDREN,
  MAX_ITEM_LIMIT,
  RANDOM_EVENTS,
  SPOUSE_LIVING_COST,
  CHILD_LIVING_COST,
  TRADE_RESPONSE_TIME_SEC,
  TURN_TIME_LIMIT_SEC,
  ThemeColorId,
  UNEMPLOYED_FIRST_ALLOWANCE,
} from '../config/constants';
import {
  BoardTile,
  MapGenerator,
  calculateBankSellValue,
  calculateCommercialRegularIncome,
  calculatePropertyPurchaseCost,
  calculatePropertyToll,
  calculatePropertyValuation,
  calculateUpgradeCost,
  createSeededRandom,
} from './MapGenerator';

export type TurnPhase =
  | 'TURN_START'
  | 'PRE_MOVE'
  | 'MOVING'
  | 'POST_MOVE'
  | 'TURN_END'
  | 'GAME_OVER';

export type PendingModalType =
  | 'NONE'
  | 'JAIL_DECISION'
  | 'BRANCH_SELECT'
  | 'PROPERTY_PURCHASE'
  | 'PROPERTY_UPGRADE'
  | 'CAREER_SELECT'
  | 'CHOICE_EVENT'
  | 'SHOP_INTERACT'
  | 'DEBT_LIQUIDATION'
  | 'AUCTION'
  | 'TRADE_RESPONSE'
  | 'EVENT_RESULT';

export type GameRuleMode = 'TURN_LIMIT' | 'TIME_LIMIT';

export interface GameConfig {
  roomId: string;
  seed: number;
  ruleMode: GameRuleMode;
  maxTurns: number; // 10 / 20 / 30 / 50
  timeLimitMinutes: number; // 15 / 30 / 45
}

export interface PlayerState {
  id: string;
  name: string;
  isCpu: boolean;
  isHost: boolean;
  isConnected: boolean;
  isAfk: boolean;
  consecutiveTimeouts: number;
  isBankrupt: boolean;
  characterId: CharacterId;
  colorId: ThemeColorId;

  cash: number;
  currentTileId: number;
  jobId: JobId;
  jobRank: JobRank;
  unemployedPassCount: number;

  hasSpouse: boolean;
  childrenCount: number;
  items: ItemId[];

  inJail: boolean;
  jailTurnsRemaining: number;

  usedItemThisTurn: boolean;
  proposedTradeThisTurn: boolean;
  forcedNextDice: number | null;
  activeTollShield: boolean;
  activeDiscountTicket: boolean;
}

export interface CareerChoiceOption {
  type: 'promote' | 'change_job' | 'keep_bonus';
  jobId: JobId;
  targetRank: JobRank;
  label: string;
  description: string;
  bonusCash: number;
}

export interface TradeProposal {
  id: string;
  fromPlayerId: string;
  toPlayerId: string;
  offerCash: number;
  offerPropertyIds: number[];
  offerItemIndices: number[];
  requestCash: number;
  requestPropertyIds: number[];
  requestItemIndices: number[];
  remainingSeconds: number;
}

export interface AuctionState {
  queueTileIds: number[];
  currentTileId: number;
  preservedLevel: 1 | 2 | 3;
  currentBid: number;
  highestBidderId: string | null;
  activeBidderIds: string[]; // まだパスしていない生存プレイヤーIDリスト
  currentTurnBidderId: string;
  remainingSeconds: number;
}

export interface DebtState {
  debtorPlayerId: string;
  creditorPlayerId: string | null; // nullなら銀行・税金・イベント支払い
  requiredAmount: number;
  reason: string;
}

export interface EventResultPopup {
  title: string;
  description: string;
  cashDelta?: number;
  badgeText?: string;
  isPositive?: boolean;
  diceRollValue?: number;
  diceBonusValue?: number;
}

export interface AssetBreakdown {
  playerId: string;
  playerName: string;
  characterId: CharacterId;
  colorId: ThemeColorId;
  isBankrupt: boolean;
  rank: number;
  cash: number;
  propertyValue: number;
  itemValue: number;
  totalNetWorth: number;
  ownedPropertyCount: number;
  familyCount: number;
  jobName: string;
  jobRank: JobRank;
}

export interface SpecialAward {
  id: string;
  title: string;
  icon: string;
  description: string;
  winnerPlayerId: string;
  winnerName: string;
  valueLabel: string;
}

export interface GameLogEntry {
  id: string;
  turn: number;
  playerId: string;
  message: string;
  timestamp: number;
  type: 'info' | 'income' | 'expense' | 'event' | 'property' | 'important';
}

export interface GameMoveStepEvent {
  playerId: string;
  fromTileId: number;
  toTileId: number;
  remainingSteps: number;
  passedStart: boolean;
}

export interface GameEngineCallbacks {
  onStateChanged?: () => void;
  onDiceRollRequested?: (
    playerId: string,
    targetValue: number,
    purpose: 'move' | 'jail' | 'event',
    onFinish: () => void
  ) => void;
  onPlayerStepped?: (step: GameMoveStepEvent, onStepAnimComplete: () => void) => void;
  onPopupEffect?: (
    tileId: number,
    text: string,
    color: string,
    effectType: 'coin' | 'build' | 'celebrate' | 'alert' | 'auction'
  ) => void;
  onLogAdded?: (entry: GameLogEntry) => void;
  onGameOver?: (rankings: AssetBreakdown[], awards: SpecialAward[]) => void;
}

export interface GameEngineSnapshot {
  config: GameConfig;
  tiles: Array<{
    id: number;
    ownerId: string | null;
    level: 1 | 2 | 3;
  }>;
  players: PlayerState[];
  currentRound: number;
  currentPlayerIndex: number;
  phase: TurnPhase;
  pendingModal: PendingModalType;
  turnTimerSec: number;
  elapsedGameSeconds: number;
  lastDiceValue: number;
  remainingMoveSteps: number;
  activeCareerOptions: CareerChoiceOption[];
  activeChoiceEvent: ChoiceEventDefinition | null;
  activeShopItems: ItemId[];
  activeTradeProposal: TradeProposal | null;
  activeAuction: AuctionState | null;
  activeDebt: DebtState | null;
  activeResultPopup: EventResultPopup | null;
  logs: GameLogEntry[];
}

export type RemotePlayerActionPayload =
  | { type: 'JAIL_DECISION'; playerId: string; method: 'bail' | 'card' | 'roll' }
  | { type: 'USE_ITEM'; playerId: string; itemId: ItemId; chosenDiceValue?: number }
  | { type: 'SELL_PROPERTY_BANK'; playerId: string; tileId: number }
  | {
      type: 'PROPOSE_TRADE';
      fromPlayerId: string;
      toPlayerId: string;
      offerCash: number;
      offerPropertyIds: number[];
      offerItemIndices: number[];
      requestCash: number;
      requestPropertyIds: number[];
      requestItemIndices: number[];
    }
  | { type: 'RESPOND_TRADE'; responderId: string; accept: boolean }
  | { type: 'ROLL_DICE'; playerId: string }
  | { type: 'SELECT_BRANCH'; playerId: string; nextTileId: number }
  | { type: 'PROPERTY_PURCHASE'; playerId: string; buy: boolean }
  | { type: 'PROPERTY_UPGRADE'; playerId: string; upgrade: boolean }
  | { type: 'SELECT_CAREER'; playerId: string; optionIndex: number }
  | { type: 'SELECT_CHOICE_EVENT'; playerId: string; optionIndex: number }
  | { type: 'BUY_SHOP_ITEM'; playerId: string; itemId: ItemId; discardSlotIndex?: number }
  | { type: 'SELL_SHOP_ITEM'; playerId: string; slotIndex: number }
  | { type: 'CLOSE_SHOP'; playerId: string }
  | { type: 'ACK_EVENT_RESULT'; playerId: string }
  | { type: 'PLACE_AUCTION_BID'; playerId: string; bidAmount: number }
  | { type: 'PASS_AUCTION'; playerId: string }
  | { type: 'END_TURN'; playerId: string };

export class GameEngine {
  public config: GameConfig;
  public tiles: BoardTile[] = [];
  public players: PlayerState[] = [];

  public currentRound = 1;
  public currentPlayerIndex = 0;
  public phase: TurnPhase = 'TURN_START';
  public pendingModal: PendingModalType = 'NONE';

  public turnTimerSec = TURN_TIME_LIMIT_SEC;
  public elapsedGameSeconds = 0;
  public lastDiceValue = 1;
  public remainingMoveSteps = 0;

  // モーダル・割り込み用コンテキストデータ
  public activeCareerOptions: CareerChoiceOption[] = [];
  public activeChoiceEvent: ChoiceEventDefinition | null = null;
  public activeShopItems: ItemId[] = [];
  public activeTradeProposal: TradeProposal | null = null;
  public activeAuction: AuctionState | null = null;
  public activeDebt: DebtState | null = null;
  public activeResultPopup: EventResultPopup | null = null;

  public logs: GameLogEntry[] = [];
  public isClientReplica = false;

  private rng: () => number;
  private callbacks: GameEngineCallbacks;
  private cpuThinkTimer = 0;
  private isAnimatingMoveOrDice = false;
  private remoteActionSender: ((action: RemotePlayerActionPayload) => void) | null = null;

  constructor(
    config: GameConfig,
    initialPlayers: Array<{
      id: string;
      name: string;
      isCpu: boolean;
      isHost: boolean;
      characterId: CharacterId;
      colorId: ThemeColorId;
    }>,
    callbacks: GameEngineCallbacks = {}
  ) {
    this.config = config;
    this.callbacks = callbacks;
    this.rng = createSeededRandom(config.seed);
    this.tiles = MapGenerator.generateBoard(config.seed);

    this.players = initialPlayers.map((p) => ({
      id: p.id,
      name: p.name,
      isCpu: p.isCpu,
      isHost: p.isHost,
      isConnected: true,
      isAfk: false,
      consecutiveTimeouts: 0,
      isBankrupt: false,
      characterId: p.characterId,
      colorId: p.colorId,
      cash: INITIAL_CASH,
      currentTileId: 0,
      jobId: 'unemployed',
      jobRank: 1,
      unemployedPassCount: 0,
      hasSpouse: false,
      childrenCount: 0,
      items: [],
      inJail: false,
      jailTurnsRemaining: 0,
      usedItemThisTurn: false,
      proposedTradeThisTurn: false,
      forcedNextDice: null,
      activeTollShield: false,
      activeDiscountTicket: false,
    }));
  }

  public setCallbacks(callbacks: GameEngineCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * P2Pゲストクライアント用のレプリカモード設定
   */
  public setRemoteReplicaMode(
    isReplica: boolean,
    sender?: (action: RemotePlayerActionPayload) => void
  ): void {
    this.isClientReplica = isReplica;
    this.remoteActionSender = sender ?? null;
  }

  /**
   * 現在のエンジン全状態をシリアライズ可能なスナップショットとして出力（P2Pホスト配信用）
   */
  public exportSnapshot(): GameEngineSnapshot {
    return {
      config: { ...this.config },
      tiles: this.tiles.map((t) => ({
        id: t.id,
        ownerId: t.ownerId ?? null,
        level: (t.level ?? 1) as 1 | 2 | 3,
      })),
      players: this.players.map((p) => ({
        ...p,
        items: [...p.items],
      })),
      currentRound: this.currentRound,
      currentPlayerIndex: this.currentPlayerIndex,
      phase: this.phase,
      pendingModal: this.pendingModal,
      turnTimerSec: this.turnTimerSec,
      elapsedGameSeconds: this.elapsedGameSeconds,
      lastDiceValue: this.lastDiceValue,
      remainingMoveSteps: this.remainingMoveSteps,
      activeCareerOptions: this.activeCareerOptions.map((o) => ({ ...o })),
      activeChoiceEvent: this.activeChoiceEvent ? { ...this.activeChoiceEvent } : null,
      activeShopItems: [...this.activeShopItems],
      activeTradeProposal: this.activeTradeProposal
        ? {
            ...this.activeTradeProposal,
            offerPropertyIds: [...this.activeTradeProposal.offerPropertyIds],
            offerItemIndices: [...this.activeTradeProposal.offerItemIndices],
            requestPropertyIds: [...this.activeTradeProposal.requestPropertyIds],
            requestItemIndices: [...this.activeTradeProposal.requestItemIndices],
          }
        : null,
      activeAuction: this.activeAuction
        ? {
            ...this.activeAuction,
            queueTileIds: [...this.activeAuction.queueTileIds],
            activeBidderIds: [...this.activeAuction.activeBidderIds],
          }
        : null,
      activeDebt: this.activeDebt ? { ...this.activeDebt } : null,
      activeResultPopup: this.activeResultPopup ? { ...this.activeResultPopup } : null,
      logs: this.logs.slice(0, 25).map((l) => ({ ...l })),
    };
  }

  /**
   * P2Pホストから受信したスナップショットをレプリカへ反映
   */
  public applySnapshot(snap: GameEngineSnapshot): void {
    this.config = { ...snap.config };
    for (const st of snap.tiles) {
      const tile = this.tiles.find((t) => t.id === st.id);
      if (tile) {
        tile.ownerId = st.ownerId;
        tile.level = st.level;
      }
    }
    this.players = snap.players.map((p) => ({
      ...p,
      items: [...p.items],
    }));
    this.currentRound = snap.currentRound;
    this.currentPlayerIndex = snap.currentPlayerIndex;
    this.phase = snap.phase;
    this.pendingModal = snap.pendingModal;
    this.turnTimerSec = snap.turnTimerSec;
    this.elapsedGameSeconds = snap.elapsedGameSeconds;
    this.lastDiceValue = snap.lastDiceValue;
    this.remainingMoveSteps = snap.remainingMoveSteps;
    this.activeCareerOptions = snap.activeCareerOptions.map((o) => ({ ...o }));
    this.activeChoiceEvent = snap.activeChoiceEvent ? { ...snap.activeChoiceEvent } : null;
    this.activeShopItems = [...snap.activeShopItems];
    this.activeTradeProposal = snap.activeTradeProposal
      ? {
          ...snap.activeTradeProposal,
          offerPropertyIds: [...snap.activeTradeProposal.offerPropertyIds],
          offerItemIndices: [...snap.activeTradeProposal.offerItemIndices],
          requestPropertyIds: [...snap.activeTradeProposal.requestPropertyIds],
          requestItemIndices: [...snap.activeTradeProposal.requestItemIndices],
        }
      : null;
    this.activeAuction = snap.activeAuction
      ? {
          ...snap.activeAuction,
          queueTileIds: [...snap.activeAuction.queueTileIds],
          activeBidderIds: [...snap.activeAuction.activeBidderIds],
        }
      : null;
    this.activeDebt = snap.activeDebt ? { ...snap.activeDebt } : null;
    this.activeResultPopup = snap.activeResultPopup ? { ...snap.activeResultPopup } : null;
    this.logs = snap.logs.map((l) => ({ ...l }));

    this.callbacks.onStateChanged?.();
  }

  /**
   * P2Pゲストから受信したプレイヤー操作を権威ホスト側で実行
   */
  public executeRemoteAction(action: RemotePlayerActionPayload): void {
    if (this.isClientReplica) return;
    switch (action.type) {
      case 'JAIL_DECISION':
        this.handleJailDecision(action.playerId, action.method, false);
        break;
      case 'USE_ITEM':
        this.useConsumableItem(action.playerId, action.itemId, action.chosenDiceValue);
        break;
      case 'SELL_PROPERTY_BANK':
        this.sellPropertyToBank(action.playerId, action.tileId, false);
        break;
      case 'PROPOSE_TRADE':
        this.proposeTrade(
          action.fromPlayerId,
          action.toPlayerId,
          action.offerCash,
          action.offerPropertyIds,
          action.offerItemIndices,
          action.requestCash,
          action.requestPropertyIds,
          action.requestItemIndices
        );
        break;
      case 'RESPOND_TRADE':
        this.respondToTrade(action.responderId, action.accept, false);
        break;
      case 'ROLL_DICE':
        this.rollDiceAndMove(action.playerId, false);
        break;
      case 'SELECT_BRANCH':
        this.selectBranchRoute(action.playerId, action.nextTileId, false);
        break;
      case 'PROPERTY_PURCHASE':
        this.handlePropertyPurchaseDecision(action.playerId, action.buy, false);
        break;
      case 'PROPERTY_UPGRADE':
        this.handlePropertyUpgradeDecision(action.playerId, action.upgrade, false);
        break;
      case 'SELECT_CAREER':
        this.selectCareerOption(action.playerId, action.optionIndex, false);
        break;
      case 'SELECT_CHOICE_EVENT':
        this.selectChoiceEventOption(action.playerId, action.optionIndex, false);
        break;
      case 'BUY_SHOP_ITEM':
        this.buyShopItem(action.playerId, action.itemId, action.discardSlotIndex, false);
        break;
      case 'SELL_SHOP_ITEM':
        this.sellShopItem(action.playerId, action.slotIndex);
        break;
      case 'CLOSE_SHOP':
        this.closeShopModal(action.playerId, false);
        break;
      case 'ACK_EVENT_RESULT':
        this.acknowledgeEventResult(action.playerId, false);
        break;
      case 'PLACE_AUCTION_BID':
        this.placeAuctionBid(action.playerId, action.bidAmount, false);
        break;
      case 'PASS_AUCTION':
        this.passAuction(action.playerId, false);
        break;
      case 'END_TURN':
        this.endTurn(action.playerId, false);
        break;
    }
  }

  public startGame(): void {
    this.currentRound = 1;
    this.currentPlayerIndex = 0;
    this.elapsedGameSeconds = 0;
    this.addLog(
      this.getCurrentPlayer().id,
      `🎲 『Life Board』対戦開始！初期資金 ${INITIAL_CASH.toLocaleString()}万円からスタート！`,
      'important'
    );
    this.beginTurn();
  }

  public getCurrentPlayer(): PlayerState {
    return this.players[this.currentPlayerIndex] ?? this.players[0];
  }

  public getPlayerById(playerId: string): PlayerState | undefined {
    return this.players.find((p) => p.id === playerId);
  }

  public getTileById(tileId: number): BoardTile {
    return this.tiles.find((t) => t.id === tileId) ?? this.tiles[0];
  }

  public getPlayerOwnedTiles(playerId: string): BoardTile[] {
    return this.tiles.filter((t) => t.type === 'property' && t.ownerId === playerId);
  }

  /**
   * プレイヤーの現在の物件所有上限を計算（職業ランク上限 ＋ 不動産資格証+1）
   */
  public getPlayerPropertyLimit(player: PlayerState): number {
    const jobDef = JOBS[player.jobId];
    const baseLimit = jobDef.propertyLimits[player.jobRank - 1] ?? 2;
    const licenseBonus = player.items.includes('realtor_license') ? 1 : 0;
    return baseLimit + licenseBonus;
  }

  /**
   * プレイヤーの純資産計算（仕様書2.2完全準拠）
   * 純資産 = 所持現金 + 所有物件の評価額合計 + 永続型アイテムの評価額合計
   */
  public getPlayerNetWorth(player: PlayerState): number {
    if (player.isBankrupt) return 0;
    const propVal = this.getPlayerOwnedTiles(player.id).reduce(
      (sum, t) => sum + calculatePropertyValuation(t),
      0
    );
    const itemVal = player.items.reduce((sum, itemId) => sum + (ITEMS[itemId]?.assetValue ?? 0), 0);
    return player.cash + propVal + itemVal;
  }

  /**
   * 全プレイヤーの現在の資産内訳＆ランキングを取得
   */
  public getRankings(): AssetBreakdown[] {
    const list: AssetBreakdown[] = this.players.map((p) => {
      const ownedProps = this.getPlayerOwnedTiles(p.id);
      const propertyValue = p.isBankrupt
        ? 0
        : ownedProps.reduce((sum, t) => sum + calculatePropertyValuation(t), 0);
      const itemValue = p.isBankrupt
        ? 0
        : p.items.reduce((sum, itemId) => sum + (ITEMS[itemId]?.assetValue ?? 0), 0);
      const cash = p.isBankrupt ? 0 : p.cash;
      const totalNetWorth = cash + propertyValue + itemValue;
      const jobDef = JOBS[p.jobId];

      return {
        playerId: p.id,
        playerName: p.name,
        characterId: p.characterId,
        colorId: p.colorId,
        isBankrupt: p.isBankrupt,
        rank: 1,
        cash,
        propertyValue,
        itemValue,
        totalNetWorth,
        ownedPropertyCount: ownedProps.length,
        familyCount: (p.hasSpouse ? 1 : 0) + p.childrenCount,
        jobName: `${jobDef.name} (${jobDef.rankNames[p.jobRank - 1]})`,
        jobRank: p.jobRank,
      };
    });

    list.sort((a, b) => {
      if (a.isBankrupt !== b.isBankrupt) return a.isBankrupt ? 1 : -1;
      return b.totalNetWorth - a.totalNetWorth;
    });

    list.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    return list;
  }

  /**
   * 最終特別称号（不動産王・大家族賞・キャリアマスター・キャッシュキング）の算出
   */
  public getSpecialAwards(): SpecialAward[] {
    const rankings = this.getRankings();
    const awards: SpecialAward[] = [];
    if (rankings.length === 0) return awards;

    // 1. 不動産王（最多物件評価額）
    const topProp = [...rankings].sort((a, b) => b.propertyValue - a.propertyValue)[0];
    awards.push({
      id: 'award_real_estate_king',
      title: '不動産王',
      icon: '🏙️',
      description: '最も高い不動産評価額を築き上げた都市開発の覇者',
      winnerPlayerId: topProp.playerId,
      winnerName: topProp.playerName,
      valueLabel: `物件評価額 ${topProp.propertyValue.toLocaleString()}万円`,
    });

    // 2. 大家族賞（最大家族人数）
    const topFamily = [...rankings].sort((a, b) => b.familyCount - a.familyCount)[0];
    awards.push({
      id: 'award_happy_family',
      title: '大家族賞',
      icon: '👨‍👩‍👧‍👦',
      description: '温かい家庭を築き、人生の絆を深めたベストファミリー',
      winnerPlayerId: topFamily.playerId,
      winnerName: topFamily.playerName,
      valueLabel: `家族人数 ${topFamily.familyCount}人`,
    });

    // 3. キャリアマスター（最高職ランク・給料水準）
    const topCareer = [...this.players].sort((a, b) => {
      const salA = JOBS[a.jobId].salaries[a.jobRank - 1] ?? 0;
      const salB = JOBS[b.jobId].salaries[b.jobRank - 1] ?? 0;
      if (salB !== salA) return salB - salA;
      return b.jobRank - a.jobRank;
    })[0];
    awards.push({
      id: 'award_career_master',
      title: 'キャリアマスター',
      icon: '👑',
      description: '華麗なる昇進・キャリアアップを果たしたプロフェッショナル',
      winnerPlayerId: topCareer.id,
      winnerName: topCareer.name,
      valueLabel: `${JOBS[topCareer.jobId].name} Rank ${topCareer.jobRank}`,
    });

    // 4. キャッシュキング（最多所持現金）
    const topCash = [...rankings].sort((a, b) => b.cash - a.cash)[0];
    awards.push({
      id: 'award_cash_king',
      title: 'キャッシュキング',
      icon: '💰',
      description: '圧倒的な手元流動資金を保持し続けた現金王',
      winnerPlayerId: topCash.playerId,
      winnerName: topCash.playerName,
      valueLabel: `所持現金 ${topCash.cash.toLocaleString()}万円`,
    });

    return awards;
  }

  /**
   * 手動操作検知（AFK状態を解除し、次回から90秒制限に復帰させる）
   */
  public notifyManualAction(playerId: string): void {
    const player = this.getPlayerById(playerId);
    if (!player) return;
    player.consecutiveTimeouts = 0;
    if (player.isAfk) {
      player.isAfk = false;
      this.addLog(player.id, `${player.name} が手動操作に復帰しました（制限時間90秒）`, 'info');
    }
  }

  // ==========================================
  // 毎フレーム更新 (タイマー・CPU思考・AFK処理)
  // ==========================================
  public update(dt: number): void {
    if (this.phase === 'GAME_OVER') return;

    this.elapsedGameSeconds += dt;

    // P2Pゲストクライアントの場合は表示用カウントダウン秒数のみ滑らかに減算し、ホストからの状態同期を待つ
    if (this.isClientReplica) {
      if (this.pendingModal === 'TRADE_RESPONSE' && this.activeTradeProposal) {
        this.activeTradeProposal.remainingSeconds = Math.max(
          0,
          this.activeTradeProposal.remainingSeconds - dt
        );
      } else if (this.pendingModal === 'AUCTION' && this.activeAuction) {
        this.activeAuction.remainingSeconds = Math.max(
          0,
          this.activeAuction.remainingSeconds - dt
        );
      } else {
        this.turnTimerSec = Math.max(0, this.turnTimerSec - dt);
      }
      return;
    }

    // アニメーション中（ダイス物理ロール中・コマ移動中）はタイマーを一時停止
    if (this.isAnimatingMoveOrDice) {
      return;
    }

    // 1. プレイヤー間取引の応答待ち中（20秒タイマー）
    if (this.pendingModal === 'TRADE_RESPONSE' && this.activeTradeProposal) {
      this.activeTradeProposal.remainingSeconds -= dt;
      const targetPlayer = this.getPlayerById(this.activeTradeProposal.toPlayerId);
      if (targetPlayer && (targetPlayer.isCpu || targetPlayer.isAfk || !targetPlayer.isConnected)) {
        this.cpuThinkTimer += dt;
        if (this.cpuThinkTimer >= 1.2) {
          this.cpuThinkTimer = 0;
          this.executeCpuTradeResponse(targetPlayer);
          return;
        }
      }
      if (this.activeTradeProposal.remainingSeconds <= 0) {
        // 20秒経過タイムアウトは自動拒否（仕様書12.2）
        this.respondToTrade(this.activeTradeProposal.toPlayerId, false, true);
      }
      return;
    }

    // 2. 公開競売中（1手15秒タイマー）
    if (this.pendingModal === 'AUCTION' && this.activeAuction) {
      this.activeAuction.remainingSeconds -= dt;
      const bidder = this.getPlayerById(this.activeAuction.currentTurnBidderId);
      if (bidder && (bidder.isCpu || bidder.isAfk || !bidder.isConnected)) {
        this.cpuThinkTimer += dt;
        if (this.cpuThinkTimer >= 1.0) {
          this.cpuThinkTimer = 0;
          this.executeCpuAuctionTurn(bidder);
          return;
        }
      }
      if (this.activeAuction.remainingSeconds <= 0) {
        // 15秒時間切れは自動パス（仕様書5.6）
        this.passAuction(this.activeAuction.currentTurnBidderId, true);
      }
      return;
    }

    // 3. 通常ターン進行タイマー（90秒 / AFK時は5秒）
    const current = this.getCurrentPlayer();
    if (!current) return;

    this.turnTimerSec -= dt;

    // CPUプレイヤーの場合は約1.1秒のウェイトでスマートAI行動を実行
    if (current.isCpu) {
      this.cpuThinkTimer += dt;
      if (this.cpuThinkTimer >= 1.1) {
        this.cpuThinkTimer = 0;
        this.executeCpuStep(current);
      }
      return;
    }

    // 人間プレイヤーがタイムアウトした場合（仕様書3.4 & 13.1）
    if (this.turnTimerSec <= 0) {
      current.consecutiveTimeouts++;
      if (current.consecutiveTimeouts >= AFK_CONSECUTIVE_TIMEOUTS && !current.isAfk) {
        current.isAfk = true;
        this.addLog(
          current.id,
          `⏱️ ${current.name} が2ターン連続タイムアウトのため放置（AFK 5秒短縮）モードに移行しました`,
          'info'
        );
      } else {
        this.addLog(current.id, `⏱️ 制限時間超過のため ${current.name} の自動処理を実行します`, 'info');
      }
      this.handleTimeoutAutoAction(current);
    }
  }

  // ==========================================
  // Phase 1: ターン開始処理 (状態確認・商業施設定期収支・刑務所判定)
  // ==========================================
  public beginTurn(): void {
    // サバイバル決着判定（生存プレイヤーが1人以下なら即座に終了）
    const alivePlayers = this.players.filter((p) => !p.isBankrupt);
    if (alivePlayers.length <= 1) {
      this.finishGame('サバイバル決着（最後の1人が生存）');
      return;
    }

    const player = this.getCurrentPlayer();
    if (player.isBankrupt) {
      this.advanceToNextPlayer();
      return;
    }

    this.phase = 'TURN_START';
    this.pendingModal = 'NONE';
    this.activeResultPopup = null;
    this.cpuThinkTimer = 0;
    this.turnTimerSec =
      player.isAfk || !player.isConnected ? AFK_TIME_LIMIT_SEC : TURN_TIME_LIMIT_SEC;

    player.usedItemThisTurn = false;
    player.proposedTradeThisTurn = false;

    this.addLog(
      player.id,
      `--- 【ラウンド ${this.currentRound}】 ${player.name} のターン ---`,
      'info'
    );

    // 1. 商業施設の定期収益受け取り（収監中も受け取り可能：仕様書5.1 & 11.1）
    const commercialTiles = this.getPlayerOwnedTiles(player.id).filter(
      (t) => t.propertyType === 'commercial'
    );
    if (commercialTiles.length > 0) {
      let totalCommercialIncome = 0;
      for (const t of commercialTiles) {
        totalCommercialIncome += calculateCommercialRegularIncome(t, this.tiles, player.jobId);
      }
      if (totalCommercialIncome > 0) {
        player.cash += totalCommercialIncome;
        this.addLog(
          player.id,
          `🏪 商業施設（${commercialTiles.length}件）の定期収益 +${totalCommercialIncome.toLocaleString()}万円を獲得！`,
          'income'
        );
        this.callbacks.onPopupEffect?.(
          player.currentTileId,
          `+${totalCommercialIncome}万`,
          '#22c55e',
          'coin'
        );
      }
    }

    // 2. 刑務所収監状態の確認（仕様書11章）
    if (player.inJail) {
      if (player.jailTurnsRemaining <= 0) {
        // 3ターン経過後のターン開始時は無条件で釈放
        player.inJail = false;
        player.jailTurnsRemaining = 0;
        this.addLog(player.id, `🔓 ${player.name} は刑期満了により無条件釈放されました！`, 'info');
        this.enterPreMovePhase();
      } else {
        // 脱出方法の選択モーダルを表示
        this.pendingModal = 'JAIL_DECISION';
        this.notifyStateChanged();
      }
      return;
    }

    this.enterPreMovePhase();
  }

  /**
   * 刑務所からの脱出アクション（Phase 1：仕様書11.2）
   * - 'bail': 保釈金300万円を支払って即時釈放＆通常移動へ
   * - 'card': 脱獄カードを消費して即時釈放＆通常移動へ
   * - 'roll': 1〜6ルーレットに挑戦し、出目6なら釈放＆移動へ、1〜5なら失敗でターン終了（拘束残り-1）
   */
  public handleJailDecision(
    playerId: string,
    method: 'bail' | 'card' | 'roll',
    isAuto = false
  ): void {
    if (this.isClientReplica && this.remoteActionSender) {
      this.remoteActionSender({ type: 'JAIL_DECISION', playerId, method });
      return;
    }
    const player = this.getCurrentPlayer();
    if (player.id !== playerId || !player.inJail || this.pendingModal !== 'JAIL_DECISION') return;
    if (!isAuto) this.notifyManualAction(playerId);

    if (method === 'bail') {
      if (player.cash < JAIL_BAIL_COST) {
        // 保釈金不足時はルーレットへフォールバック
        method = 'roll';
      } else {
        player.cash -= JAIL_BAIL_COST;
        player.inJail = false;
        player.jailTurnsRemaining = 0;
        this.pendingModal = 'NONE';
        this.addLog(
          player.id,
          `🔓 ${player.name} は保釈金 ${JAIL_BAIL_COST}万円を支払って釈放されました！`,
          'expense'
        );
        this.enterPreMovePhase();
        return;
      }
    }

    if (method === 'card') {
      const idx = player.items.indexOf('jail_free');
      if (idx === -1) {
        method = 'roll';
      } else {
        player.items.splice(idx, 1);
        player.inJail = false;
        player.jailTurnsRemaining = 0;
        this.pendingModal = 'NONE';
        this.addLog(player.id, `🗝️ ${player.name} は「脱獄カード」を使用して釈放されました！`, 'event');
        this.enterPreMovePhase();
        return;
      }
    }

    // 'roll': 出目6挑戦ルーレット
    this.pendingModal = 'NONE';
    const rollVal = Math.floor(this.rng() * 6) + 1;
    this.lastDiceValue = rollVal;
    this.isAnimatingMoveOrDice = true;
    this.notifyStateChanged();

    const finishJailRoll = () => {
      this.isAnimatingMoveOrDice = false;
      if (rollVal === JAIL_ESCAPE_DICE_TARGET) {
        player.inJail = false;
        player.jailTurnsRemaining = 0;
        this.addLog(
          player.id,
          `🎲 脱出ルーレット出目【${rollVal}】！見事無償で刑務所から脱出成功！`,
          'important'
        );
        this.callbacks.onPopupEffect?.(player.currentTileId, '脱出成功!', '#22c55e', 'celebrate');
        this.enterPreMovePhase();
      } else {
        player.jailTurnsRemaining = Math.max(0, player.jailTurnsRemaining - 1);
        this.addLog(
          player.id,
          `🎲 脱出ルーレット出目【${rollVal}】…脱出失敗（残り拘束 ${player.jailTurnsRemaining} ターン）`,
          'info'
        );
        this.endTurn(player.id, true);
      }
    };

    if (this.callbacks.onDiceRollRequested) {
      this.callbacks.onDiceRollRequested(player.id, rollVal, 'jail', finishJailRoll);
    } else {
      finishJailRoll();
    }
  }

  // ==========================================
  // Phase 2: 移動前フェーズ (アイテム使用・銀行売却・取引申請)
  // ==========================================
  private enterPreMovePhase(): void {
    this.phase = 'PRE_MOVE';
    this.pendingModal = 'NONE';
    this.notifyStateChanged();
  }

  /**
   * 消費アイテムの使用（Phase 2：1ターン1回まで：仕様書10.3）
   */
  public useConsumableItem(
    playerId: string,
    itemId: ItemId,
    chosenDiceValue?: number
  ): boolean {
    if (this.isClientReplica && this.remoteActionSender) {
      this.remoteActionSender({ type: 'USE_ITEM', playerId, itemId, chosenDiceValue });
      return true;
    }
    const player = this.getCurrentPlayer();
    if (player.id !== playerId || this.phase !== 'PRE_MOVE' || player.usedItemThisTurn) {
      return false;
    }
    const itemIdx = player.items.indexOf(itemId);
    if (itemIdx === -1) return false;

    const itemDef = ITEMS[itemId];
    if (!itemDef || !itemDef.usableInPreMove) return false;

    this.notifyManualAction(playerId);
    player.items.splice(itemIdx, 1);
    player.usedItemThisTurn = true;

    if (itemId === 'dice_select') {
      const target = Math.max(1, Math.min(6, Math.round(chosenDiceValue ?? 6)));
      player.forcedNextDice = target;
      this.addLog(
        player.id,
        `🎯 ${player.name} が「指定出目カード」を使用！次の出目を【${target}】にセットしました！`,
        'event'
      );
    } else if (itemId === 'toll_shield') {
      player.activeTollShield = true;
      this.addLog(
        player.id,
        `🛡️ ${player.name} が「通行料半減シールド」を展開しました（次回通行料50%軽減）！`,
        'event'
      );
    } else if (itemId === 'discount_ticket') {
      player.activeDiscountTicket = true;
      this.addLog(
        player.id,
        `🎫 ${player.name} が「物件割引チケット」を準備しました（次回購入・強化30%割引）！`,
        'event'
      );
    }

    this.notifyStateChanged();
    return true;
  }

  /**
   * 所有物件の銀行売却（Phase 2 または 支払い不足時：総投資額の70%：仕様書5.5）
   */
  public sellPropertyToBank(playerId: string, tileId: number, isAuto = false): boolean {
    if (this.isClientReplica && this.remoteActionSender) {
      this.remoteActionSender({ type: 'SELL_PROPERTY_BANK', playerId, tileId });
      return true;
    }
    const player = this.getPlayerById(playerId);
    const tile = this.getTileById(tileId);
    if (!player || tile.type !== 'property' || tile.ownerId !== playerId) return false;
    if (this.phase !== 'PRE_MOVE' && this.pendingModal !== 'DEBT_LIQUIDATION' && this.pendingModal !== 'PROPERTY_PURCHASE') {
      return false;
    }
    if (!isAuto) this.notifyManualAction(playerId);

    const sellValue = calculateBankSellValue(tile);
    const oldLevel = tile.level ?? 1;
    tile.ownerId = null;
    tile.level = 1;
    player.cash += sellValue;

    this.addLog(
      player.id,
      `🏦 ${player.name} が「${tile.name} (Lv${oldLevel})」を銀行へ売却し、+${sellValue.toLocaleString()}万円を受け取りました`,
      'property'
    );
    this.callbacks.onPopupEffect?.(tile.id, `+${sellValue}万 (売却)`, '#f59e0b', 'coin');

    // 支払い不足による売却モード中の場合、支払額に届いたかチェック
    if (this.pendingModal === 'DEBT_LIQUIDATION' && this.activeDebt) {
      if (player.cash >= this.activeDebt.requiredAmount) {
        this.settlePendingDebt();
        return true;
      }
    }

    this.notifyStateChanged();
    return true;
  }

  /**
   * プレイヤー間取引（トレード）の申請（Phase 2：1ターン1回まで：仕様書12章）
   */
  public proposeTrade(
    fromPlayerId: string,
    toPlayerId: string,
    offerCash: number,
    offerPropertyIds: number[],
    offerItemIndices: number[],
    requestCash: number,
    requestPropertyIds: number[],
    requestItemIndices: number[]
  ): { ok: boolean; error?: string } {
    const fromPlayer = this.getCurrentPlayer();
    const toPlayer = this.getPlayerById(toPlayerId);
    if (!toPlayer || fromPlayer.id !== fromPlayerId) {
      return { ok: false, error: '不正なプレイヤー指定です。' };
    }
    if (this.phase !== 'PRE_MOVE') {
      return { ok: false, error: '取引は移動前フェーズ（Phase 2）でのみ申請できます。' };
    }
    if (fromPlayer.proposedTradeThisTurn) {
      return { ok: false, error: '取引は1ターンにつき1回までです。' };
    }
    if (fromPlayer.inJail || toPlayer.inJail) {
      return { ok: false, error: '刑務所に収監中のプレイヤーとは取引できません。' };
    }
    if (toPlayer.isBankrupt) {
      return { ok: false, error: '破産したプレイヤーとは取引できません。' };
    }
    if (offerCash < 0 || requestCash < 0 || offerCash > fromPlayer.cash || requestCash > toPlayer.cash) {
      return { ok: false, error: '所持現金を超える金額は指定できません。' };
    }

    // 物件所有上限チェック（仕様書12.1）
    const fromOwnedCount = this.getPlayerOwnedTiles(fromPlayer.id).length;
    const toOwnedCount = this.getPlayerOwnedTiles(toPlayer.id).length;
    const fromAfterProps = fromOwnedCount - offerPropertyIds.length + requestPropertyIds.length;
    const toAfterProps = toOwnedCount - requestPropertyIds.length + offerPropertyIds.length;

    if (fromAfterProps > this.getPlayerPropertyLimit(fromPlayer)) {
      return { ok: false, error: `${fromPlayer.name} の物件所有上限を超過するため申請できません。` };
    }
    if (toAfterProps > this.getPlayerPropertyLimit(toPlayer)) {
      return { ok: false, error: `${toPlayer.name} の物件所有上限を超過するため申請できません。` };
    }

    // アイテム所持上限（3個）チェック
    const fromAfterItems =
      fromPlayer.items.length - offerItemIndices.length + requestItemIndices.length;
    const toAfterItems =
      toPlayer.items.length - requestItemIndices.length + offerItemIndices.length;

    if (fromAfterItems > MAX_ITEM_LIMIT || toAfterItems > MAX_ITEM_LIMIT) {
      return { ok: false, error: `アイテム所持上限（${MAX_ITEM_LIMIT}個）を超過するため申請できません。` };
    }

    if (this.isClientReplica && this.remoteActionSender) {
      this.remoteActionSender({
        type: 'PROPOSE_TRADE',
        fromPlayerId,
        toPlayerId,
        offerCash,
        offerPropertyIds: [...offerPropertyIds],
        offerItemIndices: [...offerItemIndices],
        requestCash,
        requestPropertyIds: [...requestPropertyIds],
        requestItemIndices: [...requestItemIndices],
      });
      return { ok: true };
    }

    this.notifyManualAction(fromPlayerId);
    fromPlayer.proposedTradeThisTurn = true;
    this.cpuThinkTimer = 0;

    this.activeTradeProposal = {
      id: `trade_${Date.now()}`,
      fromPlayerId,
      toPlayerId,
      offerCash: Math.round(offerCash),
      offerPropertyIds: [...offerPropertyIds],
      offerItemIndices: [...offerItemIndices],
      requestCash: Math.round(requestCash),
      requestPropertyIds: [...requestPropertyIds],
      requestItemIndices: [...requestItemIndices],
      remainingSeconds: TRADE_RESPONSE_TIME_SEC,
    };
    this.pendingModal = 'TRADE_RESPONSE';

    this.addLog(
      fromPlayer.id,
      `🤝 ${fromPlayer.name} が ${toPlayer.name} に取引（トレード）を申請しました（応答制限20秒）`,
      'property'
    );
    this.notifyStateChanged();
    return { ok: true };
  }

  /**
   * 取引（トレード）への応答処理（承認 または 拒否/タイムアウト）
   */
  public respondToTrade(responderId: string, accept: boolean, isAuto = false): void {
    if (this.isClientReplica && this.remoteActionSender) {
      this.remoteActionSender({ type: 'RESPOND_TRADE', responderId, accept });
      return;
    }
    if (this.pendingModal !== 'TRADE_RESPONSE' || !this.activeTradeProposal) return;
    const proposal = this.activeTradeProposal;
    if (proposal.toPlayerId !== responderId) return;
    if (!isAuto) this.notifyManualAction(responderId);

    const fromPlayer = this.getPlayerById(proposal.fromPlayerId);
    const toPlayer = this.getPlayerById(proposal.toPlayerId);
    this.activeTradeProposal = null;
    this.pendingModal = 'NONE';

    if (!fromPlayer || !toPlayer || !accept) {
      this.addLog(
        responderId,
        `❌ ${toPlayer?.name ?? '相手'} が取引を${isAuto ? 'タイムアウトにより見送り（不成立）' : '拒否'}しました`,
        'info'
      );
      this.notifyStateChanged();
      return;
    }

    // 現金移動
    fromPlayer.cash = fromPlayer.cash - proposal.offerCash + proposal.requestCash;
    toPlayer.cash = toPlayer.cash - proposal.requestCash + proposal.offerCash;

    // 物件所有権移動
    for (const tileId of proposal.offerPropertyIds) {
      const t = this.getTileById(tileId);
      if (t.ownerId === fromPlayer.id) t.ownerId = toPlayer.id;
    }
    for (const tileId of proposal.requestPropertyIds) {
      const t = this.getTileById(tileId);
      if (t.ownerId === toPlayer.id) t.ownerId = fromPlayer.id;
    }

    // アイテム移動
    const offeredItems = proposal.offerItemIndices
      .map((i) => fromPlayer.items[i])
      .filter((it): it is ItemId => Boolean(it));
    const requestedItems = proposal.requestItemIndices
      .map((i) => toPlayer.items[i])
      .filter((it): it is ItemId => Boolean(it));

    // インデックス降順で削除
    for (const idx of [...proposal.offerItemIndices].sort((a, b) => b - a)) {
      fromPlayer.items.splice(idx, 1);
    }
    for (const idx of [...proposal.requestItemIndices].sort((a, b) => b - a)) {
      toPlayer.items.splice(idx, 1);
    }
    fromPlayer.items.push(...requestedItems);
    toPlayer.items.push(...offeredItems);

    this.addLog(
      fromPlayer.id,
      `🤝 ${fromPlayer.name} と ${toPlayer.name} のプレイヤー間取引が成立しました！`,
      'important'
    );
    this.callbacks.onPopupEffect?.(fromPlayer.currentTileId, '取引成立!', '#3b82f6', 'celebrate');
    this.notifyStateChanged();
  }

  // ==========================================
  // Phase 3: ルーレット（3D物理ダイス）＆移動フェーズ
  // ==========================================
  public rollDiceAndMove(playerId: string, isAuto = false): void {
    if (this.isClientReplica && this.remoteActionSender) {
      this.remoteActionSender({ type: 'ROLL_DICE', playerId });
      return;
    }
    const player = this.getCurrentPlayer();
    if (player.id !== playerId || this.phase !== 'PRE_MOVE' || this.pendingModal !== 'NONE') return;
    if (!isAuto) this.notifyManualAction(playerId);

    this.phase = 'MOVING';
    const diceVal =
      player.forcedNextDice !== null
        ? player.forcedNextDice
        : Math.floor(this.rng() * 6) + 1;
    player.forcedNextDice = null;
    this.lastDiceValue = diceVal;
    this.remainingMoveSteps = diceVal;
    this.isAnimatingMoveOrDice = true;

    this.addLog(player.id, `🎲 ${player.name} がサイコロを振った！出目は【${diceVal}】！`, 'info');
    this.notifyStateChanged();

    const startStepping = () => {
      this.advanceOneStep();
    };

    if (this.callbacks.onDiceRollRequested) {
      this.callbacks.onDiceRollRequested(player.id, diceVal, 'move', startStepping);
    } else {
      startStepping();
    }
  }

  private advanceOneStep(chosenNextTileId?: number): void {
    const player = this.getCurrentPlayer();
    const currentTile = this.getTileById(player.currentTileId);

    if (this.remainingMoveSteps <= 0) {
      this.isAnimatingMoveOrDice = false;
      this.enterPostMovePhase();
      return;
    }

    // 分岐マスにいて、まだ進行先が指定されていない場合はルート選択UIを表示して一時停止
    if (currentTile.nextTileIds.length > 1 && chosenNextTileId === undefined) {
      this.isAnimatingMoveOrDice = false;
      this.pendingModal = 'BRANCH_SELECT';
      this.cpuThinkTimer = 0;
      this.notifyStateChanged();
      return;
    }

    const nextTileId =
      chosenNextTileId !== undefined ? chosenNextTileId : currentTile.nextTileIds[0];
    const fromTileId = player.currentTileId;
    player.currentTileId = nextTileId;
    this.remainingMoveSteps--;

    const passedStart = nextTileId === 0;
    if (passedStart) {
      this.handlePassStart(player);
    }

    const stepEvent: GameMoveStepEvent = {
      playerId: player.id,
      fromTileId,
      toTileId: nextTileId,
      remainingSteps: this.remainingMoveSteps,
      passedStart,
    };

    this.notifyStateChanged();

    const onStepDone = () => {
      // スタート通過時の生活費精算で破産・売却モードに入った場合は移動を中断
      if (player.isBankrupt || this.pendingModal === 'DEBT_LIQUIDATION') {
        this.isAnimatingMoveOrDice = false;
        this.notifyStateChanged();
        return;
      }
      if (this.remainingMoveSteps > 0) {
        this.advanceOneStep();
      } else {
        this.isAnimatingMoveOrDice = false;
        this.enterPostMovePhase();
      }
    };

    if (this.callbacks.onPlayerStepped) {
      this.callbacks.onPlayerStepped(stepEvent, onStepDone);
    } else {
      onStepDone();
    }
  }

  /**
   * 分岐マスでの進行ルート選択（仕様書4.1）
   */
  public selectBranchRoute(playerId: string, nextTileId: number, isAuto = false): void {
    if (this.isClientReplica && this.remoteActionSender) {
      this.remoteActionSender({ type: 'SELECT_BRANCH', playerId, nextTileId });
      return;
    }
    const player = this.getCurrentPlayer();
    if (
      player.id !== playerId ||
      this.phase !== 'MOVING' ||
      this.pendingModal !== 'BRANCH_SELECT'
    ) {
      return;
    }
    const currentTile = this.getTileById(player.currentTileId);
    const validNextId = currentTile.nextTileIds.includes(nextTileId)
      ? nextTileId
      : currentTile.nextTileIds[0];

    if (!isAuto) this.notifyManualAction(playerId);
    this.pendingModal = 'NONE';
    this.isAnimatingMoveOrDice = true;

    const routeIdx = currentTile.nextTileIds.indexOf(validNextId);
    const routeName = currentTile.branchNames?.[routeIdx] ?? '進行ルート';
    this.addLog(player.id, `🔀 ${player.name} は「${routeName}」を選択しました！`, 'info');

    this.advanceOneStep(validNextId);
  }

  /**
   * スタート地点通過・停止時の給料＆生活費精算（仕様書4.4 & 7.2完全準拠）
   */
  private handlePassStart(player: PlayerState): void {
    const jobDef = JOBS[player.jobId];
    let salary = 0;

    if (player.jobId === 'unemployed') {
      if (player.unemployedPassCount === 0) {
        salary = UNEMPLOYED_FIRST_ALLOWANCE; // 初回通過のみ100万円
      } else {
        salary = 0; // 2回目以降は0円
      }
      player.unemployedPassCount++;
    } else {
      salary = jobDef.salaries[player.jobRank - 1] ?? 200;
    }

    // 家族生活費の計算（配偶者50万、子供1人50万、会社員は10%軽減）
    const rawLivingCost =
      (player.hasSpouse ? SPOUSE_LIVING_COST : 0) + player.childrenCount * CHILD_LIVING_COST;
    const livingCost =
      player.jobId === 'office_worker' ? Math.round(rawLivingCost * 0.9) : rawLivingCost;

    const net = salary - livingCost;
    if (net >= 0) {
      player.cash += net;
      this.addLog(
        player.id,
        `🏁 スタート通過！給料 +${salary}万円（生活費 -${livingCost}万円）＝ 純増 +${net}万円！`,
        'income'
      );
      this.callbacks.onPopupEffect?.(0, `+${net}万 (給料)`, '#22c55e', 'coin');
    } else {
      const deficit = Math.abs(net);
      this.addLog(
        player.id,
        `🏁 スタート通過：給料 ${salary}万円に対し家族生活費 ${livingCost}万円（差引 -${deficit}万円）`,
        'expense'
      );
      this.requirePayment(player, deficit, null, '家族生活費の精算');
    }
  }

  // ==========================================
  // Phase 4: 移動後フェーズ (停止マスの効果発動)
  // ==========================================
  private enterPostMovePhase(): void {
    const player = this.getCurrentPlayer();
    const tile = this.getTileById(player.currentTileId);
    this.phase = 'POST_MOVE';
    this.pendingModal = 'NONE';
    this.cpuThinkTimer = 0;

    this.addLog(player.id, `📍 ${player.name} が「${tile.name}」に停止しました`, 'info');

    switch (tile.type) {
      case 'start':
      case 'branch':
        // スタート通過時の給料は移動ステップ時点で精算済み。追加の特別通過ボーナス表示
        this.showEventResultPopup({
          title: tile.name,
          description:
            tile.type === 'start'
              ? 'スタートゲートに到着！新たな1周へ向けて出発しましょう。'
              : '交差点を通過中。次のターンも戦略的にルートを選びましょう！',
          isPositive: true,
        });
        break;

      case 'property':
        this.handleLandOnPropertyTile(player, tile);
        break;

      case 'career':
        this.handleLandOnCareerTile(player);
        break;

      case 'family':
        this.handleLandOnFamilyTile(player);
        break;

      case 'event':
        this.handleLandOnEventTile(player);
        break;

      case 'bonus':
        this.handleLandOnBonusTile(player);
        break;

      case 'shop':
        this.handleLandOnShopTile(player);
        break;

      case 'tax':
        this.handleLandOnTaxTile(player);
        break;

      case 'jail':
        this.sendPlayerToJail(player, '中央刑務所マスに停止したため収監されました');
        break;
    }

    this.notifyStateChanged();
  }

  /**
   * 土地・物件マス停止時の処理（未所有購入 / 自己所有Lv2〜3強化 / 他者所有通行料支払い）
   */
  private handleLandOnPropertyTile(player: PlayerState, tile: BoardTile): void {
    // 1. 未所有物件の場合
    if (!tile.ownerId) {
      this.pendingModal = 'PROPERTY_PURCHASE';
      return;
    }

    // 2. 自己所有物件の場合
    if (tile.ownerId === player.id) {
      if ((tile.level ?? 1) < 3) {
        this.pendingModal = 'PROPERTY_UPGRADE';
      } else {
        this.showEventResultPopup({
          title: `${tile.name} (最大Lv3)`,
          description: 'あなたが所有する最高ランクのランドマーク物件です！',
          isPositive: true,
        });
      }
      return;
    }

    // 3. 他プレイヤー所有物件の場合 -> 通行料の自動支払い
    const owner = this.getPlayerById(tile.ownerId);
    if (!owner || owner.isBankrupt) {
      this.enterTurnEndPhase();
      return;
    }

    // 通行料半減シールド（能動使用済み、またはインベントリ所持で自動発動）
    let shieldUsed = false;
    if (player.activeTollShield) {
      shieldUsed = true;
      player.activeTollShield = false;
    } else {
      const shieldIdx = player.items.indexOf('toll_shield');
      if (shieldIdx !== -1) {
        player.items.splice(shieldIdx, 1);
        shieldUsed = true;
        this.addLog(
          player.id,
          `🛡️ ${player.name} の「通行料半減シールド」が自動発動し、通行料を50%軽減！`,
          'event'
        );
      }
    }

    const toll = calculatePropertyToll(tile, this.tiles, shieldUsed);
    this.addLog(
      player.id,
      `💸 ${owner.name} の物件「${tile.name} (Lv${tile.level ?? 1})」に停止！通行料 ${toll.toLocaleString()}万円の支払い！`,
      'expense'
    );

    this.requirePayment(player, toll, owner.id, `${owner.name}への通行料（${tile.name}）`);
  }

  /**
   * 未所有物件の購入アクション（または見送り）
   */
  public handlePropertyPurchaseDecision(
    playerId: string,
    buy: boolean,
    isAuto = false
  ): boolean {
    if (this.isClientReplica && this.remoteActionSender) {
      this.remoteActionSender({ type: 'PROPERTY_PURCHASE', playerId, buy });
      return true;
    }
    const player = this.getCurrentPlayer();
    if (player.id !== playerId || this.pendingModal !== 'PROPERTY_PURCHASE') return false;
    if (!isAuto) this.notifyManualAction(playerId);

    const tile = this.getTileById(player.currentTileId);
    if (!buy || tile.type !== 'property' || tile.ownerId !== null) {
      this.addLog(player.id, `${player.name} は「${tile.name}」の購入を見送りました`, 'info');
      this.pendingModal = 'NONE';
      this.enterTurnEndPhase();
      return true;
    }

    const ownedCount = this.getPlayerOwnedTiles(player.id).length;
    const limit = this.getPlayerPropertyLimit(player);
    if (ownedCount >= limit) {
      return false; // 所有上限に達している場合は先に手持ち物件を売却するか見送る必要がある
    }

    // 割引チケットの確認（能動使用済み または 所持時自動適用）
    const hasTicket =
      player.activeDiscountTicket || player.items.includes('discount_ticket');
    const cost = calculatePropertyPurchaseCost(tile, player.jobId, hasTicket);

    if (player.cash < cost) {
      return false;
    }

    if (player.activeDiscountTicket) {
      player.activeDiscountTicket = false;
    } else {
      const ticketIdx = player.items.indexOf('discount_ticket');
      if (ticketIdx !== -1) {
        player.items.splice(ticketIdx, 1);
      }
    }

    player.cash -= cost;
    tile.ownerId = player.id;
    tile.level = 1;

    this.addLog(
      player.id,
      `🏠 ${player.name} が「${tile.name}」を ${cost.toLocaleString()}万円で購入しました！`,
      'property'
    );
    this.callbacks.onPopupEffect?.(tile.id, '物件購入!', '#3b82f6', 'build');

    this.pendingModal = 'NONE';
    this.enterTurnEndPhase();
    return true;
  }

  /**
   * 自己所有物件の強化アクション（Lv1 -> Lv2 -> Lv3）
   */
  public handlePropertyUpgradeDecision(
    playerId: string,
    upgrade: boolean,
    isAuto = false
  ): boolean {
    if (this.isClientReplica && this.remoteActionSender) {
      this.remoteActionSender({ type: 'PROPERTY_UPGRADE', playerId, upgrade });
      return true;
    }
    const player = this.getCurrentPlayer();
    if (player.id !== playerId || this.pendingModal !== 'PROPERTY_UPGRADE') return false;
    if (!isAuto) this.notifyManualAction(playerId);

    const tile = this.getTileById(player.currentTileId);
    if (!upgrade || tile.type !== 'property' || tile.ownerId !== player.id) {
      this.addLog(player.id, `${player.name} は「${tile.name}」の強化を見送りました`, 'info');
      this.pendingModal = 'NONE';
      this.enterTurnEndPhase();
      return true;
    }

    const hasTicket =
      player.activeDiscountTicket || player.items.includes('discount_ticket');
    const cost = calculateUpgradeCost(tile, player.jobId, hasTicket);
    if (player.cash < cost || (tile.level ?? 1) >= 3) {
      return false;
    }

    if (player.activeDiscountTicket) {
      player.activeDiscountTicket = false;
    } else {
      const ticketIdx = player.items.indexOf('discount_ticket');
      if (ticketIdx !== -1) {
        player.items.splice(ticketIdx, 1);
      }
    }

    player.cash -= cost;
    tile.level = ((tile.level ?? 1) + 1) as 2 | 3;

    this.addLog(
      player.id,
      `🏗️ ${player.name} が「${tile.name}」を Lv${tile.level} へ強化しました（費用 ${cost.toLocaleString()}万円）！`,
      'property'
    );
    this.callbacks.onPopupEffect?.(tile.id, `Lv${tile.level} 強化!`, '#eab308', 'build');

    this.pendingModal = 'NONE';
    this.enterTurnEndPhase();
    return true;
  }

  /**
   * キャリアマス停止時の処理（就職・昇進・転職：仕様書7.1）
   */
  private handleLandOnCareerTile(player: PlayerState): void {
    const options: CareerChoiceOption[] = [];

    // すでに職業に就いている場合は昇進（Rank < 3）または特別キャリアボーナスを選べる
    if (player.jobId !== 'unemployed') {
      const currentJob = JOBS[player.jobId];
      if (player.jobRank < 3) {
        const nextRank = (player.jobRank + 1) as JobRank;
        options.push({
          type: 'promote',
          jobId: player.jobId,
          targetRank: nextRank,
          label: `【昇進】${currentJob.name} Rank ${nextRank}（${currentJob.rankNames[nextRank - 1]}）`,
          description: `給料 ${currentJob.salaries[nextRank - 1]}万円 / 物件上限 ${currentJob.propertyLimits[nextRank - 1]}件（昇進祝金 +100万円）`,
          bonusCash: 100,
        });
      } else {
        options.push({
          type: 'keep_bonus',
          jobId: player.jobId,
          targetRank: 3,
          label: `【最高職位ボーナス】${currentJob.name} Rank 3 熟練報奨金`,
          description: `現職のトップとして特別功労金 +250万円を受け取る`,
          bonusCash: 250,
        });
      }
    }

    // ランダムな3つの就職・転職候補を抽出
    const candidateIds = EMPLOYABLE_JOB_IDS.filter((id) => id !== player.jobId);
    const shuffled = [...candidateIds].sort(() => this.rng() - 0.5).slice(0, 3);
    for (const jobId of shuffled) {
      const def = JOBS[jobId];
      options.push({
        type: 'change_job',
        jobId,
        targetRank: 1,
        label: `${player.jobId === 'unemployed' ? '【就職】' : '【転職】'}${def.icon} ${def.name}（${def.rankNames[0]}）`,
        description: `給料 ${def.salaries[0]}万 / 上限 ${def.propertyLimits[0]}件 / 能力: ${def.passiveSummary}`,
        bonusCash: player.jobId === 'unemployed' ? 100 : 0, // 新規就職祝い金100万円
      });
    }

    this.activeCareerOptions = options;
    this.pendingModal = 'CAREER_SELECT';
  }

  public selectCareerOption(playerId: string, optionIndex: number, isAuto = false): void {
    if (this.isClientReplica && this.remoteActionSender) {
      this.remoteActionSender({ type: 'SELECT_CAREER', playerId, optionIndex });
      return;
    }
    const player = this.getCurrentPlayer();
    if (player.id !== playerId || this.pendingModal !== 'CAREER_SELECT') return;
    if (!isAuto) this.notifyManualAction(playerId);

    const opt = this.activeCareerOptions[optionIndex] ?? this.activeCareerOptions[0];
    this.activeCareerOptions = [];
    this.pendingModal = 'NONE';

    if (opt) {
      player.jobId = opt.jobId;
      player.jobRank = opt.targetRank;
      if (opt.bonusCash > 0) {
        player.cash += opt.bonusCash;
      }
      const jobDef = JOBS[player.jobId];
      this.addLog(
        player.id,
        `🎓 ${player.name} が「${jobDef.name} Rank ${player.jobRank}（${jobDef.rankNames[player.jobRank - 1]}）」になりました！${opt.bonusCash > 0 ? `（祝金 +${opt.bonusCash}万円）` : ''}`,
        'important'
      );
      this.callbacks.onPopupEffect?.(player.currentTileId, `${jobDef.name}!`, '#3b82f6', 'celebrate');
    }

    this.enterTurnEndPhase();
  }

  /**
   * ファミリーマス停止時の処理（結婚・出産・家族イベントボーナス：仕様書7.2）
   */
  private handleLandOnFamilyTile(player: PlayerState): void {
    const celebMult = player.jobId === 'celebrity' ? 1.5 : 1.0;

    if (!player.hasSpouse) {
      player.hasSpouse = true;
      const bonus = Math.round(MARRIAGE_GIFT_BONUS * celebMult);
      player.cash += bonus;
      this.addLog(
        player.id,
        `💍 ${player.name} が結婚しました！ご祝儀ボーナス +${bonus.toLocaleString()}万円を獲得！`,
        'important'
      );
      this.callbacks.onPopupEffect?.(player.currentTileId, `結婚! +${bonus}万`, '#ec4899', 'celebrate');
      this.showEventResultPopup({
        title: '💍 ハッピーウェディング！',
        description: `素敵なパートナーと結婚しました！全員からの祝福とご祝儀ボーナス +${bonus.toLocaleString()}万円を獲得！`,
        cashDelta: bonus,
        isPositive: true,
      });
      return;
    }

    if (player.childrenCount < MAX_CHILDREN) {
      player.childrenCount++;
      const familySize = 1 + player.childrenCount;
      const bonus = Math.round(
        (CHILDBIRTH_GIFT_BONUS + player.childrenCount * 50) * celebMult
      );
      player.cash += bonus;
      this.addLog(
        player.id,
        `👶 ${player.name} に第${player.childrenCount}子が誕生！出産祝い金・育児手当 +${bonus.toLocaleString()}万円を獲得（家族${familySize}人）！`,
        'important'
      );
      this.callbacks.onPopupEffect?.(player.currentTileId, `誕生! +${bonus}万`, '#ec4899', 'celebrate');
      this.showEventResultPopup({
        title: `👶 第${player.childrenCount}子誕生おめでとう！`,
        description: `新しい家族が増えました！出産祝い金・育児手当として +${bonus.toLocaleString()}万円を獲得！`,
        cashDelta: bonus,
        isPositive: true,
      });
      return;
    }

    // すでに配偶者＋子供3人の大家族の場合は大型家族イベントボーナス
    const memberCount = (player.hasSpouse ? 1 : 0) + player.childrenCount;
    const bonus = Math.round(memberCount * FAMILY_BOND_BONUS_PER_MEMBER * celebMult);
    player.cash += bonus;
    this.addLog(
      player.id,
      `👨‍👩‍👧‍👦 ${player.name} の大家族コンクール入賞＆旅行イベント！家族絆ボーナス +${bonus.toLocaleString()}万円を獲得！`,
      'income'
    );
    this.callbacks.onPopupEffect?.(player.currentTileId, `家族ボーナス +${bonus}万`, '#22c55e', 'celebrate');
    this.showEventResultPopup({
      title: '👨‍👩‍👧‍👦 大家族スペシャルボーナス！',
      description: `家族${memberCount}人の絆でコンクール最優秀賞を受賞！特別賞金 +${bonus.toLocaleString()}万円を獲得！`,
      cashDelta: bonus,
      isPositive: true,
    });
  }

  /**
   * イベントマス停止時の処理（ランダム即時イベント60% / 選択型イベント40%：仕様書8章）
   */
  private handleLandOnEventTile(player: PlayerState): void {
    const isRandom = this.rng() < EVENT_RANDOM_RATIO;

    if (isRandom) {
      const ev = RANDOM_EVENTS[Math.floor(this.rng() * RANDOM_EVENTS.length)];
      this.applyRandomEvent(player, ev);
    } else {
      const choiceEv = CHOICE_EVENTS[Math.floor(this.rng() * CHOICE_EVENTS.length)];
      this.activeChoiceEvent = choiceEv;
      this.pendingModal = 'CHOICE_EVENT';
    }
  }

  private applyRandomEvent(
    player: PlayerState,
    ev: (typeof RANDOM_EVENTS)[number]
  ): void {
    const celebMult = player.jobId === 'celebrity' ? 1.5 : 1.0;

    // 医者の固有パッシブ：病気・怪我・事故系のマイナスイベント無効化（仕様書7.1）
    if (ev.effectType === 'medical_expense' && player.jobId === 'doctor') {
      this.addLog(
        player.id,
        `🩺 【医者パッシブ発動】${player.name} は「${ev.title}」を専門知識で完全無効化しました！`,
        'event'
      );
      this.showEventResultPopup({
        title: `🩺 ${ev.title}（医者パッシブで無効化！）`,
        description:
          '医者の固有能力により、病気・怪我・事故系のマイナス出費を0円に抑えました！',
        cashDelta: 0,
        badgeText: '医者パッシブ発動',
        isPositive: true,
      });
      return;
    }

    // 会社員の固有パッシブ：失業イベント無効化（仕様書7.1）
    if (ev.effectType === 'layoff') {
      if (player.jobId === 'office_worker') {
        this.addLog(
          player.id,
          `💼 【会社員パッシブ発動】${player.name} は「${ev.title}」を雇用保証で完全無効化しました！`,
          'event'
        );
        this.showEventResultPopup({
          title: `💼 ${ev.title}（会社員パッシブで無効化！）`,
          description: '会社員の固有能力（雇用保証）により、リストラ・失業を完全に回避しました！',
          cashDelta: 0,
          badgeText: '会社員パッシブ発動',
          isPositive: true,
        });
        return;
      }
      if (player.jobId === 'unemployed') {
        player.cash += 100;
        this.showEventResultPopup({
          title: 'ハローワーク臨時給付金',
          description: '求職支援プログラムにより臨時手当 +100万円を受け取りました。',
          cashDelta: 100,
          isPositive: true,
        });
        return;
      }
      // 失業して無職になる（再度1回のみスタート通過時の失業手当100万の対象になる：仕様書4.4）
      player.jobId = 'unemployed';
      player.jobRank = 1;
      player.unemployedPassCount = 0;
      this.addLog(
        player.id,
        `😱 ${player.name} は「${ev.title}」により失業し、無職になってしまった…`,
        'event'
      );
      this.showEventResultPopup({
        title: `😱 ${ev.title}`,
        description:
          '失業して無職になってしまいました（次回スタート通過時のみ失業手当100万円が支給されます）。',
        isPositive: false,
      });
      return;
    }

    if (ev.effectType === 'item_grant' && ev.grantItemId) {
      const granted = this.tryGrantItem(player, ev.grantItemId);
      const gain = Math.round(ev.amount * celebMult);
      player.cash += gain;
      this.addLog(
        player.id,
        `🎁 ${player.name} がイベント「${ev.title}」で +${gain}万円${granted ? `＆「${ITEMS[ev.grantItemId].name}」` : ''}を獲得！`,
        'event'
      );
      this.showEventResultPopup({
        title: `🎁 ${ev.title}`,
        description: `${ev.description}（+${gain}万円獲得）`,
        cashDelta: gain,
        isPositive: true,
      });
      return;
    }

    if (ev.isPositive) {
      const gain = Math.round(ev.amount * celebMult);
      player.cash += gain;
      this.addLog(
        player.id,
        `✨ イベント「${ev.title}」！ ${player.name} が +${gain.toLocaleString()}万円を獲得！`,
        'income'
      );
      this.callbacks.onPopupEffect?.(player.currentTileId, `+${gain}万`, '#22c55e', 'coin');
      this.showEventResultPopup({
        title: `✨ ${ev.title}`,
        description: ev.description,
        cashDelta: gain,
        badgeText: player.jobId === 'celebrity' ? '芸能人1.5倍ボーナス適用' : undefined,
        isPositive: true,
      });
    } else {
      this.addLog(
        player.id,
        `⚡ イベント「${ev.title}」… ${player.name} に ${ev.amount.toLocaleString()}万円の支払い発生`,
        'expense'
      );
      this.requirePayment(player, ev.amount, null, ev.title, () => {
        this.showEventResultPopup({
          title: `⚡ ${ev.title}`,
          description: ev.description,
          cashDelta: -ev.amount,
          isPositive: false,
        });
      });
    }
  }

  /**
   * 選択型イベントの選択肢実行＆成功判定ルーレット（仕様書8.2）
   * - エンジニアは出目 +1 補正
   * - 高級腕時計（luxury_watch）所持で出目 +1 補正
   * - 芸能人は成功報酬 1.5倍
   */
  public selectChoiceEventOption(playerId: string, optionIndex: number, isAuto = false): void {
    if (this.isClientReplica && this.remoteActionSender) {
      this.remoteActionSender({ type: 'SELECT_CHOICE_EVENT', playerId, optionIndex });
      return;
    }
    const player = this.getCurrentPlayer();
    if (
      player.id !== playerId ||
      this.pendingModal !== 'CHOICE_EVENT' ||
      !this.activeChoiceEvent
    ) {
      return;
    }
    if (!isAuto) this.notifyManualAction(playerId);

    const eventDef = this.activeChoiceEvent;
    const opt = eventDef.options[optionIndex] ?? eventDef.options[eventDef.options.length - 1];
    this.activeChoiceEvent = null;
    this.pendingModal = 'NONE';

    const celebMult = player.jobId === 'celebrity' ? 1.5 : 1.0;

    // ルーレット不要の安全選択肢または見送り選択肢
    if (opt.minSuccessRoll <= 0) {
      const gain = Math.round(opt.successCash * celebMult);
      if (gain > 0) {
        player.cash += gain;
        this.addLog(
          player.id,
          `✨ ${player.name} は「${opt.label}」を選択し、確実に +${gain}万円を獲得しました`,
          'income'
        );
      } else {
        this.addLog(player.id, `${player.name} は「${opt.label}」を選択しました`, 'info');
      }
      this.showEventResultPopup({
        title: eventDef.title,
        description:
          gain > 0
            ? `「${opt.label}」により +${gain.toLocaleString()}万円を獲得しました！`
            : `「${opt.label}」を選択し、リスクを回避しました。`,
        cashDelta: gain,
        isPositive: true,
      });
      return;
    }

    // 1〜6の成功判定ルーレットを回す
    const rawRoll = Math.floor(this.rng() * 6) + 1;
    let bonusRoll = 0;
    if (player.jobId === 'engineer') bonusRoll += 1;
    if (player.items.includes('luxury_watch')) bonusRoll += 1;
    const totalRoll = rawRoll + bonusRoll;
    const isSuccess = totalRoll >= opt.minSuccessRoll;

    this.lastDiceValue = rawRoll;
    this.isAnimatingMoveOrDice = true;
    this.notifyStateChanged();

    const finishEventRoll = () => {
      this.isAnimatingMoveOrDice = false;

      if (isSuccess) {
        const gain = Math.round(opt.successCash * celebMult);
        player.cash += gain;
        let extraMsg = '';

        if (opt.successPromote && player.jobId !== 'unemployed' && player.jobRank < 3) {
          player.jobRank = (player.jobRank + 1) as JobRank;
          extraMsg += ` ＆ ${JOBS[player.jobId].name} Rank ${player.jobRank} へ昇進！`;
        }
        if (opt.successItemId) {
          if (this.tryGrantItem(player, opt.successItemId)) {
            extraMsg += ` ＆「${ITEMS[opt.successItemId].name}」を獲得！`;
          }
        }

        this.addLog(
          player.id,
          `🎯 判定成功（出目${rawRoll}${bonusRoll > 0 ? `+補正${bonusRoll}` : ''} ≥ ${opt.minSuccessRoll}）！+${gain.toLocaleString()}万円${extraMsg}`,
          'important'
        );
        this.callbacks.onPopupEffect?.(player.currentTileId, `大成功! +${gain}万`, '#22c55e', 'celebrate');

        this.showEventResultPopup({
          title: `🎯 挑戦成功！（出目 ${rawRoll}${bonusRoll > 0 ? ` + 補正${bonusRoll}` : ''}）`,
          description: `目標出目 ${opt.minSuccessRoll} 以上を達成！報酬 +${gain.toLocaleString()}万円を獲得${extraMsg}`,
          cashDelta: gain,
          diceRollValue: rawRoll,
          diceBonusValue: bonusRoll,
          isPositive: true,
        });
      } else {
        const loss = opt.failCashLoss;
        this.addLog(
          player.id,
          `💥 判定失敗（出目${rawRoll}${bonusRoll > 0 ? `+補正${bonusRoll}` : ''} < ${opt.minSuccessRoll}）… -${loss}万円`,
          'expense'
        );

        const afterLossPaid = () => {
          if (opt.failSendToJail) {
            this.sendPlayerToJail(player, 'ハイリスク案件の失敗により当局に摘発され収監されました');
          } else {
            this.showEventResultPopup({
              title: `💥 挑戦失敗…（出目 ${rawRoll}${bonusRoll > 0 ? ` + 補正${bonusRoll}` : ''}）`,
              description: `目標出目 ${opt.minSuccessRoll} に届かず、-${loss.toLocaleString()}万円の損失となりました。`,
              cashDelta: -loss,
              diceRollValue: rawRoll,
              diceBonusValue: bonusRoll,
              isPositive: false,
            });
          }
        };

        if (loss > 0) {
          this.requirePayment(player, loss, null, `${eventDef.title}の失敗損失`, afterLossPaid);
        } else {
          afterLossPaid();
        }
      }
    };

    if (this.callbacks.onDiceRollRequested) {
      this.callbacks.onDiceRollRequested(player.id, rawRoll, 'event', finishEventRoll);
    } else {
      finishEventRoll();
    }
  }

  /**
   * ボーナスマス停止時の処理（芸能人1.5倍、自家用クルーザー+50%：仕様書7.1 & 10.1）
   */
  private handleLandOnBonusTile(player: PlayerState): void {
    const baseBonus = 300;
    let multiplier = 1.0;
    const badges: string[] = [];

    if (player.jobId === 'celebrity') {
      multiplier *= 1.5;
      badges.push('芸能人×1.5');
    }
    if (player.items.includes('private_cruiser')) {
      multiplier *= 1.5;
      badges.push('自家用クルーザー+50%');
    }

    const totalBonus = Math.round((baseBonus * multiplier) / 10) * 10;
    player.cash += totalBonus;

    this.addLog(
      player.id,
      `💎 ボーナスマス停止！ ${player.name} が臨時報酬 +${totalBonus.toLocaleString()}万円を獲得！`,
      'income'
    );
    this.callbacks.onPopupEffect?.(player.currentTileId, `+${totalBonus}万!`, '#eab308', 'coin');

    this.showEventResultPopup({
      title: '💎 トレジャーボーナス獲得！',
      description: `特別配当金として +${totalBonus.toLocaleString()}万円を獲得しました！`,
      cashDelta: totalBonus,
      badgeText: badges.length > 0 ? badges.join(' / ') : undefined,
      isPositive: true,
    });
  }

  /**
   * ショップマス停止時の処理（消費型・永続型アイテムの購入・売却：仕様書10章）
   */
  private handleLandOnShopTile(_player: PlayerState): void {
    // 全7種アイテムからショップラインナップを提示
    this.activeShopItems = ITEM_LIST.map((item) => item.id);
    this.pendingModal = 'SHOP_INTERACT';
  }

  /**
   * ショップでのアイテム購入（すでに3個所持時は discardSlotIndex で入れ替え売却可能）
   */
  public buyShopItem(
    playerId: string,
    itemId: ItemId,
    discardSlotIndex?: number,
    isAuto = false
  ): boolean {
    if (this.isClientReplica && this.remoteActionSender) {
      this.remoteActionSender({ type: 'BUY_SHOP_ITEM', playerId, itemId, discardSlotIndex });
      return true;
    }
    const player = this.getCurrentPlayer();
    if (player.id !== playerId || this.pendingModal !== 'SHOP_INTERACT') return false;
    if (!isAuto) this.notifyManualAction(playerId);

    const itemDef = ITEMS[itemId];
    if (!itemDef) return false;

    let tradeInValue = 0;
    if (player.items.length >= MAX_ITEM_LIMIT) {
      if (
        discardSlotIndex === undefined ||
        discardSlotIndex < 0 ||
        discardSlotIndex >= player.items.length
      ) {
        return false;
      }
      const oldItem = ITEMS[player.items[discardSlotIndex]];
      tradeInValue = Math.round((oldItem?.price ?? 0) * ITEM_SHOP_SELL_RATIO);
    }

    const netCost = itemDef.price - tradeInValue;
    if (player.cash < netCost) return false;

    if (player.items.length >= MAX_ITEM_LIMIT && discardSlotIndex !== undefined) {
      const removedId = player.items.splice(discardSlotIndex, 1)[0];
      this.addLog(
        player.id,
        `♻️ ${player.name} は「${ITEMS[removedId].name}」を下取り（+${tradeInValue}万円）に出しました`,
        'info'
      );
    }

    player.cash -= netCost;
    player.items.push(itemId);

    this.addLog(
      player.id,
      `🛍️ ${player.name} がショップで「${itemDef.name}」を購入しました（-${itemDef.price}万円）！`,
      'event'
    );
    this.callbacks.onPopupEffect?.(player.currentTileId, `${itemDef.icon} 購入!`, '#3b82f6', 'celebrate');

    this.pendingModal = 'NONE';
    this.enterTurnEndPhase();
    return true;
  }

  public sellShopItem(playerId: string, slotIndex: number): boolean {
    if (this.isClientReplica && this.remoteActionSender) {
      this.remoteActionSender({ type: 'SELL_SHOP_ITEM', playerId, slotIndex });
      return true;
    }
    const player = this.getCurrentPlayer();
    if (player.id !== playerId || this.pendingModal !== 'SHOP_INTERACT') return false;
    if (slotIndex < 0 || slotIndex >= player.items.length) return false;

    this.notifyManualAction(playerId);
    const removedId = player.items.splice(slotIndex, 1)[0];
    const sellPrice = Math.round((ITEMS[removedId]?.price ?? 100) * ITEM_SHOP_SELL_RATIO);
    player.cash += sellPrice;

    this.addLog(
      player.id,
      `💰 ${player.name} が「${ITEMS[removedId].name}」をショップへ売却し +${sellPrice}万円を受け取りました`,
      'income'
    );
    this.notifyStateChanged();
    return true;
  }

  public closeShopModal(playerId: string, isAuto = false): void {
    if (this.isClientReplica && this.remoteActionSender) {
      this.remoteActionSender({ type: 'CLOSE_SHOP', playerId });
      return;
    }
    const player = this.getCurrentPlayer();
    if (player.id !== playerId || this.pendingModal !== 'SHOP_INTERACT') return;
    if (!isAuto) this.notifyManualAction(playerId);

    this.pendingModal = 'NONE';
    this.enterTurnEndPhase();
  }

  /**
   * 税金マス停止時の処理（純資産の10%課税、公務員はRank1:30%, Rank2:40%, Rank3:50%軽減：仕様書4.2 & 7.1）
   */
  private handleLandOnTaxTile(player: PlayerState): void {
    const netWorth = this.getPlayerNetWorth(player);
    let rawTax = Math.max(100, Math.round((netWorth * 0.1) / 10) * 10);
    let badgeText: string | undefined;

    if (player.jobId === 'civil_servant') {
      const reductionRate = player.jobRank === 1 ? 0.3 : player.jobRank === 2 ? 0.4 : 0.5;
      rawTax = Math.max(50, Math.round((rawTax * (1 - reductionRate)) / 10) * 10);
      badgeText = `公務員パッシブ（税金${Math.round(reductionRate * 100)}%軽減）`;
    }

    this.addLog(
      player.id,
      `🏛️ 税務署マス停止！純資産に応じた資産税 ${rawTax.toLocaleString()}万円の支払い${badgeText ? `（${badgeText}）` : ''}`,
      'expense'
    );

    this.requirePayment(player, rawTax, null, '資産税の納付', () => {
      this.showEventResultPopup({
        title: '🏛️ 資産税の納付',
        description: `純資産（${netWorth.toLocaleString()}万円）に基づき、税金 ${rawTax.toLocaleString()}万円を納付しました。`,
        cashDelta: -rawTax,
        badgeText,
        isPositive: false,
      });
    });
  }

  /**
   * 刑務所への収監処理（仕様書11章）
   */
  private sendPlayerToJail(player: PlayerState, reason: string): void {
    player.currentTileId = 16; // Tile 16: 中央刑務所
    player.inJail = true;
    player.jailTurnsRemaining = JAIL_MAX_TURNS;

    this.addLog(player.id, `🚔 ${player.name} が刑務所に収監されました（最大3ターン拘束）`, 'important');
    this.callbacks.onPopupEffect?.(16, '収監!', '#ef4444', 'alert');

    this.showEventResultPopup({
      title: '🚔 中央刑務所へ収監',
      description: `${reason}（最大${JAIL_MAX_TURNS}ターン拘束。収監中も所有物件の収益は受け取れますが、プレイヤー間取引は行えません）。`,
      isPositive: false,
    });
  }

  private showEventResultPopup(popup: EventResultPopup): void {
    this.activeResultPopup = popup;
    this.pendingModal = 'EVENT_RESULT';
    this.cpuThinkTimer = 0;
    this.notifyStateChanged();
  }

  public acknowledgeEventResult(playerId: string, isAuto = false): void {
    if (this.isClientReplica && this.remoteActionSender) {
      this.remoteActionSender({ type: 'ACK_EVENT_RESULT', playerId });
      return;
    }
    const player = this.getCurrentPlayer();
    if (player.id !== playerId || this.pendingModal !== 'EVENT_RESULT') return;
    if (!isAuto) this.notifyManualAction(playerId);

    this.activeResultPopup = null;
    this.pendingModal = 'NONE';
    this.enterTurnEndPhase();
  }

  // ==========================================
  // 支払い・物件売却充当・破産判定・公開競売システム (仕様書5.6 & 6.2完全準拠)
  // ==========================================
  private onDebtSettledCallback: (() => void) | null = null;

  private requirePayment(
    debtor: PlayerState,
    amount: number,
    creditorId: string | null,
    reason: string,
    onSettled?: () => void
  ): void {
    if (debtor.cash >= amount) {
      debtor.cash -= amount;
      if (creditorId) {
        const creditor = this.getPlayerById(creditorId);
        if (creditor && !creditor.isBankrupt) {
          creditor.cash += amount;
          this.callbacks.onPopupEffect?.(creditor.currentTileId, `+${amount}万`, '#22c55e', 'coin');
        }
      }
      this.callbacks.onPopupEffect?.(debtor.currentTileId, `-${amount}万`, '#ef4444', 'alert');
      if (onSettled) {
        onSettled();
      } else {
        this.enterTurnEndPhase();
      }
      return;
    }

    // 所持現金が不足している場合：全所有物件を70%換算した総換金額を計算（仕様書6.2）
    const ownedTiles = this.getPlayerOwnedTiles(debtor.id);
    const totalLiquidationValue = ownedTiles.reduce(
      (sum, t) => sum + calculateBankSellValue(t),
      0
    );

    if (debtor.cash + totalLiquidationValue < amount) {
      // 全物件を70%売却しても不足することが確定している場合は即座に破産処理へ移行
      this.executeBankruptcy(debtor, reason);
      return;
    }

    // 物件を売却すれば支払える場合は物件売却選択モードへ
    this.activeDebt = {
      debtorPlayerId: debtor.id,
      creditorPlayerId: creditorId,
      requiredAmount: amount,
      reason,
    };
    this.onDebtSettledCallback = onSettled ?? null;
    this.pendingModal = 'DEBT_LIQUIDATION';
    this.cpuThinkTimer = 0;
    this.addLog(
      debtor.id,
      `⚠️ ${debtor.name} の現金が不足しています（必要額 ${amount}万円 / 所持金 ${debtor.cash}万円）。物件を売却して充当してください`,
      'important'
    );
    this.notifyStateChanged();
  }

  private settlePendingDebt(): void {
    if (!this.activeDebt) return;
    const debtor = this.getPlayerById(this.activeDebt.debtorPlayerId);
    const creditor = this.activeDebt.creditorPlayerId
      ? this.getPlayerById(this.activeDebt.creditorPlayerId)
      : null;

    if (debtor && debtor.cash >= this.activeDebt.requiredAmount) {
      debtor.cash -= this.activeDebt.requiredAmount;
      if (creditor && !creditor.isBankrupt) {
        creditor.cash += this.activeDebt.requiredAmount;
      }
      this.addLog(
        debtor.id,
        `✅ ${debtor.name} が物件売却により「${this.activeDebt.reason}（${this.activeDebt.requiredAmount}万円）」を完済しました`,
        'info'
      );
    }

    const cb = this.onDebtSettledCallback;
    this.activeDebt = null;
    this.onDebtSettledCallback = null;
    this.pendingModal = 'NONE';

    if (cb) {
      cb();
    } else if (this.phase === 'POST_MOVE') {
      this.enterTurnEndPhase();
    } else {
      this.notifyStateChanged();
    }
  }

  /**
   * 破産処理および所有物件の公開競売キュー登録（仕様書5.6 & 6.2）
   */
  private executeBankruptcy(player: PlayerState, reason: string): void {
    player.isBankrupt = true;
    player.cash = 0; // 残余現金および所持アイテムはクリーンに消滅（仕様書6.2-3）
    player.items = [];
    player.inJail = false;
    player.jailTurnsRemaining = 0;
    this.activeDebt = null;
    this.onDebtSettledCallback = null;

    const formerProperties = this.getPlayerOwnedTiles(player.id);
    for (const prop of formerProperties) {
      prop.ownerId = null; // 強化レベル(prop.level)は競売終了まで維持
    }

    this.addLog(
      player.id,
      `💥 【破産確定】${player.name} は「${reason}」を支払えず破産しました（観戦モードへ移行）！`,
      'important'
    );
    this.callbacks.onPopupEffect?.(player.currentTileId, '破産脱落...', '#ef4444', 'alert');

    // サバイバル決着チェック（生存者が1人になったら競売を行わず即座にゲーム終了）
    const alivePlayers = this.players.filter((p) => !p.isBankrupt);
    if (alivePlayers.length <= 1) {
      this.finishGame('サバイバル決着（他プレイヤー全員破産）');
      return;
    }

    // 破産プレイヤーが所有していた物件がある場合はターン制公開競売を開始
    if (formerProperties.length > 0) {
      const queueIds = formerProperties.map((t) => t.id);
      this.startNextAuctionFromQueue(queueIds);
    } else {
      this.enterTurnEndPhase();
    }
  }

  /**
   * ターン制公開競売（オークション）の開始（仕様書5.6）
   * - 開始価格: 基本購入価格の 50%
   * - 最低引き上げ単位: +50万円
   * - 1手制限時間: 15秒
   * - 強化レベル（Lv1〜Lv3）を維持
   */
  private startNextAuctionFromQueue(queueTileIds: number[]): void {
    if (queueTileIds.length === 0) {
      this.activeAuction = null;
      this.pendingModal = 'NONE';
      this.enterTurnEndPhase();
      return;
    }

    const [currentTileId, ...restQueue] = queueTileIds;
    const tile = this.getTileById(currentTileId);
    const startPrice = Math.max(
      50,
      Math.round(((tile.basePrice ?? 200) * AUCTION_START_RATIO) / 10) * 10
    );

    // 入札資格のある生存プレイヤー（所持金 >= 開始価格 かつ 物件所有数 < 上限）
    const eligibleBidders = this.players
      .filter(
        (p) =>
          !p.isBankrupt &&
          p.cash >= startPrice &&
          this.getPlayerOwnedTiles(p.id).length < this.getPlayerPropertyLimit(p)
      )
      .map((p) => p.id);

    if (eligibleBidders.length === 0) {
      // 誰も入札資格がない場合は未所有(Lv1)にリセットして次へ
      tile.ownerId = null;
      tile.level = 1;
      this.addLog(
        this.getCurrentPlayer().id,
        `🔨 競売物件「${tile.name}」は入札可能プレイヤーがいないため未所有（Lv1）へリセットされました`,
        'property'
      );
      this.startNextAuctionFromQueue(restQueue);
      return;
    }

    this.activeAuction = {
      queueTileIds: restQueue,
      currentTileId,
      preservedLevel: tile.level ?? 1,
      currentBid: startPrice - AUCTION_MIN_INCREMENT, // 初回入札で startPrice（50%）から提示可能
      highestBidderId: null,
      activeBidderIds: eligibleBidders,
      currentTurnBidderId: eligibleBidders[0],
      remainingSeconds: AUCTION_BID_TIME_SEC,
    };
    this.pendingModal = 'AUCTION';
    this.cpuThinkTimer = 0;

    this.addLog(
      this.getCurrentPlayer().id,
      `🔨 【公開競売開始】「${tile.name} (Lv${tile.level ?? 1}維持)」開始価格 ${startPrice}万円！`,
      'important'
    );
    this.callbacks.onPopupEffect?.(tile.id, '競売開始!', '#eab308', 'auction');
    this.notifyStateChanged();
  }

  /**
   * 公開競売での入札アクション（現在の最高額 + 50万円以上）
   */
  public placeAuctionBid(
    playerId: string,
    bidAmount: number,
    isAuto = false
  ): boolean {
    if (this.isClientReplica && this.remoteActionSender) {
      this.remoteActionSender({ type: 'PLACE_AUCTION_BID', playerId, bidAmount });
      return true;
    }
    if (this.pendingModal !== 'AUCTION' || !this.activeAuction) return false;
    const auction = this.activeAuction;
    if (auction.currentTurnBidderId !== playerId) return false;

    const player = this.getPlayerById(playerId);
    if (!player) return false;
    if (!isAuto) this.notifyManualAction(playerId);

    const minRequiredBid = auction.currentBid + AUCTION_MIN_INCREMENT;
    const roundedBid = Math.round(bidAmount / 10) * 10;

    if (
      roundedBid < minRequiredBid ||
      roundedBid > player.cash ||
      this.getPlayerOwnedTiles(player.id).length >= this.getPlayerPropertyLimit(player)
    ) {
      return false;
    }

    auction.currentBid = roundedBid;
    auction.highestBidderId = player.id;
    auction.remainingSeconds = AUCTION_BID_TIME_SEC;
    this.cpuThinkTimer = 0;

    const tile = this.getTileById(auction.currentTileId);
    this.addLog(
      player.id,
      `🔨 ${player.name} が「${tile.name}」に ${roundedBid.toLocaleString()}万円で入札！`,
      'property'
    );

    this.advanceAuctionTurn();
    return true;
  }

  /**
   * 公開競売でのパス宣言（一度パスしたプレイヤーは再入札不可：仕様書5.6-2）
   */
  public passAuction(playerId: string, isAuto = false): void {
    if (this.isClientReplica && this.remoteActionSender) {
      this.remoteActionSender({ type: 'PASS_AUCTION', playerId });
      return;
    }
    if (this.pendingModal !== 'AUCTION' || !this.activeAuction) return;
    const auction = this.activeAuction;
    if (auction.currentTurnBidderId !== playerId) return;

    const player = this.getPlayerById(playerId);
    if (!isAuto && player) this.notifyManualAction(playerId);

    auction.activeBidderIds = auction.activeBidderIds.filter((id) => id !== playerId);
    this.addLog(
      playerId,
      `🔨 ${player?.name ?? 'プレイヤー'} が競売をパスしました`,
      'info'
    );

    this.advanceAuctionTurn();
  }

  private advanceAuctionTurn(): void {
    if (!this.activeAuction) return;
    const auction = this.activeAuction;
    const tile = this.getTileById(auction.currentTileId);

    // 次の入札額（currentBid + 50万）を支払えないプレイヤーを自動除外
    const nextMinBid = auction.currentBid + AUCTION_MIN_INCREMENT;
    auction.activeBidderIds = auction.activeBidderIds.filter((id) => {
      if (id === auction.highestBidderId) return true;
      const p = this.getPlayerById(id);
      return p !== undefined && p.cash >= nextMinBid;
    });

    // 1. 全員がパスし、最高入札者もいない場合 -> 未所有(Lv1)にリセット（仕様書5.6-4）
    if (auction.activeBidderIds.length === 0 && !auction.highestBidderId) {
      tile.ownerId = null;
      tile.level = 1;
      this.addLog(
        this.getCurrentPlayer().id,
        `🔨 「${tile.name}」は全員パスのため落札者なし（未所有 Lv1 にリセット）となりました`,
        'info'
      );
      this.startNextAuctionFromQueue(auction.queueTileIds);
      return;
    }

    // 2. 最高入札者1人だけが残った場合 -> 落札確定！（仕様書5.6-3）
    if (
      auction.highestBidderId &&
      (auction.activeBidderIds.length === 0 ||
        (auction.activeBidderIds.length === 1 &&
          auction.activeBidderIds[0] === auction.highestBidderId))
    ) {
      const winner = this.getPlayerById(auction.highestBidderId);
      if (winner) {
        winner.cash -= auction.currentBid;
        tile.ownerId = winner.id;
        tile.level = auction.preservedLevel;
        this.addLog(
          winner.id,
          `🎉 【競売落札】${winner.name} が「${tile.name} (Lv${tile.level})」を ${auction.currentBid.toLocaleString()}万円で落札しました！`,
          'important'
        );
        this.callbacks.onPopupEffect?.(
          tile.id,
          `${winner.name} 落札!`,
          '#22c55e',
          'auction'
        );
      }
      this.startNextAuctionFromQueue(auction.queueTileIds);
      return;
    }

    // 3. まだ複数人が残っている場合は次の入札者へ手番を回す
    const currentIdx = auction.activeBidderIds.indexOf(auction.currentTurnBidderId);
    const nextIdx = (currentIdx + 1) % auction.activeBidderIds.length;
    auction.currentTurnBidderId = auction.activeBidderIds[nextIdx];
    auction.remainingSeconds = AUCTION_BID_TIME_SEC;
    this.cpuThinkTimer = 0;

    this.notifyStateChanged();
  }

  // ==========================================
  // Phase 5: ターン終了＆次プレイヤー・ラウンド移行処理
  // ==========================================
  private enterTurnEndPhase(): void {
    this.phase = 'TURN_END';
    this.pendingModal = 'NONE';
    this.cpuThinkTimer = 0;
    this.notifyStateChanged();
  }

  public endTurn(playerId: string, isAuto = false): void {
    if (this.isClientReplica && this.remoteActionSender) {
      this.remoteActionSender({ type: 'END_TURN', playerId });
      return;
    }
    const player = this.getCurrentPlayer();
    if (player.id !== playerId) return;
    if (!isAuto) this.notifyManualAction(playerId);

    this.advanceToNextPlayer();
  }

  private advanceToNextPlayer(): void {
    const alivePlayers = this.players.filter((p) => !p.isBankrupt);
    if (alivePlayers.length <= 1) {
      this.finishGame('サバイバル決着（最後の1人が生存）');
      return;
    }

    let nextIdx = this.currentPlayerIndex;
    let wrappedRound = false;

    for (let i = 0; i < this.players.length; i++) {
      nextIdx = (nextIdx + 1) % this.players.length;
      if (nextIdx === 0) {
        wrappedRound = true;
      }
      if (!this.players[nextIdx].isBankrupt) {
        break;
      }
    }

    if (wrappedRound) {
      this.currentRound++;

      // ゲーム終了条件判定（仕様書2.1：規定ターン制 または 制限時間制のラウンド区切り終了時）
      if (this.config.ruleMode === 'TURN_LIMIT' && this.currentRound > this.config.maxTurns) {
        this.finishGame(`規定ターン（全${this.config.maxTurns}ターン）消化完了`);
        return;
      }
      if (
        this.config.ruleMode === 'TIME_LIMIT' &&
        this.elapsedGameSeconds >= this.config.timeLimitMinutes * 60
      ) {
        this.finishGame(`制限時間（${this.config.timeLimitMinutes}分）経過ラウンド終了`);
        return;
      }
    }

    this.currentPlayerIndex = nextIdx;
    this.beginTurn();
  }

  private finishGame(reason: string): void {
    this.phase = 'GAME_OVER';
    this.pendingModal = 'NONE';
    const rankings = this.getRankings();
    const awards = this.getSpecialAwards();
    const winner = rankings[0];

    this.addLog(
      winner?.playerId ?? '',
      `🏆 ゲーム終了（${reason}）！優勝は純資産 ${winner?.totalNetWorth.toLocaleString()}万円の ${winner?.playerName} です！`,
      'important'
    );
    this.notifyStateChanged();
    this.callbacks.onGameOver?.(rankings, awards);
  }

  // ==========================================
  // タイムアウト自動処理（仕様書3.4完全準拠）＆ スマートCPU思考ルーチン
  // ==========================================
  private handleTimeoutAutoAction(player: PlayerState): void {
    if (this.pendingModal === 'JAIL_DECISION') {
      // 刑務所内なら「脱出ルーレット挑戦」を自動選択（仕様書3.4-1）
      this.handleJailDecision(player.id, 'roll', true);
      return;
    }

    if (this.phase === 'PRE_MOVE' && this.pendingModal === 'NONE') {
      // 移動前なら自動的にルーレットを回して移動（仕様書3.4-1）
      this.rollDiceAndMove(player.id, true);
      return;
    }

    if (this.pendingModal === 'BRANCH_SELECT') {
      const tile = this.getTileById(player.currentTileId);
      this.selectBranchRoute(player.id, tile.nextTileIds[0], true);
      return;
    }

    if (this.pendingModal === 'PROPERTY_PURCHASE') {
      // 物件の購入確認：「パス（購入しない）」を自動選択（仕様書3.4-2）
      this.handlePropertyPurchaseDecision(player.id, false, true);
      return;
    }

    if (this.pendingModal === 'PROPERTY_UPGRADE') {
      // 物件の強化確認：「パス（強化しない）」を自動選択（仕様書3.4-2）
      this.handlePropertyUpgradeDecision(player.id, false, true);
      return;
    }

    if (this.pendingModal === 'CAREER_SELECT') {
      this.selectCareerOption(player.id, 0, true);
      return;
    }

    if (this.pendingModal === 'CHOICE_EVENT' && this.activeChoiceEvent) {
      // デフォルト選択肢（見送る／安全選択肢）を自動選択（仕様書3.4-2）
      const lastIdx = this.activeChoiceEvent.options.length - 1;
      this.selectChoiceEventOption(player.id, lastIdx, true);
      return;
    }

    if (this.pendingModal === 'SHOP_INTERACT') {
      this.closeShopModal(player.id, true);
      return;
    }

    if (this.pendingModal === 'DEBT_LIQUIDATION') {
      // 支払い不足時の物件売却選択：評価額が低い物件から支払い可能になるまで自動売却（仕様書3.4-2）
      const owned = this.getPlayerOwnedTiles(player.id).sort(
        (a, b) => calculatePropertyValuation(a) - calculatePropertyValuation(b)
      );
      for (const prop of owned) {
        this.sellPropertyToBank(player.id, prop.id, true);
        if (this.pendingModal !== 'DEBT_LIQUIDATION') break;
      }
      return;
    }

    if (this.pendingModal === 'EVENT_RESULT') {
      this.acknowledgeEventResult(player.id, true);
      return;
    }

    if (this.phase === 'TURN_END') {
      this.endTurn(player.id, true);
    }
  }

  /**
   * スマートCPU（AI）の戦略的意思決定ルーチン
   */
  private executeCpuStep(cpu: PlayerState): void {
    // 1. 刑務所内での判断
    if (this.pendingModal === 'JAIL_DECISION') {
      if (cpu.items.includes('jail_free')) {
        this.handleJailDecision(cpu.id, 'card', true);
      } else if (cpu.cash >= JAIL_BAIL_COST + 600) {
        this.handleJailDecision(cpu.id, 'bail', true);
      } else {
        this.handleJailDecision(cpu.id, 'roll', true);
      }
      return;
    }

    // 2. Phase 2（移動前）の判断：有用な消費アイテムがあれば使い、サイコロを振る
    if (this.phase === 'PRE_MOVE' && this.pendingModal === 'NONE') {
      if (!cpu.usedItemThisTurn) {
        if (cpu.items.includes('toll_shield') && !cpu.activeTollShield) {
          this.useConsumableItem(cpu.id, 'toll_shield');
          return;
        }
        if (cpu.items.includes('discount_ticket') && !cpu.activeDiscountTicket) {
          this.useConsumableItem(cpu.id, 'discount_ticket');
          return;
        }
      }
      this.rollDiceAndMove(cpu.id, true);
      return;
    }

    // 3. 分岐ルート選択：無職・未婚なら分岐1（キャリア・ファミリー）、資金豊富なら分岐2（特区）を選択
    if (this.pendingModal === 'BRANCH_SELECT') {
      const tile = this.getTileById(cpu.currentTileId);
      let pickIdx = 0;
      if (tile.id === 6 && (cpu.jobId === 'unemployed' || !cpu.hasSpouse)) {
        pickIdx = 1; // 内周キャリア＆ファミリールート
      } else if (tile.id === 22 && cpu.cash >= 600) {
        pickIdx = 1; // 内周ハイリスク特区ルート
      }
      this.selectBranchRoute(cpu.id, tile.nextTileIds[pickIdx] ?? tile.nextTileIds[0], true);
      return;
    }

    // 4. 未所有物件の購入判断：生活防衛資金150万円を残して買えるなら積極的に購入
    if (this.pendingModal === 'PROPERTY_PURCHASE') {
      const tile = this.getTileById(cpu.currentTileId);
      const hasTicket = cpu.activeDiscountTicket || cpu.items.includes('discount_ticket');
      const cost = calculatePropertyPurchaseCost(tile, cpu.jobId, hasTicket);
      const canBuy =
        cpu.cash >= cost + 120 &&
        this.getPlayerOwnedTiles(cpu.id).length < this.getPlayerPropertyLimit(cpu);
      this.handlePropertyPurchaseDecision(cpu.id, canBuy, true);
      return;
    }

    // 5. 自己物件の強化判断
    if (this.pendingModal === 'PROPERTY_UPGRADE') {
      const tile = this.getTileById(cpu.currentTileId);
      const hasTicket = cpu.activeDiscountTicket || cpu.items.includes('discount_ticket');
      const cost = calculateUpgradeCost(tile, cpu.jobId, hasTicket);
      const canUpgrade = cpu.cash >= cost + 150 && (tile.level ?? 1) < 3;
      this.handlePropertyUpgradeDecision(cpu.id, canUpgrade, true);
      return;
    }

    // 6. キャリア選択：昇進があれば最優先、なければ給料・上限バランスの良い職種へ就職
    if (this.pendingModal === 'CAREER_SELECT') {
      this.selectCareerOption(cpu.id, 0, true);
      return;
    }

    // 7. 選択型イベント：エンジニアや腕時計持ち、または資金に余裕がある場合は挑戦、なければ堅実選択肢
    if (this.pendingModal === 'CHOICE_EVENT' && this.activeChoiceEvent) {
      const hasBonus = cpu.jobId === 'engineer' || cpu.items.includes('luxury_watch');
      const pickIdx = hasBonus || cpu.cash >= 900 ? 0 : 1;
      this.selectChoiceEventOption(cpu.id, pickIdx, true);
      return;
    }

    // 8. ショップ：余裕があれば永続資産アイテムまたは割引チケットを購入
    if (this.pendingModal === 'SHOP_INTERACT') {
      if (cpu.items.length < MAX_ITEM_LIMIT) {
        if (cpu.cash >= 900 && !cpu.items.includes('realtor_license')) {
          this.buyShopItem(cpu.id, 'realtor_license', undefined, true);
          return;
        }
        if (cpu.cash >= 600 && !cpu.items.includes('luxury_watch')) {
          this.buyShopItem(cpu.id, 'luxury_watch', undefined, true);
          return;
        }
        if (cpu.cash >= 400 && !cpu.items.includes('discount_ticket')) {
          this.buyShopItem(cpu.id, 'discount_ticket', undefined, true);
          return;
        }
      }
      this.closeShopModal(cpu.id, true);
      return;
    }

    // 9. 支払い不足時の物件売却
    if (this.pendingModal === 'DEBT_LIQUIDATION') {
      this.handleTimeoutAutoAction(cpu);
      return;
    }

    // 10. イベント結果ポップアップ確認
    if (this.pendingModal === 'EVENT_RESULT') {
      this.acknowledgeEventResult(cpu.id, true);
      return;
    }

    // 11. Phase 5: ターン終了宣言
    if (this.phase === 'TURN_END') {
      this.endTurn(cpu.id, true);
    }
  }

  private executeCpuAuctionTurn(cpu: PlayerState): void {
    if (!this.activeAuction) return;
    const auction = this.activeAuction;
    const tile = this.getTileById(auction.currentTileId);
    const valuation = calculatePropertyValuation(tile);
    const nextMinBid = auction.currentBid + AUCTION_MIN_INCREMENT;

    // 物件評価額の90%以下かつ手元資金に200万円以上の余裕があれば入札、それ以外はパス
    if (
      auction.highestBidderId !== cpu.id &&
      nextMinBid <= valuation * 0.9 &&
      cpu.cash >= nextMinBid + 200
    ) {
      this.placeAuctionBid(cpu.id, nextMinBid, true);
    } else {
      this.passAuction(cpu.id, true);
    }
  }

  private executeCpuTradeResponse(cpu: PlayerState): void {
    if (!this.activeTradeProposal) return;
    const prop = this.activeTradeProposal;

    // 提示された総価値と要求された総価値を比較し、CPU側が損をしない内容なら承認する
    const offeredPropVal = prop.offerPropertyIds.reduce(
      (sum, id) => sum + calculatePropertyValuation(this.getTileById(id)),
      0
    );
    const requestedPropVal = prop.requestPropertyIds.reduce(
      (sum, id) => sum + calculatePropertyValuation(this.getTileById(id)),
      0
    );
    const offeredItemVal = prop.offerItemIndices.reduce(
      (sum, idx) => sum + (ITEMS[this.getPlayerById(prop.fromPlayerId)?.items[idx] ?? 'dice_select']?.price ?? 0),
      0
    );
    const requestedItemVal = prop.requestItemIndices.reduce(
      (sum, idx) => sum + (ITEMS[cpu.items[idx] ?? 'dice_select']?.price ?? 0),
      0
    );

    const totalOffered = prop.offerCash + offeredPropVal + offeredItemVal;
    const totalRequested = prop.requestCash + requestedPropVal + requestedItemVal;

    const accept = totalOffered >= totalRequested * 1.05;
    this.respondToTrade(cpu.id, accept, true);
  }

  private tryGrantItem(player: PlayerState, itemId: ItemId): boolean {
    if (player.items.length >= MAX_ITEM_LIMIT) {
      return false;
    }
    player.items.push(itemId);
    return true;
  }

  private addLog(
    playerId: string,
    message: string,
    type: GameLogEntry['type'] = 'info'
  ): void {
    const entry: GameLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      turn: this.currentRound,
      playerId,
      message,
      timestamp: Date.now(),
      type,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 80) {
      this.logs.pop();
    }
    this.callbacks.onLogAdded?.(entry);
  }

  private notifyStateChanged(): void {
    this.callbacks.onStateChanged?.();
  }
}
