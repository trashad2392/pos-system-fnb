// src/main/handlers/index.js
const { setupCategoryHandlers } = require('./categoryHandlers');
const { setupProductHandlers } = require('./productHandlers');
const { setupModifierHandlers } = require('./modifierHandlers');
const { setupTableHandlers } = require('./tableHandlers');
const { setupOrderHandlers } = require('./orderHandlers');
const { setupImportHandlers } = require('./importHandlers');
const { setupUserHandlers } = require('./userHandlers'); // <-- NEW: Import user handlers

function setupAllIpcHandlers() {
  setupCategoryHandlers();
  setupProductHandlers();
  setupModifierHandlers();
  setupTableHandlers();
  setupOrderHandlers();
  setupImportHandlers();
  setupUserHandlers(); // <-- NEW: Initialize user handlers
}

module.exports = { setupAllIpcHandlers };