// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // All of our database functions are exposed here
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (data) => ipcRenderer.invoke('add-product', data),
  updateProduct: (id, data) => ipcRenderer.invoke('update-product', id, data),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
  createSale: (items) => ipcRenderer.invoke('create-sale', items),
  getSales: () => ipcRenderer.invoke('get-sales'),
});