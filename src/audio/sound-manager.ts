import * as THREE from 'three';

export type PositionalSoundType =
  | 'dice_roll'
  | 'dice_hit'
  | 'step'
  | 'build'
  | 'upgrade'
  | 'cash'
  | 'fanfare'
  | 'jail'
  | 'bankrupt';

export type GlobalSoundType =
  | 'ui_click'
  | 'ui_cancel'
  | 'turn_start'
  | 'dice_roll'
  | 'step'
  | 'buy'
  | 'upgrade'
  | 'toll_pay'
  | 'salary'
  | 'bonus'
  | 'event_good'
  | 'event_bad'
  | 'marriage'
  | 'promotion'
  | 'jail'
  | 'auction_bid'
  | 'auction_hammer'
  | 'trade_offer'
  | 'trade_success'
  | 'victory'
  | 'countdown';

export class SoundManager {
  private listener: THREE.AudioListener;
  private ctx: AudioContext;
  private masterGain: GainNode;
  private bgmGain: GainNode;
  private sfxGain: GainNode;
  private isMuted: boolean = false;
  private volume: number = 0.7;
  private bgmTimer: number | null = null;
  private bgmStep: number = 0;
  private bgmActive: boolean = false;
  private attachedCamera: THREE.Camera | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  constructor(camera?: THREE.Camera) {
    this.listener = new THREE.AudioListener();
    this.ctx = this.listener.context;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.masterGain.connect(this.listener.getInput());

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.setValueAtTime(0.28, this.ctx.currentTime);
    this.bgmGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.sfxGain.connect(this.masterGain);

    if (camera) {
      this.attachCamera(camera);
    }

    this.createNoiseBuffer();
    this.setupAutoResume();
  }

  public attachCamera(camera: THREE.Camera): void {
    if (this.attachedCamera && this.attachedCamera !== camera) {
      this.attachedCamera.remove(this.listener);
    }
    this.attachedCamera = camera;
    camera.add(this.listener);
  }

  public getListener(): THREE.AudioListener {
    return this.listener;
  }

  private setupAutoResume(): void {
    if (typeof window === 'undefined') return;
    const resumeHandler = () => {
      this.resumeContext();
    };
    window.addEventListener('pointerdown', resumeHandler, { passive: true });
    window.addEventListener('keydown', resumeHandler, { passive: true });
  }

  private createNoiseBuffer(): void {
    try {
      const sampleRate = this.ctx.sampleRate || 44100;
      const length = Math.floor(sampleRate * 0.5);
      const buffer = this.ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    } catch {
      this.noiseBuffer = null;
    }
  }

