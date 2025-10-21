// src/main/handlers/index.js
const { setupCategoryHandlers } = require('./categoryHandlers');
const { setupProductHandlers } = require('./productHandlers');
const { setupModifierHandlers } = require('./modifierHandlers');
const { setupTableHandlers } = require('./tableHandlers');
const { setupOrderHandlers } = require('./orderHandlers');
const { setupImportHandlers } = require('./importHandlers');
const { setupUserHandlers } = require('./userHandlers');
const { setupDiscountHandlers } = require('./discountHandlers');
const { setupFileHandlers } = require('./fileHandlers');
const { setupRoleHandlers } = require('./roleHandlers');
const { setupMenuHandlers } = require('./menuHandlers');
const { setupSettingHandlers } = require('./settingHandlers'); // <-- ADD THIS LINE

function setupAllIpcHandlers() {
  setupCategoryHandlers();
  setupProductHandlers();
  setupModifierHandlers();
  setupTableHandlers();
  setupOrderHandlers();
  setupImportHandlers();
  setupUserHandlers();
  setupDiscountHandlers();
  setupFileHandlers();
  setupRoleHandlers();
  setupMenuHandlers();
  setupSettingHandlers(); // <-- ADD THIS LINE
}

module.exports = { setupAllIpcHandlers };