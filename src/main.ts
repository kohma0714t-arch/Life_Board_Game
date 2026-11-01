import './style.css';
import { SoundManager } from './audio/sound-manager';
import { RoomManager } from './network/RoomManager';
import { MainScene } from './scenes/MainScene';
import { UIManager } from './scenes/UIManager';

async function bootstrap(): Promise<void> {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  const uiContainer = document.getElementById('ui-layer') as HTMLElement | null;

  if (!canvas || !uiContainer) {
    throw new Error('Required DOM containers (#game-canvas, #ui-layer) were not found.');
  }

  // 1. サウンドマネージャー・ルームマネージャー初期化
  const soundManager = new SoundManager();
  const roomManager = new RoomManager();

  // 2. 3Dメインシーン初期化＆アセット非同期ロード
  const mainScene = new MainScene(canvas, soundManager);
  await mainScene.initAssets();

  // 3. 2D UIマネージャー初期化
  const uiManager = new UIManager(uiContainer, roomManager, soundManager, mainScene);

  // 4. 初回ユーザー操作時のWebAudioコンテキスト再開＆BGMスタート
  let audioUnlocked = false;
  const unlockAudioOnce = () => {
    if (audioUnlocked) return;
    audioUnlocked = true;
    soundManager.resumeContext();
    soundManager.startBGM();
    window.removeEventListener('pointerdown', unlockAudioOnce);
    window.removeEventListener('keydown', unlockAudioOnce);
  };
  window.addEventListener('pointerdown', unlockAudioOnce, { passive: true });
  window.addEventListener('keydown', unlockAudioOnce, { passive: true });

  // 5. ウィンドウリサイズ対応
  window.addEventListener('resize', () => {
    mainScene.handleResize();
  });

  // 6. メインアニメーションループ (requestAnimationFrame)
  let lastTime = performance.now();
  const animate = (now: number) => {
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;

    const engine = roomManager.getGameEngine();
    if (engine) {
      engine.update(dt);
    }

    mainScene.update(dt);
    uiManager.updateTimersOnly();

    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
}

void bootstrap();
