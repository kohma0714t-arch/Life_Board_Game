import * as THREE from 'three';
import {
  AssetManifest,
  BuildingLevel,
  PropertyBuildingType,
  loadAssetManifest,
} from '../assets/asset-manifest';
import { SoundManager } from '../audio/sound-manager';
import { THEME_COLORS } from '../config/constants';
import { GameEngine, GameMoveStepEvent, PlayerState } from '../systems/GameEngine';
import { BoardTile } from '../systems/MapGenerator';
import { PhysicsWorld } from '../systems/PhysicsWorld';

export type CameraMode = 'overview' | 'follow';

interface ActiveHopAnimation {
  playerId: string;
  mesh: THREE.Group;
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  elapsed: number;
  duration: number;
  onComplete: () => void;
}

interface BuildingScaleAnim {
  mesh: THREE.Group;
  elapsed: number;
  duration: number;
}

interface BurstParticleSystem {
  points: THREE.Points;
  velocities: Float32Array;
  elapsed: number;
  duration: number;
}

interface FloatingSpritePopup {
  sprite: THREE.Sprite;
  elapsed: number;
  duration: number;
}

export class MainScene {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private soundManager: SoundManager;
  private physicsWorld: PhysicsWorld;
  private manifest: AssetManifest | null = null;

  // シーングループ管理
  private rootGroup = new THREE.Group();
  private environmentGroup = new THREE.Group();
  private tilesGroup = new THREE.Group();
  private bridgesGroup = new THREE.Group();
  private buildingsGroup = new THREE.Group();
  private playersGroup = new THREE.Group();
  private effectsGroup = new THREE.Group();

  // オブジェクトキャッシュ
  private tileMeshes = new Map<number, THREE.Group>();
  private playerMeshes = new Map<string, THREE.Group>();
  private buildingMeshes = new Map<number, { key: string; mesh: THREE.Group }>();
  private diceMesh: THREE.Mesh | null = null;
  private activeTurnIndicator: THREE.Group;
  private hoverHighlightRing: THREE.Mesh;

  // アニメーション状態
  private hopAnimation: ActiveHopAnimation | null = null;
  private buildingAnims: BuildingScaleAnim[] = [];
  private particleBursts: BurstParticleSystem[] = [];
  private floatingPopups: FloatingSpritePopup[] = [];
  private clouds: THREE.Group[] = [];
  private elapsedClock = 0;

  // カメラ制御
  private cameraMode: CameraMode = 'overview';
  private cameraTarget = new THREE.Vector3(0, 0.5, 0);
  private desiredCameraTarget = new THREE.Vector3(0, 0.5, 0);
  private orbitYaw = Math.PI * 0.22; // アイソメトリック斜め俯瞰角（リファレンス画像準拠）
  private orbitPitch = 0.72; // 俯角ラジアン
  private orbitDistance = 36;
  private isDraggingCamera = false;
  private pointerDownPos = { x: 0, y: 0 };
  private lastPointerPos = { x: 0, y: 0 };

  // カメラシェイク
  private shakeIntensity = 0;
  private shakeTimer = 0;

  // Raycaster（マス選択・ホバー）
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private hoveredTileId: number | null = null;
  private onTileClickCallback: ((tileId: number) => void) | null = null;
  private onTileHoverCallback: ((tileId: number | null, screenPos?: { x: number; y: number }) => void) | null =
    null;

  constructor(canvas: HTMLCanvasElement, soundManager: SoundManager) {
    this.canvas = canvas;
    this.soundManager = soundManager;

    // 1. WebGLRenderer 初期化 (ACESFilmicToneMapping + PCFSoftShadowMap)
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 2. シーン＆空色グラデーション背景＋爽やかなフォグ
    this.scene = new THREE.Scene();
    this.scene.background = this.createSkyGradientTexture();
    this.scene.fog = new THREE.FogExp2(0xdcf0ff, 0.0065);

    // 3. カメラ初期化
    this.camera = new THREE.PerspectiveCamera(
      40,
      window.innerWidth / Math.max(1, window.innerHeight),
      0.5,
      220
    );
    this.soundManager.attachCamera(this.camera);

    // 4. ライティング構築
    this.setupLights();

    // 5. シーングループ階層登録
    this.rootGroup.add(
      this.environmentGroup,
      this.bridgesGroup,
      this.tilesGroup,
      this.buildingsGroup,
      this.playersGroup,
      this.effectsGroup
    );
    this.scene.add(this.rootGroup);

    // 6. 手番プレイヤー頭上マーカー＆タイルホバーリング作成
    this.activeTurnIndicator = this.createTurnIndicatorMesh();
    this.activeTurnIndicator.visible = false;
    this.effectsGroup.add(this.activeTurnIndicator);

    this.hoverHighlightRing = this.createHoverRingMesh();
    this.hoverHighlightRing.visible = false;
    this.effectsGroup.add(this.hoverHighlightRing);

    // 7. 物理ワールド（3Dダイス用）初期化
    this.physicsWorld = new PhysicsWorld((impactSpeed) => {
      if (this.diceMesh) {
        this.soundManager.playPositionalSound(this.diceMesh, 'dice_hit');
      }
      if (impactSpeed > 6) {
        this.triggerCameraShake(Math.min(0.22, impactSpeed * 0.015), 0.14);
      }
    });

    // 8. マウス・タッチ・ホイール操作イベント登録
    this.setupInteractionEvents();
    this.updateCameraTransform(0.016, true);
  }

