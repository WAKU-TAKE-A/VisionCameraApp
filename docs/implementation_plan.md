# Goal
`react-native-vision-camera` のようなネイティブコードを含むライブラリは、標準の Expo Go アプリでは動作しないため、カスタムの Expo Development Build（開発用ビルド）を作成する必要があります。  
本プロジェクトでは、カメラのフォーカス制御を含む撮像機能、設定ファイル（URLや認証情報）の読み込み、Digest認証による画像アップロード、及びサーバーの処理完了をポーリングで待機して結果を取得・表示する一連のフローを持つ React Native アプリを構築します。

## 要求事項の確認とユーザーへの質問 (User Review Required)
初期構築にあたり、いくつか事前に確認と選択をお願いします：

1. **Node.js のインストールについて**  
   Node.jsがインストールされていないようです。こちらでコマンド（`winget install OpenJS.NodeJS` など）を実行して自動インストールを進めてもよろしいでしょうか？ それともご自身でインストーラーをダウンロードしてインストールされますか？
2. **Development Build の作成方法について**  
   開発用ビルド（APKファイルなど）を作成するには2つの方法があります。どちらをご希望でしょうか？
   - **EAS Build（推奨）**: クラウド上でビルドを行います。PCの環境構築（Android Studioなど）が不要で簡単ですが、無料の Expo アカウントの作成が必要です。
   - **ローカルビルド**: ご自身のPC上でビルドします。アカウントは不要ですが、Android Studio や Java (JDK) などの環境構築が必要です。
3. **設定ファイルについて**  
   「ファイルはユーザーが編集可能であることが必要」とのことですが、スマートフォンの内部ストレージの特定フォルダ（ドキュメントフォルダ等）に初期ファイル（例: `config.json` または `settings.ini`）を生成し、それをPCと繋いで編集する、という運用でよろしいでしょうか？（アプリ内に簡易的な設定編集画面を作ることも可能です）

## Proposed Changes
### プロジェクトフォルダ構成案
- `[NEW] src/`
  - `[NEW] App.tsx`: ナビゲーション（画面遷移）のルート。
  - `[NEW] src/screens/HomeScreen.tsx`: 初期画面。[実行]ボタンを配置。
  - `[NEW] src/screens/CameraScreen.tsx`: カメラ画面。`react-native-vision-camera` を用い、[撮像][再撮像]ボタンを配置。
  - `[NEW] src/screens/ResultScreen.tsx`: 結果表示画面。[実行]ボタン（HomeScreenに戻る）を配置。
  - `[NEW] src/utils/config.ts`: デバイス内の設定ファイル（ini/yaml/json）を読み書きするモジュール（`expo-file-system`を利用）。
  - `[NEW] src/utils/api.ts`: HTTP通信モジュール。Digest認証でのアップロード、`/check`のポーリング、`/result`および`/result_image`の取得ロジック。

### 主な依存パッケージ
- `react-native-vision-camera`: カメラ機能の中核。
- `expo-dev-client`: 開発用ビルドを作成するためのExpoプラグイン。
- `@react-navigation/native` 等: 画面遷移用。
- `expo-file-system`: 設定ファイルの読み書き。
- Digest認証対応のネットワークライブラリ（またはカスタム実装）。

## Verification Plan
### Manual Verification
- カスタム開発クライアント（APK）をスマートフォンにインストールして起動。
- 初回起動時にデバイスのドキュメント領域に設定ファイルの雛形が作成されることを確認。
- [実行]ボタンからカメラ画面へ遷移し、フォーカスと撮像ができることを実機確認。
- 撮像後、設定ファイルのアドレスに対しDigest認証でアップロードされ、`/check` で完了を待ち、結果画像を取得・表示できるかをテスト用のモックサーバーを用いて確認。
