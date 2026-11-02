/**
 * ゲーム専用の高品位ベクター（SVG）アイコン定義
 * OS標準の絵文字（🪙, 🔐, ✅, ♟️, 👑, 🎲, 🚪, ⚙️, 👥, ➕ 等）を完全に廃止し、
 * おもちゃ・ジオラマボードゲームらしいツヤと立体感のある専用アイコンを提供します。
 */

export interface IconOptions {
  size?: number;
  className?: string;
  fill?: string;
}

export const GameIcons = {
  /** ライフコイン（🪙）: 縁取りとハイライトが入った立体ゴールドコイン */
  coin: (opts: IconOptions = {}): string => {
    const s = opts.size ?? 24;
    const cls = opts.className ? ` class="${opts.className}"` : '';
    return `
      <svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none"${cls} xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block;">
        <defs>
          <linearGradient id="coinGradOuter" x1="16" y1="2" x2="16" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FDE047" />
            <stop offset="100%" stop-color="#CA8A04" />
          </linearGradient>
          <linearGradient id="coinGradInner" x1="16" y1="5" x2="16" y2="27" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FEF08A" />
            <stop offset="100%" stop-color="#EAB308" />
          </linearGradient>
          <filter id="coinShadow" x="0" y="0" width="32" height="32" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="2" stdDeviation="1" flood-color="#854D0E" flood-opacity="0.4" />
          </filter>
        </defs>
        <!-- 外枠・厚み -->
        <circle cx="16" cy="17" r="13" fill="#A16207" />
        <circle cx="16" cy="15" r="13" fill="url(#coinGradOuter)" stroke="#FFFFFF" stroke-width="1.5" />
        <!-- 内側リング -->
        <circle cx="16" cy="15" r="9.5" fill="url(#coinGradInner)" stroke="#CA8A04" stroke-width="1.2" />
        <!-- 中央のスター＆ハイライト -->
        <path d="M16 9.5L17.5 13.5L21.5 15L17.5 16.5L16 20.5L14.5 16.5L10.5 15L14.5 13.5Z" fill="#FFFFFF" />
        <circle cx="13" cy="11" r="2" fill="#FFFFFF" opacity="0.6" />
      </svg>
    `.trim();
  },

  /** 錠前・ロック（🔐 / 🔒）: 真鍮ゴールドとメタリックシルバーの立体パドロック */
  lock: (opts: IconOptions = {}): string => {
    const s = opts.size ?? 24;
    const cls = opts.className ? ` class="${opts.className}"` : '';
    return `
      <svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none"${cls} xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block;">
        <defs>
          <linearGradient id="lockBodyGrad" x1="16" y1="13" x2="16" y2="29" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FBBF24" />
            <stop offset="100%" stop-color="#D97706" />
          </linearGradient>
          <linearGradient id="lockShackleGrad" x1="16" y1="3" x2="16" y2="15" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#F1F5F9" />
            <stop offset="100%" stop-color="#94A3B8" />
          </linearGradient>
        </defs>
        <!-- つる（シャックル） -->
        <path d="M10 14V9.5C10 6.18629 12.6863 3.5 16 3.5C19.3137 3.5 22 6.18629 22 9.5V14" stroke="url(#lockShackleGrad)" stroke-width="3.5" stroke-linecap="round" />
        <!-- 本体厚み -->
        <rect x="7" y="15" width="18" height="14" rx="4" fill="#92400E" />
        <rect x="7" y="13" width="18" height="14" rx="4" fill="url(#lockBodyGrad)" stroke="#FFFFFF" stroke-width="1.2" />
        <!-- 鍵穴 -->
        <circle cx="16" cy="18.5" r="2" fill="#78350F" />
        <path d="M15 19.5H17L17.5 23H14.5L15 19.5Z" fill="#78350F" />
      </svg>
    `.trim();
  },

  /** チェック・完了（✅）: 立体グリーンのふっくらチェックバッジ */
  check: (opts: IconOptions = {}): string => {
    const s = opts.size ?? 24;
    const cls = opts.className ? ` class="${opts.className}"` : '';
    return `
      <svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none"${cls} xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block;">
        <defs>
          <linearGradient id="checkBadgeGrad" x1="16" y1="3" x2="16" y2="29" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#4ADE80" />
            <stop offset="100%" stop-color="#16A34A" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="18" r="12" fill="#15803D" />
        <circle cx="16" cy="16" r="12" fill="url(#checkBadgeGrad)" stroke="#FFFFFF" stroke-width="2" />
        <path d="M10.5 16L14 19.5L21.5 12" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        <!-- 上部ハイライト -->
        <ellipse cx="16" cy="8.5" rx="6" ry="2.5" fill="#FFFFFF" opacity="0.35" />
      </svg>
    `.trim();
  },

  /** 立体ポーン・コマ（♟️）: トイライクな木製・アクリル調ポーン */
  pawn: (opts: IconOptions = {}): string => {
    const s = opts.size ?? 24;
    const cls = opts.className ? ` class="${opts.className}"` : '';
    return `
      <svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none"${cls} xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block;">
        <defs>
          <linearGradient id="pawnGrad" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#60A5FA" />
            <stop offset="100%" stop-color="#2563EB" />
          </linearGradient>
        </defs>
        <!-- 台座厚み -->
        <ellipse cx="16" cy="27" rx="9" ry="3" fill="#1E3A8A" />
        <ellipse cx="16" cy="25" rx="9" ry="3" fill="url(#pawnGrad)" stroke="#FFFFFF" stroke-width="1.2" />
        <!-- コマボディ -->
        <path d="M12 24C12 18 13.5 15 14 14C13.2 13.5 12.5 12 12.5 10C12.5 8.067 14.067 6.5 16 6.5C17.933 6.5 19.5 8.067 19.5 10C19.5 12 18.8 13.5 18 14C18.5 15 20 18 20 24Z" fill="url(#pawnGrad)" stroke="#FFFFFF" stroke-width="1.2" />
        <!-- ハイライト -->
        <circle cx="14.8" cy="9" r="1.5" fill="#FFFFFF" opacity="0.7" />
      </svg>
    `.trim();
  },

  /** 王冠・ホスト（👑）: ゴールドクラウン */
  crown: (opts: IconOptions = {}): string => {
    const s = opts.size ?? 24;
    const cls = opts.className ? ` class="${opts.className}"` : '';
    return `
      <svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none"${cls} xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block;">
        <defs>
          <linearGradient id="crownGrad" x1="16" y1="6" x2="16" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#FDE047" />
            <stop offset="100%" stop-color="#EAB308" />
          </linearGradient>
        </defs>
        <path d="M6 25L8 12L13 18L16 8L19 18L24 12L26 25H6Z" fill="#B45309" />
        <path d="M6 23L8 10L13 16L16 6L19 16L24 10L26 23H6Z" fill="url(#crownGrad)" stroke="#FFFFFF" stroke-width="1.5" stroke-linejoin="round" />
        <circle cx="8" cy="9" r="2" fill="#EF4444" stroke="#FFFFFF" stroke-width="0.8" />
        <circle cx="16" cy="5" r="2.2" fill="#3B82F6" stroke="#FFFFFF" stroke-width="0.8" />
        <circle cx="24" cy="9" r="2" fill="#10B981" stroke="#FFFFFF" stroke-width="0.8" />
        <rect x="7" y="21" width="18" height="3" rx="1.5" fill="#CA8A04" />
      </svg>
    `.trim();
  },

  /** 立体サイコロ（🎲）: アイソメトリック調の3Dダイス */
  dice: (opts: IconOptions = {}): string => {
    const s = opts.size ?? 24;
    const cls = opts.className ? ` class="${opts.className}"` : '';
    return `
      <svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none"${cls} xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block;">
        <!-- 影 -->
        <ellipse cx="16" cy="27" rx="10" ry="3.5" fill="#0F172A" opacity="0.2" />
        <!-- 上面 -->
        <polygon points="16,4 27,10 16,16 5,10" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1" />
        <!-- 左面 -->
        <polygon points="5,10 16,16 16,26 5,20" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1" />
        <!-- 右面 -->
        <polygon points="16,16 27,10 27,20 16,26" fill="#CBD5E1" stroke="#64748B" stroke-width="1" />
        <!-- 目（上面の中央1） -->
        <ellipse cx="16" cy="10" rx="2" ry="1.2" fill="#EF4444" />
        <!-- 目（左面の目） -->
        <circle cx="10" cy="15" r="1.3" fill="#1E293B" />
        <circle cx="12" cy="21" r="1.3" fill="#1E293B" />
        <!-- 目（右面の目） -->
        <circle cx="20" cy="16" r="1.3" fill="#1E293B" />
        <circle cx="23" cy="21" r="1.3" fill="#1E293B" />
      </svg>
    `.trim();
  },

  /** 歯車・設定（⚙️） */
  gear: (opts: IconOptions = {}): string => {
    const s = opts.size ?? 24;
    const cls = opts.className ? ` class="${opts.className}"` : '';
    return `
      <svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none"${cls} xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block;">
        <defs>
          <linearGradient id="gearGrad" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#94A3B8" />
            <stop offset="100%" stop-color="#475569" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="18" r="10" fill="#334155" />
        <path d="M14 4H18V7H14V4ZM21.5 6.5L24.5 9.5L22.5 11.5L19.5 8.5L21.5 6.5ZM25 14H28V18H25V14ZM22.5 20.5L24.5 22.5L21.5 25.5L19.5 23.5L22.5 20.5ZM14 25H18V28H14V25ZM7.5 22.5L10.5 19.5L12.5 21.5L9.5 24.5L7.5 22.5ZM4 14H7V18H4V14ZM9.5 7.5L12.5 10.5L10.5 12.5L7.5 9.5L9.5 7.5Z" fill="url(#gearGrad)" />
        <circle cx="16" cy="16" r="9.5" fill="url(#gearGrad)" stroke="#FFFFFF" stroke-width="1.2" />
        <circle cx="16" cy="16" r="4" fill="#0F172A" />
      </svg>
    `.trim();
  },

  /** ユーザー・グループ（👥） */
  users: (opts: IconOptions = {}): string => {
    const s = opts.size ?? 24;
    const cls = opts.className ? ` class="${opts.className}"` : '';
    return `
      <svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none"${cls} xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block;">
        <circle cx="12" cy="11" r="5" fill="#3B82F6" stroke="#FFFFFF" stroke-width="1.2" />
        <path d="M5 24C5 20 8 18 12 18C16 18 19 20 19 24" fill="#2563EB" stroke="#FFFFFF" stroke-width="1.2" />
        <circle cx="21" cy="12" r="4" fill="#60A5FA" stroke="#FFFFFF" stroke-width="1.2" />
        <path d="M16 23C16.5 20.5 18.5 19 21.5 19C24.5 19 27 20.5 27 23" fill="#1D4ED8" stroke="#FFFFFF" stroke-width="1" />
      </svg>
    `.trim();
  },

  /** プラス・作成（➕） */
  plus: (opts: IconOptions = {}): string => {
    const s = opts.size ?? 24;
    const cls = opts.className ? ` class="${opts.className}"` : '';
    return `
      <svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none"${cls} xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block;">
        <circle cx="16" cy="18" r="12" fill="#1D4ED8" />
        <circle cx="16" cy="16" r="12" fill="#3B82F6" stroke="#FFFFFF" stroke-width="2" />
        <path d="M16 10V22M10 16H22" stroke="#FFFFFF" stroke-width="3.5" stroke-linecap="round" />
      </svg>
    `.trim();
  },

  /** 矢印・戻る（⬅） */
  arrowBack: (opts: IconOptions = {}): string => {
    const s = opts.size ?? 24;
    const cls = opts.className ? ` class="${opts.className}"` : '';
    return `
      <svg width="${s}" height="${s}" viewBox="0 0 32 32" fill="none"${cls} xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block;">
        <circle cx="16" cy="18" r="12" fill="#94A3B8" />
        <circle cx="16" cy="16" r="12" fill="#F8FAFC" stroke="#FFFFFF" stroke-width="2" />
        <path d="M18 11L12 16L18 21" stroke="#334155" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    `.trim();
  },

  /** Google "G" カラーロゴ */
  google: (opts: IconOptions = {}): string => {
    const s = opts.size ?? 20;
    const cls = opts.className ? ` class="${opts.className}"` : '';
    return `
      <svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none"${cls} xmlns="http://www.w3.org/2000/svg" style="vertical-align: middle; display: inline-block;">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
      </svg>
    `.trim();
  },
};

