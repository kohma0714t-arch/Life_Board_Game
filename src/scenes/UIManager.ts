import { characterAvatarUrls, cityPreviewUrl } from '../assets/asset-manifest';
import { SoundManager } from '../audio/sound-manager';
import {
  AUCTION_MIN_INCREMENT,
  CHARACTERS,
  CHARACTER_LIST,
  CharacterId,
  ITEMS,
  ITEM_SHOP_SELL_RATIO,
  ItemId,
  JAIL_BAIL_COST,
  JOBS,
  MAX_ITEM_LIMIT,
  THEME_COLORS,
  THEME_COLOR_LIST,
  TIME_MODE_OPTIONS_MIN,
  TURN_MODE_OPTIONS,
  ThemeColorId,
} from '../config/constants';
import { RoomLobbyState, RoomManager } from '../network/RoomManager';
import {
  AssetBreakdown,
  GameEngine,
  GameLogEntry,
  PlayerState,
  SpecialAward,
} from '../systems/GameEngine';
import {
  BoardTile,
  calculateBankSellValue,
  calculateCommercialRegularIncome,
  calculatePropertyPurchaseCost,
  calculatePropertyToll,
  calculatePropertyValuation,
  calculateUpgradeCost,
  isGroupMonopolized,
} from '../systems/MapGenerator';
import { MainScene } from './MainScene';

export type ScreenType = 'TITLE' | 'LOBBY' | 'CHAR_SELECT' | 'GAME' | 'RESULT';

type SubOverlayModal =
  | 'NONE'
  | 'SETTINGS'
  | 'HELP'
  | 'ITEM_USE'
  | 'TRADE_COMPOSE'
  | 'BANK_SELL'
  | 'PLAYER_DETAIL'
  | 'TILE_DETAIL'
  | 'PAUSE_MENU';

export class UIManager {
  private container: HTMLElement;
  private roomManager: RoomManager;
  private soundManager: SoundManager;
  private mainScene: MainScene;
  private engine: GameEngine | null = null;

  private currentScreen: ScreenType = 'TITLE';
  private subModal: SubOverlayModal = 'NONE';

  // キャラクター選択画面の対象プレイヤーID
  private editingPlayerId: string = 'player_1';
  private selectedCharId: CharacterId = 'char_1';
  private selectedColorId: ThemeColorId = 'blue';
  private editingPlayerName: string = 'プレイヤー1';

  // サブモーダル用の一時状態
  private inspectedPlayerId: string | null = null;
  private inspectedTileId: number | null = null;
  private selectedDiceCardTarget: number = 6;
  private shopDiscardSlotIndex: number = 0;

  // トレード作成フォーム状態
  private tradeTargetPlayerId: string = '';
  private tradeOfferCash: number = 0;
  private tradeRequestCash: number = 0;
  private tradeOfferProps: Set<number> = new Set();
  private tradeRequestProps: Set<number> = new Set();
  private tradeOfferItems: Set<number> = new Set();
  private tradeRequestItems: Set<number> = new Set();
  private tradeErrorMsg: string = '';

  // リザルト画面用状態
  private finalRankings: AssetBreakdown[] = [];
  private finalAwards: SpecialAward[] = [];
  private selectedResultPlayerId: string = '';

  // トースト通知
  private toasts: Array<{ id: string; message: string; type: GameLogEntry['type'] }> = [];
  private lobbyJoinCodeInput: string = '';
  private lobbyNoticeMessage: string = '';
  private isJoinDrawerOpen: boolean = false;
  private lobbyCountdownTargetMs: number = Date.now() + 83000; // 00:01:23 からカウントダウン開始

  constructor(
    container: HTMLElement,
    roomManager: RoomManager,
    soundManager: SoundManager,
    mainScene: MainScene
  ) {
    this.container = container;
    this.roomManager = roomManager;
    this.soundManager = soundManager;
    this.mainScene = mainScene;

    this.roomManager.setCallbacksForGuest(this.createEngineCallbacks());
    this.roomManager.setOnGuestMatchStart((guestEngine) => {
      this.engine = guestEngine;
      this.mainScene.buildBoard(guestEngine.tiles);
      this.mainScene.syncWithEngine(guestEngine);
      this.currentScreen = 'GAME';
      this.subModal = 'NONE';
      this.soundManager.playGlobalSound('turn_start');
      this.render();
    });

    this.roomManager.subscribe(() => {
      if (this.currentScreen === 'LOBBY' || this.currentScreen === 'CHAR_SELECT') {
        this.render();
      }
    });

    this.mainScene.setTileInteractionCallbacks((tileId) => {
      if (this.currentScreen === 'GAME' && this.engine) {
        this.soundManager.playGlobalSound('ui_click');
        this.inspectedTileId = tileId;
        this.subModal = 'TILE_DETAIL';
        this.mainScene.focusOnTile(tileId);
        this.render();
      }
    });

    // URLに ?room=XXXXXX がある場合は自動的にロビー画面へ遷移してそのルームに参加する
    const inviteRoomCode = RoomManager.getInviteRoomIdFromUrl();
    if (inviteRoomCode) {
      this.currentScreen = 'LOBBY';
      this.lobbyJoinCodeInput = inviteRoomCode;
      this.lobbyNoticeMessage = `⏳ 招待ルーム (${inviteRoomCode}) に接続しています...`;
      this.render();
      void this.roomManager.joinP2PRoomByCode(inviteRoomCode).then((res) => {
        this.lobbyNoticeMessage = res.ok
          ? `✅ ルーム ${inviteRoomCode} に参加しました！「キャラ変更」から名前や見た目を設定できます。`
          : `⚠️ ${res.error ?? 'ルーム接続に失敗しました'}`;
        this.render();
      });
    } else {
      this.render();
    }
  }

  public setGameEngine(engine: GameEngine): void {
    this.engine = engine;
  }

  public showScreen(screen: ScreenType): void {
    if (screen === 'LOBBY' && this.currentScreen !== 'LOBBY' && this.currentScreen !== 'CHAR_SELECT') {
      this.lobbyCountdownTargetMs = Date.now() + 83000;
    }
    this.currentScreen = screen;
    this.subModal = 'NONE';
    this.render();
  }