  public resumeContext(): void {
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {
        // Ignore autoplay restrictions until user interacts
      });
    }
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(this.isMuted ? 0.0001 : Math.max(0.0001, this.volume), now, 0.02);
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (!this.isMuted) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(Math.max(0.0001, this.volume), now, 0.02);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public isBGMPlaying(): boolean {
    return this.bgmActive;
  }

  /**
   * 明るく爽やかなシティポップ・ボードゲーム風プロシージャルBGMループを開始
   */
  public startBGM(): void {
    if (this.bgmActive) return;
    this.resumeContext();
    this.bgmActive = true;
    this.bgmStep = 0;

    // 120 BPM -> 16分音符 = 125ms, 8分音符 = 250ms
    const stepMs = 240;

    // 爽やかな進行: Fmaj7 -> G7 -> Em7 -> Am7 -> Dm7 -> G7 -> Cmaj7 -> C7
    const chordProgression: number[][] = [
      [349.23, 440.0, 523.25, 659.25], // Fmaj7
      [392.0, 493.88, 587.33, 698.46], // G7
      [329.63, 392.0, 493.88, 587.33], // Em7
      [440.0, 523.25, 659.25, 783.99], // Am7
      [293.66, 349.23, 440.0, 523.25], // Dm7
      [392.0, 493.88, 587.33, 698.46], // G7
      [261.63, 329.63, 392.0, 493.88], // Cmaj7
      [261.63, 329.63, 392.0, 466.16], // C7
    ];

    const bassNotes: number[] = [
      174.61, // F3
      196.0,  // G3
      164.81, // E3
      220.0,  // A3
      146.83, // D3
      196.0,  // G3
      130.81, // C3
      130.81, // C3
    ];

    const melodyPattern: (number | null)[] = [
      659.25, null, 783.99, 880.0,
      783.99, null, 587.33, 659.25,
      587.33, null, 659.25, 783.99,
      880.0, 1046.5, 880.0, null,
      698.46, null, 880.0, 783.99,
      659.25, 587.33, 659.25, 783.99,
      659.25, null, 523.25, 587.33,
      659.25, 783.99, 1046.5, null,
    ];

    const tick = () => {
      if (!this.bgmActive) return;
      if (!this.isMuted && this.ctx.state === 'running') {
        const now = this.ctx.currentTime;
        const barIndex = Math.floor(this.bgmStep / 4) % chordProgression.length;
        const beatInBar = this.bgmStep % 4;
        const chord = chordProgression[barIndex];
        const bass = bassNotes[barIndex];

        // 1拍目と3拍目にエレクトリック・ピアノ風の柔らかいコードバッキング
        if (beatInBar === 0 || beatInBar === 2) {
          const chordDur = beatInBar === 0 ? 0.42 : 0.3;
          chord.forEach((freq, idx) => {
            this.scheduleBGMNote(
              freq,
              'triangle',
              now + idx * 0.012,
              chordDur,
              beatInBar === 0 ? 0.08 : 0.055
            );
          });
        }

        // 軽快なウォーキング/バウンスベース
        if (beatInBar === 0) {
          this.scheduleBGMNote(bass, 'sine', now, 0.22, 0.16);
        } else if (beatInBar === 2) {
          this.scheduleBGMNote(bass * 1.5, 'sine', now, 0.18, 0.12);
        } else if (beatInBar === 3) {
          this.scheduleBGMNote(bass * 1.25, 'sine', now, 0.14, 0.1);
        }

        // 爽やかなベル・シンセメロディ
        const melodyFreq = melodyPattern[this.bgmStep % melodyPattern.length];
        if (melodyFreq !== null) {
          this.scheduleBGMNote(melodyFreq, 'sine', now, 0.2, 0.09);
          this.scheduleBGMNote(melodyFreq * 2, 'triangle', now, 0.12, 0.025);
        }

        // 軽いハイハット・シェイカー風リズム
        if (beatInBar === 1 || beatInBar === 3) {
          this.scheduleBGMHiHat(now, 0.035, 0.025);
        }
      }

      this.bgmStep = (this.bgmStep + 1) % 32;
      this.bgmTimer = window.setTimeout(tick, stepMs);
    };

    tick();
  }

  public stopBGM(): void {
    this.bgmActive = false;
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private scheduleBGMNote(
    freq: number,
    type: OscillatorType,
    startTime: number,
    duration: number,
    peakGain: number
  ): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private scheduleBGMHiHat(startTime: number, duration: number, peakGain: number): void {
    if (!this.noiseBuffer) return;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(peakGain, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    source.start(startTime);
    source.stop(startTime + duration + 0.01);
  }

  /**
   * 3D空間上のオブジェクトにアタッチする立体音響SE (THREE.PositionalAudio)
   */
  public playPositionalSound(target: THREE.Object3D, type: PositionalSoundType): void {
    if (this.isMuted) return;
    this.resumeContext();

    const sound = new THREE.PositionalAudio(this.listener);
    const outGain = this.ctx.createGain();
    outGain.gain.setValueAtTime(Math.max(0.001, this.volume), this.ctx.currentTime);

    const durationMs = this.synthesizePositionalEffect(type, outGain);

    sound.setNodeSource(outGain as unknown as AudioNode);
    sound.setRefDistance(8);
    sound.setMaxDistance(90);
    sound.setRolloffFactor(1.2);
    target.add(sound);

    window.setTimeout(() => {
      try {
        target.remove(sound);
        outGain.disconnect();
      } catch {
        // Safe cleanup
      }
    }, durationMs + 100);
  }

  private synthesizePositionalEffect(type: PositionalSoundType, destination: AudioNode): number {
    const now = this.ctx.currentTime;

    switch (type) {
      case 'dice_roll': {
        // カラカラと転がる木製/アクリルダイスの連続打撃音
        const hits = [0, 0.06, 0.13, 0.21, 0.3];
        hits.forEach((offset, idx) => {
          const baseFreq = 520 + idx * 90 + (idx % 2 === 0 ? 40 : -30);
          this.triggerTone(destination, 'triangle', baseFreq, baseFreq * 0.65, now + offset, 0.055, 0.28);
          this.triggerNoiseBurst(destination, now + offset, 0.03, 2400, 0.16);
        });
        return 420;
      }

      case 'dice_hit': {
        // ボード着地時のコツン！という立体バウンド音
        this.triggerTone(destination, 'triangle', 420, 140, now, 0.09, 0.38);
        this.triggerNoiseBurst(destination, now, 0.045, 1800, 0.22);
        return 150;
      }

      case 'step': {
        // コマが1マスホップする可愛いポヨン音
        this.triggerTone(destination, 'sine', 320, 660, now, 0.12, 0.32);
        this.triggerTone(destination, 'triangle', 640, 880, now + 0.03, 0.09, 0.15);
        return 180;
      }

      case 'build': {
        // 物件建設時のトントン＋キラキラ上昇和音
        this.triggerTone(destination, 'square', 220, 140, now, 0.07, 0.22);
        this.triggerTone(destination, 'square', 260, 170, now + 0.08, 0.07, 0.22);
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((f, i) => {
          this.triggerTone(destination, 'triangle', f, f, now + 0.16 + i * 0.06, 0.22, 0.26);
        });
        return 600;
      }

      case 'upgrade': {
        // ビル増築時の華やかなシンセ上昇アルペジオ
        const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.5];
        notes.forEach((f, i) => {
          this.triggerTone(destination, 'sawtooth', f, f * 1.01, now + i * 0.055, 0.24, 0.18, 2800);
        });
        return 650;
      }

      case 'cash': {
        // チャリン！というレジスター・コイン音
        this.triggerTone(destination, 'sine', 1318.5, 1318.5, now, 0.08, 0.32);
        this.triggerTone(destination, 'sine', 1760.0, 1760.0, now + 0.07, 0.28, 0.36);
        this.triggerTone(destination, 'triangle', 3520.0, 3520.0, now + 0.07, 0.18, 0.14);
        return 420;
      }

      case 'fanfare': {
        // 祝福のブラス風ファンファーレ
        const chord = [
          { f: 523.25, t: 0, d: 0.12 },
          { f: 523.25, t: 0.13, d: 0.12 },
          { f: 523.25, t: 0.26, d: 0.12 },
          { f: 659.25, t: 0.4, d: 0.38 },
          { f: 783.99, t: 0.4, d: 0.38 },
          { f: 1046.5, t: 0.4, d: 0.45 },
        ];
        chord.forEach((n) => {
          this.triggerTone(destination, 'sawtooth', n.f, n.f, now + n.t, n.d, 0.2, 2400);
        });
        return 920;
      }

      case 'jail': {
        // 鉄格子が閉まるガシャン！＋低い警告音
        this.triggerNoiseBurst(destination, now, 0.18, 950, 0.35);
        this.triggerTone(destination, 'sawtooth', 196.0, 130.81, now + 0.05, 0.35, 0.28, 900);
        this.triggerTone(destination, 'square', 146.83, 98.0, now + 0.22, 0.4, 0.25, 700);
        return 700;
      }

      case 'bankrupt': {
        // 破産時の下降トロンボーン風サウンド
        const steps = [392.0, 369.99, 349.23, 329.63];
        steps.forEach((f, idx) => {
          const dur = idx === steps.length - 1 ? 0.45 : 0.18;
          const endFreq = idx === steps.length - 1 ? f * 0.78 : f * 0.96;
          this.triggerTone(destination, 'sawtooth', f, endFreq, now + idx * 0.2, dur, 0.24, 1200);
        });
        return 1150;
      }
    }
  }

  /**
   * 2D全般UI効果音・ゲーム進行イベントジングル再生
   */
  public playGlobalSound(type: GlobalSoundType): void {
    if (this.isMuted) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    const dest = this.sfxGain;

    switch (type) {
      case 'ui_click': {
        this.triggerTone(dest, 'sine', 880, 1320, now, 0.06, 0.24);
        this.triggerTone(dest, 'triangle', 1760, 2200, now + 0.01, 0.04, 0.1);
        break;
      }

      case 'ui_cancel': {
        this.triggerTone(dest, 'triangle', 480, 280, now, 0.09, 0.24);
        break;
      }

      case 'turn_start': {
        // 爽やかな2音チャイム（ピン・ポーン♪）
        this.triggerTone(dest, 'sine', 659.25, 659.25, now, 0.16, 0.28);
        this.triggerTone(dest, 'triangle', 987.77, 987.77, now + 0.11, 0.32, 0.3);
        this.triggerTone(dest, 'sine', 1318.5, 1318.5, now + 0.11, 0.28, 0.12);
        break;
      }

      case 'dice_roll': {
        const hits = [0, 0.055, 0.12, 0.19, 0.27];
        hits.forEach((offset, idx) => {
          const f = 560 + idx * 75;
          this.triggerTone(dest, 'triangle', f, f * 0.7, now + offset, 0.05, 0.24);
          this.triggerNoiseBurst(dest, now + offset, 0.025, 2600, 0.14);
        });
        break;
      }

      case 'step': {
        this.triggerTone(dest, 'sine', 350, 700, now, 0.1, 0.26);
        break;
      }

      case 'buy': {
        // チャリン♪＋明るいメジャーコード
        this.triggerTone(dest, 'sine', 1318.5, 1318.5, now, 0.07, 0.28);
        this.triggerTone(dest, 'sine', 1760.0, 1760.0, now + 0.06, 0.25, 0.32);
        this.triggerTone(dest, 'triangle', 523.25, 523.25, now + 0.1, 0.24, 0.18);
        this.triggerTone(dest, 'triangle', 659.25, 659.25, now + 0.14, 0.24, 0.18);
        this.triggerTone(dest, 'triangle', 783.99, 783.99, now + 0.18, 0.28, 0.22);
        break;
      }

      case 'upgrade': {
        const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
        notes.forEach((f, idx) => {
          this.triggerTone(dest, 'triangle', f, f, now + idx * 0.055, 0.24, 0.24);
          this.triggerTone(dest, 'sine', f * 2, f * 2, now + idx * 0.055, 0.15, 0.08);
        });
        break;
      }

      case 'toll_pay': {
        // 支払い時のちょっと痛い下降コイン音
        this.triggerTone(dest, 'triangle', 880, 620, now, 0.11, 0.26);
        this.triggerTone(dest, 'triangle', 587.33, 392.0, now + 0.11, 0.22, 0.28);
        break;
      }

      case 'salary': {
        // 給料日！華やかな3連チャイム＋キラキラ
        const salaryNotes = [523.25, 659.25, 783.99, 1046.5];
        salaryNotes.forEach((f, idx) => {
          this.triggerTone(dest, 'sine', f, f, now + idx * 0.07, 0.28, 0.28);
          this.triggerTone(dest, 'triangle', f * 1.5, f * 1.5, now + idx * 0.07 + 0.02, 0.18, 0.1);
        });
        break;
      }

      case 'bonus': {
        // 臨時ボーナス獲得のキラキラアルペジオ
        const bonusNotes = [587.33, 739.99, 880.0, 1174.66, 1479.98];
        bonusNotes.forEach((f, idx) => {
          this.triggerTone(dest, 'sine', f, f, now + idx * 0.05, 0.25, 0.26);
        });
        break;
      }

      case 'event_good': {
        const goodNotes = [523.25, 659.25, 783.99, 1046.5];
        goodNotes.forEach((f, idx) => {
          this.triggerTone(dest, 'triangle', f, f, now + idx * 0.06, 0.22, 0.25);
        });
        break;
      }

      case 'event_bad': {
        const badNotes = [440.0, 415.3, 392.0, 349.23];
        badNotes.forEach((f, idx) => {
          this.triggerTone(dest, 'sawtooth', f, f * 0.96, now + idx * 0.11, 0.2, 0.2, 1100);
        });
        break;
      }

      case 'marriage': {
        // ウェディングベル風の祝福チャイム（教会ベルハーモニクス）
        const bells = [
          { f: 783.99, t: 0, d: 0.35 },
          { f: 1046.5, t: 0.22, d: 0.35 },
          { f: 1174.66, t: 0.44, d: 0.35 },
          { f: 1567.98, t: 0.66, d: 0.55 },
        ];
        bells.forEach((b) => {
          this.triggerTone(dest, 'sine', b.f, b.f, now + b.t, b.d, 0.28);
          this.triggerTone(dest, 'triangle', b.f * 2, b.f * 2, now + b.t, b.d * 0.7, 0.1);
        });
        break;
      }

      case 'promotion': {
        // 昇進・キャリアアップの力強いファンファーレ
        const promo = [
          { f: 440.0, t: 0, d: 0.1 },
          { f: 554.37, t: 0.1, d: 0.1 },
          { f: 659.25, t: 0.2, d: 0.12 },
          { f: 880.0, t: 0.33, d: 0.42 },
        ];
        promo.forEach((p) => {
          this.triggerTone(dest, 'sawtooth', p.f, p.f, now + p.t, p.d, 0.22, 2600);
          this.triggerTone(dest, 'triangle', p.f * 0.5, p.f * 0.5, now + p.t, p.d, 0.16);
        });
        break;
      }

      case 'jail': {
        this.triggerNoiseBurst(dest, now, 0.16, 900, 0.32);
        this.triggerTone(dest, 'sawtooth', 196.0, 123.47, now + 0.04, 0.38, 0.26, 850);
        break;
      }

      case 'auction_bid': {
        // 入札時の小気味よいポップアップトーン
        this.triggerTone(dest, 'triangle', 660, 990, now, 0.09, 0.28);
        this.triggerTone(dest, 'sine', 1320, 1320, now + 0.05, 0.12, 0.22);
        break;
      }

      case 'auction_hammer': {
        // 競売落札時の木槌ガベル2回（コン・コン！）＋決定和音
        this.triggerTone(dest, 'square', 300, 110, now, 0.07, 0.34, 1200);
        this.triggerNoiseBurst(dest, now, 0.04, 1500, 0.24);
        this.triggerTone(dest, 'square', 320, 120, now + 0.12, 0.08, 0.38, 1200);
        this.triggerNoiseBurst(dest, now + 0.12, 0.05, 1500, 0.26);
        this.triggerTone(dest, 'triangle', 880, 880, now + 0.22, 0.3, 0.24);
        break;
      }

      case 'trade_offer': {
        // 取引提案の爽やかな通知音
        this.triggerTone(dest, 'sine', 587.33, 587.33, now, 0.1, 0.24);
        this.triggerTone(dest, 'sine', 880.0, 880.0, now + 0.09, 0.2, 0.26);
        break;
      }

      case 'trade_success': {
        // 取引成立の握手・合意チャイム
        const tradeNotes = [523.25, 659.25, 783.99, 1046.5];
        tradeNotes.forEach((f, idx) => {
          this.triggerTone(dest, 'triangle', f, f, now + idx * 0.06, 0.22, 0.25);
        });
        break;
      }

      case 'victory': {
        // 勝利時の豪華なフィナーレファンファーレ
        const sequence = [
          { f: 523.25, t: 0, d: 0.13 },
          { f: 659.25, t: 0.14, d: 0.13 },
          { f: 783.99, t: 0.28, d: 0.13 },
          { f: 1046.5, t: 0.42, d: 0.22 },
          { f: 783.99, t: 0.66, d: 0.14 },
          { f: 1046.5, t: 0.82, d: 0.6 },
        ];
        sequence.forEach((n) => {
          this.triggerTone(dest, 'sawtooth', n.f, n.f, now + n.t, n.d, 0.22, 3000);
          this.triggerTone(dest, 'triangle', n.f * 0.5, n.f * 0.5, now + n.t, n.d, 0.18);
        });
        // 最終コードのハーモニー
        this.triggerTone(dest, 'sine', 659.25, 659.25, now + 0.82, 0.6, 0.18);
        this.triggerTone(dest, 'sine', 783.99, 783.99, now + 0.82, 0.6, 0.18);
        break;
      }

      case 'countdown': {
        // 残り時間カウントダウンのピッ音
        this.triggerTone(dest, 'sine', 1046.5, 1046.5, now, 0.07, 0.22);
        break;
      }
    }
  }

  private triggerTone(
    destination: AudioNode,
    type: OscillatorType,
    startFreq: number,
    endFreq: number,
    startTime: number,
    duration: number,
    peakGain: number,
    lowpassFreq?: number
  ): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, startFreq), startTime);
    if (Math.abs(startFreq - endFreq) > 0.5) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);
    }

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(peakGain, startTime + Math.min(0.012, duration * 0.25));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    if (lowpassFreq) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(lowpassFreq, startTime);
      osc.connect(filter);
      filter.connect(gain);
    } else {
      osc.connect(gain);
    }

    gain.connect(destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
  }

  private triggerNoiseBurst(
    destination: AudioNode,
    startTime: number,
    duration: number,
    bandpassFreq: number,
    peakGain: number
  ): void {
    if (!this.noiseBuffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(bandpassFreq, startTime);
    filter.Q.setValueAtTime(1.5, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(peakGain, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);

    source.start(startTime);
    source.stop(startTime + duration + 0.01);
  }
}
