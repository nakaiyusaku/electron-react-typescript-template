import { BrowserWindow, app, ipcMain, dialog } from 'electron';
import fs from 'fs';
import path from 'path';

/**
 * Preload スクリプトの所在するディレクトリを取得
 *
 * 開発時には webpack の出力先を指定し、
 * electron-builder によるパッケージ後には 'asarUnpack' オプションに
 * 設定したディレクトリを返す
 */
const getResourceDirectory = () => {
  return process.env.NODE_ENV === 'development'
    ? path.join(process.cwd(), 'dist')
    : path.join(process.resourcesPath, 'app.asar.unpack', 'dist');
};

/**
 * BrowserWindowインスタンスを作成する関数
 */
const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      /**
       * BrowserWindowインスタンス（レンダラープロセス）では
       * Node.jsの機能を無効化する（デフォルト）
       */
      nodeIntegration: false,
      contextIsolation: true,
      /**
       * Preloadスクリプトは絶対パスで指定する
       */
      preload: path.resolve(getResourceDirectory(), 'preload.js'),
    },
  });

  // レンダラープロセスをロード
  mainWindow.loadFile('dist/index.html');

  // 開発時にはデベロッパーツールを開く
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // 'open-dialog' チャネルに受信
  ipcMain.handle('open-dialog', async () => {
    // フォルダ選択ダイアログを開いてディレクトリパスを取得する
    const dirpath = await dialog
      .showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
      })
      .then(result => {
        // キャンセルされたとき
        if (result.canceled) return;

        // 選択されたディレクトリのパスを返す
        return result.filePaths[0];
      })
      .catch(err => console.log(err));

    // なにも選択されなかったときやエラーが生じたときは
    // void | undefined となる
    if (!dirpath) return;

    /**
     * Node.fs を使って上で得られたディレクトリパスの
     * ファイル一覧を作成し、返信としてレンダラープロセス
     * へ送る
     */
    const filelist = fs.promises
      .readdir(dirpath, { withFileTypes: true })
      .then(dirents =>
        dirents
          .filter(dirent => dirent.isFile())
          .map(({ name }) => path.join(dirpath, name)),
      )
      .catch(err => console.log(err));

    return filelist;
  });
};

app.whenReady().then(createWindow);

app.once('window-all-closed', () => app.quit());
