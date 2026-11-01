import * as Colyseus from 'colyseus.js';
import Peer, { DataConnection } from 'peerjs';
import {
  CHARACTER_LIST,
  CharacterId,
  THEME_COLOR_LIST,
  ThemeColorId,
} from '../config/constants';
import {
  AssetBreakdown,
  GameConfig,
  GameEngine,
  GameEngineCallbacks,
  GameEngineSnapshot,
  GameLogEntry,
  GameMoveStepEvent,
  GameRuleMode,
  RemotePlayerActionPayload,
  SpecialAward,
} from '../systems/GameEngine';

export type P2PRole = 'offline' | 'host' | 'guest';

export interface LobbyPlayerSlot {
  id: string;
  name: string;
  isCpu: boolean;
  isHost: boolean;
  isConnected: boolean;
  isReady: boolean;
  characterId: CharacterId;
  colorId: ThemeColorId;
}

export interface RoomLobbyState {
  roomId: string;
  roomTitle: string;
  seed: number;
  isOnlineColyseus: boolean;
  p2pRole: P2PRole;
  p2pStatusText: string;
  connectedPeerCount: number;
  endpointUrl: string;
  ruleMode: GameRuleMode;
  maxTurns: number; // 10 | 20 | 30 | 50
  timeLimitMinutes: number; // 15 | 30 | 45
  maxPlayers: number; // 2〜6
  players: LobbyPlayerSlot[];
  localPlayerId: string;
}

export type RoomStateListener = (state: RoomLobbyState) => void;

type HostToClientMessage =
  | {
      type: 'WELCOME_ASSIGN';
      assignedPlayerId: string;
      lobby: Omit<
        RoomLobbyState,
        'localPlayerId' | 'p2pRole' | 'p2pStatusText' | 'connectedPeerCount'
      >;
      activeSnapshot?: GameEngineSnapshot;
    }
  | {
      type: 'LOBBY_SYNC';
      lobby: Omit<
        RoomLobbyState,
        'localPlayerId' | 'p2pRole' | 'p2pStatusText' | 'connectedPeerCount'
      >;
    }
  | {
      type: 'MATCH_START';
      config: GameConfig;
      initialPlayers: LobbyPlayerSlot[];
      snapshot: GameEngineSnapshot;
    }
  | {
      type: 'ENGINE_STATE_SYNC';
      snapshot: GameEngineSnapshot;
    }
  | {
      type: 'FX_DICE_ROLL';
      playerId: string;
      targetValue: number;
      purpose: 'move' | 'jail' | 'event';
    }
  | {
      type: 'FX_PLAYER_STEP';
      step: GameMoveStepEvent;
    }
  | {
      type: 'FX_POPUP';
      tileId: number;
      text: string;
      color: string;
      effectType: 'coin' | 'build' | 'celebrate' | 'alert' | 'auction';
    }
  | {
      type: 'FX_LOG';
      entry: GameLogEntry;
    }
  | {
      type: 'MATCH_OVER';
      rankings: AssetBreakdown[];
      awards: SpecialAward[];
    };

type ClientToHostMessage =
  | {
      type: 'JOIN_REQUEST';
      sessionId: string;
      preferredName?: string;
    }
  | {
      type: 'CUSTOMIZE_PLAYER';
      playerId: string;
      updates: {
        name?: string;
        characterId?: CharacterId;
        colorId?: ThemeColorId;
      };
    }
  | {
      type: 'PLAYER_ACTION';
      action: RemotePlayerActionPayload;
    };

const CPU_NAMES = [
  'CPU タクミ',
  'CPU アオイ',
  'CPU レン',
  'CPU ミオ',
  'CPU カイト',
];

const PEER_ID_PREFIX = 'lifeboard-p2p-room-';

export class RoomManager {
  private client: Colyseus.Client | null = null;
  private colyseusRoom: Colyseus.Room | null = null;

  // PeerJS (WebRTC P2P) 状態管理
  private peer: Peer | null = null;
  private hostConnection: DataConnection | null = null; // ゲスト時の対ホスト接続
  private guestConnections: Map<string, DataConnection> = new Map(); // ホスト時の playerId -> DataConnection
  private sessionToPlayerId: Map<string, string> = new Map();
  private localSessionId: string;

  private lobbyState: RoomLobbyState;
  private listeners: Set<RoomStateListener> = new Set();
  private gameEngine: GameEngine | null = null;
  private currentCallbacks: GameEngineCallbacks = {};
  private onGuestMatchStartCallback: ((engine: GameEngine) => void) | null = null;