  /**
   * 非同期アセットマニフェストのロードと初期箱庭ジオラマ構築
   */
  public async initAssets(): Promise<void> {
    this.manifest = await loadAssetManifest();

    // 中央都市ジオラマの配置
    this.environmentGroup.clear();
    const cityDiorama = this.manifest.createCityCenterDiorama(this.manifest.grassTexture);
    this.environmentGroup.add(cityDiorama);

    // ボード外周の爽やかな海・芝生アイランド基礎と浮かぶ雲の装飾
    this.buildSurroundingIslandAndClouds();

    // 3D物理ダイスメッシュ生成
    this.diceMesh = this.manifest.createDiceMesh(1.25);
    this.diceMesh.visible = false;
    this.effectsGroup.add(this.diceMesh);

    // タイトル・ロビー背景でも美しい街並みが見えるよう初期デモボードを配置
    const previewTiles = MapGeneratorPreviewFallback();
    this.buildBoard(previewTiles);
  }

  public setTileInteractionCallbacks(
    onClick: (tileId: number) => void,
    onHover?: (tileId: number | null, screenPos?: { x: number; y: number }) => void
  ): void {
    this.onTileClickCallback = onClick;
    this.onTileHoverCallback = onHover ?? null;
  }

  public getCameraMode(): CameraMode {
    return this.cameraMode;
  }

