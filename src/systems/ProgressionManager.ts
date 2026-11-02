import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  CHARACTERS,
  CharacterId,
  TOKEN_SKINS,
  ThemeColorId,
  TokenSkinId,
} from '../config/constants';

export interface UserProfileState {
  isLoggedIn: boolean;
  authProvider: 'supabase-google' | 'demo-google' | 'guest';
  userId: string | null;
  email: string | null;
  displayName: string;
  lifeCoins: number;
  unlockedCharacters: CharacterId[];
  unlockedSkins: TokenSkinId[];
  selectedCharacterId: CharacterId;
  selectedColorId: ThemeColorId;
  selectedSkinId: TokenSkinId;
}

export interface MatchRewardSummary {
  rankBonus: number;
  netWorthBonus: number;
  awardBonus: number;
  totalEarned: number;
  newBalance: number;
}

const STORAGE_KEY = 'lifeboard_progression_v1';

export class ProgressionManager {
  private supabase: SupabaseClient | null = null;
  private isSupabaseConfigured: boolean = false;
  private devModeOverride: boolean = false;
  private state: UserProfileState;
  private listeners: Set<(state: UserProfileState) => void> = new Set();

  constructor() {
    this.state = this.loadLocalState();
    this.initSupabaseClient();
  }

  private loadLocalState(): UserProfileState {
    const defaultState: UserProfileState = {
      isLoggedIn: false,
      authProvider: 'guest',
      userId: null,
      email: null,
      displayName: 'プレイヤー1',
      lifeCoins: 300, // 初回ログイン後にすぐスキンやコマを試せるウェルカムコイン
      unlockedCharacters: ['char_1', 'char_2', 'char_3', 'char_4'],
      unlockedSkins: ['standard'],
      selectedCharacterId: 'char_1',
      selectedColorId: 'blue',
      selectedSkinId: 'standard',
    };

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState;
      const parsed = JSON.parse(raw) as Partial<UserProfileState>;

      const unlockedChars = Array.isArray(parsed.unlockedCharacters)
        ? (parsed.unlockedCharacters.filter((id) => id in CHARACTERS) as CharacterId[])
        : defaultState.unlockedCharacters;
      for (const baseId of ['char_1', 'char_2', 'char_3', 'char_4'] as CharacterId[]) {
        if (!unlockedChars.includes(baseId)) unlockedChars.push(baseId);
      }

      const unlockedSkins = Array.isArray(parsed.unlockedSkins)
        ? (parsed.unlockedSkins.filter((id) => id in TOKEN_SKINS) as TokenSkinId[])
        : defaultState.unlockedSkins;
      if (!unlockedSkins.includes('standard')) unlockedSkins.unshift('standard');

      return {
        isLoggedIn: Boolean(parsed.isLoggedIn),
        authProvider: parsed.authProvider ?? 'guest',
        userId: parsed.userId ?? null,
        email: parsed.email ?? null,
        displayName: parsed.displayName || 'プレイヤー1',
        lifeCoins: typeof parsed.lifeCoins === 'number' ? Math.max(0, parsed.lifeCoins) : 300,
        unlockedCharacters: unlockedChars,
        unlockedSkins,
        selectedCharacterId:
          parsed.selectedCharacterId && parsed.selectedCharacterId in CHARACTERS
            ? parsed.selectedCharacterId
            : 'char_1',
        selectedColorId: parsed.selectedColorId ?? 'blue',
        selectedSkinId:
          parsed.selectedSkinId && parsed.selectedSkinId in TOKEN_SKINS
            ? parsed.selectedSkinId
            : 'standard',
      };
    } catch {
      return defaultState;
    }
  }

  private saveLocalState(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // ignore storage quota errors
    }
  }

  private initSupabaseClient(): void {
    try {
      const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
      const url = env?.VITE_SUPABASE_URL?.trim();
      const anonKey = env?.VITE_SUPABASE_ANON_KEY?.trim();

      if (
        url &&
        anonKey &&
        url.startsWith('http') &&
        !url.includes('your-project-id')
      ) {
        this.supabase = createClient(url, anonKey);
        this.isSupabaseConfigured = true;

        void this.supabase.auth.getSession().then(({ data }) => {
          if (data.session?.user) {
            void this.syncFromSupabaseUser(data.session.user.id, data.session.user.email ?? null);
          }
        });

        this.supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            void this.syncFromSupabaseUser(session.user.id, session.user.email ?? null);
          } else if (this.state.authProvider === 'supabase-google') {
            this.state.isLoggedIn = false;
            this.state.authProvider = 'guest';
            this.state.userId = null;
            this.state.email = null;
            this.saveLocalState();
            this.emitChange();
          }
        });
      }
    } catch {
      this.isSupabaseConfigured = false;
    }
  }

  private async syncFromSupabaseUser(userId: string, email: string | null): Promise<void> {
    if (!this.supabase) return;

    this.state.isLoggedIn = true;
    this.state.authProvider = 'supabase-google';
    this.state.userId = userId;
    this.state.email = email;

    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        this.state.displayName = data.display_name || this.state.displayName;
        this.state.lifeCoins =
          typeof data.life_coins === 'number' ? data.life_coins : this.state.lifeCoins;
        if (Array.isArray(data.unlocked_characters)) {
          this.state.unlockedCharacters = data.unlocked_characters as CharacterId[];
        }
        if (Array.isArray(data.unlocked_skins)) {
          this.state.unlockedSkins = data.unlocked_skins as TokenSkinId[];
        }
        if (data.selected_character && data.selected_character in CHARACTERS) {
          this.state.selectedCharacterId = data.selected_character as CharacterId;
        }
        if (data.selected_skin && data.selected_skin in TOKEN_SKINS) {
          this.state.selectedSkinId = data.selected_skin as TokenSkinId;
        }
      } else {
        // 初回ログイン時はレコードを作成
        await this.pushToSupabase();
      }
    } catch {
      // ignore network error and keep local state
    }

    this.saveLocalState();
    this.emitChange();
  }

  private async pushToSupabase(): Promise<void> {
    if (!this.supabase || !this.state.userId || this.state.authProvider !== 'supabase-google') {
      return;
    }
    try {
      await this.supabase.from('user_profiles').upsert({
        id: this.state.userId,
        display_name: this.state.displayName,
        life_coins: this.state.lifeCoins,
        unlocked_characters: this.state.unlockedCharacters,
        unlocked_skins: this.state.unlockedSkins,
        selected_character: this.state.selectedCharacterId,
        selected_color: this.state.selectedColorId,
        selected_skin: this.state.selectedSkinId,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // ignore
    }
  }

  public subscribe(cb: (state: UserProfileState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => {
      this.listeners.delete(cb);
    };
  }

  public getState(): UserProfileState {
    return {
      ...this.state,
      unlockedCharacters: [...this.state.unlockedCharacters],
      unlockedSkins: [...this.state.unlockedSkins],
    };
  }

  public hasSupabaseKeys(): boolean {
    return this.isSupabaseConfigured;
  }

  /**
   * Google OAuth ログインを実行
   * - VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 設定済み時：Supabase Google OAuth リダイレクトを実行
   * - 未設定の開発・デモ環境時：ワンクリックでGoogleアカウント認証シミュレーションを完了しスキン解放を可能にする
   */
  public async signInWithGoogle(customEmail?: string): Promise<{ ok: boolean; message: string }> {
    if (this.isSupabaseConfigured && this.supabase) {
      const { error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) {
        return { ok: false, message: `Google認証エラー: ${error.message}` };
      }
      return { ok: true, message: 'Google認証画面へ移動しています...' };
    }

    // .env 未設定時は即座に動作確認できるGoogle連携デモログインとして認証状態を確立
    this.state.isLoggedIn = true;
    this.state.authProvider = 'demo-google';
    this.state.userId = `google_user_${Date.now().toString(36)}`;
    this.state.email = customEmail?.trim() || 'player.lifeboard@gmail.com';
    this.saveLocalState();
    this.emitChange();
    return {
      ok: true,
      message: 'Googleアカウントでログインしました！特別スキンと報酬コマの解放が可能です。',
    };
  }

  public async signOut(): Promise<void> {
    if (this.isSupabaseConfigured && this.supabase && this.state.authProvider === 'supabase-google') {
      try {
        await this.supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
    this.state.isLoggedIn = false;
    this.state.authProvider = 'guest';
    this.state.userId = null;
    this.state.email = null;
    // 未ログインに戻った場合、ログイン必須の特別スキン選択は standard に戻す
    if (this.state.selectedSkinId !== 'standard') {
      this.state.selectedSkinId = 'standard';
    }
    this.saveLocalState();
    this.emitChange();
  }

  public isCharacterUnlocked(charId: CharacterId): boolean {
    if (CHARACTERS[charId]?.isInitialUnlocked) return true;
    return this.state.unlockedCharacters.includes(charId);
  }

  public isSkinUnlocked(skinId: TokenSkinId): boolean {
    if (TOKEN_SKINS[skinId]?.isInitialUnlocked) return true;
    // スキンはログイン中かつアンロック済みの場合のみ使用可能
    return this.state.isLoggedIn && this.state.unlockedSkins.includes(skinId);
  }

  /**
   * 報酬コマのアンロック（ログイン必須）
   */
  public unlockCharacter(charId: CharacterId): {
    ok: boolean;
    requiresLogin?: boolean;
    message: string;
  } {
    const def = CHARACTERS[charId];
    if (!def) return { ok: false, message: '存在しないコマです。' };
    if (this.isCharacterUnlocked(charId)) {
      return { ok: true, message: `${def.name} は既に解放されています。` };
    }
    if (!this.state.isLoggedIn) {
      return {
        ok: false,
        requiresLogin: true,
        message: '報酬コマやスキンを解放するにはログインが必要です。',
      };
    }
    if (this.state.lifeCoins < def.unlockCostCoins) {
      return {
        ok: false,
        message: `ライフコインが足りません（必要: ${def.unlockCostCoins} 🪙 / 所持: ${this.state.lifeCoins} 🪙）`,
      };
    }

    this.state.lifeCoins -= def.unlockCostCoins;
    this.state.unlockedCharacters.push(charId);
    this.state.selectedCharacterId = charId;
    this.saveLocalState();
    void this.pushToSupabase();
    this.emitChange();
    return { ok: true, message: `🎉「${def.name}」を解放しました！` };
  }

  /**
   * 特別スキンのアンロック（ログイン必須）
   */
  public unlockSkin(skinId: TokenSkinId): {
    ok: boolean;
    requiresLogin?: boolean;
    message: string;
  } {
    const def = TOKEN_SKINS[skinId];
    if (!def) return { ok: false, message: '存在しないスキンです。' };
    if (def.isInitialUnlocked || this.state.unlockedSkins.includes(skinId)) {
      if (!this.state.isLoggedIn && def.requiresLogin) {
        return {
          ok: false,
          requiresLogin: true,
          message: '特別スキンを使用・解放するにはログインが必要です。',
        };
      }
      return { ok: true, message: `${def.name} は既に解放されています。` };
    }
    if (!this.state.isLoggedIn) {
      return {
        ok: false,
        requiresLogin: true,
        message: 'スキンを解放するにはログインが必要です。',
      };
    }
    if (this.state.lifeCoins < def.unlockCostCoins) {
      return {
        ok: false,
        message: `ライフコインが足りません（必要: ${def.unlockCostCoins} 🪙 / 所持: ${this.state.lifeCoins} 🪙）`,
      };
    }

    this.state.lifeCoins -= def.unlockCostCoins;
    this.state.unlockedSkins.push(skinId);
    this.state.selectedSkinId = skinId;
    this.saveLocalState();
    void this.pushToSupabase();
    this.emitChange();
    return { ok: true, message: `✨ 特別スキン「${def.name}」を解放しました！` };
  }

  public updateSelection(updates: {
    displayName?: string;
    characterId?: CharacterId;
    colorId?: ThemeColorId;
    skinId?: TokenSkinId;
  }): void {
    if (updates.displayName !== undefined && updates.displayName.trim().length > 0) {
      this.state.displayName = updates.displayName.trim().slice(0, 14);
    }
    if (updates.characterId && this.isCharacterUnlocked(updates.characterId)) {
      this.state.selectedCharacterId = updates.characterId;
    }
    if (updates.colorId) {
      this.state.selectedColorId = updates.colorId;
    }
    if (updates.skinId && this.isSkinUnlocked(updates.skinId)) {
      this.state.selectedSkinId = updates.skinId;
    }
    this.saveLocalState();
    void this.pushToSupabase();
    this.emitChange();
  }

  /**
   * 試合終了時の報酬「ライフコイン」計算＆付与
   */
  public awardMatchCoins(
    rank: number,
    totalNetWorth: number,
    awardsCount: number
  ): MatchRewardSummary {
    const rankBonus =
      rank === 1 ? 150 : rank === 2 ? 100 : rank === 3 ? 70 : 50;
    const netWorthBonus = Math.max(0, Math.floor(totalNetWorth / 1000) * 10);
    const awardBonus = Math.max(0, awardsCount * 30);
    const totalEarned = rankBonus + netWorthBonus + awardBonus;

    this.state.lifeCoins += totalEarned;
    this.saveLocalState();
    void this.pushToSupabase();
    this.emitChange();

    return {
      rankBonus,
      netWorthBonus,
      awardBonus,
      totalEarned,
      newBalance: this.state.lifeCoins,
    };
  }

  /**
   * 開発者管理者権限の判定
   * 1. devModeOverride が true の場合
   * 2. ログイン中メールアドレスが VITE_DEV_ADMIN_EMAILS に含まれる場合
   * 3. ローカル開発環境（import.meta.env.DEV）かつ未ログイン時
   */
  public isDevAdmin(): boolean {
    if (this.devModeOverride) return true;
    const email = this.state.email?.toLowerCase().trim();
    const env = (import.meta as unknown as { env?: Record<string, string | undefined> & { DEV?: boolean } }).env;
    if (!email) {
      return Boolean(env?.DEV);
    }
    const adminEmailsRaw = env?.VITE_DEV_ADMIN_EMAILS || '';
    const adminEmails = adminEmailsRaw
      .split(',')
      .map((e) => e.toLowerCase().trim())
      .filter(Boolean);
    if (adminEmails.includes(email)) return true;
    return Boolean(env?.DEV);
  }

  public setDevModeOverride(enabled: boolean): void {
    this.devModeOverride = enabled;
    this.emitChange();
  }

  public isDevModeOverride(): boolean {
    return this.devModeOverride;
  }

  /**
   * 開発者用：全スキンおよび全キャラクターを強制アンロック
   */
  public debugUnlockAllSkins(): void {
    this.state.unlockedCharacters = Object.keys(CHARACTERS) as CharacterId[];
    this.state.unlockedSkins = Object.keys(TOKEN_SKINS) as TokenSkinId[];
    this.saveLocalState();
    this.emitChange();
  }

  private emitChange(): void {
    const snap = this.getState();
    for (const cb of this.listeners) {
      cb(snap);
    }
  }
}

export const progressionManager = new ProgressionManager();