  public pushToast(entry: GameLogEntry): void {
    const id = entry.id;
    this.toasts.unshift({ id, message: entry.message, type: entry.type });
    if (this.toasts.length > 4) {
      this.toasts.pop();
    }
    this.updateToastDOM();

    window.setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id);
      this.updateToastDOM();
    }, 4200);
  }

  public showResultScreen(rankings: AssetBreakdown[], awards: SpecialAward[]): void {
    this.finalRankings = rankings;
    this.finalAwards = awards;
    this.selectedResultPlayerId = rankings[0]?.playerId ?? '';
    this.currentScreen = 'RESULT';
    this.subModal = 'NONE';
    this.soundManager.playGlobalSound('victory');
    this.render();
  }

  private formatLobbyCountdown(): string {
    const remainSec = Math.max(0, Math.ceil((this.lobbyCountdownTargetMs - Date.now()) / 1000));
    const hrs = Math.floor(remainSec / 3600);
    const mins = Math.floor((remainSec % 3600) / 60);
    const secs = remainSec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }

  /**
   * 毎フレームの軽量タイマー表示更新（DOM全体を再構築せず秒数テキストのみ高速更新）
   */
  public updateTimersOnly(): void {
    if (this.currentScreen === 'LOBBY') {
      const lobbyCountdownEl = this.container.querySelector('#lobby-start-countdown');
      if (lobbyCountdownEl) {
        lobbyCountdownEl.textContent = this.formatLobbyCountdown();
      }
      return;
    }

    if (this.currentScreen !== 'GAME' || !this.engine) return;

    const timerTextEl = this.container.querySelector('#hud-turn-timer-text');
    const timerPillEl = this.container.querySelector('#hud-turn-timer-pill');
    if (timerTextEl) {
      const sec = Math.max(0, Math.ceil(this.engine.turnTimerSec));
      timerTextEl.textContent = `あと ${sec} 秒`;
      if (timerPillEl) {
        const current = this.engine.getCurrentPlayer();
        const isDanger = sec <= 10 || current?.isAfk;
        timerPillEl.classList.toggle('timer-danger', Boolean(isDanger));
      }
    }

    if (this.engine.pendingModal === 'TRADE_RESPONSE' && this.engine.activeTradeProposal) {
      const tradeTimerEl = this.container.querySelector('#modal-trade-timer');
      if (tradeTimerEl) {
        tradeTimerEl.textContent = `${Math.max(0, Math.ceil(this.engine.activeTradeProposal.remainingSeconds))}秒`;
      }
    }

    if (this.engine.pendingModal === 'AUCTION' && this.engine.activeAuction) {
      const auctionTimerEl = this.container.querySelector('#modal-auction-timer');
      if (auctionTimerEl) {
        auctionTimerEl.textContent = `${Math.max(0, Math.ceil(this.engine.activeAuction.remainingSeconds))}秒`;
      }
    }
  }

  // ==========================================
  // メインレンダリングディスパッチャ
  // ==========================================
  public render(): void {
    switch (this.currentScreen) {
      case 'TITLE':
        this.renderTitleScreen();
        break;
      case 'LOBBY':
        this.renderLobbyScreen();
        break;
      case 'CHAR_SELECT':
        this.renderCharSelectScreen();
        break;
      case 'GAME':
        this.renderGameHud();
        break;
      case 'RESULT':
        this.renderResultScreen();
        break;
    }
  }

  // ==========================================
  // 1. タイトル画面 (TITLE) - リファレンス左上パネル完全準拠
  // ==========================================
  private renderTitleScreen(): void {
    this.container.innerHTML = `
      <div class="screen-overlay title-screen">
        <div class="sky-clouds-bg"></div>
        <div class="city-silhouette-bg"></div>

        <div class="title-center-card">
          <div class="logo-wrapper">
            <div class="logo-orbit-ring"></div>
            <div class="logo-dice-badge" aria-hidden="true">
              ${this.renderDiceSvgIcon(6, 68)}
            </div>
            <h1 class="logo-title-text">Life Board</h1>
            <p class="logo-subtitle-text">3D オンライン人生＆不動産ボードゲーム</p>
          </div>

          <div class="title-actions">
            <button id="btn-title-start" class="btn-primary-gradient btn-xl">
              <span>ゲームスタート</span>
              <span class="btn-arrow">❯</span>
            </button>

            <div class="title-sub-buttons">
              <button id="btn-title-settings" class="btn-white-pill">
                <span class="icon">⚙️</span>
                <span>設定</span>
              </button>
              <button id="btn-title-help" class="btn-white-pill">
                <span class="icon">❓</span>
                <span>ヘルプ</span>
              </button>
            </div>
          </div>
        </div>

        ${this.renderSubOverlayModal()}
      </div>
    `;

    this.container.querySelector('#btn-title-start')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      this.soundManager.startBGM();
      this.showScreen('LOBBY');
      if (this.roomManager.getLobbyState().p2pRole === 'offline') {
        void this.roomManager.openP2PHostRoom();
      }
    });

    this.container.querySelector('#btn-title-settings')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      this.subModal = 'SETTINGS';
      this.render();
    });

    this.container.querySelector('#btn-title-help')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      this.subModal = 'HELP';
      this.render();
    });

    this.bindSubOverlayEvents();
  }

  // ==========================================
  // 2. ルームロビー画面 (LOBBY) - 新リファレンスデザイン完全準拠
  // ==========================================
  private renderLobbyScreen(): void {
    const lobby: RoomLobbyState = this.roomManager.getLobbyState();
    const isGuest = lobby.p2pRole === 'guest';
    const estMinutes =
      lobby.ruleMode === 'TURN_LIMIT'
        ? Math.round(lobby.maxTurns * 1.0)
        : lobby.timeLimitMinutes;

    const ruleSummaryText =
      lobby.ruleMode === 'TURN_LIMIT'
        ? `規定ターン制 (${lobby.maxTurns}ターン)`
        : `制限時間制 (${lobby.timeLimitMinutes}分)`;

    const slotsHtml: string[] = [];
    for (let i = 0; i < 6; i++) {
      const p = lobby.players[i];
      if (p) {
        const colorDef = THEME_COLORS[p.colorId];
        const isMe = p.id === lobby.localPlayerId;
        const canEditSlot = !isGuest || isMe;
        const canRemoveSlot = !isGuest && !p.isHost && lobby.players.length > 2;

        slotsHtml.push(`
          <div
            class="lobby-v2-player-row filled ${canEditSlot ? 'clickable' : ''}"
            ${canEditSlot ? `data-edit-player="${p.id}" title="クリックでキャラ・色・名前を変更"` : ''}
          >
            <div class="lobby-v2-player-left">
              <span class="lobby-v2-color-dot" style="background: ${colorDef.hex}"></span>
              <span class="lobby-v2-player-name">${this.escapeHtml(p.name)}</span>
              ${!p.isConnected ? '<span class="lobby-v2-mini-tag danger">切断中</span>' : ''}
            </div>
            <div class="lobby-v2-player-right">
              ${p.isHost ? '<span class="lobby-v2-crown" title="ホスト">👑</span>' : ''}
              ${
                canEditSlot
                  ? `<button class="lobby-v2-row-icon-btn" data-edit-player="${p.id}" title="キャラ・名前変更">✎</button>`
                  : ''
              }
              ${
                canRemoveSlot
                  ? `<button class="lobby-v2-row-icon-btn remove" data-remove-player="${p.id}" title="枠を削除">✕</button>`
                  : ''
              }
            </div>
          </div>
        `);
      } else {
        slotsHtml.push(`
          <div class="lobby-v2-player-row empty">
            <div class="lobby-v2-player-left">
              <span class="lobby-v2-empty-avatar" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                </svg>
              </span>
              <span class="lobby-v2-empty-label">募集中...</span>
            </div>
            ${
              !isGuest
                ? `
              <div class="lobby-v2-empty-actions">
                <button class="lobby-v2-slot-add-btn" data-add-cpu="true" title="CPUを追加">＋CPU</button>
                <button class="lobby-v2-slot-add-btn" data-add-human="true" title="プレイヤー枠を追加">＋人間</button>
              </div>
            `
                : ''
            }
          </div>
        `);
      }
    }

    const statusBannerText =
      this.lobbyNoticeMessage ||
      (lobby.connectedPeerCount > 0
        ? `オンライン接続中（参加者 ${lobby.connectedPeerCount + 1}人） - プレイヤーが集まるのを待っています...`
        : 'プレイヤーが集まるのを待っています...');

    this.container.innerHTML = `
      <div class="screen-overlay lobby-v2-screen">
        <div class="lobby-v2-shell">
          <!-- 上部ヘッダーバー (3カラム) -->
          <header class="lobby-v2-top-bar">
            <div class="lobby-v2-top-left">
              <button id="btn-lobby-back" class="lobby-v2-back-pill">
                <span class="back-arrow">⬅</span>
                <span>戻る</span>
              </button>
            </div>

            <div class="lobby-v2-top-center">
              <div class="lobby-v2-title-row">
                <span class="lobby-v2-house-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="#1e3a8a">
                    <path d="M12 3L2 12h3v8h5v-6h4v6h5v-8h3L12 3z"/>
                  </svg>
                </span>
                <h2>ルームロビー</h2>
              </div>
              <div class="lobby-v2-title-underline">
                <span class="seg-side"></span>
                <span class="seg-mid"></span>
                <span class="seg-side"></span>
              </div>
            </div>

            <div class="lobby-v2-top-right">
              <div class="lobby-v2-roomid-pill">
                <span class="roomid-text">ルームID : <strong>${lobby.roomId}</strong></span>
                <button id="btn-copy-invite" class="lobby-v2-copy-btn" title="ルームIDと招待URLをコピー">
                  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#1e3a8a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
              <button id="btn-toggle-join-drawer" class="lobby-v2-join-toggle-btn" title="友達のルームIDを入力して参加">
                🔑 ID参加
              </button>
            </div>
          </header>

          ${
            this.isJoinDrawerOpen
              ? `
            <div class="lobby-v2-join-drawer">
              <span class="join-drawer-label">🌐 友達のルームIDで参加：</span>
              <input
                id="input-join-room-code"
                type="text"
                maxlength="8"
                placeholder="ルームIDを入力 (例: ${lobby.roomId})"
                value="${this.escapeHtml(this.lobbyJoinCodeInput)}"
                class="lobby-v2-join-input"
              />
              <button id="btn-join-room-code" class="btn-primary-gradient btn-sm">接続して参加</button>
              <button id="btn-lobby-rules" class="btn-white-pill" style="padding:6px 14px;font-size:0.84rem">📖 ルール確認</button>
            </div>
          `
              : ''
          }

          <!-- 中央2カラムカード -->
          <div class="lobby-v2-main-grid">
            <!-- 左カード：ルーム概要カード -->
            <section class="lobby-v2-overview-card">
              <div class="lobby-v2-overview-top">
                <!-- 左サムネイル（街＋立体サイコロ） -->
                <div class="lobby-v2-thumb-box">
                  <img src="${cityPreviewUrl}" alt="Life Board City" class="lobby-v2-thumb-img" />
                  <div class="lobby-v2-thumb-dice" aria-hidden="true">
                    ${this.renderDiceSvgIcon(5, 76)}
                  </div>
                </div>

                <!-- 右テキスト情報 -->
                <div class="lobby-v2-details-col">
                  <div class="lobby-v2-room-title-row">
                    <h3 class="lobby-v2-room-title">${this.escapeHtml(lobby.roomTitle)}</h3>
                    ${
                      !isGuest
                        ? `
                      <button id="btn-edit-room-title" class="lobby-v2-edit-title-btn" title="ルーム名を変更">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#1e3a8a">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/>
                        </svg>
                      </button>
                    `
                        : ''
                    }
                  </div>

                  <div class="lobby-v2-meta-list">
                    <div class="lobby-v2-meta-row">
                      <span class="meta-label">
                        <span class="meta-icon">🏁</span>
                        <span>ゲームモード</span>
                      </span>
                      <span class="meta-value">${ruleSummaryText}</span>
                    </div>

                    <div class="lobby-v2-meta-row">
                      <span class="meta-label">
                        <span class="meta-icon">🕒</span>
                        <span>プレイ時間</span>
                      </span>
                      <span class="meta-value">約 ${estMinutes} 分</span>
                    </div>

                    <div class="lobby-v2-meta-row">
                      <span class="meta-label">
                        <span class="meta-icon">👥</span>
                        <span>参加人数</span>
                      </span>
                      <span class="meta-value">${lobby.players.length} / 6</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 左カード下部：インフォメーションバー -->
              <div class="lobby-v2-status-banner">
                <span class="status-info-badge">i</span>
                <span class="status-info-text">${this.escapeHtml(statusBannerText)}</span>
              </div>
            </section>

            <!-- 右カード：参加プレイヤー一覧カード -->
            <section class="lobby-v2-players-card">
              <div class="lobby-v2-players-header">
                <span class="players-header-icon" aria-hidden="true">👥</span>
                <span>参加プレイヤー</span>
              </div>
              <div class="lobby-v2-players-list">
                ${slotsHtml.join('')}
              </div>
            </section>
          </div>

          <!-- 下部フローティングドックバー -->
          <footer class="lobby-v2-bottom-dock">
            <div class="lobby-v2-dock-left">
              <div class="dock-cond-label">
                <span class="cond-gear">⚙️</span>
                <span>終了条件</span>
              </div>
              <button
                id="btn-cycle-rule"
                class="lobby-v2-cond-pill"
                ${isGuest ? 'disabled' : ''}
                title="クリックで終了条件（規定ターン数／制限時間）を切り替え"
              >
                <span class="cond-sync-icon">🔄</span>
                <span>${ruleSummaryText}</span>
              </button>
            </div>

            <div class="lobby-v2-dock-divider"></div>

            <div class="lobby-v2-dock-center">
              <div class="dock-timer-icon" aria-hidden="true">🕒</div>
              <div class="dock-timer-stack">
                <span class="dock-timer-caption">開始まで</span>
                <span id="lobby-start-countdown" class="dock-timer-digits">${this.formatLobbyCountdown()}</span>
              </div>
            </div>

            <div class="lobby-v2-dock-right">
              ${
                isGuest
                  ? `
                <button class="lobby-v2-gold-start-btn" disabled>
                  <span>⏳ ホスト開始待ち</span>
                </button>
              `
                  : `
                <button id="btn-lobby-start-game" class="lobby-v2-gold-start-btn">
                  <span class="play-triangle">▶</span>
                  <span>ゲーム開始</span>
                </button>
              `
              }
            </div>
          </footer>
        </div>

        ${this.renderSubOverlayModal()}
      </div>
    `;

    // イベントバインド
    this.container.querySelector('#btn-copy-invite')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      const inviteUrl = this.roomManager.getInviteUrl();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        void navigator.clipboard.writeText(inviteUrl).then(() => {
          this.lobbyNoticeMessage = `📋 ルームID (${lobby.roomId}) と招待URLをコピーしました！`;
          this.render();
        });
      } else {
        window.prompt('以下の招待URLをコピーして友達に送ってください：', inviteUrl);
      }
    });

    this.container.querySelector('#btn-toggle-join-drawer')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      this.isJoinDrawerOpen = !this.isJoinDrawerOpen;
      this.render();
    });

    this.container.querySelector('#btn-edit-room-title')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      const nextTitle = window.prompt('ルーム名を入力してください：', lobby.roomTitle);
      if (nextTitle && nextTitle.trim().length > 0) {
        this.roomManager.setRoomTitle(nextTitle.trim());
      }
    });

    this.container.querySelector('#btn-cycle-rule')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      this.roomManager.cycleGameRuleOption();
    });

    const joinCodeInput = this.container.querySelector(
      '#input-join-room-code'
    ) as HTMLInputElement | null;
    joinCodeInput?.addEventListener('input', () => {
      this.lobbyJoinCodeInput = joinCodeInput.value.toUpperCase();
    });

    this.container.querySelector('#btn-join-room-code')?.addEventListener('click', () => {
      const code = (joinCodeInput?.value ?? this.lobbyJoinCodeInput).trim().toUpperCase();
      if (!code) {
        this.lobbyNoticeMessage = '⚠️ 参加するルームIDを入力してください。';
        this.render();
        return;
      }
      this.soundManager.playGlobalSound('ui_click');
      this.lobbyNoticeMessage = `⏳ ルーム ${code} に接続中...`;
      this.render();
      void this.roomManager.joinP2PRoomByCode(code).then((res) => {
        this.lobbyNoticeMessage = res.ok
          ? `✅ ルーム ${code} に参加しました！プレイヤー枠をクリックして名前やキャラを設定できます。`
          : `⚠️ ${res.error ?? '接続に失敗しました'}`;
        this.isJoinDrawerOpen = false;
        this.render();
      });
    });

    this.container.querySelectorAll('[data-add-cpu]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.soundManager.playGlobalSound('ui_click');
        this.roomManager.addCpuPlayer();
      });
    });

    this.container.querySelectorAll('[data-add-human]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.soundManager.playGlobalSound('ui_click');
        this.roomManager.addHumanPlayer();
      });
    });

    this.container.querySelectorAll('[data-remove-player]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pid = (e.currentTarget as HTMLElement).getAttribute('data-remove-player');
        if (pid) {
          this.soundManager.playGlobalSound('ui_cancel');
          this.roomManager.removePlayer(pid);
        }
      });
    });

    this.container.querySelectorAll('[data-edit-player]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const pid = (e.currentTarget as HTMLElement).getAttribute('data-edit-player');
        const target = lobby.players.find((p) => p.id === pid);
        if (target) {
          this.soundManager.playGlobalSound('ui_click');
          this.editingPlayerId = target.id;
          this.selectedCharId = target.characterId;
          this.selectedColorId = target.colorId;
          this.editingPlayerName = target.name;
          this.showScreen('CHAR_SELECT');
        }
      });
    });

    this.container.querySelector('#btn-lobby-back')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_cancel');
      this.showScreen('TITLE');
    });

    this.container.querySelector('#btn-lobby-rules')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      this.subModal = 'HELP';
      this.render();
    });

    this.container.querySelector('#btn-lobby-start-game')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('turn_start');
      this.startMatchFromLobby();
    });

    this.bindSubOverlayEvents();
  }

  // ==========================================
  // 3. キャラクター選択画面 (CHAR_SELECT) - リファレンス右上パネル完全準拠
  // ==========================================
  private renderCharSelectScreen(): void {
    const selectedChar = CHARACTERS[this.selectedCharId];
    const selectedColor = THEME_COLORS[this.selectedColorId];

    const charCardsHtml = CHARACTER_LIST.map((c) => {
      const isSelected = c.id === this.selectedCharId;
      const imgUrl = characterAvatarUrls[c.id];
      return `
        <div class="char-select-card ${isSelected ? 'selected' : ''}" data-select-char="${c.id}" style="--active-color: ${selectedColor.hex}">
          <div class="char-figure-stage">
            <img src="${imgUrl}" alt="${c.name}" class="char-portrait-img" />
            <div class="char-pedestal" style="border-color: ${isSelected ? selectedColor.hex : '#cbd5e1'}"></div>
          </div>
          <div class="char-card-name">${c.name}</div>
          <div class="char-card-title">${c.title}</div>
        </div>
      `;
    }).join('');

    const colorButtonsHtml = THEME_COLOR_LIST.map((col) => {
      const isSelected = col.id === this.selectedColorId;
      return `
        <button
          class="color-swatch-btn ${isSelected ? 'selected' : ''}"
          style="background-color: ${col.hex}"
          data-select-color="${col.id}"
          title="${col.name}"
        ></button>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="screen-overlay char-select-screen">
        <div class="glass-window char-select-window">
          <div class="window-header">
            <div class="header-title">
              <span class="header-icon">👤</span>
              <h2>キャラクター選択</h2>
            </div>
            <div class="name-input-group">
              <label for="input-player-name">名前：</label>
              <input id="input-player-name" type="text" maxlength="14" value="${this.escapeHtml(this.editingPlayerName)}" />
            </div>
          </div>

          <div class="char-carousel-row">
            <button id="btn-char-prev" class="carousel-arrow-btn" aria-label="前のキャラクター">❮</button>
            <div class="char-cards-grid">
              ${charCardsHtml}
            </div>
            <button id="btn-char-next" class="carousel-arrow-btn" aria-label="次のキャラクター">❯</button>
          </div>

          <div class="char-desc-banner">
            <strong>${selectedChar.name}（${selectedChar.title}）</strong>：${selectedChar.description}
          </div>

          <div class="color-picker-row">
            <span class="color-picker-label">カラー選択</span>
            <div class="color-swatches">
              ${colorButtonsHtml}
            </div>
          </div>

          <div class="window-footer centered">
            <button id="btn-char-confirm" class="btn-primary-gradient btn-lg">
              決定
            </button>
          </div>
        </div>
      </div>
    `;

    const nameInput = this.container.querySelector('#input-player-name') as HTMLInputElement | null;
    nameInput?.addEventListener('input', () => {
      this.editingPlayerName = nameInput.value;
    });

    this.container.querySelectorAll('[data-select-char]').forEach((card) => {
      card.addEventListener('click', (e) => {
        const cid = (e.currentTarget as HTMLElement).getAttribute('data-select-char') as CharacterId;
        this.soundManager.playGlobalSound('ui_click');
        this.selectedCharId = cid;
        this.render();
      });
    });

    this.container.querySelector('#btn-char-prev')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      const idx = CHARACTER_LIST.findIndex((c) => c.id === this.selectedCharId);
      const prevIdx = (idx - 1 + CHARACTER_LIST.length) % CHARACTER_LIST.length;
      this.selectedCharId = CHARACTER_LIST[prevIdx].id;
      this.render();
    });

    this.container.querySelector('#btn-char-next')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      const idx = CHARACTER_LIST.findIndex((c) => c.id === this.selectedCharId);
      const nextIdx = (idx + 1) % CHARACTER_LIST.length;
      this.selectedCharId = CHARACTER_LIST[nextIdx].id;
      this.render();
    });

    this.container.querySelectorAll('[data-select-color]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const colId = (e.currentTarget as HTMLElement).getAttribute('data-select-color') as ThemeColorId;
        this.soundManager.playGlobalSound('ui_click');
        this.selectedColorId = colId;
        this.render();
      });
    });

    this.container.querySelector('#btn-char-confirm')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      this.roomManager.updatePlayerCustomization(this.editingPlayerId, {
        name: this.editingPlayerName,
        characterId: this.selectedCharId,
        colorId: this.selectedColorId,
      });
      this.showScreen('LOBBY');
    });
  }

  // ==========================================
  // 4. メインゲーム画面HUD (GAME) - リファレンス左下パネル完全準拠
  // ==========================================
  private renderGameHud(): void {
    if (!this.engine) return;
    const engine = this.engine;
    const current = engine.getCurrentPlayer();
    const currentJob = JOBS[current.jobId];
    const currentColor = THEME_COLORS[current.colorId];
    const rankings = engine.getRankings();
    const rankMap = new Map<string, AssetBreakdown>();
    rankings.forEach((r) => rankMap.set(r.playerId, r));

    const sec = Math.max(0, Math.ceil(engine.turnTimerSec));
    const isHumanTurn =
      this.roomManager.canLocalPlayerControl(current.id) && !current.isBankrupt;
    const canActPreMove =
      isHumanTurn && engine.phase === 'PRE_MOVE' && engine.pendingModal === 'NONE';
    const canEndTurn =
      isHumanTurn && engine.phase === 'TURN_END' && engine.pendingModal === 'NONE';

    // 右側プレイヤー一覧カード
    const playerCardsHtml = engine.players
      .map((p) => {
        const pColor = THEME_COLORS[p.colorId];
        const pJob = JOBS[p.jobId];
        const breakdown = rankMap.get(p.id);
        const isTurn = p.id === current.id;
        const propCount = engine.getPlayerOwnedTiles(p.id).length;
        const propLimit = engine.getPlayerPropertyLimit(p);
        const familyTotal = (p.hasSpouse ? 1 : 0) + p.childrenCount;

        return `
          <div
            class="hud-player-card ${isTurn ? 'active-turn' : ''} ${p.isBankrupt ? 'bankrupt' : ''}"
            data-inspect-player="${p.id}"
            style="--p-color: ${pColor.hex}"
            title="クリックで所有物件・アイテム詳細を表示"
          >
            <div class="hud-p-avatar" style="border-color: ${pColor.hex}; background: ${pColor.lightHex}">
              <img src="${characterAvatarUrls[p.characterId]}" alt="${p.name}" />
              <span class="hud-p-rank-badge">#${breakdown?.rank ?? 1}</span>
            </div>
            <div class="hud-p-info">
              <div class="hud-p-name-row">
                <span class="hud-p-name">${this.escapeHtml(p.name)}</span>
                ${p.inJail ? '<span class="mini-status-tag jail">収監中</span>' : ''}
                ${p.isBankrupt ? '<span class="mini-status-tag bankrupt">破産</span>' : ''}
              </div>
              <div class="hud-p-cash">${p.cash.toLocaleString()}万円</div>
              <div class="hud-p-meta">
                <span>純資産 ${(breakdown?.totalNetWorth ?? 0).toLocaleString()}万</span>
                <span>🏢 ${propCount}/${propLimit}</span>
                <span>👨‍👩‍👧 ${familyTotal}</span>
                <span>🎒 ${p.items.length}</span>
              </div>
              <div class="hud-p-job">${pJob.icon} ${pJob.name} Lv${p.jobRank}</div>
            </div>
          </div>
        `;
      })
      .join('');

    const ruleStatusText =
      engine.config.ruleMode === 'TURN_LIMIT'
        ? `ラウンド ${engine.currentRound} / ${engine.config.maxTurns}`
        : `ラウンド ${engine.currentRound}（残り約 ${Math.max(
            0,
            Math.ceil(engine.config.timeLimitMinutes - engine.elapsedGameSeconds / 60)
          )}分）`;

    this.container.innerHTML = `
      <div class="game-hud-layer">
        <!-- 左上：現在の手番プレイヤー大型バッジ -->
        <div class="hud-top-left">
          <div class="active-player-pill" style="--active-hex: ${currentColor.hex}">
            <div class="ap-avatar" style="border-color: ${currentColor.hex}; background: ${currentColor.lightHex}">
              <img src="${characterAvatarUrls[current.characterId]}" alt="${current.name}" />
            </div>
            <div class="ap-details">
              <div class="ap-name-row">
                <span class="ap-name">${this.escapeHtml(current.name)}</span>
                ${current.isCpu ? '<span class="ap-tag cpu">CPU思考中</span>' : '<span class="ap-tag turn">手番</span>'}
                ${current.inJail ? `<span class="ap-tag jail">🚔 収監残り${current.jailTurnsRemaining}T</span>` : ''}
              </div>
              <div class="ap-cash">${current.cash.toLocaleString()}<span>万円</span></div>
              <div class="ap-sub-badges">
                <span class="ap-sub-chip">${currentJob.icon} ${currentJob.name} (${currentJob.rankNames[current.jobRank - 1]})</span>
                <span class="ap-sub-chip">💍 ${current.hasSpouse ? '既婚' : '独身'} / 👶 ${current.childrenCount}人</span>
                ${current.activeTollShield ? '<span class="ap-sub-chip buff">🛡️ シールド展開中</span>' : ''}
                ${current.activeDiscountTicket ? '<span class="ap-sub-chip buff">🎫 30%割引準備中</span>' : ''}
                ${current.forcedNextDice ? `<span class="ap-sub-chip buff">🎯 指定出目:${current.forcedNextDice}</span>` : ''}
              </div>
            </div>
          </div>
        </div>

        <!-- 上部中央：残り秒数ピル＆ラウンド・カメラ切替 -->
        <div class="hud-top-center">
          <div id="hud-turn-timer-pill" class="turn-timer-pill ${sec <= 10 || current.isAfk ? 'timer-danger' : ''}">
            <span class="timer-dice-icon">${this.renderDiceSvgIcon(engine.lastDiceValue, 28)}</span>
            <span id="hud-turn-timer-text">あと ${sec} 秒</span>
          </div>
          <div class="hud-round-bar">
            <span class="round-chip">${ruleStatusText}</span>
            <button id="btn-hud-camera" class="cam-toggle-btn">
              ${this.mainScene.getCameraMode() === 'overview' ? '🗺️ 全体俯瞰 (ドラッグ旋回)' : '🎥 プレイヤー追従'}
            </button>
          </div>
        </div>

        <!-- 右側：全プレイヤー情報ダッシュボード -->
        <div class="hud-right-sidebar">
          ${playerCardsHtml}
        </div>

        <!-- 左下：立体サイコロウィジェット ＆ アクションボタン群 -->
        <div class="hud-bottom-left">
          <div class="dice-widget-box">
            ${this.renderDiceSvgIcon(engine.lastDiceValue, 64)}
          </div>

          <div class="hud-action-cluster">
            ${
              canActPreMove
                ? `
              <button id="btn-hud-roll" class="btn-primary-gradient btn-roll-main">
                🎲 サイコロを振る
              </button>
              <div class="pre-move-sub-actions">
                <button id="btn-hud-item" class="btn-sub-action" ${current.usedItemThisTurn ? 'disabled' : ''}>
                  🎒 アイテム使用
                </button>
                <button id="btn-hud-trade" class="btn-sub-action" ${current.proposedTradeThisTurn || current.inJail ? 'disabled' : ''}>
                  🤝 取引（トレード）
                </button>
                <button id="btn-hud-sell" class="btn-sub-action" ${engine.getPlayerOwnedTiles(current.id).length === 0 ? 'disabled' : ''}>
                  🏢 物件売却
                </button>
              </div>
            `
                : canEndTurn
                  ? `
              <button id="btn-hud-end-turn" class="btn-primary-gradient btn-roll-main">
                ✅ ターン終了
              </button>
            `
                  : `
              <div class="hud-waiting-banner">
                ${
                  current.isCpu
                    ? `🤖 ${this.escapeHtml(current.name)} が行動を選択しています...`
                    : engine.phase === 'MOVING'
                      ? `🎲 出目【${engine.lastDiceValue}】で移動中...（残り ${engine.remainingMoveSteps} マス）`
                      : !this.roomManager.canLocalPlayerControl(current.id)
                        ? `🌐 ${this.escapeHtml(current.name)} が操作中...`
                        : `⏳ イベント・アクション処理中...`
                }
              </div>
            `
            }
          </div>
        </div>

        <!-- 中央下：最新ログフィード -->
        <div class="hud-bottom-center">
          <div id="hud-toast-container" class="hud-toast-stack"></div>
          <div class="hud-mini-log-bar">
            ${
              engine.logs[0]
                ? `<span class="log-latest-text">${this.escapeHtml(engine.logs[0].message)}</span>`
                : ''
            }
          </div>
        </div>

        <!-- 右下：メニューボタン -->
        <div class="hud-bottom-right">
          <button id="btn-hud-menu" class="btn-circle-menu" title="メニュー・ルール・設定">
            ☰
          </button>
        </div>

        <!-- ゲームエンジン連動モーダル / サブモーダル -->
        ${this.renderEnginePendingModal()}
        ${this.renderSubOverlayModal()}
      </div>
    `;

    this.updateToastDOM();
    this.bindGameHudEvents();
    this.bindEngineModalEvents();
    this.bindSubOverlayEvents();
  }

  private updateToastDOM(): void {
    const toastRoot = this.container.querySelector('#hud-toast-container');
    if (!toastRoot) return;
    toastRoot.innerHTML = this.toasts
      .map(
        (t) => `
        <div class="toast-item toast-${t.type}">
          ${this.escapeHtml(t.message)}
        </div>
      `
      )
      .join('');
  }

  private bindGameHudEvents(): void {
    if (!this.engine) return;
    const engine = this.engine;
    const current = engine.getCurrentPlayer();

    this.container.querySelector('#btn-hud-camera')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      this.mainScene.toggleCameraMode();
      this.render();
    });

    this.container.querySelector('#btn-hud-roll')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('dice_roll');
      engine.rollDiceAndMove(current.id, false);
    });

    this.container.querySelector('#btn-hud-end-turn')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      engine.endTurn(current.id, false);
    });

    this.container.querySelector('#btn-hud-item')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      this.subModal = 'ITEM_USE';
      this.render();
    });

    this.container.querySelector('#btn-hud-trade')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      const otherPlayers = engine.players.filter(
        (p) => p.id !== current.id && !p.isBankrupt && !p.inJail
      );
      this.tradeTargetPlayerId = otherPlayers[0]?.id ?? '';
      this.tradeOfferCash = 0;
      this.tradeRequestCash = 0;
      this.tradeOfferProps.clear();
      this.tradeRequestProps.clear();
      this.tradeOfferItems.clear();
      this.tradeRequestItems.clear();
      this.tradeErrorMsg = '';
      this.subModal = 'TRADE_COMPOSE';
      this.render();
    });

    this.container.querySelector('#btn-hud-sell')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      this.subModal = 'BANK_SELL';
      this.render();
    });

    this.container.querySelector('#btn-hud-menu')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      this.subModal = 'PAUSE_MENU';
      this.render();
    });

    this.container.querySelectorAll('[data-inspect-player]').forEach((card) => {
      card.addEventListener('click', (e) => {
        const pid = (e.currentTarget as HTMLElement).getAttribute('data-inspect-player');
        if (pid) {
          this.soundManager.playGlobalSound('ui_click');
          this.inspectedPlayerId = pid;
          this.subModal = 'PLAYER_DETAIL';
          this.render();
        }
      });
    });
  }

  // ==========================================
  // ゲーム進行インタラクティブ・モーダル群 (仕様書全フェーズ完全対応)
  // ==========================================
  private renderEnginePendingModal(): string {
    if (!this.engine || this.engine.pendingModal === 'NONE') return '';
    const engine = this.engine;
    const current = engine.getCurrentPlayer();
    const isInteractive = this.roomManager.canLocalPlayerControl(current.id);

    switch (engine.pendingModal) {
      case 'JAIL_DECISION': {
        const hasCard = current.items.includes('jail_free');
        const canBail = current.cash >= JAIL_BAIL_COST;
        return `
          <div class="modal-backdrop">
            <div class="modal-card">
              <div class="modal-header jail-header">
                <h3>🚔 中央刑務所に収監中（残り ${current.jailTurnsRemaining} ターン）</h3>
              </div>
              <div class="modal-body">
                <p class="modal-lead">
                  ${this.escapeHtml(current.name)} の脱出方法を選択してください。
                </p>
                <div class="choice-stack">
                  <button class="choice-option-btn" data-jail-action="roll" ${!isInteractive ? 'disabled' : ''}>
                    <div class="choice-title">🎲 出目【6】挑戦ルーレット（無料）</div>
                    <div class="choice-desc">6が出れば無償で釈放＆即移動！1〜5ならこのターンは休み（残り拘束-1）</div>
                  </button>
                  <button class="choice-option-btn" data-jail-action="bail" ${!isInteractive || !canBail ? 'disabled' : ''}>
                    <div class="choice-title">💰 保釈金 ${JAIL_BAIL_COST}万円を支払う</div>
                    <div class="choice-desc">確実に即座に釈放され、このターンからサイコロを振って移動できます</div>
                  </button>
                  <button class="choice-option-btn" data-jail-action="card" ${!isInteractive || !hasCard ? 'disabled' : ''}>
                    <div class="choice-title">🗝️ 「脱獄カード」を使用する ${hasCard ? '（所持あり）' : '（未所持）'}</div>
                    <div class="choice-desc">カードを消費して保釈金0円で即座に釈放されます</div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case 'BRANCH_SELECT': {
        const tile = engine.getTileById(current.currentTileId);
        return `
          <div class="modal-backdrop">
            <div class="modal-card">
              <div class="modal-header branch-header">
                <h3>🔀 ${this.escapeHtml(tile.name)} - ルート選択</h3>
              </div>
              <div class="modal-body">
                <p class="modal-lead">進むルートを選択してください（残り移動歩数：${engine.remainingMoveSteps}マス）</p>
                <div class="choice-stack">
                  ${tile.nextTileIds
                    .map((nextId, idx) => {
                      const label = tile.branchNames?.[idx] ?? `ルート ${idx + 1}`;
                      const desc =
                        idx === 0
                          ? 'バランスの取れた標準メインストリートを進みます。'
                          : tile.id === 6
                            ? '就職・昇進キャリアマスや結婚・出産ファミリーマスが多い近道ルートです！'
                            : '高級物件やセレクトショップが並ぶハイリターン特区ルートです！';
                      return `
                        <button class="choice-option-btn" data-branch-next="${nextId}" ${!isInteractive ? 'disabled' : ''}>
                          <div class="choice-title">🚩 ${this.escapeHtml(label)}</div>
                          <div class="choice-desc">${desc}</div>
                        </button>
                      `;
                    })
                    .join('')}
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case 'PROPERTY_PURCHASE': {
        const tile = engine.getTileById(current.currentTileId);
        const hasTicket =
          current.activeDiscountTicket || current.items.includes('discount_ticket');
        const cost = calculatePropertyPurchaseCost(tile, current.jobId, hasTicket);
        const ownedTiles = engine.getPlayerOwnedTiles(current.id);
        const limit = engine.getPlayerPropertyLimit(current);
        const isAtLimit = ownedTiles.length >= limit;
        const canAfford = current.cash >= cost && !isAtLimit;
        const tollLv1 = calculatePropertyToll(
          { ...tile, ownerId: current.id, level: 1 },
          engine.tiles
        );
        const regIncomeLv1 = calculateCommercialRegularIncome(
          { ...tile, ownerId: current.id, level: 1 },
          engine.tiles,
          current.jobId
        );

        return `
          <div class="modal-backdrop">
            <div class="modal-card">
              <div class="modal-header" style="background: ${tile.groupColor ?? '#3b82f6'}">
                <h3>🏠 物件購入チャンス：${this.escapeHtml(tile.name)}</h3>
              </div>
              <div class="modal-body">
                <div class="prop-summary-box">
                  <div class="prop-badge-row">
                    <span class="prop-group-pill" style="background:${tile.groupColor ?? '#3b82f6'}">${tile.groupName ?? 'エリア'}</span>
                    <span class="prop-type-pill">${this.getPropertyTypeLabel(tile.propertyType)}</span>
                  </div>
                  <div class="prop-stats-grid">
                    <div><span>購入価格</span><strong>${cost.toLocaleString()}万円</strong></div>
                    <div><span>基本価値</span><strong>${(tile.basePrice ?? 0).toLocaleString()}万円</strong></div>
                    <div><span>停止時通行料(Lv1)</span><strong>${tollLv1.toLocaleString()}万円</strong></div>
                    ${
                      tile.propertyType === 'commercial'
                        ? `<div><span>毎ターン定期収益</span><strong>+${regIncomeLv1}万円</strong></div>`
                        : `<div><span>エリア独占時</span><strong>収益 1.5倍</strong></div>`
                    }
                  </div>
                  ${
                    current.jobId === 'real_estate' || hasTicket
                      ? `<div class="discount-applied-note">✨ 割引適用中！（${current.jobId === 'real_estate' ? '不動産ブローカー15%OFF ' : ''}${hasTicket ? '割引チケット30%OFF' : ''}）</div>`
                      : ''
                  }
                </div>

                ${
                  isAtLimit
                    ? `
                  <div class="limit-warning-box">
                    <p>⚠️ 物件所有上限（${ownedTiles.length}/${limit}件）に達しています。購入するには手持ち物件を銀行へ売却（70%）して枠を空けてください：</p>
                    <div class="inline-sell-list">
                      ${ownedTiles
                        .map(
                          (ot) => `
                        <div class="inline-sell-item">
                          <span>${this.escapeHtml(ot.name)} (Lv${ot.level ?? 1})</span>
                          <button class="btn-mini-sell" data-inline-sell="${ot.id}" ${!isInteractive ? 'disabled' : ''}>
                            売却 (+${calculateBankSellValue(ot)}万)
                          </button>
                        </div>
                      `
                        )
                        .join('')}
                    </div>
                  </div>
                `
                    : ''
                }

                <div class="modal-footer-btns">
                  <button id="btn-prop-pass" class="btn-white-pill" ${!isInteractive ? 'disabled' : ''}>
                    見送る
                  </button>
                  <button id="btn-prop-buy" class="btn-primary-gradient" ${!isInteractive || !canAfford ? 'disabled' : ''}>
                    購入する（${cost.toLocaleString()}万円）
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case 'PROPERTY_UPGRADE': {
        const tile = engine.getTileById(current.currentTileId);
        const curLv = tile.level ?? 1;
        const nextLv = Math.min(3, curLv + 1) as 2 | 3;
        const hasTicket =
          current.activeDiscountTicket || current.items.includes('discount_ticket');
        const upgradeCost = calculateUpgradeCost(tile, current.jobId, hasTicket);
        const canAfford = current.cash >= upgradeCost;
        const nextToll = calculatePropertyToll(
          { ...tile, level: nextLv },
          engine.tiles
        );

        return `
          <div class="modal-backdrop">
            <div class="modal-card">
              <div class="modal-header" style="background: ${tile.groupColor ?? '#eab308'}">
                <h3>🏗️ 物件強化：${this.escapeHtml(tile.name)} (Lv${curLv} ➔ Lv${nextLv})</h3>
              </div>
              <div class="modal-body">
                <p class="modal-lead">自己所有物件に止まりました！増築して資産価値と収益を引き上げますか？</p>
                <div class="prop-summary-box">
                  <div class="prop-stats-grid">
                    <div><span>強化費用</span><strong>${upgradeCost.toLocaleString()}万円</strong></div>
                    <div><span>強化後評価額</span><strong>${calculatePropertyValuation({ ...tile, level: nextLv }).toLocaleString()}万円</strong></div>
                    <div><span>強化後通行料</span><strong>${nextToll.toLocaleString()}万円</strong></div>
                  </div>
                </div>
                <div class="modal-footer-btns">
                  <button id="btn-upgrade-pass" class="btn-white-pill" ${!isInteractive ? 'disabled' : ''}>
                    見送る
                  </button>
                  <button id="btn-upgrade-confirm" class="btn-primary-gradient" ${!isInteractive || !canAfford ? 'disabled' : ''}>
                    Lv${nextLv} に強化する（${upgradeCost.toLocaleString()}万円）
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case 'CAREER_SELECT': {
        return `
          <div class="modal-backdrop">
            <div class="modal-card modal-lg">
              <div class="modal-header career-header">
                <h3>🎓 キャリアセンター：就職・昇進・転職の選択</h3>
              </div>
              <div class="modal-body">
                <p class="modal-lead">これからの人生を左右するキャリアを選択してください。</p>
                <div class="choice-stack">
                  ${engine.activeCareerOptions
                    .map(
                      (opt, idx) => `
                    <button class="choice-option-btn" data-career-idx="${idx}" ${!isInteractive ? 'disabled' : ''}>
                      <div class="choice-title">${this.escapeHtml(opt.label)}</div>
                      <div class="choice-desc">${this.escapeHtml(opt.description)}</div>
                    </button>
                  `
                    )
                    .join('')}
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case 'CHOICE_EVENT': {
        const ev = engine.activeChoiceEvent;
        if (!ev) return '';
        const hasEng = current.jobId === 'engineer';
        const hasWatch = current.items.includes('luxury_watch');

        return `
          <div class="modal-backdrop">
            <div class="modal-card modal-lg">
              <div class="modal-header event-header">
                <h3>⚡ 選択イベント：${this.escapeHtml(ev.title)}</h3>
              </div>
              <div class="modal-body">
                <p class="modal-lead">${this.escapeHtml(ev.description)}</p>
                ${
                  hasEng || hasWatch
                    ? `<div class="discount-applied-note">🎯 成功判定ボーナス有効：${hasEng ? '【エンジニア +1】' : ''}${hasWatch ? '【高級腕時計 +1】' : ''}</div>`
                    : ''
                }
                <div class="choice-stack">
                  ${ev.options
                    .map(
                      (opt, idx) => `
                    <button class="choice-option-btn" data-choice-event-idx="${idx}" ${!isInteractive ? 'disabled' : ''}>
                      <div class="choice-title">${this.escapeHtml(opt.label)}</div>
                      <div class="choice-desc">${this.escapeHtml(opt.description)}</div>
                    </button>
                  `
                    )
                    .join('')}
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case 'SHOP_INTERACT': {
        const isFull = current.items.length >= MAX_ITEM_LIMIT;
        return `
          <div class="modal-backdrop">
            <div class="modal-card modal-xl">
              <div class="modal-header shop-header">
                <h3>🛍️ セレクトショップ（所持上限：${current.items.length} / ${MAX_ITEM_LIMIT}個）</h3>
              </div>
              <div class="modal-body">
                ${
                  current.items.length > 0
                    ? `
                  <div class="shop-owned-bar">
                    <span>所持中アイテム（売却は半額）：</span>
                    <div class="shop-owned-chips">
                      ${current.items
                        .map((itemId, idx) => {
                          const def = ITEMS[itemId];
                          const sellVal = Math.round(def.price * ITEM_SHOP_SELL_RATIO);
                          const isSelectedDiscard = this.shopDiscardSlotIndex === idx;
                          return `
                            <div class="owned-item-chip ${isFull && isSelectedDiscard ? 'discard-target' : ''}" data-select-discard="${idx}">
                              <span>${def.icon} ${def.name}</span>
                              <button class="btn-mini-sell" data-shop-sell-slot="${idx}" ${!isInteractive ? 'disabled' : ''}>
                                売却(+${sellVal}万)
                              </button>
                            </div>
                          `;
                        })
                        .join('')}
                    </div>
                  </div>
                `
                    : ''
                }

                <div class="shop-grid">
                  ${engine.activeShopItems
                    .map((itemId) => {
                      const def = ITEMS[itemId];
                      const tradeIn = isFull
                        ? Math.round(
                            (ITEMS[current.items[this.shopDiscardSlotIndex]]?.price ?? 0) *
                              ITEM_SHOP_SELL_RATIO
                          )
                        : 0;
                      const netCost = def.price - tradeIn;
                      const canBuy = current.cash >= netCost;

                      return `
                        <div class="shop-item-card">
                          <div class="shop-item-top">
                            <span class="shop-item-icon">${def.icon}</span>
                            <div>
                              <div class="shop-item-name">${def.name}</div>
                              <span class="shop-cat-badge ${def.category}">
                                ${def.category === 'permanent' ? `永続資産（評価額${def.assetValue}万）` : '消費アイテム'}
                              </span>
                            </div>
                          </div>
                          <p class="shop-item-desc">${def.description}</p>
                          <button
                            class="btn-primary-gradient btn-sm"
                            data-shop-buy="${def.id}"
                            ${!isInteractive || !canBuy ? 'disabled' : ''}
                          >
                            ${isFull ? `入替購入（差額 ${netCost}万）` : `購入（${def.price}万円）`}
                          </button>
                        </div>
                      `;
                    })
                    .join('')}
                </div>

                <div class="modal-footer-btns">
                  <button id="btn-shop-close" class="btn-white-pill" ${!isInteractive ? 'disabled' : ''}>
                    ショップを出る
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case 'DEBT_LIQUIDATION': {
        const debt = engine.activeDebt;
        if (!debt) return '';
        const debtor = engine.getPlayerById(debt.debtorPlayerId) ?? current;
        const deficit = Math.max(0, debt.requiredAmount - debtor.cash);
        const ownedProps = engine.getPlayerOwnedTiles(debtor.id);
        const canDebtorAct = this.roomManager.canLocalPlayerControl(debtor.id);

        return `
          <div class="modal-backdrop">
            <div class="modal-card modal-lg">
              <div class="modal-header alert-header">
                <h3>⚠️ 資金不足：物件の売却充当（あと ${deficit.toLocaleString()}万円 必要）</h3>
              </div>
              <div class="modal-body">
                <p class="modal-lead">
                  「${this.escapeHtml(debt.reason)}（${debt.requiredAmount.toLocaleString()}万円）」の支払いに現金が不足しています。売却する物件を選択してください（総投資額の70%で換金）。
                </p>
                <div class="choice-stack">
                  ${ownedProps
                    .map((t) => {
                      const val = calculateBankSellValue(t);
                      return `
                        <button class="choice-option-btn" data-debt-sell="${t.id}" ${!canDebtorAct ? 'disabled' : ''}>
                          <div class="choice-title">🏢 ${this.escapeHtml(t.name)} (Lv${t.level ?? 1}) を売却</div>
                          <div class="choice-desc">換金額：+${val.toLocaleString()}万円（評価額 ${calculatePropertyValuation(t)}万円の70%）</div>
                        </button>
                      `;
                    })
                    .join('')}
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case 'AUCTION': {
        const auc = engine.activeAuction;
        if (!auc) return '';
        const tile = engine.getTileById(auc.currentTileId);
        const turnBidder = engine.getPlayerById(auc.currentTurnBidderId);
        const highestBidder = auc.highestBidderId
          ? engine.getPlayerById(auc.highestBidderId)
          : null;
        const minNextBid = auc.currentBid + AUCTION_MIN_INCREMENT;
        const plus100Bid = auc.currentBid + AUCTION_MIN_INCREMENT * 2;
        const isHumanBidder = Boolean(
          turnBidder && this.roomManager.canLocalPlayerControl(turnBidder.id)
        );

        return `
          <div class="modal-backdrop">
            <div class="modal-card modal-lg">
              <div class="modal-header auction-header">
                <h3>🔨 ターン制公開競売：${this.escapeHtml(tile.name)} (Lv${auc.preservedLevel}維持)</h3>
                <span id="modal-auction-timer" class="modal-timer-badge">${Math.ceil(auc.remainingSeconds)}秒</span>
              </div>
              <div class="modal-body">
                <div class="auction-status-box">
                  <div>
                    <span>現在最高入札額</span>
                    <strong>${auc.highestBidderId ? `${auc.currentBid.toLocaleString()}万円` : '入札なし'}</strong>
                  </div>
                  <div>
                    <span>最高入札者</span>
                    <strong>${highestBidder ? this.escapeHtml(highestBidder.name) : '---'}</strong>
                  </div>
                  <div>
                    <span>現在の判断手番</span>
                    <strong style="color:#2563eb">${turnBidder ? this.escapeHtml(turnBidder.name) : '---'}（所持金 ${turnBidder?.cash.toLocaleString() ?? 0}万）</strong>
                  </div>
                </div>

                <div class="modal-footer-btns">
                  <button id="btn-auction-pass" class="btn-white-pill" ${!isHumanBidder ? 'disabled' : ''}>
                    パスする（再入札不可）
                  </button>
                  <button
                    class="btn-primary-gradient"
                    data-auction-bid="${minNextBid}"
                    ${!isHumanBidder || (turnBidder?.cash ?? 0) < minNextBid ? 'disabled' : ''}
                  >
                    ${minNextBid.toLocaleString()}万円で入札 (+50万)
                  </button>
                  <button
                    class="btn-primary-gradient"
                    data-auction-bid="${plus100Bid}"
                    ${!isHumanBidder || (turnBidder?.cash ?? 0) < plus100Bid ? 'disabled' : ''}
                  >
                    ${plus100Bid.toLocaleString()}万円で入札 (+100万)
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case 'TRADE_RESPONSE': {
        const prop = engine.activeTradeProposal;
        if (!prop) return '';
        const fromP = engine.getPlayerById(prop.fromPlayerId);
        const toP = engine.getPlayerById(prop.toPlayerId);
        const isHumanTarget = Boolean(
          toP && this.roomManager.canLocalPlayerControl(toP.id)
        );

        const offerPropNames = prop.offerPropertyIds.map((id) => engine.getTileById(id).name);
        const reqPropNames = prop.requestPropertyIds.map((id) => engine.getTileById(id).name);
        const offerItemNames = prop.offerItemIndices.map(
          (i) => ITEMS[fromP?.items[i] ?? 'dice_select']?.name
        );
        const reqItemNames = prop.requestItemIndices.map(
          (i) => ITEMS[toP?.items[i] ?? 'dice_select']?.name
        );

        return `
          <div class="modal-backdrop">
            <div class="modal-card modal-lg">
              <div class="modal-header trade-header">
                <h3>🤝 プレイヤー間取引（トレード）の提案</h3>
                <span id="modal-trade-timer" class="modal-timer-badge">${Math.ceil(prop.remainingSeconds)}秒</span>
              </div>
              <div class="modal-body">
                <p class="modal-lead">
                  <strong>${this.escapeHtml(fromP?.name ?? '')}</strong> から <strong>${this.escapeHtml(toP?.name ?? '')}</strong> へ取引が提案されました。
                </p>
                <div class="trade-compare-grid">
                  <div class="trade-side-box">
                    <h4>📤 ${this.escapeHtml(fromP?.name ?? '')} の提供内容</h4>
                    <ul>
                      <li>💰 現金：${prop.offerCash.toLocaleString()}万円</li>
                      <li>🏢 物件：${offerPropNames.length > 0 ? offerPropNames.join('、') : 'なし'}</li>
                      <li>🎒 アイテム：${offerItemNames.length > 0 ? offerItemNames.join('、') : 'なし'}</li>
                    </ul>
                  </div>
                  <div class="trade-side-box">
                    <h4>📥 ${this.escapeHtml(toP?.name ?? '')} への要求内容</h4>
                    <ul>
                      <li>💰 現金：${prop.requestCash.toLocaleString()}万円</li>
                      <li>🏢 物件：${reqPropNames.length > 0 ? reqPropNames.join('、') : 'なし'}</li>
                      <li>🎒 アイテム：${reqItemNames.length > 0 ? reqItemNames.join('、') : 'なし'}</li>
                    </ul>
                  </div>
                </div>
                <div class="modal-footer-btns">
                  <button id="btn-trade-reject" class="btn-white-pill" ${!isHumanTarget ? 'disabled' : ''}>
                    拒否する
                  </button>
                  <button id="btn-trade-accept" class="btn-primary-gradient" ${!isHumanTarget ? 'disabled' : ''}>
                    承認して取引成立
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case 'EVENT_RESULT': {
        const res = engine.activeResultPopup;
        if (!res) return '';
        return `
          <div class="modal-backdrop">
            <div class="modal-card">
              <div class="modal-header ${res.isPositive === false ? 'alert-header' : 'event-header'}">
                <h3>${this.escapeHtml(res.title)}</h3>
              </div>
              <div class="modal-body centered">
                ${
                  res.badgeText
                    ? `<div class="discount-applied-note">${this.escapeHtml(res.badgeText)}</div>`
                    : ''
                }
                <p class="modal-lead">${this.escapeHtml(res.description)}</p>
                ${
                  res.cashDelta !== undefined && res.cashDelta !== 0
                    ? `<div class="cash-delta-big ${res.cashDelta > 0 ? 'plus' : 'minus'}">
                        ${res.cashDelta > 0 ? `+${res.cashDelta.toLocaleString()}` : res.cashDelta.toLocaleString()} 万円
                      </div>`
                    : ''
                }
                <div class="modal-footer-btns centered">
                  <button id="btn-event-ack" class="btn-primary-gradient" ${!isInteractive ? 'disabled' : ''}>
                    確認して次へ
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      }
    }

    return '';
  }

  private bindEngineModalEvents(): void {
    if (!this.engine) return;
    const engine = this.engine;
    const current = engine.getCurrentPlayer();

    // 刑務所判断
    this.container.querySelectorAll('[data-jail-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const method = (e.currentTarget as HTMLElement).getAttribute('data-jail-action') as
          | 'bail'
          | 'card'
          | 'roll';
        this.soundManager.playGlobalSound('ui_click');
        engine.handleJailDecision(current.id, method, false);
      });
    });

    // 分岐選択
    this.container.querySelectorAll('[data-branch-next]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const nextId = Number((e.currentTarget as HTMLElement).getAttribute('data-branch-next'));
        this.soundManager.playGlobalSound('ui_click');
        engine.selectBranchRoute(current.id, nextId, false);
      });
    });

    // 物件購入・上限時のその場売却
    this.container.querySelectorAll('[data-inline-sell]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tid = Number((e.currentTarget as HTMLElement).getAttribute('data-inline-sell'));
        this.soundManager.playGlobalSound('buy');
        engine.sellPropertyToBank(current.id, tid, false);
      });
    });

    this.container.querySelector('#btn-prop-buy')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('buy');
      engine.handlePropertyPurchaseDecision(current.id, true, false);
    });

    this.container.querySelector('#btn-prop-pass')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_cancel');
      engine.handlePropertyPurchaseDecision(current.id, false, false);
    });

    // 物件強化
    this.container.querySelector('#btn-upgrade-confirm')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('upgrade');
      engine.handlePropertyUpgradeDecision(current.id, true, false);
    });

    this.container.querySelector('#btn-upgrade-pass')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_cancel');
      engine.handlePropertyUpgradeDecision(current.id, false, false);
    });

    // キャリア選択
    this.container.querySelectorAll('[data-career-idx]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = Number((e.currentTarget as HTMLElement).getAttribute('data-career-idx'));
        this.soundManager.playGlobalSound('promotion');
        engine.selectCareerOption(current.id, idx, false);
      });
    });

    // 選択イベント
    this.container.querySelectorAll('[data-choice-event-idx]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = Number((e.currentTarget as HTMLElement).getAttribute('data-choice-event-idx'));
        this.soundManager.playGlobalSound('ui_click');
        engine.selectChoiceEventOption(current.id, idx, false);
      });
    });

    // ショップ
    this.container.querySelectorAll('[data-select-discard]').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        const slot = Number((e.currentTarget as HTMLElement).getAttribute('data-select-discard'));
        this.shopDiscardSlotIndex = slot;
        this.render();
      });
    });

    this.container.querySelectorAll('[data-shop-sell-slot]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slot = Number((e.currentTarget as HTMLElement).getAttribute('data-shop-sell-slot'));
        this.soundManager.playGlobalSound('buy');
        engine.sellShopItem(current.id, slot);
      });
    });

    this.container.querySelectorAll('[data-shop-buy]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const itemId = (e.currentTarget as HTMLElement).getAttribute('data-shop-buy') as ItemId;
        this.soundManager.playGlobalSound('buy');
        engine.buyShopItem(current.id, itemId, this.shopDiscardSlotIndex, false);
      });
    });

    this.container.querySelector('#btn-shop-close')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_cancel');
      engine.closeShopModal(current.id, false);
    });

    // 支払い不足による売却
    this.container.querySelectorAll('[data-debt-sell]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const tid = Number((e.currentTarget as HTMLElement).getAttribute('data-debt-sell'));
        const debtorId = engine.activeDebt?.debtorPlayerId ?? current.id;
        this.soundManager.playGlobalSound('buy');
        engine.sellPropertyToBank(debtorId, tid, false);
      });
    });

    // 公開競売
    this.container.querySelectorAll('[data-auction-bid]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const amount = Number((e.currentTarget as HTMLElement).getAttribute('data-auction-bid'));
        const bidderId = engine.activeAuction?.currentTurnBidderId;
        if (bidderId) {
          this.soundManager.playGlobalSound('auction_bid');
          engine.placeAuctionBid(bidderId, amount, false);
        }
      });
    });

    this.container.querySelector('#btn-auction-pass')?.addEventListener('click', () => {
      const bidderId = engine.activeAuction?.currentTurnBidderId;
      if (bidderId) {
        this.soundManager.playGlobalSound('ui_cancel');
        engine.passAuction(bidderId, false);
      }
    });

    // トレード応答
    this.container.querySelector('#btn-trade-accept')?.addEventListener('click', () => {
      const responderId = engine.activeTradeProposal?.toPlayerId;
      if (responderId) {
        this.soundManager.playGlobalSound('trade_success');
        engine.respondToTrade(responderId, true, false);
      }
    });

    this.container.querySelector('#btn-trade-reject')?.addEventListener('click', () => {
      const responderId = engine.activeTradeProposal?.toPlayerId;
      if (responderId) {
        this.soundManager.playGlobalSound('ui_cancel');
        engine.respondToTrade(responderId, false, false);
      }
    });

    // イベント結果ポップアップ確認
    this.container.querySelector('#btn-event-ack')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      engine.acknowledgeEventResult(current.id, false);
    });
  }

  // ==========================================
  // 5. ゲーム結果画面 (RESULT) - リファレンス右下パネル完全準拠
  // ==========================================
  private renderResultScreen(): void {
    const rankings =
      this.finalRankings.length > 0
        ? this.finalRankings
        : this.engine?.getRankings() ?? [];
    const awards =
      this.finalAwards.length > 0
        ? this.finalAwards
        : this.engine?.getSpecialAwards() ?? [];

    const selectedPlayer =
      rankings.find((r) => r.playerId === this.selectedResultPlayerId) ?? rankings[0];

    const rankingRowsHtml = rankings
      .map((r) => {
        const isSelected = r.playerId === selectedPlayer?.playerId;
        const pAwards = awards.filter((a) => a.winnerPlayerId === r.playerId);
        const crownHtml =
          r.rank === 1
            ? '<span class="rank-crown gold">👑</span>'
            : r.rank === 2
              ? '<span class="rank-crown silver">👑</span>'
              : r.rank === 3
                ? '<span class="rank-crown bronze">👑</span>'
                : `<span class="rank-num">${r.rank}</span>`;

        return `
          <div
            class="result-rank-row ${r.rank === 1 ? 'first-place' : ''} ${isSelected ? 'selected-row' : ''}"
            data-result-player="${r.playerId}"
          >
            <div class="rank-left">
              ${crownHtml}
              <div class="rank-avatar" style="border-color: ${THEME_COLORS[r.colorId].hex}">
                <img src="${characterAvatarUrls[r.characterId]}" alt="${r.playerName}" />
              </div>
              <div class="rank-name-col">
                <span class="rank-player-name">${this.escapeHtml(r.playerName)}</span>
                <div class="rank-award-chips">
                  ${pAwards
                    .map((aw) => `<span class="award-mini-badge">${aw.icon} ${aw.title}</span>`)
                    .join('')}
                </div>
              </div>
            </div>
            <div class="rank-networth">${r.totalNetWorth.toLocaleString()}万円</div>
          </div>
        `;
      })
      .join('');

    this.container.innerHTML = `
      <div class="screen-overlay result-screen">
        <div class="glass-window result-window">
          <div class="window-header">
            <div class="header-title">
              <span class="header-icon">🏆</span>
              <h2>ゲーム結果</h2>
            </div>
            <span class="result-hint-text">プレイヤーをクリックすると資産内訳グラフが切り替わります</span>
          </div>

          <div class="result-body-grid">
            <!-- 左側：純資産ランキングリスト -->
            <div class="result-ranking-col">
              ${rankingRowsHtml}
            </div>

            <!-- 右側：資産内訳円グラフ（SVG描画） -->
            <div class="result-chart-col">
              ${
                selectedPlayer
                  ? `
                <div class="chart-card">
                  <h3>資産内訳（${this.escapeHtml(selectedPlayer.playerName)}）</h3>
                  <div class="pie-chart-wrap">
                    ${this.renderAssetPieChartSvg(selectedPlayer)}
                    <div class="pie-legend">
                      <div class="legend-item">
                        <span class="legend-dot cash"></span>
                        <div>
                          <div class="legend-label">現金</div>
                          <strong>${selectedPlayer.cash.toLocaleString()}万円</strong>
                        </div>
                      </div>
                      <div class="legend-item">
                        <span class="legend-dot prop"></span>
                        <div>
                          <div class="legend-label">物件（${selectedPlayer.ownedPropertyCount}件）</div>
                          <strong>${selectedPlayer.propertyValue.toLocaleString()}万円</strong>
                        </div>
                      </div>
                      <div class="legend-item">
                        <span class="legend-dot item"></span>
                        <div>
                          <div class="legend-label">アイテム</div>
                          <strong>${selectedPlayer.itemValue.toLocaleString()}万円</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="chart-extra-stats">
                    <span>最終職位：${this.escapeHtml(selectedPlayer.jobName)}</span>
                    <span>家族人数：${selectedPlayer.familyCount}人</span>
                  </div>
                </div>
              `
                  : ''
              }
            </div>
          </div>

          <div class="window-footer centered">
            <button id="btn-result-to-lobby" class="btn-primary-gradient btn-lg">
              ロビーに戻る
            </button>
          </div>
        </div>
      </div>
    `;

    this.container.querySelectorAll('[data-result-player]').forEach((row) => {
      row.addEventListener('click', (e) => {
        const pid = (e.currentTarget as HTMLElement).getAttribute('data-result-player');
        if (pid) {
          this.soundManager.playGlobalSound('ui_click');
          this.selectedResultPlayerId = pid;
          this.render();
        }
      });
    });

    this.container.querySelector('#btn-result-to-lobby')?.addEventListener('click', () => {
      this.soundManager.playGlobalSound('ui_click');
      this.mainScene.setCameraMode('overview');
      this.showScreen('LOBBY');
    });
  }

  /**
   * 資産内訳のSVG円グラフ描画（現金:ブルー / 物件:エメラルドグリーン / アイテム:パープル）
   */
  private renderAssetPieChartSvg(b: AssetBreakdown): string {
    const total = Math.max(1, b.cash + b.propertyValue + b.itemValue);
    const segments = [
      { value: b.cash, color: '#38bdf8' }, // 現金: ブルー
      { value: b.propertyValue, color: '#34d399' }, // 物件: グリーン
      { value: b.itemValue, color: '#a855f7' }, // アイテム: パープル
    ];

    let cumulative = 0;
    const r = 42;
    const c = 2 * Math.PI * r;

    const circlesHtml = segments
      .filter((s) => s.value > 0)
      .map((s) => {
        const frac = s.value / total;
        const dash = frac * c;
        const offset = -cumulative * c;
        cumulative += frac;
        return `
          <circle
            cx="60"
            cy="60"
            r="${r}"
            fill="transparent"
            stroke="${s.color}"
            stroke-width="28"
            stroke-dasharray="${dash} ${c}"
            stroke-dashoffset="${offset}"
            transform="rotate(-90 60 60)"
          />
        `;
      })
      .join('');

    return `
      <svg viewBox="0 0 120 120" class="asset-pie-svg">
        <circle cx="60" cy="60" r="${r}" fill="transparent" stroke="#e2e8f0" stroke-width="28" />
        ${circlesHtml}
        <circle cx="60" cy="60" r="26" fill="#ffffff" />
      </svg>
    `;
  }

  // ==========================================
  // サブオーバーレイモーダル（設定 / ヘルプ / アイテム使用 / トレード作成 / 物件売却 / 詳細確認）
  // ==========================================
  private renderSubOverlayModal(): string {
    if (this.subModal === 'NONE') return '';

    switch (this.subModal) {
      case 'SETTINGS': {
        const lobby = this.roomManager.getLobbyState();
        const volPercent = Math.round(this.soundManager.getVolume() * 100);
        const isMuted = this.soundManager.getMuted();
        return `
          <div class="modal-backdrop">
            <div class="modal-card">
              <div class="modal-header">
                <h3>⚙️ サウンド＆オンライン接続設定</h3>
              </div>
              <div class="modal-body">
                <div class="settings-row">
                  <label>🔊 マスター音量 (${volPercent}%)</label>
                  <input id="input-volume-slider" type="range" min="0" max="100" value="${volPercent}" />
                </div>
                <div class="settings-row">
                  <label>🔇 ミュート切替</label>
                  <button id="btn-toggle-mute" class="btn-white-pill">
                    ${isMuted ? '🔇 ミュート中（クリックで解除）' : '🔊 サウンドON'}
                  </button>
                </div>
                <div class="settings-row">
                  <label>🌐 Colyseus サーバーURL</label>
                  <input id="input-colyseus-url" type="text" value="${this.escapeHtml(lobby.endpointUrl)}" />
                </div>
                <div class="modal-footer-btns">
                  <button data-close-submodal="true" class="btn-primary-gradient">閉じる</button>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case 'HELP': {
        return `
          <div class="modal-backdrop">
            <div class="modal-card modal-lg">
              <div class="modal-header">
                <h3>📖 『Life Board』公式ルールガイド</h3>
              </div>
              <div class="modal-body help-scroll-body">
                <h4>🏆 勝利条件と純資産の計算</h4>
                <p>ゲーム終了時に<strong>「純資産（所持現金 ＋ 所有物件の評価額 ＋ 永続資産アイテムの評価額）」</strong>が最も多いプレイヤーの勝利です！</p>
                <h4>🏠 物件の購入・強化・エリア独占</h4>
                <p>住宅地・商業施設・特殊物件を購入でき、同じマスに再度止まるとLv2・Lv3へ強化できます。同色エリアを全て独占すると通行料・定期収益が<strong>1.5倍</strong>に跳ね上がります！</p>
                <h4>💼 キャリア（全8職種）と家族</h4>
                <p>職業とランクに応じて「スタート通過時の給料」「物件の所有上限（初期2件〜最大9件）」「固有パッシブ能力」が変化します。結婚・出産するとご祝儀や手当が貰えます。</p>
                <h4>🔨 破産とターン制公開競売</h4>
                <p>支払いができない場合は物件を銀行へ70%で売却して充当します。全物件を売っても足りない場合は破産となり、所有していた物件は<strong>強化レベルを維持したまま基本価格50%スタートの公開競売</strong>にかけられます！</p>
                <div class="modal-footer-btns">
                  <button data-close-submodal="true" class="btn-primary-gradient">閉じる</button>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case 'ITEM_USE': {
        if (!this.engine) return '';
        const current = this.engine.getCurrentPlayer();
        const usableItems = current.items.filter((id) => ITEMS[id]?.usableInPreMove);
        return `
          <div class="modal-backdrop">
            <div class="modal-card">
              <div class="modal-header">
                <h3>🎒 消費アイテムの使用（1ターン1回）</h3>
              </div>
              <div class="modal-body">
                ${
                  usableItems.length === 0
                    ? '<p class="modal-lead">現在使用できる移動前消費アイテムを所持していません。</p>'
                    : `
                  <div class="dice-select-picker">
                    <span>「指定出目カード」使用時の目標出目：</span>
                    <div class="dice-num-btns">
                      ${[1, 2, 3, 4, 5, 6]
                        .map(
                          (n) => `
                        <button class="pill-choice ${this.selectedDiceCardTarget === n ? 'active' : ''}" data-pick-dice-num="${n}">
                          出目 ${n}
                        </button>
                      `
                        )
                        .join('')}
                    </div>
                  </div>
                  <div class="choice-stack">
                    ${usableItems
                      .map((itemId) => {
                        const def = ITEMS[itemId];
                        return `
                          <button class="choice-option-btn" data-use-item="${itemId}">
                            <div class="choice-title">${def.icon} ${def.name} を使う</div>
                            <div class="choice-desc">${def.description}</div>
                          </button>
                        `;
                      })
                      .join('')}
                  </div>
                `
                }
                <div class="modal-footer-btns">
                  <button data-close-submodal="true" class="btn-white-pill">キャンセル</button>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case 'BANK_SELL': {
        if (!this.engine) return '';
        const current = this.engine.getCurrentPlayer();
        const owned = this.engine.getPlayerOwnedTiles(current.id);
        return `
          <div class="modal-backdrop">
            <div class="modal-card modal-lg">
              <div class="modal-header">
                <h3>🏢 物件の銀行売却（総投資額の70%で即時換金）</h3>
              </div>
              <div class="modal-body">
                <div class="choice-stack">
                  ${owned
                    .map((t) => {
                      const sellVal = calculateBankSellValue(t);
                      return `
                        <button class="choice-option-btn" data-manual-bank-sell="${t.id}">
                          <div class="choice-title">🏠 ${this.escapeHtml(t.name)} (Lv${t.level ?? 1})</div>
                          <div class="choice-desc">売却受取額：+${sellVal.toLocaleString()}万円（評価額 ${calculatePropertyValuation(t)}万円）</div>
                        </button>
                      `;
                    })
                    .join('')}
                </div>
                <div class="modal-footer-btns">
                  <button data-close-submodal="true" class="btn-white-pill">閉じる</button>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case 'TRADE_COMPOSE': {
        if (!this.engine) return '';
        const engine = this.engine;
        const current = engine.getCurrentPlayer();
        const partners = engine.players.filter(
          (p) => p.id !== current.id && !p.isBankrupt && !p.inJail
        );
        const target =
          partners.find((p) => p.id === this.tradeTargetPlayerId) ?? partners[0];

        if (!target) {
          return `
            <div class="modal-backdrop">
              <div class="modal-card">
                <div class="modal-header"><h3>🤝 取引（トレード）</h3></div>
                <div class="modal-body">
                  <p>現在取引可能な相手プレイヤーがいません。</p>
                  <button data-close-submodal="true" class="btn-white-pill">閉じる</button>
                </div>
              </div>
            </div>
          `;
        }

        const myProps = engine.getPlayerOwnedTiles(current.id);
        const targetProps = engine.getPlayerOwnedTiles(target.id);

        return `
          <div class="modal-backdrop">
            <div class="modal-card modal-xl">
              <div class="modal-header trade-header">
                <h3>🤝 プレイヤー間取引（トレード）の作成</h3>
              </div>
              <div class="modal-body">
                <div class="trade-partner-row">
                  <span>取引相手を選択：</span>
                  <div class="option-pills">
                    ${partners
                      .map(
                        (p) => `
                      <button class="pill-choice ${p.id === target.id ? 'active' : ''}" data-trade-partner="${p.id}">
                        ${this.escapeHtml(p.name)}
                      </button>
                    `
                      )
                      .join('')}
                  </div>
                </div>

                ${this.tradeErrorMsg ? `<div class="trade-error-banner">⚠️ ${this.escapeHtml(this.tradeErrorMsg)}</div>` : ''}

                <div class="trade-compare-grid">
                  <!-- 自分の提供側 -->
                  <div class="trade-side-box">
                    <h4>📤 ${this.escapeHtml(current.name)} の提供</h4>
                    <label>提供現金（上限 ${current.cash}万）：
                      <input id="input-trade-offer-cash" type="number" min="0" max="${current.cash}" step="50" value="${this.tradeOfferCash}" /> 万円
                    </label>
                    <div class="trade-check-list">
                      <strong>提供物件：</strong>
                      ${
                        myProps.length === 0
                          ? '<div>所有物件なし</div>'
                          : myProps
                              .map(
                                (t) => `
                            <label class="trade-check-item">
                              <input type="checkbox" data-offer-prop="${t.id}" ${this.tradeOfferProps.has(t.id) ? 'checked' : ''} />
                              ${this.escapeHtml(t.name)} (Lv${t.level ?? 1} / 評価${calculatePropertyValuation(t)}万)
                            </label>
                          `
                              )
                              .join('')
                      }
                    </div>
                    <div class="trade-check-list">
                      <strong>提供アイテム：</strong>
                      ${
                        current.items.length === 0
                          ? '<div>所持アイテムなし</div>'
                          : current.items
                              .map(
                                (itemId, idx) => `
                            <label class="trade-check-item">
                              <input type="checkbox" data-offer-item="${idx}" ${this.tradeOfferItems.has(idx) ? 'checked' : ''} />
                              ${ITEMS[itemId].icon} ${this.escapeHtml(ITEMS[itemId].name)} (価格${ITEMS[itemId].price}万)
                            </label>
                          `
                              )
                              .join('')
                      }
                    </div>
                  </div>

                  <!-- 相手への要求側 -->
                  <div class="trade-side-box">
                    <h4>📥 ${this.escapeHtml(target.name)} への要求</h4>
                    <label>要求現金（上限 ${target.cash}万）：
                      <input id="input-trade-req-cash" type="number" min="0" max="${target.cash}" step="50" value="${this.tradeRequestCash}" /> 万円
                    </label>
                    <div class="trade-check-list">
                      <strong>要求物件：</strong>
                      ${
                        targetProps.length === 0
                          ? '<div>所有物件なし</div>'
                          : targetProps
                              .map(
                                (t) => `
                            <label class="trade-check-item">
                              <input type="checkbox" data-req-prop="${t.id}" ${this.tradeRequestProps.has(t.id) ? 'checked' : ''} />
                              ${this.escapeHtml(t.name)} (Lv${t.level ?? 1} / 評価${calculatePropertyValuation(t)}万)
                            </label>
                          `
                              )
                              .join('')
                      }
                    </div>
                    <div class="trade-check-list">
                      <strong>要求アイテム：</strong>
                      ${
                        target.items.length === 0
                          ? '<div>所持アイテムなし</div>'
                          : target.items
                              .map(
                                (itemId, idx) => `
                            <label class="trade-check-item">
                              <input type="checkbox" data-req-item="${idx}" ${this.tradeRequestItems.has(idx) ? 'checked' : ''} />
                              ${ITEMS[itemId].icon} ${this.escapeHtml(ITEMS[itemId].name)} (価格${ITEMS[itemId].price}万)
                            </label>
                          `
                              )
                              .join('')
                      }
                    </div>
                  </div>
                </div>

                <div class="modal-footer-btns">
                  <button data-close-submodal="true" class="btn-white-pill">キャンセル</button>
                  <button id="btn-submit-trade" class="btn-primary-gradient">取引を提案する</button>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case 'PLAYER_DETAIL': {
        if (!this.engine || !this.inspectedPlayerId) return '';
        const p = this.engine.getPlayerById(this.inspectedPlayerId);
        if (!p) return '';
        const job = JOBS[p.jobId];
        const props = this.engine.getPlayerOwnedTiles(p.id);
        const netWorth = this.engine.getPlayerNetWorth(p);

        return `
          <div class="modal-backdrop">
            <div class="modal-card modal-lg">
              <div class="modal-header" style="background:${THEME_COLORS[p.colorId].hex}">
                <h3>👤 ${this.escapeHtml(p.name)} の資産・ポートフォリオ詳細</h3>
              </div>
              <div class="modal-body">
                <div class="prop-stats-grid">
                  <div><span>純資産総額</span><strong>${netWorth.toLocaleString()}万円</strong></div>
                  <div><span>所持現金</span><strong>${p.cash.toLocaleString()}万円</strong></div>
                  <div><span>現在の職業</span><strong>${job.icon} ${job.name} (${job.rankNames[p.jobRank - 1]})</strong></div>
                  <div><span>物件所有数</span><strong>${props.length} / ${this.engine.getPlayerPropertyLimit(p)}件</strong></div>
                </div>
                <p style="margin:8px 0;font-size:0.9rem;color:#334155"><strong>職業固有能力：</strong>${job.passiveSummary}</p>

                <h4>🏢 所有物件一覧</h4>
                ${
                  props.length === 0
                    ? '<p>所有している物件はありません。</p>'
                    : `<div class="detail-prop-list">
                        ${props
                          .map((t) => {
                            const mono = isGroupMonopolized(this.engine!.tiles, t.groupId, p.id);
                            return `
                              <div class="detail-prop-row">
                                <span class="prop-dot" style="background:${t.groupColor ?? '#3b82f6'}"></span>
                                <strong>${this.escapeHtml(t.name)} (Lv${t.level ?? 1})</strong>
                                <span>評価額 ${calculatePropertyValuation(t)}万円</span>
                                ${mono ? '<span class="mono-tag">★エリア独占1.5倍</span>' : ''}
                              </div>
                            `;
                          })
                          .join('')}
                      </div>`
                }

                <h4>🎒 所持アイテム（${p.items.length}/${MAX_ITEM_LIMIT}）</h4>
                <div class="detail-item-list">
                  ${
                    p.items.length === 0
                      ? '<span>所持アイテムなし</span>'
                      : p.items
                          .map((id) => `<span class="ap-sub-chip">${ITEMS[id].icon} ${ITEMS[id].name}</span>`)
                          .join('')
                  }
                </div>

                <div class="modal-footer-btns">
                  <button data-close-submodal="true" class="btn-primary-gradient">閉じる</button>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case 'TILE_DETAIL': {
        if (!this.engine || this.inspectedTileId === null) return '';
        const tile = this.engine.getTileById(this.inspectedTileId);
        const owner = tile.ownerId ? this.engine.getPlayerById(tile.ownerId) : null;
        return `
          <div class="modal-backdrop">
            <div class="modal-card">
              <div class="modal-header" style="background:${tile.groupColor ?? '#0284c7'}">
                <h3>📍 マス情報：#${tile.id} ${this.escapeHtml(tile.name)}</h3>
              </div>
              <div class="modal-body">
                ${
                  tile.type === 'property'
                    ? `
                  <div class="prop-stats-grid">
                    <div><span>エリア</span><strong>${tile.groupName ?? '-'}</strong></div>
                    <div><span>物件種別</span><strong>${this.getPropertyTypeLabel(tile.propertyType)}</strong></div>
                    <div><span>所有者</span><strong>${owner ? this.escapeHtml(owner.name) : '未所有（購入可能）'}</strong></div>
                    <div><span>現在の段階</span><strong>Lv${tile.level ?? 1}（評価額 ${calculatePropertyValuation(tile)}万円）</strong></div>
                    <div><span>基本価格</span><strong>${tile.basePrice}万円</strong></div>
                    <div><span>現在通行料</span><strong>${calculatePropertyToll({ ...tile, ownerId: tile.ownerId ?? 'preview' }, this.engine.tiles)}万円</strong></div>
                  </div>
                `
                    : `<p class="modal-lead">種別：${tile.type.toUpperCase()} マス</p>`
                }
                <div class="modal-footer-btns">
                  <button data-close-submodal="true" class="btn-primary-gradient">閉じる</button>
                </div>
              </div>
            </div>
          </div>
        `;
      }

      case 'PAUSE_MENU': {
        return `
          <div class="modal-backdrop">
            <div class="modal-card">
              <div class="modal-header">
                <h3>☰ ゲームメニュー</h3>
              </div>
              <div class="modal-body">
                <div class="choice-stack">
                  <button id="btn-menu-settings" class="choice-option-btn">⚙️ サウンド・音量設定</button>
                  <button id="btn-menu-help" class="choice-option-btn">📖 ルール確認</button>
                  <button id="btn-menu-lobby" class="choice-option-btn">🏠 対戦を終了してロビーへ戻る</button>
                </div>
                <div class="modal-footer-btns">
                  <button data-close-submodal="true" class="btn-primary-gradient">ゲームに戻る</button>
                </div>
              </div>
            </div>
          </div>
        `;
      }
    }

    return '';
  }

  private bindSubOverlayEvents(): void {
    this.container.querySelectorAll('[data-close-submodal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.soundManager.playGlobalSound('ui_cancel');
        this.subModal = 'NONE';
        this.render();
      });
    });

    const volSlider = this.container.querySelector('#input-volume-slider') as HTMLInputElement | null;
    volSlider?.addEventListener('input', () => {
      this.soundManager.setVolume(Number(volSlider.value) / 100);
    });

    this.container.querySelector('#btn-toggle-mute')?.addEventListener('click', () => {
      this.soundManager.toggleMute();
      this.render();
    });

    const urlInput = this.container.querySelector('#input-colyseus-url') as HTMLInputElement | null;
    urlInput?.addEventListener('change', () => {
      void this.roomManager.createOrJoinRoom(undefined, urlInput.value);
    });

    // アイテム使用モーダル
    this.container.querySelectorAll('[data-pick-dice-num]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.selectedDiceCardTarget = Number(
          (e.currentTarget as HTMLElement).getAttribute('data-pick-dice-num')
        );
        this.render();
      });
    });

    this.container.querySelectorAll('[data-use-item]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (!this.engine) return;
        const itemId = (e.currentTarget as HTMLElement).getAttribute('data-use-item') as ItemId;
        const current = this.engine.getCurrentPlayer();
        this.soundManager.playGlobalSound('event_good');
        this.engine.useConsumableItem(current.id, itemId, this.selectedDiceCardTarget);
        this.subModal = 'NONE';
        this.render();
      });
    });

    // 銀行売却モーダル
    this.container.querySelectorAll('[data-manual-bank-sell]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        if (!this.engine) return;
        const tid = Number((e.currentTarget as HTMLElement).getAttribute('data-manual-bank-sell'));
        const current = this.engine.getCurrentPlayer();
        this.soundManager.playGlobalSound('buy');
        this.engine.sellPropertyToBank(current.id, tid, false);
        this.subModal = 'NONE';
        this.render();
      });
    });

    // トレード作成モーダル
    this.container.querySelectorAll('[data-trade-partner]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        this.tradeTargetPlayerId =
          (e.currentTarget as HTMLElement).getAttribute('data-trade-partner') ?? '';
        this.tradeRequestProps.clear();
        this.tradeRequestItems.clear();
        this.render();
      });
    });

    const offerCashInput = this.container.querySelector(
      '#input-trade-offer-cash'
    ) as HTMLInputElement | null;
    offerCashInput?.addEventListener('input', () => {
      this.tradeOfferCash = Math.max(0, Number(offerCashInput.value) || 0);
    });

    const reqCashInput = this.container.querySelector(
      '#input-trade-req-cash'
    ) as HTMLInputElement | null;
    reqCashInput?.addEventListener('input', () => {
      this.tradeRequestCash = Math.max(0, Number(reqCashInput.value) || 0);
    });

    this.container.querySelectorAll('[data-offer-prop]').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const input = e.currentTarget as HTMLInputElement;
        const tid = Number(input.getAttribute('data-offer-prop'));
        if (input.checked) this.tradeOfferProps.add(tid);
        else this.tradeOfferProps.delete(tid);
      });
    });

    this.container.querySelectorAll('[data-req-prop]').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const input = e.currentTarget as HTMLInputElement;
        const tid = Number(input.getAttribute('data-req-prop'));
        if (input.checked) this.tradeRequestProps.add(tid);
        else this.tradeRequestProps.delete(tid);
      });
    });

    this.container.querySelectorAll('[data-offer-item]').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const input = e.currentTarget as HTMLInputElement;
        const idx = Number(input.getAttribute('data-offer-item'));
        if (input.checked) this.tradeOfferItems.add(idx);
        else this.tradeOfferItems.delete(idx);
      });
    });

    this.container.querySelectorAll('[data-req-item]').forEach((chk) => {
      chk.addEventListener('change', (e) => {
        const input = e.currentTarget as HTMLInputElement;
        const idx = Number(input.getAttribute('data-req-item'));
        if (input.checked) this.tradeRequestItems.add(idx);
        else this.tradeRequestItems.delete(idx);
      });
    });

    this.container.querySelector('#btn-submit-trade')?.addEventListener('click', () => {
      if (!this.engine) return;
      const current = this.engine.getCurrentPlayer();
      const res = this.engine.proposeTrade(
        current.id,
        this.tradeTargetPlayerId,
        this.tradeOfferCash,
        Array.from(this.tradeOfferProps),
        Array.from(this.tradeOfferItems),
        this.tradeRequestCash,
        Array.from(this.tradeRequestProps),
        Array.from(this.tradeRequestItems)
      );
      if (!res.ok) {
        this.tradeErrorMsg = res.error ?? '取引条件を確認してください';
        this.soundManager.playGlobalSound('ui_cancel');
        this.render();
      } else {
        this.soundManager.playGlobalSound('trade_offer');
        this.subModal = 'NONE';
        this.render();
      }
    });

    // ポーズメニュー
    this.container.querySelector('#btn-menu-settings')?.addEventListener('click', () => {
      this.subModal = 'SETTINGS';
      this.render();
    });
    this.container.querySelector('#btn-menu-help')?.addEventListener('click', () => {
      this.subModal = 'HELP';
      this.render();
    });
    this.container.querySelector('#btn-menu-lobby')?.addEventListener('click', () => {
      this.subModal = 'NONE';
      this.showScreen('LOBBY');
    });
  }

  // ==========================================
  // ゲーム開始バインディング (RoomManager + GameEngine + MainScene)
  // ==========================================
  private createEngineCallbacks() {
    return {
      onStateChanged: () => {
        if (this.engine) {
          this.mainScene.syncWithEngine(this.engine);
        }
        if (this.currentScreen === 'GAME') {
          this.render();
        }
      },
      onDiceRollRequested: (
        _playerId: string,
        targetValue: number,
        _purpose: 'move' | 'jail' | 'event',
        onFinish: () => void
      ) => {
        this.mainScene.rollDice3D(targetValue, onFinish);
      },
      onPlayerStepped: (
        step: {
          playerId: string;
          fromTileId: number;
          toTileId: number;
          remainingSteps: number;
          passedStart: boolean;
        },
        onStepAnimComplete: () => void
      ) => {
        this.mainScene.animatePlayerStep(step, onStepAnimComplete);
      },
      onPopupEffect: (
        tileId: number,
        text: string,
        color: string,
        effectType: 'coin' | 'build' | 'celebrate' | 'alert' | 'auction'
      ) => {
        this.mainScene.spawnPopupEffect(tileId, text, color, effectType);
      },
      onLogAdded: (entry: GameLogEntry) => {
        this.pushToast(entry);
      },
      onGameOver: (rankings: AssetBreakdown[], awards: SpecialAward[]) => {
        this.showResultScreen(rankings, awards);
      },
    };
  }

  private startMatchFromLobby(): void {
    const engine = this.roomManager.startGameEngine(this.createEngineCallbacks());

    this.engine = engine;
    this.mainScene.buildBoard(engine.tiles);
    this.mainScene.syncWithEngine(engine);
    this.currentScreen = 'GAME';
    this.subModal = 'NONE';
    engine.startGame();
    this.render();
  }

  // ==========================================
  // SVGサイコロアイコン＆ユーティリティ
  // ==========================================
  private renderDiceSvgIcon(value: number, sizePx = 56): string {
    const pipMap: Record<number, Array<[number, number]>> = {
      1: [[50, 50]],
      2: [
        [28, 28],
        [72, 72],
      ],
      3: [
        [26, 26],
        [50, 50],
        [74, 74],
      ],
      4: [
        [28, 28],
        [72, 28],
        [28, 72],
        [72, 72],
      ],
      5: [
        [26, 26],
        [74, 26],
        [50, 50],
        [26, 74],
        [74, 74],
      ],
      6: [
        [28, 24],
        [72, 24],
        [28, 50],
        [72, 50],
        [28, 76],
        [72, 76],
      ],
    };
    const pips = pipMap[value] ?? pipMap[6];
    const circles = pips
      .map(([cx, cy]) => {
        const fill = value === 1 ? '#ef4444' : '#1e293b';
        const r = value === 1 ? 14 : 9.5;
        return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" />`;
      })
      .join('');

    return `
      <svg width="${sizePx}" height="${sizePx}" viewBox="0 0 100 100" class="dice-svg-icon">
        <rect x="6" y="6" width="88" height="88" rx="20" fill="#ffffff" stroke="#cbd5e1" stroke-width="5" />
        ${circles}
      </svg>
    `;
  }

  private getPropertyTypeLabel(t?: string): string {
    if (t === 'commercial') return '商業施設（定期収益＋利用料）';
    if (t === 'special') return '特殊ランドマーク（所有数連動）';
    return '住宅地（高通行料）';
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
