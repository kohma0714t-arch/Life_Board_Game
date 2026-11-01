import * as CANNON from 'cannon-es';
import * as THREE from 'three';

export interface DiceTransform {
  position: { x: number; y: number; z: number };
  quaternion: { x: number; y: number; z: number; w: number };
}

/**
 * サイコロの各出目（1〜6）が上面（+Y方向）を向くための目標オイラー角
 * BoxGeometry の面順序（+X:1, -X:2, +Y:3, -Y:4, +Z:5, -Z:6）に完全対応
 */
export function getTargetQuaternionForDiceValue(
  value: number,
  yawAngle = 0
): THREE.Quaternion {
  const euler = new THREE.Euler(0, yawAngle, 0, 'YXZ');
  switch (value) {
    case 1:
      // +X (index 0) を上面(+Y)にする -> Z軸周りに +90度回転
      euler.set(0, yawAngle, Math.PI / 2, 'YXZ');
      break;
    case 2:
      // -X (index 1) を上面(+Y)にする -> Z軸周りに -90度回転
      euler.set(0, yawAngle, -Math.PI / 2, 'YXZ');
      break;
    case 3:
      // +Y (index 2) がそのまま上面(+Y)
      euler.set(0, yawAngle, 0, 'YXZ');
      break;
    case 4:
      // -Y (index 3) を上面(+Y)にする -> X軸周りに 180度回転
      euler.set(Math.PI, yawAngle, 0, 'YXZ');
      break;
    case 5:
      // +Z (index 4) を上面(+Y)にする -> X軸周りに -90度回転
      euler.set(-Math.PI / 2, yawAngle, 0, 'YXZ');
      break;
    case 6:
    default:
      // -Z (index 5) を上面(+Y)にする -> X軸周りに +90度回転
      euler.set(Math.PI / 2, yawAngle, 0, 'YXZ');
      break;
  }
  return new THREE.Quaternion().setFromEuler(euler);
}

export class PhysicsWorld {
  private world: CANNON.World;
  private diceBody: CANNON.Body;
  private trayBodies: CANNON.Body[] = [];

  private rolling = false;
  private rollElapsed = 0;
  private rollDuration = 1.45; // 物理バウンド＋確定着地までの秒数
  private targetDiceValue = 1;
  private targetQuat = new THREE.Quaternion();
  private currentThreeQuat = new THREE.Quaternion();

  private onRollCompleteCallback: ((val: number) => void) | null = null;
  private onBounceCallback: ((impactSpeed: number) => void) | null = null;
  private lastBounceTime = 0;

  // トレイの中心座標（3Dボード中央広場の上）
  private readonly trayCenter = new CANNON.Vec3(0, 0.5, 0);
  private readonly trayHalfSize = 4.5;
  private readonly diceHalfExtent = 0.65;

