import {
  CHARACTERS,
  CHARACTER_LIST,
  CharacterId,
  JOBS,
  JobId,
  THEME_COLORS,
  THEME_COLOR_LIST,
  TOKEN_SKINS,
  TOKEN_SKIN_LIST,
  ThemeColorId,
  TokenSkinId,
} from '../config/constants';
import { GameEngine, PlayerState } from '../systems/GameEngine';
import { BoardTile, PropertyType, TileType } from '../systems/MapGenerator';
import { progressionManager } from '../systems/ProgressionManager';

export type DevConsoleTab = 'player' | 'economy' | 'movement' | 'map' | 'settings';

export class DevConsole {
  private engine: GameEngine | null = null;
  private isOpen: boolean = false;
  private shouldAnimateOpen: boolean = false;
  private currentTab: DevConsoleTab = 'player';
  private selectedPlayerId: string = '';
  private selectedTileId: number = 0;
  private tileFilter: 'all' | 'property' | 'special' = 'all';
  private onStateChangedCallback?: () => void;
  private rootElement: HTMLElement | null = null;

  constructor(_container: HTMLElement, onStateChanged?: () => void) {
    this.onStateChangedCallback = onStateChanged;
    this.ensureRootElement();
  }

  private ensureRootElement(): HTMLElement {
    let root = document.getElementById('dev-console-drawer-root');
    if (!root) {
      root = document.createElement('div');
      root.id = 'dev-console-drawer-root';
      root.style.display = 'none';
      document.body.appendChild(root);
    }
    this.rootElement = root;
    return root;
  }

