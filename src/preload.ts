import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('myAPI', {
  openDialog: async (): Promise<void | string[]> =>
    await ipcRenderer.invoke('open-dialog'),
});

/**
 * Window オブジェクトに ipcRenderer メソッドを追加し、
 * レンダラープロセスからも利用できるようにする。
 */
window.ipcRenderer = ipcRenderer;