  constructor(onBounce?: (impactSpeed: number) => void) {
    this.onBounceCallback = onBounce ?? null;

    this.world = new CANNON.World({
      gravity: new CANNON.Vec3(0, -28, 0),
    });
    this.world.allowSleep = false;

    const floorMat = new CANNON.Material('trayFloor');
    const diceMat = new CANNON.Material('diceMaterial');

    const contactMat = new CANNON.ContactMaterial(floorMat, diceMat, {
      friction: 0.35,
      restitution: 0.58,
    });
    this.world.addContactMaterial(contactMat);

    // 1. 見えないトレイ床の構築
    const floorBody = new CANNON.Body({
      mass: 0,
      material: floorMat,
      shape: new CANNON.Box(new CANNON.Vec3(this.trayHalfSize, 0.25, this.trayHalfSize)),
      position: new CANNON.Vec3(
        this.trayCenter.x,
        this.trayCenter.y - 0.25,
        this.trayCenter.z
      ),
    });
    this.world.addBody(floorBody);
    this.trayBodies.push(floorBody);

    // 2. 四方の見えないトレイ壁を構築（ダイスがボード外へ飛び出さないようにする）
    const wallHeight = 6.0;
    const wallThickness = 0.4;
    const wallConfigs: Array<{ pos: CANNON.Vec3; size: CANNON.Vec3 }> = [
      {
        pos: new CANNON.Vec3(0, this.trayCenter.y + wallHeight / 2, this.trayHalfSize),
        size: new CANNON.Vec3(this.trayHalfSize, wallHeight / 2, wallThickness),
      },
      {
        pos: new CANNON.Vec3(0, this.trayCenter.y + wallHeight / 2, -this.trayHalfSize),
        size: new CANNON.Vec3(this.trayHalfSize, wallHeight / 2, wallThickness),
      },
      {
        pos: new CANNON.Vec3(this.trayHalfSize, this.trayCenter.y + wallHeight / 2, 0),
        size: new CANNON.Vec3(wallThickness, wallHeight / 2, this.trayHalfSize),
      },
      {
        pos: new CANNON.Vec3(-this.trayHalfSize, this.trayCenter.y + wallHeight / 2, 0),
        size: new CANNON.Vec3(wallThickness, wallHeight / 2, this.trayHalfSize),
      },
    ];

    for (const cfg of wallConfigs) {
      const wall = new CANNON.Body({
        mass: 0,
        material: floorMat,
        shape: new CANNON.Box(cfg.size),
        position: cfg.pos,
      });
      this.world.addBody(wall);
      this.trayBodies.push(wall);
    }

    // 3. 3Dダイス剛体の構築
    this.diceBody = new CANNON.Body({
      mass: 1.2,
      material: diceMat,
      shape: new CANNON.Box(
        new CANNON.Vec3(this.diceHalfExtent, this.diceHalfExtent, this.diceHalfExtent)
      ),
      position: new CANNON.Vec3(0, this.trayCenter.y + this.diceHalfExtent, 0),
      linearDamping: 0.15,
      angularDamping: 0.15,
    });

    this.diceBody.addEventListener('collide', (event: { contact: CANNON.ContactEquation }) => {
      if (!this.rolling || !this.onBounceCallback) return;
      const now = performance.now();
      if (now - this.lastBounceTime < 75) return;
      const impact = Math.abs(event.contact.getImpactVelocityAlongNormal());
      if (impact > 1.8) {
        this.lastBounceTime = now;
        this.onBounceCallback(impact);
      }
    });

    this.world.addBody(this.diceBody);
  }

  public setOnBounceCallback(cb: (impactSpeed: number) => void): void {
    this.onBounceCallback = cb;
  }

  /**
   * 3D物理ダイスを指定された決定出目（1〜6）に向かってロールする
   */
  public rollPhysicalDice(
    targetValue: number,
    onComplete: (val: number) => void
  ): void {
    const clampedValue = Math.max(1, Math.min(6, Math.round(targetValue)));
    this.targetDiceValue = clampedValue;
    this.onRollCompleteCallback = onComplete;
    this.rolling = true;
    this.rollElapsed = 0;
    this.lastBounceTime = 0;

    // 投擲開始位置（ボード中央上空から斜めに投げ込む）
    const startX = (Math.random() - 0.5) * 2.2;
    const startZ = 2.0 + Math.random() * 1.2;
    this.diceBody.position.set(startX, this.trayCenter.y + 5.2, startZ);

    // 初速度（中央に向かってバウンド）
    this.diceBody.velocity.set(
      -startX * 2.2 + (Math.random() - 0.5) * 3.0,
      -4.5,
      -startZ * 2.4 + (Math.random() - 0.5) * 2.0
    );

    // 初期のランダム回転と強い角速度
    const initEuler = new THREE.Euler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
    const initQuat = new THREE.Quaternion().setFromEuler(initEuler);
    this.diceBody.quaternion.set(initQuat.x, initQuat.y, initQuat.z, initQuat.w);

    this.diceBody.angularVelocity.set(
      (Math.random() > 0.5 ? 1 : -1) * (12 + Math.random() * 10),
      (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 8),
      (Math.random() > 0.5 ? 1 : -1) * (12 + Math.random() * 10)
    );

    // 着地時の目標クォータニオンを計算
    const targetYaw = (Math.random() - 0.5) * 0.5;
    this.targetQuat.copy(getTargetQuaternionForDiceValue(clampedValue, targetYaw));
    this.currentThreeQuat.set(
      this.diceBody.quaternion.x,
      this.diceBody.quaternion.y,
      this.diceBody.quaternion.z,
      this.diceBody.quaternion.w
    );
  }