  public setEngine(engine: GameEngine | null): void {
    this.engine = engine;
    if (engine && engine.players.length > 0 && !this.selectedPlayerId) {
      this.selectedPlayerId = engine.players[0].id;
    }
    if (this.isOpen) {
      this.render();
    }
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public open(): void {
    this.isOpen = true;
    this.shouldAnimateOpen = true;
    this.render();
  }

  public close(): void {
    this.isOpen = false;
    this.render();
  }

  public getIsOpen(): boolean {
    return this.isOpen;
  }

  public render(): void {
    const root = this.ensureRootElement();

    if (!this.isOpen || !progressionManager.isDevAdmin()) {
      root.style.display = 'none';
      root.innerHTML = '';
      return;
    }

    root.style.display = 'block';

    const engine = this.engine;
    const players = engine?.players ?? [];
    if (!this.selectedPlayerId && players.length > 0) {
      this.selectedPlayerId = players[0].id;
    }
    const targetPlayer = players.find((p) => p.id === this.selectedPlayerId) ?? players[0];

    // すでにパネル骨格が存在する場合は、コンテンツと選択状態のみインプレース更新（アニメーションの再発動を防ぐ）
    const existingPanel = root.querySelector('.dev-drawer-panel');
    if (existingPanel && !this.shouldAnimateOpen) {
      this.updateInPlace(root, targetPlayer, players);
      return;
    }

    // 初回表示またはアニメーション付きオープンの完全レンダリング
    const animClass = this.shouldAnimateOpen ? 'animate-open' : '';
    this.shouldAnimateOpen = false;

    root.innerHTML = `
      <div class="dev-drawer-backdrop ${animClass}" id="dev-drawer-backdrop"></div>
      <aside class="dev-drawer-panel toy-panel-slab ${animClass}">
        <div class="dev-drawer-header">
          <div class="dev-header-left">
            <span class="dev-header-badge">🛠️ DEVELOPER TOOLS</span>
            <span class="dev-admin-tag">${progressionManager.getState().email || 'ローカル管理者'}</span>
          </div>
          <button id="btn-close-dev-drawer" class="toy-btn toy-btn-white btn-mini-close" title="閉じる">✕</button>
        </div>

        <div class="dev-target-selector" id="dev-target-selector-wrap">
          ${this.renderTargetSelectorHtml(players)}
        </div>

        <nav class="dev-tab-nav" id="dev-tab-nav-wrap">
          ${this.renderTabNavHtml()}
        </nav>

        <div class="dev-drawer-content" id="dev-drawer-content-box">
          ${this.renderTabContent(targetPlayer)}
        </div>
      </aside>
    `;

    this.bindEvents(root, targetPlayer);
  }

  /**
   * 骨格を破棄せず、中身のみインプレース更新する（チラつき・閉じる挙動の完全防止）
   */
  private updateInPlace(root: HTMLElement, targetPlayer?: PlayerState, players: PlayerState[] = []): void {
    const targetWrap = root.querySelector('#dev-target-selector-wrap');
    if (targetWrap) {
      targetWrap.innerHTML = this.renderTargetSelectorHtml(players);
    }

    const tabNavWrap = root.querySelector('#dev-tab-nav-wrap');
    if (tabNavWrap) {
      tabNavWrap.innerHTML = this.renderTabNavHtml();
    }

    const contentBox = root.querySelector('#dev-drawer-content-box');
    if (contentBox) {
      contentBox.innerHTML = this.renderTabContent(targetPlayer);
    }

    this.bindEvents(root, targetPlayer);
  }

  private renderTargetSelectorHtml(players: PlayerState[]): string {
    if (players.length === 0) return '';
    return `
      <span class="dev-target-label">対象プレイヤー:</span>
      <div class="dev-target-pills">
        ${players
          .map(
            (p) => `
          <button class="dev-player-pill ${p.id === this.selectedPlayerId ? 'active' : ''}" data-dev-select-player="${p.id}">
            <span class="p-dot" style="background:${THEME_COLORS[p.colorId]?.hex || '#3b82f6'}"></span>
            <span>${p.name}${p.isCpu ? ' (CPU)' : ''}</span>
          </button>
        `
          )
          .join('')}
      </div>
    `;
  }

  private renderTabNavHtml(): string {
    return `
      <button class="dev-tab-btn ${this.currentTab === 'player' ? 'active' : ''}" data-dev-tab="player">
        👤 プレイヤー
      </button>
      <button class="dev-tab-btn ${this.currentTab === 'economy' ? 'active' : ''}" data-dev-tab="economy">
        💰 資産・物件
      </button>
      <button class="dev-tab-btn ${this.currentTab === 'movement' ? 'active' : ''}" data-dev-tab="movement">
        🎲 ダイス・移動
      </button>
      <button class="dev-tab-btn ${this.currentTab === 'map' ? 'active' : ''}" data-dev-tab="map">
        🗺️ マップ・マス
      </button>
      <button class="dev-tab-btn ${this.currentTab === 'settings' ? 'active' : ''}" data-dev-tab="settings">
        ⚙️ 設定
      </button>
    `;
  }

  private renderTabContent(player?: PlayerState): string {
    if (!this.engine || !player) {
      return `
        <div class="dev-empty-notice">
          <p>ゲームが開始されていないか、プレイヤーデータが存在しません。</p>
        </div>
      `;
    }

    switch (this.currentTab) {
      case 'player':
        return this.renderPlayerTab(player);
      case 'economy':
        return this.renderEconomyTab(player);
      case 'movement':
        return this.renderMovementTab(player);
      case 'map':
        return this.renderMapTab(player);
      case 'settings':
        return this.renderSettingsTab();
    }
  }

  private renderPlayerTab(player: PlayerState): string {
    const currentSkin = player.skinId || 'standard';
    const currentColor = player.colorId || 'blue';
    const currentJob = player.jobId || 'unemployed';

    return `
      <div class="dev-section">
        <div class="dev-section-title">✨ スキン・アピアランス即時変更</div>
        <p class="dev-section-desc">現在の自キャラ・他キャラの見た目をゲーム中に即座に再生成・反映します。</p>

        <div class="dev-sub-header">トークンスキン (${TOKEN_SKIN_LIST.length}種)</div>
        <div class="dev-pill-grid">
          ${TOKEN_SKIN_LIST.map((s) => `
            <button class="dev-skin-pill ${currentSkin === s.id ? 'active' : ''}" data-action="set-skin" data-val="${s.id}">
              <strong>${s.name}</strong>
              <small>${s.description}</small>
            </button>
          `).join('')}
        </div>

        <div class="dev-sub-header" style="margin-top:14px;">テーマカラー (${THEME_COLOR_LIST.length}色)</div>
        <div class="dev-color-swatches">
          ${THEME_COLOR_LIST.map((c) => `
            <button class="dev-color-circle ${currentColor === c.id ? 'active' : ''}" data-action="set-color" data-val="${c.id}" style="background:${c.hex}" title="${c.name}"></button>
          `).join('')}
        </div>

        <div class="dev-sub-header" style="margin-top:14px;">キャラクター (${CHARACTER_LIST.length}種)</div>
        <div class="dev-pill-grid">
          ${CHARACTER_LIST.map((ch) => `
            <button class="dev-char-pill ${player.characterId === ch.id ? 'active' : ''}" data-action="set-char" data-val="${ch.id}">
              ${ch.name}
            </button>
          `).join('')}
        </div>

        <div class="dev-btn-row" style="margin-top:16px;">
          <button id="btn-dev-unlock-all-skins" class="toy-btn toy-btn-gold" style="width:100%;padding:10px;">
            🔓 全スキン・コマを永続アンロック（デバッグ解放）
          </button>
        </div>
      </div>

      <div class="dev-section" style="margin-top:18px;">
        <div class="dev-section-title">🎓 職業（転職）即時変更</div>
        <div class="dev-pill-grid">
          ${(Object.keys(JOBS) as JobId[]).map((jId) => {
            const j = JOBS[jId];
            return `
              <button class="dev-job-pill ${currentJob === jId ? 'active' : ''}" data-action="set-job" data-val="${jId}">
                <span>${j.name}</span>
                <small>給与:${j.salaries[0]}万</small>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  private renderEconomyTab(player: PlayerState): string {
    const tile = this.engine?.getTileById(player.currentTileId);
    const ownedTiles = this.engine?.getPlayerOwnedTiles(player.id) ?? [];

    return `
      <div class="dev-section">
        <div class="dev-section-title">💵 所持金操作 (現在: ${player.cash.toLocaleString()}万円)</div>
        <div class="dev-btn-grid-4">
          <button class="toy-btn toy-btn-green" data-action="add-cash" data-val="500">+500万</button>
          <button class="toy-btn toy-btn-green" data-action="add-cash" data-val="1000">+1000万</button>
          <button class="toy-btn toy-btn-gold" data-action="add-cash" data-val="5000">+5000万</button>
          <button class="toy-btn toy-btn-gold" data-action="add-cash" data-val="10000">+1億円</button>
        </div>
        <div class="dev-btn-grid-2" style="margin-top:8px;">
          <button class="toy-btn toy-btn-white" data-action="add-cash" data-val="-500">-500万円</button>
          <button class="toy-btn toy-btn-white" data-action="set-cash" data-val="0">所持金を0に（破産直前）</button>
        </div>
      </div>

      <div class="dev-section" style="margin-top:18px;">
        <div class="dev-section-title">🏘️ 現在マスの物件操作</div>
        ${
          tile && tile.type === 'property'
            ? `
          <div class="dev-tile-info-slab">
            <div>マス【${tile.id}: <strong>${tile.name}</strong>】 (${tile.groupName ?? 'エリア'})</div>
            <div>所有者: <strong>${tile.ownerId ? this.engine?.getPlayerById(tile.ownerId)?.name ?? tile.ownerId : '未所有'}</strong> / Lv: <strong>${tile.level ?? 1}</strong></div>
          </div>
          <div class="dev-btn-grid-2" style="margin-top:8px;">
            <button class="toy-btn toy-btn-blue" data-action="acquire-current-tile">このマスを無償獲得</button>
            <button class="toy-btn toy-btn-gold" data-action="max-level-current-tile">Lv3（ホテル）に強化</button>
          </div>
        `
            : `
          <p class="dev-hint-text">現在停止中のマス【${tile?.id}: ${tile?.name}】は物件マスではありません。</p>
        `
        }

        <div class="dev-sub-header" style="margin-top:14px;">所有物件一覧 (${ownedTiles.length}件)</div>
        <div class="dev-owned-tiles-list">
          ${
            ownedTiles.length === 0
              ? '<span class="dev-empty-text">所有物件なし</span>'
              : ownedTiles
                  .map(
                    (t) => `
                <div class="dev-owned-tile-item">
                  <span>${t.name} (Lv${t.level ?? 1})</span>
                  <div style="display:flex;gap:4px;">
                    <button class="btn-micro toy-btn toy-btn-gold" data-action="set-tile-lv" data-tile-id="${t.id}" data-val="3">Max</button>
                    <button class="btn-micro toy-btn toy-btn-white" data-action="release-tile" data-tile-id="${t.id}">放棄</button>
                  </div>
                </div>
              `
                  )
                  .join('')
          }
        </div>
      </div>

      <div class="dev-section" style="margin-top:18px;">
        <div class="dev-section-title">🎒 アイテム操作</div>
        <button id="btn-dev-give-all-items" class="toy-btn toy-btn-blue" style="width:100%;padding:10px;">
          🎁 全アイテム（7種）を一括付与
        </button>
      </div>
    `;
  }

  private renderMovementTab(player: PlayerState): string {
    const tiles = this.engine?.tiles ?? [];
    const forcedDice = player.forcedNextDice;

    return `
      <div class="dev-section">
        <div class="dev-section-title">🎲 イカサマダイス（次回出目を指定）</div>
        <p class="dev-section-desc">次のサイコロを振った際の出目を確定させます。</p>
        <div class="dev-dice-pills">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((d) => `
            <button class="dev-dice-pill ${forcedDice === d ? 'active' : ''}" data-action="set-dice" data-val="${d}">
              【${d}】
            </button>
          `).join('')}
        </div>
        ${
          forcedDice
            ? `<div class="dev-active-dice-note">✨ 出目【${forcedDice}】が予約されています</div>`
            : ''
        }
      </div>

      <div class="dev-section" style="margin-top:18px;">
        <div class="dev-section-title">⚡ 指定マスへ即時ワープ</div>
        <p class="dev-section-desc">マップ上の任意のマスへプレイヤーをテレポートさせます。</p>
        <div class="dev-warp-select-wrap">
          <select id="dev-warp-tile-select" class="dev-select">
            ${tiles.map((t) => `
              <option value="${t.id}" ${t.id === player.currentTileId ? 'selected' : ''}>
                [${t.id}] ${t.name} (${t.type})
              </option>
            `).join('')}
          </select>
          <button id="btn-dev-warp-exec" class="toy-btn toy-btn-blue" style="padding:8px 18px;">ワープ</button>
        </div>
      </div>
    `;
  }

  private renderMapTab(player: PlayerState): string {
    const tiles = this.engine?.tiles ?? [];
    if (tiles.length === 0) return '<div class="dev-empty-notice">マップが生成されていません</div>';

    const selectedTile = tiles.find((t) => t.id === this.selectedTileId) ?? tiles[0];
    const players = this.engine?.players ?? [];

    const filteredTiles = tiles.filter((t) => {
      if (this.tileFilter === 'property') return t.type === 'property';
      if (this.tileFilter === 'special') return t.type !== 'property';
      return true;
    });

    const tileTypes: Array<{ type: TileType; label: string }> = [
      { type: 'property', label: '🏘️ 物件（住宅・商業・特区）' },
      { type: 'start', label: '🚩 START / 給料日' },
      { type: 'event', label: '❓ チャンスイベント' },
      { type: 'career', label: '🎓 キャリアセンター' },
      { type: 'family', label: '💍 ウェディング＆ファミリー' },
      { type: 'bonus', label: '💎 臨時ボーナス' },
      { type: 'shop', label: '🛍️ アイテムショップ' },
      { type: 'tax', label: '🏛️ 資産税務署' },
      { type: 'jail', label: '🚔 刑務所' },
      { type: 'branch', label: '🔀 ルート分岐点' },
    ];

    return `
      <!-- 選択マスのリプレイス・編集パネル -->
      <div class="dev-section">
        <div class="dev-section-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
          <span>🛠️ マス編集・3D即時リプレイス</span>
          <span class="dev-selected-badge">#${selectedTile.id} ${this.escapeHtml(selectedTile.name)}</span>
        </div>
        <p class="dev-section-desc">種類を変更すると、3Dマップ上の建物モデルや装飾もリアルタイムに建て替わります。</p>

        <div class="dev-form-grid">
          <div class="dev-form-row">
            <label class="dev-form-label">マス名称:</label>
            <input id="input-dev-tile-name" type="text" class="dev-input" value="${this.escapeHtml(selectedTile.name)}" />
          </div>

          <div class="dev-form-row">
            <label class="dev-form-label">マスの種類:</label>
            <select id="select-dev-tile-type" class="dev-select">
              ${tileTypes
                .map(
                  (tt) => `
                <option value="${tt.type}" ${selectedTile.type === tt.type ? 'selected' : ''}>
                  ${tt.label}
                </option>
              `
                )
                .join('')}
            </select>
          </div>

          <div id="dev-property-sub-options" style="${selectedTile.type === 'property' ? 'display:block;' : 'display:none;'}">
            <div class="dev-form-row" style="margin-top:8px;">
              <label class="dev-form-label">建築タイプ:</label>
              <select id="select-dev-prop-type" class="dev-select">
                <option value="residential" ${selectedTile.propertyType === 'residential' ? 'selected' : ''}>住宅地 (高通行料)</option>
                <option value="commercial" ${selectedTile.propertyType === 'commercial' ? 'selected' : ''}>商業ビル (定期収益)</option>
                <option value="special" ${selectedTile.propertyType === 'special' ? 'selected' : ''}>都市インフラ特区</option>
              </select>
            </div>
          </div>
        </div>

        <div class="dev-btn-grid-2" style="margin-top:12px;">
          <button id="btn-dev-apply-tile-replace" class="toy-btn toy-btn-gold" style="padding:10px;">
            🔄 3D建て替えリプレイス実行
          </button>
          <button id="btn-dev-warp-to-selected" class="toy-btn toy-btn-blue" style="padding:10px;">
            ⚡ このマスへワープ
          </button>
        </div>

        ${
          selectedTile.type === 'property'
            ? `
          <div class="dev-sub-header" style="margin-top:14px;">所有者・レベル直接変更</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button class="btn-micro toy-btn ${!selectedTile.ownerId ? 'toy-btn-gold' : 'toy-btn-white'}" data-action="set-selected-owner" data-owner="">未所有</button>
            ${players
              .map(
                (p) => `
              <button class="btn-micro toy-btn ${selectedTile.ownerId === p.id ? 'toy-btn-blue' : 'toy-btn-white'}" data-action="set-selected-owner" data-owner="${p.id}">
                ${p.name}
              </button>
            `
              )
              .join('')}
          </div>
          <div style="display:flex;gap:6px;margin-top:8px;">
            <button class="btn-micro toy-btn ${(selectedTile.level ?? 1) === 1 ? 'toy-btn-green' : 'toy-btn-white'}" data-action="set-selected-level" data-lv="1">Lv1 住宅</button>
            <button class="btn-micro toy-btn ${(selectedTile.level ?? 1) === 2 ? 'toy-btn-green' : 'toy-btn-white'}" data-action="set-selected-level" data-lv="2">Lv2 ビル</button>
            <button class="btn-micro toy-btn ${(selectedTile.level ?? 1) === 3 ? 'toy-btn-green' : 'toy-btn-white'}" data-action="set-selected-level" data-lv="3">Lv3 ホテル</button>
          </div>
        `
            : ''
        }
      </div>

      <!-- マップ全36マス一覧テーブル -->
      <div class="dev-section" style="margin-top:16px;">
        <div class="dev-section-title" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;">
          <span>📋 生成マス全一覧 (${tiles.length}マス)</span>
          <div class="dev-filter-pills">
            <button class="dev-filter-btn ${this.tileFilter === 'all' ? 'active' : ''}" data-dev-filter="all">すべて</button>
            <button class="dev-filter-btn ${this.tileFilter === 'property' ? 'active' : ''}" data-dev-filter="property">物件のみ</button>
            <button class="dev-filter-btn ${this.tileFilter === 'special' ? 'active' : ''}" data-dev-filter="special">特殊マス</button>
          </div>
        </div>

        <div class="dev-tiles-table-wrap">
          <table class="dev-tiles-table">
            <thead>
              <tr>
                <th>#</th>
                <th>種別</th>
                <th>マス名称</th>
                <th>所有者</th>
                <th>Lv</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTiles
                .map((t) => {
                  const owner = t.ownerId ? players.find((p) => p.id === t.ownerId) : null;
                  const isSelected = t.id === selectedTile.id;
                  return `
                  <tr class="dev-tile-row ${isSelected ? 'selected' : ''}" data-dev-row-tile-id="${t.id}">
                    <td><strong>${t.id}</strong></td>
                    <td>
                      <span class="dev-tile-type-tag" style="background:${t.groupColor ?? '#64748b'};">
                        ${t.type === 'property' ? (t.propertyType === 'commercial' ? '商業' : '住宅') : t.type}
                      </span>
                    </td>
                    <td><span class="dev-tile-name-cell">${this.escapeHtml(t.name)}</span></td>
                    <td>${owner ? `<span style="color:${THEME_COLORS[owner.colorId]?.hex || '#0284c7'};font-weight:700;">${owner.name}</span>` : '<span style="color:#94a3b8;">-</span>'}</td>
                    <td>${t.type === 'property' ? `Lv${t.level ?? 1}` : '-'}</td>
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  private renderSettingsTab(): string {
    const isOverride = progressionManager.isDevModeOverride();

    return `
      <div class="dev-section">
        <div class="dev-section-title">⚙️ 開発者モード状態</div>
        <div class="dev-status-box">
          <div>メールアドレス: <strong>${progressionManager.getState().email || '（未ログイン）'}</strong></div>
          <div>管理者判定: <strong style="color:#10b981;">有効 (Admin)</strong></div>
        </div>

        <div class="dev-sub-header" style="margin-top:16px;">ローカル開発シミュレーション</div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
          <span>開発者権限の常時強制ON:</span>
          <button id="btn-dev-toggle-override" class="toy-btn ${isOverride ? 'toy-btn-green' : 'toy-btn-white'}" style="padding:6px 16px;">
            ${isOverride ? '有効中 (ON)' : '無効 (OFF)'}
          </button>
        </div>
      </div>
    `;
  }

  private bindEvents(root: HTMLElement, player?: PlayerState): void {
    // パネル全体：背後のゲームHUDや3Dキャンバスへのクリック・マウス・タッチ突き抜けを完全に遮断
    const panel = root.querySelector('.dev-drawer-panel') as HTMLElement;
    if (panel) {
      const stopAll = (e: Event) => {
        e.stopPropagation();
      };
      panel.addEventListener('click', stopAll);
      panel.addEventListener('mousedown', stopAll);
      panel.addEventListener('mouseup', stopAll);
      panel.addEventListener('pointerdown', stopAll);
      panel.addEventListener('pointerup', stopAll);
      panel.addEventListener('touchstart', stopAll, { passive: true });
      panel.addEventListener('wheel', stopAll, { passive: true });
    }

    // バックドロップクリックで閉じる
    root.querySelector('#dev-drawer-backdrop')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    root.querySelector('#btn-close-dev-drawer')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    // プレイヤー切り替え
    root.querySelectorAll('[data-dev-select-player]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectedPlayerId = el.getAttribute('data-dev-select-player') || '';
        this.render();
      });
    });

    // タブ切り替え
    root.querySelectorAll('[data-dev-tab]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.currentTab = (el.getAttribute('data-dev-tab') as DevConsoleTab) || 'player';
        this.render();
      });
    });

    if (!this.engine || !player) return;

    // スキン変更
    root.querySelectorAll('[data-action="set-skin"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const skinId = el.getAttribute('data-val') as TokenSkinId;
        this.engine?.debugUpdatePlayerAppearance(player.id, player.characterId, player.colorId, skinId);
        this.render();
        this.onStateChangedCallback?.();
      });
    });

    // カラー変更
    root.querySelectorAll('[data-action="set-color"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const colorId = el.getAttribute('data-val') as ThemeColorId;
        this.engine?.debugUpdatePlayerAppearance(
          player.id,
          player.characterId,
          colorId,
          player.skinId || 'standard'
        );
        this.render();
        this.onStateChangedCallback?.();
      });
    });

    // キャラクター変更
    root.querySelectorAll('[data-action="set-char"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const charId = el.getAttribute('data-val') as CharacterId;
        this.engine?.debugUpdatePlayerAppearance(
          player.id,
          charId,
          player.colorId,
          player.skinId || 'standard'
        );
        this.render();
        this.onStateChangedCallback?.();
      });
    });

    // 全スキン解放
    root.querySelector('#btn-dev-unlock-all-skins')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      progressionManager.debugUnlockAllSkins();
      alert('全スキン＆キャラクターをアンロックしました！');
      this.render();
    });

    // 職業変更
    root.querySelectorAll('[data-action="set-job"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const jobId = el.getAttribute('data-val') as JobId;
        this.engine?.debugSetJob(player.id, jobId);
        this.render();
        this.onStateChangedCallback?.();
      });
    });

    // 所持金追加
    root.querySelectorAll('[data-action="add-cash"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const val = Number(el.getAttribute('data-val'));
        this.engine?.debugAddCash(player.id, val);
        this.render();
        this.onStateChangedCallback?.();
      });
    });

    // 所持金セット
    root.querySelectorAll('[data-action="set-cash"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const val = Number(el.getAttribute('data-val'));
        this.engine?.debugSetCash(player.id, val);
        this.render();
        this.onStateChangedCallback?.();
      });
    });

    // 現在マスの無償獲得
    root.querySelector('[data-action="acquire-current-tile"]')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.engine?.debugSetTileOwner(player.currentTileId, player.id);
      this.render();
      this.onStateChangedCallback?.();
    });

    // 現在マスのMax強化
    root.querySelector('[data-action="max-level-current-tile"]')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.engine?.debugSetTileLevel(player.currentTileId, 3);
      this.render();
      this.onStateChangedCallback?.();
    });

    // 個別物件のレベル変更
    root.querySelectorAll('[data-action="set-tile-lv"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tileId = Number(el.getAttribute('data-tile-id'));
        const lv = Number(el.getAttribute('data-val')) as 1 | 2 | 3;
        this.engine?.debugSetTileLevel(tileId, lv);
        this.render();
        this.onStateChangedCallback?.();
      });
    });

    // 個別物件の放棄
    root.querySelectorAll('[data-action="release-tile"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tileId = Number(el.getAttribute('data-tile-id'));
        this.engine?.debugSetTileOwner(tileId, null);
        this.render();
        this.onStateChangedCallback?.();
      });
    });

    // 全アイテム付与
    root.querySelector('#btn-dev-give-all-items')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.engine?.debugAddAllItems(player.id);
      this.render();
      this.onStateChangedCallback?.();
    });

    // 出目指定
    root.querySelectorAll('[data-action="set-dice"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const val = Number(el.getAttribute('data-val'));
        this.engine?.debugSetForcedDice(player.id, val);
        this.render();
        this.onStateChangedCallback?.();
      });
    });

    // ワープ実行
    root.querySelector('#btn-dev-warp-exec')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const select = root.querySelector('#dev-warp-tile-select') as HTMLSelectElement;
      if (select) {
        const targetTileId = Number(select.value);
        this.engine?.debugWarpPlayer(player.id, targetTileId);
        this.render();
        this.onStateChangedCallback?.();
      }
    });

    // 開発者オーバーライドトグル
    root.querySelector('#btn-dev-toggle-override')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const current = progressionManager.isDevModeOverride();
      progressionManager.setDevModeOverride(!current);
      this.render();
    });

    // ==========================================
    // 🗺️ マップ・マスタブ イベントバインディング
    // ==========================================

    const selectTileType = root.querySelector('#select-dev-tile-type') as HTMLSelectElement;
    const propSubOpts = root.querySelector('#dev-property-sub-options') as HTMLElement;
    if (selectTileType && propSubOpts) {
      selectTileType.addEventListener('change', () => {
        propSubOpts.style.display = selectTileType.value === 'property' ? 'block' : 'none';
      });
    }

    // 3D建て替えリプレイス実行
    root.querySelector('#btn-dev-apply-tile-replace')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const tiles = this.engine?.tiles ?? [];
      const selectedTile = tiles.find((t) => t.id === this.selectedTileId) ?? tiles[0];
      if (!selectedTile) return;

      const inputName = root.querySelector('#input-dev-tile-name') as HTMLInputElement;
      const selectType = root.querySelector('#select-dev-tile-type') as HTMLSelectElement;
      const selectProp = root.querySelector('#select-dev-prop-type') as HTMLSelectElement;

      const customName = inputName?.value.trim() || undefined;
      const newType = (selectType?.value as TileType) || 'property';
      const propType = (selectProp?.value as PropertyType) || 'residential';

      this.engine?.debugReplaceTile(selectedTile.id, newType, customName, propType);
      this.render();
      this.onStateChangedCallback?.();
    });

    // 選択マスへワープ
    root.querySelector('#btn-dev-warp-to-selected')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.engine?.debugWarpPlayer(player.id, this.selectedTileId);
      this.render();
      this.onStateChangedCallback?.();
    });

    // 選択マスの所有者変更
    root.querySelectorAll('[data-action="set-selected-owner"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const ownerId = el.getAttribute('data-owner') || null;
        this.engine?.debugSetTileOwner(this.selectedTileId, ownerId);
        this.render();
        this.onStateChangedCallback?.();
      });
    });

    // 選択マスのレベル変更
    root.querySelectorAll('[data-action="set-selected-level"]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const lv = Number(el.getAttribute('data-lv')) as 1 | 2 | 3;
        this.engine?.debugSetTileLevel(this.selectedTileId, lv);
        this.render();
        this.onStateChangedCallback?.();
      });
    });

    // マップ一覧テーブル行クリック（選択）
    root.querySelectorAll('[data-dev-row-tile-id]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectedTileId = Number(el.getAttribute('data-dev-row-tile-id'));
        this.render();
      });
    });

    // 一覧フィルター切り替え
    root.querySelectorAll('[data-dev-filter]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.tileFilter = (el.getAttribute('data-dev-filter') as 'all' | 'property' | 'special') || 'all';
        this.render();
      });
    });
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