  constructor(defaultEndpoint = 'ws://localhost:2567') {
    const initialRoomId = RoomManager.generateRoomId();
    const localId = 'player_1';
    this.localSessionId = RoomManager.getOrCreateSessionId();

    this.lobbyState = {
      roomId: initialRoomId,
      roomTitle: 'たのしい人生ゲーム',
      seed: RoomManager.hashRoomSeed(initialRoomId),
      isOnlineColyseus: false,
      p2pRole: 'offline',
      p2pStatusText: 'プレイヤーが集まるのを待っています...',
      connectedPeerCount: 0,
      endpointUrl: defaultEndpoint,
      ruleMode: 'TURN_LIMIT',
      maxTurns: 30,
      timeLimitMinutes: 30,
      maxPlayers: 6,
      localPlayerId: localId,
      players: [
        {
          id: localId,
          name: 'プレイヤー1',
          isCpu: false,
          isHost: true,
          isConnected: true,
          isReady: true,
          characterId: 'char_1',
          colorId: 'blue',
        },
        {
          id: 'cpu_1',
          name: 'プレイヤー2 (CPU)',
          isCpu: true,
          isHost: false,
          isConnected: true,
          isReady: true,
          characterId: 'char_2',
          colorId: 'green',
        },
        {
          id: 'cpu_2',
          name: 'プレイヤー3 (CPU)',
          isCpu: true,
          isHost: false,
          isConnected: true,
          isReady: true,
          characterId: 'char_3',
          colorId: 'purple',
        },
      ],
    };
  }

  private static getOrCreateSessionId(): string {
    try {
      const existing = window.sessionStorage.getItem('lifeboard_session_id');
      if (existing) return existing;
      const created = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      window.sessionStorage.setItem('lifeboard_session_id', created);
      return created;
    } catch {
      return `sess_${Math.random().toString(36).slice(2, 9)}`;
    }
  }

