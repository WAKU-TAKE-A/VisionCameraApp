# VisionCameraApp

Expo (React Native) と `react-native-vision-camera` を用いて構築されたカメラスキャン＆画像アップロードアプリです。
設定ファイルに基づく動的な接続先変更、RFC 2617 規格を用いたセキュアなDigest認証アップロード、そしてサーバー側の非同期処理完了を待機するポーリング機能を備えています。

## 主な機能

- **ネイティブカメラ機能**: `react-native-vision-camera` による高速かつ安定した撮像。
- **動的な設定変更**: アプリのドキュメント領域に自動生成される `config.json` を書き換えることで、アプリを再ビルドせずに接続先IPアドレス、ポート番号、認証情報を後から変更可能。
- **セキュアな通信**: Python Flask製のモックサーバーと連携し、生のヘッダーパースによる厳密な Digest 認証で画像をアップロード。ローカル開発環境でのHTTPS強制アップグレードを回避するダウングレード機構付き。
- **非同期ポーリング機能**: 画像アップロード後、サーバー側の重い処理（AI画像認識など）の完了を `/check` エンドポイントで定期的に確認し、完了後に結果スコアと処理後画像を `/result` `/result_image` から取得して表示。

## フォルダ構成

```text
VisionCameraApp/
├── src/                    # アプリのソースコード本体
│   ├── screens/            # 画面コンポーネント (Home, Camera, Result)
│   └── utils/              # API通信 (api.ts) や 設定管理 (config.ts) モジュール
├── mock_server/            # 開発・テスト用のPythonダミーサーバー群
│   ├── mock_server.py      # Digest認証とポーリングをシミュレートするサーバー
│   ├── test_digest.py      # Python側の認証ハッシュ生成テスト
│   └── test_digest.js      # JS/Node側の認証ハッシュ生成テスト
└── docs/                   # 開発経緯やノウハウをまとめたドキュメント
    ├── implementation_plan.md      # 初期設計書類
    ├── project_report.md           # 開発総括・トラブルシューティング事例
    └── project_migration_guide.md  # 別PCへの環境引き継ぎガイド
```

## 開発と実行の手順

### 1. 依存パッケージのインストール
```bash
npm install
```

### 2. アプリのビルド (EAS Build)
本アプリはカメラ機能などのネイティブモジュールを利用するため、標準の Expo Go では動作しません。EAS (Expo Application Services) を用いた Development Build （開発用クライアント）を作成します。

ビルドのために、まず EAS CLI をグローバルにインストールします。
```bash
npm install -g eas-cli
```

```bash
# EAS CLI にログイン
eas login

# Android 向け開発用 APK のクラウドビルド
eas build --profile development --platform android
```
ビルドが完了したら、生成された APK を Android 実機にインストールしてください。

### 3. モックサーバーの起動
ローカルでアプリからの画像を受信・認証し、処理結果を返すダミーサーバーを立ち上げます。
```bash
cd mock_server
pip install flask werkzeug
python mock_server.py
```
*(起動するとポート `2880` で待ち受けを開始します。)*

### 4. 開発サーバー (Metro) の起動
ルートディレクトリに戻り、Expo開発サーバーを起動します。
```bash
npx expo start
```
コンソールに表示されるQRコードをスキャンするか、USB接続した状態で `a` キーを押し、先ほどインストールしたアプリ（Development Build）から接続してください。
