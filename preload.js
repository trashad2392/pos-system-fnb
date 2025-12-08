// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Image Upload
  uploadImage: () => ipcRenderer.invoke('upload-image'),
  // 🔥 FIX: ADDED saveIconImage to expose it to the renderer
  saveIconImage: (data) => ipcRenderer.invoke('save-icon-image', data), 

  // Product Functions
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (data) => ipcRenderer.invoke('add-product', data),
  updateProduct: (data) => ipcRenderer.invoke('update-product', data),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),

  // Sale/Order Functions
  getSales: () => ipcRenderer.invoke('get-sales'),
  getSalesByDateRange: (range) => ipcRenderer.invoke('get-sales-by-date-range', range),
  getSalesStats: (range) => ipcRenderer.invoke('get-sales-stats', range),
  getSalesComparison: (range) => ipcRenderer.invoke('get-sales-comparison', range),
  getDailySalesForRange: (range) => ipcRenderer.invoke('get-daily-sales-for-range', range),
  createOrder: (data) => ipcRenderer.invoke('create-order', data),
  getOpenOrderForTable: (tableId) => ipcRenderer.invoke('get-open-order-for-table', tableId),
  addItemToOrder: (data) => ipcRenderer.invoke('add-item-to-order', data),
  updateItemQuantity: (data) => ipcRenderer.invoke('update-item-quantity', data),
  removeItemFromOrder: (data) => ipcRenderer.invoke('remove-item-from-order', data),
  finalizeOrder: (data) => ipcRenderer.invoke('finalize-order', data),
  voidOrderItem: (data) => ipcRenderer.invoke('void-order-item', data),
  voidFullOrder: (data) => ipcRenderer.invoke('void-full-order', data),
  holdOrder: (data) => ipcRenderer.invoke('hold-order', data),
  getHeldOrders: (data) => ipcRenderer.invoke('get-held-orders', data),
  resumeHeldOrder: (data) => ipcRenderer.invoke('resume-held-order', data),
  deleteHeldOrder: (data) => ipcRenderer.invoke('delete-held-orders', data),
  clearOrder: (data) => ipcRenderer.invoke('clear-order', data),
  updateItemComment: (data) => ipcRenderer.invoke('update-item-comment', data),
  updateOrderComment: (data) => ipcRenderer.invoke('update-order-comment', data),
  applyDiscountToItem: (data) => ipcRenderer.invoke('apply-discount-to-item', data),
  applyDiscountToOrder: (data) => ipcRenderer.invoke('apply-discount-to-order', data),

  // Category Functions
  getCategories: () => ipcRenderer.invoke('get-categories'),
  addCategory: (data) => ipcRenderer.invoke('add-category', data), // Expects { name, menuId }
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

  // User & Shift Functions
  getUsers: () => ipcRenderer.invoke('get-users'),
  addUser: (data) => ipcRenderer.invoke('add-user', data),
  updateUser: (data) => ipcRenderer.invoke('update-user', data),
  deleteUser: (id) => ipcRenderer.invoke('delete-user', id),
  login: (pin) => ipcRenderer.invoke('login', pin),
  logout: () => ipcRenderer.invoke('logout'),
  getActiveUser: () => ipcRenderer.invoke('get-active-user'),
  clockOut: () => ipcRenderer.invoke('clock-out'),
  getCurrentShift: (userId) => ipcRenderer.invoke('get-current-shift', userId),

  // Discount Functions
  getDiscounts: () => ipcRenderer.invoke('get-discounts'),
  addDiscount: (data) => ipcRenderer.invoke('add-discount', data),
  updateDiscount: (data) => ipcRenderer.invoke('update-discount', data),
  deactivateDiscount: (id) => ipcRenderer.invoke('deactivate-discount', id),

  // Role & Permission Functions
  getRoles: () => ipcRenderer.invoke('get-roles'),
  getPermissions: () => ipcRenderer.invoke('get-permissions'),
  createRole: (data) => ipcRenderer.invoke('create-role', data),
  updateRole: (data) => ipcRenderer.invoke('update-role', data),
  deleteRole: (id) => ipcRenderer.invoke('delete-role', id),

  // Menu Functions
  getMenus: (options) => ipcRenderer.invoke('get-menus', options),
  addMenu: (data) => ipcRenderer.invoke('add-menu', data),
  updateMenu: (data) => ipcRenderer.invoke('update-menu', data),
  deleteMenu: (id) => ipcRenderer.invoke('delete-menu', id),

  // Setting Functions
  getPosSettings: () => ipcRenderer.invoke('get-pos-settings'),
  getPosSetting: (key) => ipcRenderer.invoke('get-pos-setting', key),
  setPosSetting: (data) => ipcRenderer.invoke('set-pos-setting', data), // Expects { key, value }
  setPosSettings: (settingsMap) => ipcRenderer.invoke('set-pos-settings', settingsMap), // Expects { key1: value1, ... }

  // --- NEW: Payment Method Functions ---
  getPaymentMethods: (options) => ipcRenderer.invoke('get-payment-methods', options),
  addPaymentMethod: (data) => ipcRenderer.invoke('add-payment-method', data),
  updatePaymentMethod: (data) => ipcRenderer.invoke('update-payment-method', data),
  deletePaymentMethod: (id) => ipcRenderer.invoke('delete-payment-method', id),
  // --- END NEW ---

  // Customer & Company Functions (Credit Sale)
  getCompanies: () => ipcRenderer.invoke('get-companies'),
  addCompany: (data) => ipcRenderer.invoke('add-company', data),
  updateCompany: (data) => ipcRenderer.invoke('update-company', data),
  getCustomers: () => ipcRenderer.invoke('get-customers'),
  addCustomer: (data) => ipcRenderer.invoke('add-customer', data),
  updateCustomer: (data) => ipcRenderer.invoke('update-customer', data),
  deleteCustomer: (id) => ipcRenderer.invoke('delete-customer', id), 
  addCustomerPayment: (data) => ipcRenderer.invoke('add-customer-payment', data), // { customerId, amount, method }
  getCustomerCreditStatus: (customerId) => ipcRenderer.invoke('get-customer-credit-status', customerId),

  // Printing Functions
  printReceipt: (orderId) => ipcRenderer.invoke('print-receipt', orderId),
  triggerPrintDialog: () => ipcRenderer.send('trigger-print-dialog'),
  getReceiptData: () => ipcRenderer.invoke('get-receipt-data'),
  onReceiptData: (callback) => ipcRenderer.on('receipt-data', (e, ...args) => callback(...args)),
  clearReceiptDataListener: () => ipcRenderer.removeAllListeners('receipt-data'),
});