// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Product Functions
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (data) => ipcRenderer.invoke('add-product', data),
  updateProduct: (data) => ipcRenderer.invoke('update-product', data),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
  
  // Sale/Order Functions
  createSale: (items) => ipcRenderer.invoke('create-sale', items),
  getSales: () => ipcRenderer.invoke('get-sales'),
  createOrder: (data) => ipcRenderer.invoke('create-order', data),
  getOpenOrderForTable: (tableId) => ipcRenderer.invoke('get-open-order-for-table', tableId),
  addItemToOrder: (data) => ipcRenderer.invoke('add-item-to-order', data),
  updateItemQuantity: (data) => ipcRenderer.invoke('update-item-quantity', data),
  removeItemFromOrder: (data) => ipcRenderer.invoke('remove-item-from-order', data),
  finalizeOrder: (data) => ipcRenderer.invoke('finalize-order', data),
  holdOrder: (data) => ipcRenderer.invoke('hold-order', data),
  getHeldOrders: (data) => ipcRenderer.invoke('get-held-orders', data),
  resumeHeldOrder: (data) => ipcRenderer.invoke('resume-held-order', data),
  deleteHeldOrder: (data) => ipcRenderer.invoke('delete-held-order', data),
  clearOrder: (data) => ipcRenderer.invoke('clear-order', data),

  // Category Functions
  getCategories: () => ipcRenderer.invoke('get-categories'),
  addCategory: (name) => ipcRenderer.invoke('add-category', name),
  updateCategory: (data) => ipcRenderer.invoke('update-category', data),
  deleteCategory: (id) => ipcRenderer.invoke('delete-category', id),

  // Modifier Functions
  getModifierGroups: () => ipcRenderer.invoke('get-modifier-groups'),
  addModifierGroup: (data) => ipcRenderer.invoke('add-modifier-group', data),
  updateModifierGroup: (id, data) => ipcRenderer.invoke('update-modifier-group', { id, data }),
  deleteModifierGroup: (id) => ipcRenderer.invoke('delete-modifier-group', id),
  addModifierOption: (data) => ipcRenderer.invoke('add-modifier-option', data),
  updateModifierOption: (id, data) => ipcRenderer.invoke('update-modifier-option', { id, data }),
  deleteModifierOption: (id) => ipcRenderer.invoke('delete-modifier-option', id),

  // Import Functions
  openImportDialog: () => ipcRenderer.invoke('open-file-dialog'),
  importMenuFromJson: (json) => ipcRenderer.invoke('import-menu-from-json', json),

  // Table Functions
  getTables: () => ipcRenderer.invoke('get-tables'),
  addTable: (name) => ipcRenderer.invoke('add-table', name),
  updateTable: (data) => ipcRenderer.invoke('update-table', data),
  deleteTable: (id) => ipcRenderer.invoke('delete-table', id),
});