  /**
   * 毎フレームの物理ワールド更新（DeltaTime準拠）
   */
  public step(dt: number): void {
    const safeDt = Math.min(dt, 0.1);
    this.world.step(1 / 60, safeDt, 3);

    if (!this.rolling) {
      return;
    }

    this.rollElapsed += safeDt;
    const progress = Math.min(1, this.rollElapsed / this.rollDuration);

    // 現在の物理ボディ姿勢を取得
    this.currentThreeQuat.set(
      this.diceBody.quaternion.x,
      this.diceBody.quaternion.y,
      this.diceBody.quaternion.z,
      this.diceBody.quaternion.w
    );

    // 後半（progress > 0.55）から目標出目姿勢へ滑らかにSlerp補正し、自然に着地させる
    if (progress > 0.55) {
      const blendFactor = Math.min(1, (progress - 0.55) / 0.45);
      const smoothFactor = blendFactor * blendFactor * (3 - 2 * blendFactor);

      // 角速度と水平速度を減衰
      this.diceBody.angularVelocity.scale(1 - smoothFactor * 0.35, this.diceBody.angularVelocity);
      this.diceBody.velocity.x *= 1 - smoothFactor * 0.25;
      this.diceBody.velocity.z *= 1 - smoothFactor * 0.25;

      this.currentThreeQuat.slerp(this.targetQuat, Math.min(1, smoothFactor * 0.45 + 0.1));
      this.diceBody.quaternion.set(
        this.currentThreeQuat.x,
        this.currentThreeQuat.y,
        this.currentThreeQuat.z,
        this.currentThreeQuat.w
      );
    }

    if (progress >= 1) {
      // 完全着地＆目標出目でピタッと確定
      this.rolling = false;
      this.diceBody.velocity.set(0, 0, 0);
      this.diceBody.angularVelocity.set(0, 0, 0);
      this.diceBody.position.y = this.trayCenter.y + this.diceHalfExtent;
      this.diceBody.quaternion.set(
        this.targetQuat.x,
        this.targetQuat.y,
        this.targetQuat.z,
        this.targetQuat.w
      );
      this.currentThreeQuat.copy(this.targetQuat);

      if (this.onRollCompleteCallback) {
        const cb = this.onRollCompleteCallback;
        this.onRollCompleteCallback = null;
        cb(this.targetDiceValue);
      }
    }
  }

  /**
   * Three.js のダイスメッシュに位置と回転クォータニオンを同期する
   */
  public syncMesh(mesh: THREE.Object3D): void {
    mesh.position.set(
      this.diceBody.position.x,
      this.diceBody.position.y,
      this.diceBody.position.z
    );
    mesh.quaternion.set(
      this.diceBody.quaternion.x,
      this.diceBody.quaternion.y,
      this.diceBody.quaternion.z,
      this.diceBody.quaternion.w
    );
  }

  /**
   * 現在のダイスのTransformを取得する
   */
  public getDiceTransform(): DiceTransform {
    return {
      position: {
        x: this.diceBody.position.x,
        y: this.diceBody.position.y,
        z: this.diceBody.position.z,
      },
      quaternion: {
        x: this.diceBody.quaternion.x,
        y: this.diceBody.quaternion.y,
        z: this.diceBody.quaternion.z,
        w: this.diceBody.quaternion.w,
      },
    };
  }

  public isRolling(): boolean {
    return this.rolling;
  }

  public getTargetValue(): number {
    return this.targetDiceValue;
  }

  /**
   * 物理ワールドのボディ破棄とクリーンアップ
   */
  public dispose(): void {
    this.rolling = false;
    this.onRollCompleteCallback = null;
    this.world.removeBody(this.diceBody);
    for (const body of this.trayBodies) {
      this.world.removeBody(body);
    }
    this.trayBodies = [];
  }
}