  public static generateRoomId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  public static hashRoomSeed(roomId: string): number {
    let h = 2166136261;
    for (let i = 0; i < roomId.length; i++) {
      h ^= roomId.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /**
   * URLクエリパラメータ (?room=XXXXXX) から招待ルームIDを取得
   */
  public static getInviteRoomIdFromUrl(): string | null {
    try {
      const params = new URLSearchParams(window.location.search);
      const room = params.get('room');
      if (room && room.trim().length >= 4) {
        return room.trim().toUpperCase();
      }
    } catch {
      // ignore
    }
    return null;
  }

  /**
   * 友達招待用のURLを生成
   */
  public getInviteUrl(): string {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', this.lobbyState.roomId);
      return url.toString();
    } catch {
      return `${window.location.origin}/?room=${this.lobbyState.roomId}`;
    }
  }

  public setOnGuestMatchStart(cb: (engine: GameEngine) => void): void {
    this.onGuestMatchStartCallback = cb;
  }

  public isOnlineP2P(): boolean {
    return this.lobbyState.p2pRole === 'host' || this.lobbyState.p2pRole === 'guest';
  }

  public canLocalPlayerControl(playerId: string): boolean {
    if (this.lobbyState.p2pRole === 'offline') {
      // オフライン・1台共有モードではCPU以外の全人間プレイヤーを操作可能
      const p =
        this.gameEngine?.getPlayerById(playerId) ??
        this.lobbyState.players.find((slot) => slot.id === playerId);
      return Boolean(p && !p.isCpu);
    }
    // P2Pオンライン対戦時は自分に割り当てられた localPlayerId のみ操作可能
    return playerId === this.lobbyState.localPlayerId;
  }

  public subscribe(listener: RoomStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getLobbyState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getLobbyState(): RoomLobbyState {
    return {
      ...this.lobbyState,
      players: this.lobbyState.players.map((p) => ({ ...p })),
    };
  }

  public getLocalPlayer(): LobbyPlayerSlot {
    return (
      this.lobbyState.players.find((p) => p.id === this.lobbyState.localPlayerId) ??
      this.lobbyState.players[0]
    );
  }

  public getGameEngine(): GameEngine | null {
    return this.gameEngine;
  }

  // ==========================================
  // PeerJS (WebRTC P2P) ホスト部屋作成 & ゲスト参加
  // ==========================================

  /**
   * P2Pホストとしてオンラインルームを開設（Vercel単体デプロイで友達を招待可能にする）
   */
  public async openP2PHostRoom(customRoomId?: string): Promise<{ ok: boolean; error?: string }> {
    this.cleanupP2P();

    const cleanId =
      customRoomId && customRoomId.trim().length >= 4
        ? customRoomId.trim().toUpperCase()
        : this.lobbyState.roomId || RoomManager.generateRoomId();

    this.lobbyState.roomId = cleanId;
    this.lobbyState.seed = RoomManager.hashRoomSeed(cleanId);
    this.lobbyState.localPlayerId = 'player_1';
    if (this.lobbyState.players.length > 0) {
      this.lobbyState.players[0].id = 'player_1';
      this.lobbyState.players[0].isHost = true;
      this.lobbyState.players[0].isCpu = false;
    }

    this.lobbyState.p2pRole = 'host';
    this.lobbyState.p2pStatusText = '⏳ オンライン部屋を開設中...';
    this.emitChange();

    const peerId = `${PEER_ID_PREFIX}${cleanId}`;

    return new Promise((resolve) => {
      try {
        const peer = new Peer(peerId);
        this.peer = peer;

        const timeout = window.setTimeout(() => {
          this.lobbyState.p2pStatusText = '⚠️ P2Pサーバー接続タイムアウト（ローカル動作中）';
          this.emitChange();
          resolve({ ok: false, error: '接続がタイムアウトしました。' });
        }, 8000);

        peer.on('open', () => {
          window.clearTimeout(timeout);
          this.lobbyState.p2pRole = 'host';
          this.lobbyState.p2pStatusText = `🟢 P2Pホスト公開中（ID: ${cleanId}）`;
          this.emitChange();
          resolve({ ok: true });
        });

        peer.on('connection', (conn) => {
          this.handleIncomingGuestConnection(conn);
        });

        peer.on('error', (err) => {
          window.clearTimeout(timeout);
          // すでに同じルームIDが使われている場合は新しいIDで再試行
          if (err.type === 'unavailable-id') {
            const nextId = RoomManager.generateRoomId();
            void this.openP2PHostRoom(nextId).then(resolve);
            return;
          }
          this.lobbyState.p2pStatusText = `⚠️ P2Pエラー: ${err.type}`;
          this.emitChange();
          resolve({ ok: false, error: err.message });
        });
      } catch (e) {
        this.lobbyState.p2pRole = 'offline';
        this.lobbyState.p2pStatusText = 'ローカルモード';
        this.emitChange();
        resolve({ ok: false, error: String(e) });
      }
    });
  }

  /**
   * 友達のルームIDを指定してP2Pゲストとして参加する
   */
  public async joinP2PRoomByCode(roomCode: string): Promise<{ ok: boolean; error?: string }> {
    const cleanCode = roomCode.trim().toUpperCase();
    if (cleanCode.length < 4) {
      return { ok: false, error: '4文字以上のルームIDを入力してください。' };
    }

    this.cleanupP2P();
    this.lobbyState.p2pRole = 'guest';
    this.lobbyState.p2pStatusText = `⏳ ルーム ${cleanCode} に接続中...`;
    this.emitChange();

    const targetHostPeerId = `${PEER_ID_PREFIX}${cleanCode}`;

    return new Promise((resolve) => {
      try {
        const peer = new Peer();
        this.peer = peer;

        const timeout = window.setTimeout(() => {
          this.cleanupP2P();
          this.lobbyState.p2pStatusText = `❌ ルーム ${cleanCode} が見つからないか応答がありません`;
          this.emitChange();
          resolve({ ok: false, error: 'ルームが見つかりませんでした。IDを確認してください。' });
        }, 8500);

        peer.on('open', () => {
          const conn = peer.connect(targetHostPeerId, { reliable: true });
          this.hostConnection = conn;

          conn.on('open', () => {
            const joinMsg: ClientToHostMessage = {
              type: 'JOIN_REQUEST',
              sessionId: this.localSessionId,
              preferredName: this.getLocalPlayer()?.name,
            };
            conn.send(joinMsg);
          });

          conn.on('data', (raw) => {
            const msg = raw as HostToClientMessage;
            if (msg.type === 'WELCOME_ASSIGN') {
              window.clearTimeout(timeout);
              this.lobbyState.roomId = msg.lobby.roomId;
              this.lobbyState.roomTitle = msg.lobby.roomTitle || 'たのしい人生ゲーム';
              this.lobbyState.seed = msg.lobby.seed;
              this.lobbyState.ruleMode = msg.lobby.ruleMode;
              this.lobbyState.maxTurns = msg.lobby.maxTurns;
              this.lobbyState.timeLimitMinutes = msg.lobby.timeLimitMinutes;
              this.lobbyState.maxPlayers = msg.lobby.maxPlayers;
              this.lobbyState.players = msg.lobby.players;
              this.lobbyState.localPlayerId = msg.assignedPlayerId;
              this.lobbyState.p2pRole = 'guest';
              this.lobbyState.connectedPeerCount = 1;
              this.lobbyState.p2pStatusText = `🟢 ルーム ${cleanCode} に参加中`;
              this.emitChange();

              // 途中再接続で既に試合が進行中の場合は即座にゲーム画面へ合流
              if (msg.activeSnapshot) {
                this.initGuestReplicaEngine(
                  msg.activeSnapshot.config,
                  msg.lobby.players,
                  msg.activeSnapshot
                );
              }

              resolve({ ok: true });
              return;
            }
            this.handleMessageFromHost(msg);
          });

          conn.on('close', () => {
            this.lobbyState.p2pStatusText = '⚠️ ホストとの通信が切断されました';
            this.emitChange();
          });

          conn.on('error', () => {
            window.clearTimeout(timeout);
            this.cleanupP2P();
            resolve({ ok: false, error: 'ホストへの接続中にエラーが発生しました。' });
          });
        });

        peer.on('error', (err) => {
          window.clearTimeout(timeout);
          this.cleanupP2P();
          this.lobbyState.p2pStatusText = `❌ 接続失敗 (${err.type})`;
          this.emitChange();
          resolve({
            ok: false,
            error:
              err.type === 'peer-unavailable'
                ? `ルームID「${cleanCode}」は現在開かれていません。ホストがロビーを開いているか確認してください。`
                : `通信エラー (${err.type})`,
          });
        });
      } catch (e) {
        this.cleanupP2P();
        resolve({ ok: false, error: String(e) });
      }
    });
  }

  /**
   * ホスト側：ゲストからの着信WebRTCコネクション処理
   */
  private handleIncomingGuestConnection(conn: DataConnection): void {
    let assignedPlayerId = '';

    conn.on('data', (raw) => {
      const msg = raw as ClientToHostMessage;

      if (msg.type === 'JOIN_REQUEST') {
        // 1. 既存のセッションIDによる再接続かチェック（仕様書13.1：いつでも元のルームに再接続して操作権を取り戻せる）
        const existingPlayerId = this.sessionToPlayerId.get(msg.sessionId);
        if (
          existingPlayerId &&
          this.lobbyState.players.some((p) => p.id === existingPlayerId)
        ) {
          assignedPlayerId = existingPlayerId;
          this.guestConnections.set(assignedPlayerId, conn);
          this.setPlayerConnectionStatus(assignedPlayerId, true);
        } else {
          // 2. 新規ゲスト参加：CPU枠があれば1つを人間ゲスト枠に置き換え、なければ新規枠（最大6人）を追加
          assignedPlayerId = this.allocateSlotForNewGuest(msg.preferredName);
          this.sessionToPlayerId.set(msg.sessionId, assignedPlayerId);
          this.guestConnections.set(assignedPlayerId, conn);
        }

        this.lobbyState.connectedPeerCount = this.guestConnections.size;
        this.lobbyState.p2pStatusText = `🟢 P2Pホスト公開中（参加者 ${this.guestConnections.size + 1}人）`;

        const welcome: HostToClientMessage = {
          type: 'WELCOME_ASSIGN',
          assignedPlayerId,
          lobby: this.extractSharedLobbyPayload(),
          activeSnapshot: this.gameEngine ? this.gameEngine.exportSnapshot() : undefined,
        };
        conn.send(welcome);
        this.broadcastLobbySync();
        this.emitChange();
        return;
      }

      if (msg.type === 'CUSTOMIZE_PLAYER') {
        this.updatePlayerCustomization(msg.playerId, msg.updates);
        return;
      }

      if (msg.type === 'PLAYER_ACTION' && this.gameEngine) {
        this.gameEngine.executeRemoteAction(msg.action);
      }
    });

    conn.on('close', () => {
      if (assignedPlayerId) {
        this.guestConnections.delete(assignedPlayerId);
        this.lobbyState.connectedPeerCount = this.guestConnections.size;
        this.setPlayerConnectionStatus(assignedPlayerId, false);
        this.broadcastLobbySync();
      }
    });
  }

  private allocateSlotForNewGuest(preferredName?: string): string {
    const humanCount = this.lobbyState.players.filter((p) => !p.isCpu).length + 1;
    const guestId = `player_${humanCount}_${Math.random().toString(36).slice(2, 5)}`;
    const guestName =
      preferredName &&
      preferredName.trim().length > 0 &&
      !preferredName.includes('プレイヤー1')
        ? preferredName.trim()
        : `プレイヤー${humanCount}`;

    // CPU枠があれば最初のCPU枠をゲスト人間に置き換える
    const firstCpuIdx = this.lobbyState.players.findIndex((p) => p.isCpu);
    if (firstCpuIdx !== -1) {
      const cpuSlot = this.lobbyState.players[firstCpuIdx];
      this.lobbyState.players[firstCpuIdx] = {
        id: guestId,
        name: guestName,
        isCpu: false,
        isHost: false,
        isConnected: true,
        isReady: true,
        characterId: cpuSlot.characterId,
        colorId: cpuSlot.colorId,
      };
      return guestId;
    }

    // 空き枠（6人未満）があれば追加
    if (this.lobbyState.players.length < 6) {
      const usedColors = new Set(this.lobbyState.players.map((p) => p.colorId));
      const availableColor =
        THEME_COLOR_LIST.find((c) => !usedColors.has(c.id))?.id ??
        THEME_COLOR_LIST[this.lobbyState.players.length % THEME_COLOR_LIST.length].id;
      const charDef =
        CHARACTER_LIST[this.lobbyState.players.length % CHARACTER_LIST.length];

      this.lobbyState.players.push({
        id: guestId,
        name: guestName,
        isCpu: false,
        isHost: false,
        isConnected: true,
        isReady: true,
        characterId: charDef.id,
        colorId: availableColor,
      });
      return guestId;
    }

    // すでに6人埋まっている場合は最後の非ホスト枠を割り当て
    const fallback = this.lobbyState.players[this.lobbyState.players.length - 1];
    return fallback.id;
  }

  private extractSharedLobbyPayload(): Omit<
    RoomLobbyState,
    'localPlayerId' | 'p2pRole' | 'p2pStatusText' | 'connectedPeerCount'
  > {
    return {
      roomId: this.lobbyState.roomId,
      roomTitle: this.lobbyState.roomTitle,
      seed: this.lobbyState.seed,
      isOnlineColyseus: this.lobbyState.isOnlineColyseus,
      endpointUrl: this.lobbyState.endpointUrl,
      ruleMode: this.lobbyState.ruleMode,
      maxTurns: this.lobbyState.maxTurns,
      timeLimitMinutes: this.lobbyState.timeLimitMinutes,
      maxPlayers: this.lobbyState.maxPlayers,
      players: this.lobbyState.players.map((p) => ({ ...p })),
    };
  }

  private broadcastToGuests(msg: HostToClientMessage): void {
    if (this.lobbyState.p2pRole !== 'host') return;
    for (const conn of this.guestConnections.values()) {
      if (conn.open) {
        try {
          conn.send(msg);
        } catch {
          // ignore individual send error
        }
      }
    }
  }

  private broadcastLobbySync(): void {
    if (this.lobbyState.p2pRole !== 'host') return;
    this.broadcastToGuests({
      type: 'LOBBY_SYNC',
      lobby: this.extractSharedLobbyPayload(),
    });
  }

  /**
   * ゲスト側：ホストから届いたメッセージの処理
   */
  private handleMessageFromHost(msg: HostToClientMessage): void {
    switch (msg.type) {
      case 'LOBBY_SYNC':
        this.lobbyState.roomId = msg.lobby.roomId;
        this.lobbyState.roomTitle = msg.lobby.roomTitle || 'たのしい人生ゲーム';
        this.lobbyState.seed = msg.lobby.seed;
        this.lobbyState.ruleMode = msg.lobby.ruleMode;
        this.lobbyState.maxTurns = msg.lobby.maxTurns;
        this.lobbyState.timeLimitMinutes = msg.lobby.timeLimitMinutes;
        this.lobbyState.maxPlayers = msg.lobby.maxPlayers;
        this.lobbyState.players = msg.lobby.players;
        this.emitChange();
        break;

      case 'MATCH_START':
        this.initGuestReplicaEngine(msg.config, msg.initialPlayers, msg.snapshot);
        break;

      case 'ENGINE_STATE_SYNC':
        if (this.gameEngine) {
          this.gameEngine.applySnapshot(msg.snapshot);
        }
        break;

      case 'FX_DICE_ROLL':
        this.currentCallbacks.onDiceRollRequested?.(
          msg.playerId,
          msg.targetValue,
          msg.purpose,
          () => {}
        );
        break;

      case 'FX_PLAYER_STEP':
        this.currentCallbacks.onPlayerStepped?.(msg.step, () => {});
        break;

      case 'FX_POPUP':
        this.currentCallbacks.onPopupEffect?.(
          msg.tileId,
          msg.text,
          msg.color,
          msg.effectType
        );
        break;

      case 'FX_LOG':
        this.currentCallbacks.onLogAdded?.(msg.entry);
        break;

      case 'MATCH_OVER':
        this.currentCallbacks.onGameOver?.(msg.rankings, msg.awards);
        break;
    }
  }

  private initGuestReplicaEngine(
    config: GameConfig,
    initialPlayers: LobbyPlayerSlot[],
    snapshot: GameEngineSnapshot
  ): void {
    const engine = new GameEngine(
      config,
      initialPlayers.map((p) => ({
        id: p.id,
        name: p.name,
        isCpu: p.isCpu,
        isHost: p.isHost,
        characterId: p.characterId,
        colorId: p.colorId,
      })),
      this.currentCallbacks
    );

    engine.setRemoteReplicaMode(true, (action) => {
      if (this.hostConnection && this.hostConnection.open) {
        const packet: ClientToHostMessage = {
          type: 'PLAYER_ACTION',
          action,
        };
        this.hostConnection.send(packet);
      }
    });

    engine.applySnapshot(snapshot);
    this.gameEngine = engine;
    this.onGuestMatchStartCallback?.(engine);
  }

  public cleanupP2P(): void {
    for (const conn of this.guestConnections.values()) {
      try {
        conn.close();
      } catch {
        // ignore
      }
    }
    this.guestConnections.clear();

    if (this.hostConnection) {
      try {
        this.hostConnection.close();
      } catch {
        // ignore
      }
      this.hostConnection = null;
    }

    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // ignore
      }
      this.peer = null;
    }

    this.lobbyState.p2pRole = 'offline';
    this.lobbyState.connectedPeerCount = 0;
  }