  public setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
    if (mode === 'overview') {
      this.desiredCameraTarget.set(0, 0.4, 0);
      this.orbitDistance = 36;
      this.orbitPitch = 0.72;
    } else {
      this.orbitDistance = 20;
      this.orbitPitch = 0.62;
    }
  }

  public toggleCameraMode(): CameraMode {
    const next: CameraMode = this.cameraMode === 'overview' ? 'follow' : 'overview';
    this.setCameraMode(next);
    return next;
  }

  public focusOnTile(tileId: number): void {
    const tileGroup = this.tileMeshes.get(tileId);
    if (!tileGroup) return;
    this.desiredCameraTarget.set(tileGroup.position.x, tileGroup.position.y + 0.5, tileGroup.position.z);
  }

  /**
   * 3Dボード（全38マス＋分岐高架ブリッジ＋外周ロード）の構築
   */
  public buildBoard(tiles: BoardTile[]): void {
    if (!this.manifest) return;

    this.tilesGroup.clear();
    this.bridgesGroup.clear();
    this.buildingsGroup.clear();
    this.tileMeshes.clear();
    this.buildingMeshes.clear();

    // ボード全体のグリーンアイランド土台フレーム（外周マスの下敷き）
    const outerIsland = new THREE.Mesh(
      new THREE.BoxGeometry(33.2, 0.5, 33.2),
      new THREE.MeshStandardMaterial({
        map: this.manifest.grassTexture,
        color: 0x86efac,
        roughness: 0.65,
      })
    );
    outerIsland.position.y = -0.26;
    outerIsland.receiveShadow = true;
    this.bridgesGroup.add(outerIsland);

    const outerRim = new THREE.Mesh(
      new THREE.BoxGeometry(34.2, 0.45, 34.2),
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.35,
      })
    );
    outerRim.position.y = -0.35;
    outerRim.receiveShadow = true;
    this.bridgesGroup.add(outerRim);

    // 各マスの立体タイル生成
    for (const tile of tiles) {
      let subText = '';
      if (tile.type === 'property' && tile.basePrice) {
        subText = `${tile.basePrice}万円`;
      } else if (tile.type === 'start') {
        subText = '給料日!';
      } else if (tile.type === 'bonus') {
        subText = '+300万円';
      } else if (tile.type === 'tax') {
        subText = '資産税10%';
      } else if (tile.type === 'branch') {
        subText = 'ルート選択';
      }

      const meshType =
        tile.type === 'property' && tile.propertyType ? tile.propertyType : tile.type;

      const tileMesh = this.manifest.createTileMesh({
        type: meshType,
        name: tile.name,
        groupColor: tile.groupColor,
        subText,
        isBranch: tile.type === 'branch' || tile.isBranchSubTile,
      });

      tileMesh.position.set(tile.position.x, tile.position.y, tile.position.z);
      tileMesh.traverse((child) => {
        child.userData.tileId = tile.id;
      });

      // 分岐サブルート（高架マス）には橋脚ピラーを追加
      if (tile.isBranchSubTile && tile.position.y > 0.1) {
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.32, 0.42, tile.position.y + 0.3, 12),
          new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 })
        );
        pillar.position.y = -(tile.position.y / 2);
        pillar.castShadow = true;
        pillar.receiveShadow = true;
        tileMesh.add(pillar);
      }

      this.tilesGroup.add(tileMesh);
      this.tileMeshes.set(tile.id, tileMesh);
    }

    // マス間の接続ライン・分岐ブリッジを描画
    this.buildRouteConnections(tiles);
  }

  /**
   * 隣接マスおよび分岐ルートを繋ぐ立体歩道・発光ガイドラインを構築
   */
  private buildRouteConnections(tiles: BoardTile[]): void {
    const tileMap = new Map<number, BoardTile>();
    for (const t of tiles) tileMap.set(t.id, t);

    for (const tile of tiles) {
      const fromVec = new THREE.Vector3(
        tile.position.x,
        tile.position.y + 0.12,
        tile.position.z
      );

      tile.nextTileIds.forEach((nextId, idx) => {
        const nextTile = tileMap.get(nextId);
        if (!nextTile) return;

        const toVec = new THREE.Vector3(
          nextTile.position.x,
          nextTile.position.y + 0.12,
          nextTile.position.z
        );

        const isBranchPath =
          tile.isBranchSubTile || nextTile.isBranchSubTile || idx > 0;

        const diff = new THREE.Vector3().subVectors(toVec, fromVec);
        const dist = diff.length();
        const mid = new THREE.Vector3().addVectors(fromVec, toVec).multiplyScalar(0.5);

        const bridgeMat = new THREE.MeshStandardMaterial({
          color: isBranchPath ? 0x38bdf8 : 0xcbd5e1,
          emissive: isBranchPath ? new THREE.Color(0x0284c7) : new THREE.Color(0x000000),
          emissiveIntensity: isBranchPath ? 0.35 : 0,
          roughness: 0.3,
        });

        const connector = new THREE.Mesh(
          new THREE.BoxGeometry(isBranchPath ? 0.65 : 0.85, 0.08, Math.max(0.2, dist - 1.6)),
          bridgeMat
        );
        connector.position.copy(mid);
        connector.lookAt(toVec);
        connector.receiveShadow = true;
        this.bridgesGroup.add(connector);
      });
    }
  }

  /**
   * ゲームエンジン状態と3Dシーン（プレイヤーコマ・所有物件ビル・手番マーカー）の完全同期
   */
  public syncWithEngine(engine: GameEngine): void {
    if (!this.manifest) return;

    this.syncPlayers(engine.players, engine.getCurrentPlayer()?.id);
    this.syncBuildings(engine.tiles, engine.players);

    // 追従カメラモード時は現在の手番プレイヤーを注視
    const current = engine.getCurrentPlayer();
    if (current && this.cameraMode === 'follow' && !this.physicsWorld.isRolling() && !this.hopAnimation) {
      const playerMesh = this.playerMeshes.get(current.id);
      if (playerMesh) {
        this.desiredCameraTarget.set(
          playerMesh.position.x,
          playerMesh.position.y + 0.8,
          playerMesh.position.z
        );
      }
    }
  }

  /**
   * 全プレイヤーの3Dキャラクターコマ配置（同一マス複数人停止時の自然な円形オフセット対応）
   */
  public syncPlayers(players: PlayerState[], activePlayerId?: string): void {
    if (!this.manifest) return;

    const activeIds = new Set(players.filter((p) => !p.isBankrupt).map((p) => p.id));

    // 破産または削除されたプレイヤーのコマを非表示・削除
    for (const [pid, mesh] of this.playerMeshes.entries()) {
      if (!activeIds.has(pid)) {
        this.playersGroup.remove(mesh);
        this.playerMeshes.delete(pid);
      }
    }

    // 同一マスにいるプレイヤーのグループ分け
    const occupantsByTile = new Map<number, PlayerState[]>();
    for (const p of players) {
      if (p.isBankrupt) continue;
      const list = occupantsByTile.get(p.currentTileId) ?? [];
      list.push(p);
      occupantsByTile.set(p.currentTileId, list);
    }

    for (const p of players) {
      if (p.isBankrupt) continue;

      const colorHex = THEME_COLORS[p.colorId]?.hex ?? '#3b82f6';
      let mesh = this.playerMeshes.get(p.id);
      const meshKey = `${p.characterId}_${colorHex}`;

      if (!mesh || mesh.userData.meshKey !== meshKey) {
        if (mesh) {
          this.playersGroup.remove(mesh);
        }
        mesh = this.manifest.createPlayerMesh(p.characterId, colorHex);
        mesh.userData.meshKey = meshKey;
        this.playersGroup.add(mesh);
        this.playerMeshes.set(p.id, mesh);
      }

      // 現在ホップ移動アニメーション中のプレイヤーはアニメーション側に座標制御を委ねる
      if (this.hopAnimation && this.hopAnimation.playerId === p.id) {
        continue;
      }

      const targetPos = this.computePlayerSlotPosition(
        p.currentTileId,
        occupantsByTile.get(p.currentTileId) ?? [p],
        p.id
      );
      mesh.position.copy(targetPos);

      // 手番プレイヤーの頭上に光るクリスタルインジケーターを表示
      if (p.id === activePlayerId) {
        this.activeTurnIndicator.visible = true;
        this.activeTurnIndicator.position.set(
          mesh.position.x,
          mesh.position.y + 2.05,
          mesh.position.z
        );
      }
    }
  }

  private computePlayerSlotPosition(
    tileId: number,
    occupants: PlayerState[],
    playerId: string
  ): THREE.Vector3 {
    const tileMesh = this.tileMeshes.get(tileId);
    const basePos = tileMesh
      ? new THREE.Vector3(tileMesh.position.x, tileMesh.position.y + 0.38, tileMesh.position.z)
      : new THREE.Vector3(-14, 0.38, 14);

    if (occupants.length <= 1) {
      return basePos;
    }

    const idx = Math.max(
      0,
      occupants.findIndex((o) => o.id === playerId)
    );
    const angle = (idx / occupants.length) * Math.PI * 2 + 0.4;
    const radius = 0.52;
    return new THREE.Vector3(
      basePos.x + Math.cos(angle) * radius,
      basePos.y,
      basePos.z + Math.sin(angle) * radius
    );
  }

  /**
   * プレイヤーコマが1マスずつ放物線を描いてジャンプ移動するホップアニメーション
   */
  public animatePlayerStep(step: GameMoveStepEvent, onComplete: () => void): void {
    const mesh = this.playerMeshes.get(step.playerId);
    const toTile = this.tileMeshes.get(step.toTileId);

    if (!mesh || !toTile) {
      onComplete();
      return;
    }

    const startPos = mesh.position.clone();
    const endPos = new THREE.Vector3(
      toTile.position.x,
      toTile.position.y + 0.38,
      toTile.position.z
    );

    // 進行方向へキャラクターの向きを回転
    const dir = new THREE.Vector3().subVectors(endPos, startPos);
    dir.y = 0;
    if (dir.lengthSq() > 0.001) {
      const targetAngle = Math.atan2(dir.x, dir.z);
      mesh.rotation.y = targetAngle;
    }

    this.soundManager.playPositionalSound(mesh, 'step');

    this.hopAnimation = {
      playerId: step.playerId,
      mesh,
      startPos,
      endPos,
      elapsed: 0,
      duration: 0.24,
      onComplete: () => {
        if (step.passedStart) {
          this.soundManager.playGlobalSound('salary');
          this.spawnPopupEffect(0, 'START通過! 給料日', '#22c55e', 'coin');
        }
        onComplete();
      },
    };
  }

  /**
   * 物件購入・強化（Lv1〜Lv3）に応じた3Dビルの動的生成・バウンス建設演出・売却撤去
   */
  public syncBuildings(tiles: BoardTile[], players: PlayerState[]): void {
    if (!this.manifest) return;

    const playerColorMap = new Map<string, string>();
    for (const p of players) {
      playerColorMap.set(p.id, THEME_COLORS[p.colorId]?.hex ?? '#3b82f6');
    }

    for (const tile of tiles) {
      if (tile.type !== 'property') continue;

      const existing = this.buildingMeshes.get(tile.id);

      // 未所有になった場合は建物を撤去
      if (!tile.ownerId) {
        if (existing) {
          this.buildingsGroup.remove(existing.mesh);
          this.buildingMeshes.delete(tile.id);
        }
        continue;
      }

      const ownerColorHex = playerColorMap.get(tile.ownerId) ?? '#3b82f6';
      const level = (tile.level ?? 1) as BuildingLevel;
      const propType = (tile.propertyType ?? 'residential') as PropertyBuildingType;
      const stateKey = `${tile.ownerId}_${propType}_${level}_${ownerColorHex}`;

      if (existing && existing.key === stateKey) {
        continue;
      }

      if (existing) {
        this.buildingsGroup.remove(existing.mesh);
      }

      const buildingMesh = this.manifest.createBuildingMesh(propType, level, ownerColorHex);
      const offsetPos = this.computeBuildingPositionForTile(tile);
      buildingMesh.position.copy(offsetPos);

      // ボード中心または道路側を向くように回転
      buildingMesh.lookAt(0, offsetPos.y, 0);

      // スケールバウンス建設アニメーション登録
      buildingMesh.scale.set(0.01, 0.01, 0.01);
      this.buildingsGroup.add(buildingMesh);
      this.buildingMeshes.set(tile.id, { key: stateKey, mesh: buildingMesh });
      this.buildingAnims.push({
        mesh: buildingMesh,
        elapsed: 0,
        duration: 0.48,
      });

      this.soundManager.playPositionalSound(
        buildingMesh,
        level > 1 ? 'upgrade' : 'build'
      );
    }
  }

  /**
   * マスの外周脇に3Dビルを配置する座標を計算（コマの停止位置と重ならない美しい配置）
   */
  private computeBuildingPositionForTile(tile: BoardTile): THREE.Vector3 {
    const pos = new THREE.Vector3(tile.position.x, tile.position.y + 0.1, tile.position.z);
    if (tile.isBranchSubTile) {
      pos.x += tile.position.x >= 0 ? -1.45 : 1.45;
      pos.z += tile.position.z >= 0 ? -1.45 : 1.45;
      return pos;
    }

    // メイン外周ループ（半径14）の場合は外側リムの上にビルを並べる
    const outward = new THREE.Vector3(tile.position.x, 0, tile.position.z);
    if (Math.abs(outward.x) >= Math.abs(outward.z)) {
      pos.x += Math.sign(outward.x) * 1.95;
    } else {
      pos.z += Math.sign(outward.z) * 1.95;
    }
    return pos;
  }

  /**
   * 3D物理サイコロのロール演出（Cannon-es PhysicsWorld 連動）
   */
  public rollDice3D(targetValue: number, onComplete: () => void): void {
    if (!this.diceMesh) {
      onComplete();
      return;
    }

    this.diceMesh.visible = true;
    this.soundManager.playPositionalSound(this.diceMesh, 'dice_roll');

    if (this.cameraMode === 'follow') {
      this.desiredCameraTarget.set(0, 1.5, 0);
    }

    this.physicsWorld.rollPhysicalDice(targetValue, (finalVal) => {
      if (this.diceMesh) {
        this.physicsWorld.syncMesh(this.diceMesh);
        this.spawnCelebrationBurst(this.diceMesh.position, '#38bdf8', 28);
      }
      this.triggerCameraShake(0.16, 0.2);

      // 出目が確定したあと0.45秒間プレイヤーに見せてから次へ進む
      window.setTimeout(() => {
        if (this.diceMesh) {
          this.diceMesh.visible = false;
        }
        onComplete();
      }, 450);

      void finalVal;
    });
  }

  /**
   * 3D Juice演出：紙吹雪・祝福パーティクル＆3Dフローティングテキストポップアップ放出
   */
  public spawnPopupEffect(
    tileId: number,
    text: string,
    colorHex: string,
    effectType: 'coin' | 'build' | 'celebrate' | 'alert' | 'auction'
  ): void {
    const tileMesh = this.tileMeshes.get(tileId);
    const origin = tileMesh
      ? new THREE.Vector3(tileMesh.position.x, tileMesh.position.y + 1.6, tileMesh.position.z)
      : new THREE.Vector3(0, 2.0, 0);

    // パーティクル放出
    const particleCount = effectType === 'celebrate' || effectType === 'build' ? 55 : 35;
    this.spawnCelebrationBurst(origin, colorHex, particleCount);

    if (effectType === 'alert') {
      this.triggerCameraShake(0.28, 0.32);
    } else if (effectType === 'build' || effectType === 'celebrate') {
      this.triggerCameraShake(0.14, 0.22);
    }

    // 3D空間上に浮かび上がるCanvasスプライトポップアップ
    const sprite = this.createFloatingTextSprite(text, colorHex);
    sprite.position.copy(origin).add(new THREE.Vector3(0, 0.8, 0));
    this.effectsGroup.add(sprite);
    this.floatingPopups.push({
      sprite,
      elapsed: 0,
      duration: 1.55,
    });
  }

  private spawnCelebrationBurst(
    origin: THREE.Vector3,
    mainColorHex: string,
    count = 45
  ): void {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    const palette = [
      new THREE.Color(mainColorHex),
      new THREE.Color('#facc15'),
      new THREE.Color('#38bdf8'),
      new THREE.Color('#f472b6'),
      new THREE.Color('#4ade80'),
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = origin.x + (Math.random() - 0.5) * 0.6;
      positions[i * 3 + 1] = origin.y + Math.random() * 0.4;
      positions[i * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.6;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.2 + Math.random() * 4.5;
      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = 4.5 + Math.random() * 5.5;
      velocities[i * 3 + 2] = Math.sin(angle) * speed;

      const c = palette[i % palette.length];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.34,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    this.effectsGroup.add(points);

    this.particleBursts.push({
      points,
      velocities,
      elapsed: 0,
      duration: 1.25,
    });
  }

  private createFloatingTextSprite(text: string, badgeColorHex: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = badgeColorHex;
      ctx.beginPath();
      ctx.roundRect(24, 18, 464, 92, 46);
      ctx.fill();

      ctx.lineWidth = 6;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 44px "M PLUS Rounded 1c", "Noto Sans JP", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 256, 66);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(4.2, 1.05, 1);
    return sprite;
  }

  public triggerCameraShake(intensity = 0.2, duration = 0.25): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  /**
   * 毎フレーム更新＆3Dレンダリングループ
   */
  public update(dt: number): void {
    const safeDt = Math.min(dt, 0.1);
    this.elapsedClock += safeDt;

    // 1. 物理ダイスの更新とメッシュ同期
    this.physicsWorld.step(safeDt);
    if (this.diceMesh && this.physicsWorld.isRolling()) {
      this.physicsWorld.syncMesh(this.diceMesh);
    }

    // 2. プレイヤーコマの1マスホップ移動補間
    if (this.hopAnimation) {
      const anim = this.hopAnimation;
      anim.elapsed += safeDt;
      const t = Math.min(1, anim.elapsed / anim.duration);
      const smoothT = t * t * (3 - 2 * t);

      anim.mesh.position.lerpVectors(anim.startPos, anim.endPos, smoothT);
      // 放物線ジャンプ高さ
      const jumpArc = Math.sin(t * Math.PI) * 1.35;
      anim.mesh.position.y += jumpArc;

      this.activeTurnIndicator.position.set(
        anim.mesh.position.x,
        anim.mesh.position.y + 2.05,
        anim.mesh.position.z
      );

      if (this.cameraMode === 'follow') {
        this.desiredCameraTarget.set(
          anim.mesh.position.x,
          anim.mesh.position.y + 0.6,
          anim.mesh.position.z
        );
      }

      if (t >= 1) {
        anim.mesh.position.copy(anim.endPos);
        const doneCb = anim.onComplete;
        this.hopAnimation = null;
        doneCb();
      }
    }

    // 3. 建物建設時のバウンススケール演出
    for (let i = this.buildingAnims.length - 1; i >= 0; i--) {
      const bAnim = this.buildingAnims[i];
      bAnim.elapsed += safeDt;
      const p = Math.min(1, bAnim.elapsed / bAnim.duration);
      // Elastic overshoot bounce
      const scale =
        p === 1
          ? 1
          : 1 - Math.pow(2, -10 * p) * Math.cos((p * 10 - 0.75) * ((2 * Math.PI) / 3));
      bAnim.mesh.scale.setScalar(Math.max(0.01, scale));
      if (p >= 1) {
        this.buildingAnims.splice(i, 1);
      }
    }

    // 4. 3Dパーティクル更新
    for (let i = this.particleBursts.length - 1; i >= 0; i--) {
      const burst = this.particleBursts[i];
      burst.elapsed += safeDt;
      const progress = burst.elapsed / burst.duration;
      if (progress >= 1) {
        this.effectsGroup.remove(burst.points);
        burst.points.geometry.dispose();
        (burst.points.material as THREE.Material).dispose();
        this.particleBursts.splice(i, 1);
        continue;
      }

      const posAttr = burst.points.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const count = arr.length / 3;
      for (let k = 0; k < count; k++) {
        burst.velocities[k * 3 + 1] -= 13.5 * safeDt; // 重力
        arr[k * 3] += burst.velocities[k * 3] * safeDt;
        arr[k * 3 + 1] += burst.velocities[k * 3 + 1] * safeDt;
        arr[k * 3 + 2] += burst.velocities[k * 3 + 2] * safeDt;
      }
      posAttr.needsUpdate = true;
      (burst.points.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - progress);
    }

    // 5. 3Dフローティングテキスト更新
    for (let i = this.floatingPopups.length - 1; i >= 0; i--) {
      const pop = this.floatingPopups[i];
      pop.elapsed += safeDt;
      const progress = pop.elapsed / pop.duration;
      if (progress >= 1) {
        this.effectsGroup.remove(pop.sprite);
        pop.sprite.material.map?.dispose();
        pop.sprite.material.dispose();
        this.floatingPopups.splice(i, 1);
        continue;
      }
      pop.sprite.position.y += safeDt * 1.4;
      pop.sprite.material.opacity = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;
    }

    // 6. 手番インジケーター＆雲のふわふわアニメーション
    if (this.activeTurnIndicator.visible) {
      this.activeTurnIndicator.rotation.y += safeDt * 2.4;
      this.activeTurnIndicator.position.y += Math.sin(this.elapsedClock * 5) * 0.004;
    }
    this.clouds.forEach((cloud, idx) => {
      cloud.position.x += Math.sin(this.elapsedClock * 0.25 + idx) * 0.008;
      cloud.position.y += Math.cos(this.elapsedClock * 0.6 + idx) * 0.003;
    });

    // 7. カメラ更新＆描画
    this.updateCameraTransform(safeDt, false);
    this.renderer.render(this.scene, this.camera);
  }

  private updateCameraTransform(dt: number, instant = false): void {
    if (instant) {
      this.cameraTarget.copy(this.desiredCameraTarget);
    } else {
      this.cameraTarget.lerp(this.desiredCameraTarget, Math.min(1, dt * 6.5));
    }

    const horizontalRadius = this.orbitDistance * Math.cos(this.orbitPitch);
    const height = this.orbitDistance * Math.sin(this.orbitPitch);

    const camX = this.cameraTarget.x + Math.sin(this.orbitYaw) * horizontalRadius;
    const camY = this.cameraTarget.y + height;
    const camZ = this.cameraTarget.z + Math.cos(this.orbitYaw) * horizontalRadius;

    this.camera.position.set(camX, camY, camZ);

    // カメラシェイク減衰
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      const offset = this.shakeIntensity * (this.shakeTimer / 0.3);
      this.camera.position.x += (Math.random() - 0.5) * offset;
      this.camera.position.y += (Math.random() - 0.5) * offset;
      this.camera.position.z += (Math.random() - 0.5) * offset;
      if (this.shakeTimer <= 0) {
        this.shakeIntensity = 0;
      }
    }

    this.camera.lookAt(this.cameraTarget);
  }

  public handleResize(): void {
    const w = window.innerWidth;
    const h = Math.max(1, window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // ==========================================
  // 背景・ライト・補助ジオメトリ構築ヘルパー
  // ==========================================
  private createSkyGradientTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#9bd4ff');
      grad.addColorStop(0.45, '#cfeaff');
      grad.addColorStop(0.85, '#eff8ff');
      grad.addColorStop(1, '#ffffff');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 512);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private setupLights(): void {
    const hemiLight = new THREE.HemisphereLight(0xe0f4ff, 0x86efac, 0.92);
    hemiLight.position.set(0, 35, 0);
    this.scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.38);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.65);
    sunLight.position.set(22, 36, 24);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 95;
    const d = 24;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xbae6fd, 0.45);
    fillLight.position.set(-20, 18, -18);
    this.scene.add(fillLight);
  }

  private buildSurroundingIslandAndClouds(): void {
    // 爽やかなベイエリアの水面ディスク
    const seaGeo = new THREE.CylinderGeometry(75, 75, 0.4, 48);
    const seaMat = new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      roughness: 0.2,
      metalness: 0.08,
    });
    const seaMesh = new THREE.Mesh(seaGeo, seaMat);
    seaMesh.position.y = -0.8;
    seaMesh.receiveShadow = true;
    this.environmentGroup.add(seaMesh);

    // 浮かぶ白いローポリ雲
    this.clouds = [];
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.0,
    });
    const cloudCoords: Array<[number, number, number, number]> = [
      [-24, 10, -22, 1.3],
      [25, 11, -20, 1.4],
      [-26, 9, 18, 1.1],
      [24, 10, 22, 1.2],
      [0, 13, -28, 1.5],
    ];
    for (const [cx, cy, cz, scale] of cloudCoords) {
      const cg = new THREE.Group();
      const s1 = new THREE.Mesh(new THREE.SphereGeometry(1.4, 12, 12), cloudMat);
      const s2 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 12), cloudMat);
      s2.position.set(1.1, -0.2, 0.2);
      const s3 = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 12), cloudMat);
      s3.position.set(-1.1, -0.15, -0.1);
      cg.add(s1, s2, s3);
      cg.position.set(cx, cy, cz);
      cg.scale.setScalar(scale);
      this.environmentGroup.add(cg);
      this.clouds.push(cg);
    }
  }

  private createTurnIndicatorMesh(): THREE.Group {
    const group = new THREE.Group();
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.7,
        roughness: 0.2,
        metalness: 0.4,
      })
    );
    crystal.scale.set(1, 1.45, 1);
    group.add(crystal);
    return group;
  }

  private createHoverRingMesh(): THREE.Mesh {
    const geo = new THREE.RingGeometry(1.12, 1.32, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    return new THREE.Mesh(geo, mat);
  }

  private setupInteractionEvents(): void {
    this.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      this.isDraggingCamera = true;
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
      this.lastPointerPos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('pointermove', (e: PointerEvent) => {
      if (this.isDraggingCamera) {
        const dx = e.clientX - this.lastPointerPos.x;
        const dy = e.clientY - this.lastPointerPos.y;
        this.lastPointerPos = { x: e.clientX, y: e.clientY };

        this.orbitYaw -= dx * 0.0065;
        this.orbitPitch = Math.max(0.32, Math.min(1.28, this.orbitPitch + dy * 0.005));
        return;
      }

      // マス目のホバー判定
      this.updateRaycaster(e.clientX, e.clientY);
      const hitTileId = this.pickTileId();
      if (hitTileId !== this.hoveredTileId) {
        this.hoveredTileId = hitTileId;
        if (hitTileId !== null) {
          const tileMesh = this.tileMeshes.get(hitTileId);
          if (tileMesh) {
            this.hoverHighlightRing.visible = true;
            this.hoverHighlightRing.position.set(
              tileMesh.position.x,
              tileMesh.position.y + 0.42,
              tileMesh.position.z
            );
          }
          this.canvas.style.cursor = 'pointer';
        } else {
          this.hoverHighlightRing.visible = false;
          this.canvas.style.cursor = 'grab';
        }
        this.onTileHoverCallback?.(hitTileId, { x: e.clientX, y: e.clientY });
      }
    });

    window.addEventListener('pointerup', (e: PointerEvent) => {
      if (!this.isDraggingCamera) return;
      this.isDraggingCamera = false;

      const moveDist = Math.hypot(
        e.clientX - this.pointerDownPos.x,
        e.clientY - this.pointerDownPos.y
      );
      if (moveDist < 6) {
        this.updateRaycaster(e.clientX, e.clientY);
        const clickedTileId = this.pickTileId();
        if (clickedTileId !== null) {
          this.onTileClickCallback?.(clickedTileId);
        }
      }
    });

    this.canvas.addEventListener(
      'wheel',
      (e: WheelEvent) => {
        e.preventDefault();
        this.orbitDistance = Math.max(14, Math.min(54, this.orbitDistance + e.deltaY * 0.02));
      },
      { passive: false }
    );
  }

  private updateRaycaster(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.pointerNdc.x = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
  }

  private pickTileId(): number | null {
    const intersects = this.raycaster.intersectObjects(this.tilesGroup.children, true);
    for (const hit of intersects) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (typeof obj.userData?.tileId === 'number') {
          return obj.userData.tileId;
        }
        obj = obj.parent;
      }
    }
    return null;
  }
}

/**
 * 初期タイトル画面背景用のプレビューボード生成ヘルパー
 */
import { MapGenerator } from '../systems/MapGenerator';
function MapGeneratorPreviewFallback(): BoardTile[] {
  return MapGenerator.generateBoard(12345);
}