  /**
   * ColyseusサーバーまたはP2Pルームの新規ID生成・再構築
   */
  public async createOrJoinRoom(
    roomIdInput?: string,
    endpoint?: string
  ): Promise<RoomLobbyState> {
    const targetEndpoint = endpoint ?? this.lobbyState.endpointUrl;
    const cleanRoomId =
      roomIdInput && roomIdInput.trim().length >= 4
        ? roomIdInput.trim().toUpperCase()
        : RoomManager.generateRoomId();

    this.lobbyState.roomId = cleanRoomId;
    this.lobbyState.seed = RoomManager.hashRoomSeed(cleanRoomId);
    this.lobbyState.endpointUrl = targetEndpoint;

    // P2Pホスト中だった場合は新しいルームIDでP2Pホストを再オープン
    if (this.lobbyState.p2pRole === 'host') {
      await this.openP2PHostRoom(cleanRoomId);
      return this.getLobbyState();
    }

    try {
      this.client = new Colyseus.Client(targetEndpoint);
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 600);
      });

      const joinPromise = this.client
        .joinOrCreate('life_board_room', {
          roomId: cleanRoomId,
          playerName: this.getLocalPlayer().name,
        })
        .catch(() => null);

      const room = await Promise.race([joinPromise, timeoutPromise]);
      if (room) {
        this.colyseusRoom = room;
        this.lobbyState.isOnlineColyseus = true;
      } else {
        this.lobbyState.isOnlineColyseus = false;
      }
    } catch {
      this.lobbyState.isOnlineColyseus = false;
    }

    this.emitChange();
    return this.getLobbyState();
  }

  /**
   * ルーム名の変更
   */
  public setRoomTitle(title: string): void {
    if (this.lobbyState.p2pRole === 'guest') return;
    const trimmed = title.trim();
    if (!trimmed) return;
    this.lobbyState.roomTitle = trimmed.slice(0, 24);
    this.broadcastLobbySync();
    this.emitChange();
  }

  /**
   * 終了条件（規定ターン制 10/20/30/50 ＆ 制限時間制 15/30/45分）のサイクル切り替え
   */
  public cycleGameRuleOption(): void {
    if (this.lobbyState.p2pRole === 'guest') return;

    const presets: Array<{ ruleMode: GameRuleMode; maxTurns?: number; timeLimitMinutes?: number }> = [
      { ruleMode: 'TURN_LIMIT', maxTurns: 10 },
      { ruleMode: 'TURN_LIMIT', maxTurns: 20 },
      { ruleMode: 'TURN_LIMIT', maxTurns: 30 },
      { ruleMode: 'TURN_LIMIT', maxTurns: 50 },
      { ruleMode: 'TIME_LIMIT', timeLimitMinutes: 15 },
      { ruleMode: 'TIME_LIMIT', timeLimitMinutes: 30 },
      { ruleMode: 'TIME_LIMIT', timeLimitMinutes: 45 },
    ];

    const currentIdx = presets.findIndex((p) =>
      p.ruleMode === 'TURN_LIMIT'
        ? this.lobbyState.ruleMode === 'TURN_LIMIT' && this.lobbyState.maxTurns === p.maxTurns
        : this.lobbyState.ruleMode === 'TIME_LIMIT' &&
          this.lobbyState.timeLimitMinutes === p.timeLimitMinutes
    );

    const next = presets[(currentIdx + 1) % presets.length];
    this.setGameRuleConfig(next);
  }

  /**
   * ルーム設定（規定ターン制 または 制限時間制）の更新
   */
  public setGameRuleConfig(config: {
    ruleMode?: GameRuleMode;
    maxTurns?: number;
    timeLimitMinutes?: number;
  }): void {
    if (this.lobbyState.p2pRole === 'guest') return; // ゲストはルール変更不可

    if (config.ruleMode !== undefined) {
      this.lobbyState.ruleMode = config.ruleMode;
    }
    if (config.maxTurns !== undefined) {
      this.lobbyState.maxTurns = config.maxTurns;
    }
    if (config.timeLimitMinutes !== undefined) {
      this.lobbyState.timeLimitMinutes = config.timeLimitMinutes;
    }

    this.broadcastLobbySync();
    this.emitChange();
  }

  /**
   * プレイヤー名・キャラクター・テーマカラーの変更
   */
  public updatePlayerCustomization(
    playerId: string,
    updates: {
      name?: string;
      characterId?: CharacterId;
      colorId?: ThemeColorId;
    }
  ): void {
    // ゲストの場合はホストへ変更リクエストを送信
    if (this.lobbyState.p2pRole === 'guest' && this.hostConnection?.open) {
      const msg: ClientToHostMessage = {
        type: 'CUSTOMIZE_PLAYER',
        playerId,
        updates,
      };
      this.hostConnection.send(msg);
    }

    const target = this.lobbyState.players.find((p) => p.id === playerId);
    if (!target) return;

    if (updates.name !== undefined && updates.name.trim().length > 0) {
      target.name = updates.name.trim();
    }
    if (updates.characterId !== undefined) {
      target.characterId = updates.characterId;
    }
    if (updates.colorId !== undefined) {
      target.colorId = updates.colorId;
    }

    this.broadcastLobbySync();
    this.emitChange();
  }

  /**
   * CPUプレイヤーの追加（最大6人まで：仕様書1.1）
   */
  public addCpuPlayer(): boolean {
    if (this.lobbyState.p2pRole === 'guest') return false;
    if (this.lobbyState.players.length >= 6) return false;

    const existingIds = new Set(this.lobbyState.players.map((p) => p.id));
    let cpuIdx = 1;
    while (existingIds.has(`cpu_${cpuIdx}`)) {
      cpuIdx++;
    }

    const usedColors = new Set(this.lobbyState.players.map((p) => p.colorId));
    const availableColor =
      THEME_COLOR_LIST.find((c) => !usedColors.has(c.id))?.id ??
      THEME_COLOR_LIST[this.lobbyState.players.length % THEME_COLOR_LIST.length].id;

    const charDef =
      CHARACTER_LIST[this.lobbyState.players.length % CHARACTER_LIST.length];

    this.lobbyState.players.push({
      id: `cpu_${cpuIdx}`,
      name: CPU_NAMES[(cpuIdx - 1) % CPU_NAMES.length],
      isCpu: true,
      isHost: false,
      isConnected: true,
      isReady: true,
      characterId: charDef.id,
      colorId: availableColor,
    });

    this.lobbyState.maxPlayers = Math.max(
      this.lobbyState.maxPlayers,
      this.lobbyState.players.length
    );
    this.broadcastLobbySync();
    this.emitChange();
    return true;
  }

  /**
   * ローカル人間プレイヤー枠の追加（1台での複数人ホットシート対戦にも対応）
   */
  public addHumanPlayer(name?: string): boolean {
    if (this.lobbyState.p2pRole === 'guest') return false;
    if (this.lobbyState.players.length >= 6) return false;

    const humanCount = this.lobbyState.players.filter((p) => !p.isCpu).length + 1;
    const newId = `player_${Date.now().toString(36).slice(-4)}`;

    const usedColors = new Set(this.lobbyState.players.map((p) => p.colorId));
    const availableColor =
      THEME_COLOR_LIST.find((c) => !usedColors.has(c.id))?.id ??
      THEME_COLOR_LIST[this.lobbyState.players.length % THEME_COLOR_LIST.length].id;

    const charDef =
      CHARACTER_LIST[this.lobbyState.players.length % CHARACTER_LIST.length];

    this.lobbyState.players.push({
      id: newId,
      name: name ?? `プレイヤー${humanCount}`,
      isCpu: false,
      isHost: false,
      isConnected: true,
      isReady: true,
      characterId: charDef.id,
      colorId: availableColor,
    });

    this.broadcastLobbySync();
    this.emitChange();
    return true;
  }

  /**
   * プレイヤー枠の削除（最低2人は維持：仕様書1.1）
   */
  public removePlayer(playerId: string): boolean {
    if (this.lobbyState.p2pRole === 'guest') return false;
    if (this.lobbyState.players.length <= 2) return false;
    if (playerId === this.lobbyState.localPlayerId) return false;

    const idx = this.lobbyState.players.findIndex((p) => p.id === playerId);
    if (idx === -1) return false;

    this.lobbyState.players.splice(idx, 1);
    this.broadcastLobbySync();
    this.emitChange();
    return true;
  }

  public setCallbacksForGuest(callbacks: GameEngineCallbacks): void {
    this.currentCallbacks = callbacks;
    if (this.gameEngine) {
      this.gameEngine.setCallbacks(callbacks);
    }
  }

  /**
   * 対戦開始（ホストまたはローカルでGameEngineインスタンスを初期化して返却）
   */
  public startGameEngine(callbacks: GameEngineCallbacks = {}): GameEngine {
    this.currentCallbacks = callbacks;

    while (this.lobbyState.players.length < 2) {
      this.addCpuPlayer();
    }

    const config: GameConfig = {
      roomId: this.lobbyState.roomId,
      seed: this.lobbyState.seed,
      ruleMode: this.lobbyState.ruleMode,
      maxTurns: this.lobbyState.maxTurns,
      timeLimitMinutes: this.lobbyState.timeLimitMinutes,
    };

    const wrappedCallbacks: GameEngineCallbacks = {
      onStateChanged: () => {
        callbacks.onStateChanged?.();
        if (this.gameEngine && this.lobbyState.p2pRole === 'host') {
          this.broadcastToGuests({
            type: 'ENGINE_STATE_SYNC',
            snapshot: this.gameEngine.exportSnapshot(),
          });
        }
      },
      onDiceRollRequested: (playerId, targetValue, purpose, onFinish) => {
        if (this.lobbyState.p2pRole === 'host') {
          this.broadcastToGuests({
            type: 'FX_DICE_ROLL',
            playerId,
            targetValue,
            purpose,
          });
        }
        if (callbacks.onDiceRollRequested) {
          callbacks.onDiceRollRequested(playerId, targetValue, purpose, onFinish);
        } else {
          onFinish();
        }
      },
      onPlayerStepped: (step, onStepAnimComplete) => {
        if (this.lobbyState.p2pRole === 'host') {
          this.broadcastToGuests({
            type: 'FX_PLAYER_STEP',
            step,
          });
        }
        if (callbacks.onPlayerStepped) {
          callbacks.onPlayerStepped(step, onStepAnimComplete);
        } else {
          onStepAnimComplete();
        }
      },
      onPopupEffect: (tileId, text, color, effectType) => {
        if (this.lobbyState.p2pRole === 'host') {
          this.broadcastToGuests({
            type: 'FX_POPUP',
            tileId,
            text,
            color,
            effectType,
          });
        }
        callbacks.onPopupEffect?.(tileId, text, color, effectType);
      },
      onLogAdded: (entry) => {
        if (this.lobbyState.p2pRole === 'host') {
          this.broadcastToGuests({
            type: 'FX_LOG',
            entry,
          });
        }
        callbacks.onLogAdded?.(entry);
      },
      onGameOver: (rankings, awards) => {
        if (this.lobbyState.p2pRole === 'host') {
          this.broadcastToGuests({
            type: 'MATCH_OVER',
            rankings,
            awards,
          });
        }
        callbacks.onGameOver?.(rankings, awards);
      },
    };

    this.gameEngine = new GameEngine(
      config,
      this.lobbyState.players.map((p) => ({
        id: p.id,
        name: p.name,
        isCpu: p.isCpu,
        isHost: p.isHost,
        characterId: p.characterId,
        colorId: p.colorId,
      })),
      wrappedCallbacks
    );

    if (this.lobbyState.p2pRole === 'host') {
      this.broadcastToGuests({
        type: 'MATCH_START',
        config,
        initialPlayers: this.lobbyState.players.map((p) => ({ ...p })),
        snapshot: this.gameEngine.exportSnapshot(),
      });
    }

    return this.gameEngine;
  }

  /**
   * 通信切断・再接続復帰ステータス変更（仕様書13.1準拠）
   */
  public setPlayerConnectionStatus(playerId: string, connected: boolean): void {
    const lobbyP = this.lobbyState.players.find((p) => p.id === playerId);
    if (lobbyP) {
      lobbyP.isConnected = connected;
    }

    if (this.gameEngine) {
      const engineP = this.gameEngine.getPlayerById(playerId);
      if (engineP) {
        engineP.isConnected = connected;
        if (connected) {
          this.gameEngine.notifyManualAction(playerId);
        }
      }
    }

    this.emitChange();
  }

  private emitChange(): void {
    const snapshot = this.getLobbyState();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}
