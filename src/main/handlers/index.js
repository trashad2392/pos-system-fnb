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
const { setupSettingHandlers } = require('./settingHandlers');
const { setupPrintingHandlers } = require('./printingHandlers');
// const { setupCustomerHandlers } = require('./customerHandlers'); // <-- REMOVED IMPORT
// --- NEW IMPORTS ---
const { ipcMain } = require('electron');
const { prisma, Prisma } = require('../../lib/db'); // <-- CORRECT PATH

// --- THIS IS THE FINAL FIXED EXPORT ---
function setupAllIpcHandlers(rootDir) {
  // Setup standard handlers (these work fine)
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
  setupSettingHandlers();
  
  // --- START: CONSOLIDATED CUSTOMER HANDLERS (Guaranteed Registration) ---
  (function setupCustomerHandlersConsolidated() {
      // --- Company Handlers ---
      ipcMain.handle('get-companies', () => 
        prisma.company.findMany({ 
          where: { isActive: true },
          orderBy: { name: 'asc' },
          include: { customers: { where: { isActive: true }, orderBy: { name: 'asc' } } } 
        })
      );

      ipcMain.handle('add-company', (e, data) => 
        prisma.company.create({ data })
      );

      ipcMain.handle('update-company', (e, { id, data }) => 
        prisma.company.update({ where: { id }, data })
      );

      // --- Customer Handlers ---
      ipcMain.handle('get-customers', () => 
        prisma.customer.findMany({ 
          where: { isActive: true }, 
          orderBy: { name: 'asc' },
          include: { company: true }
        })
      );

      ipcMain.handle('add-customer', async (e, data) => {
        try {
          return await prisma.customer.create({ data });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
              throw new Error(`A customer with the name "${data.name}" already exists.`);
          }
          throw error;
        }
      });

      ipcMain.handle('update-customer', (e, { id, data }) => 
        prisma.customer.update({ where: { id }, data })
      );
      
      // --- Payment Handling for Customers (Debt Management) ---
      ipcMain.handle('add-customer-payment', async (e, { customerId, amount, method }) => {
        return prisma.$transaction(async (tx) => {
          const customer = await tx.customer.findUnique({ where: { id: customerId } });
          if (!customer) throw new Error('Customer not found.');

          await tx.payment.create({
            data: {
              amount: amount,
              method: method,
              customerId: customerId,
            },
          });

          await tx.customer.update({
            where: { id: customerId },
            data: {
              balance: { increment: amount }
            }
          });
          
          return tx.customer.findUnique({ where: { id: customerId } });
        });
      });

      // --- Credit Logic Helper ---
      ipcMain.handle('get-customer-credit-status', async (e, customerId) => {
        const customer = await prisma.customer.findUnique({
          where: { id: customerId },
          include: { company: true }
        });

        if (!customer) return null;

        const effectiveCreditLimit = customer.creditLimit > 0 
          ? customer.creditLimit 
          : (customer.company?.creditLimit || 0);

        return {
          balance: customer.balance,
          creditLimit: effectiveCreditLimit,
          availableCredit: effectiveCreditLimit - Math.abs(Math.min(0, customer.balance)),
          isOverdue: customer.balance < 0 && effectiveCreditLimit > 0 && Math.abs(customer.balance) > effectiveCreditLimit
        };
      });
  })(); // Immediately invoked
  // --- END: CONSOLIDATED CUSTOMER HANDLERS ---

  setupPrintingHandlers(rootDir);
}

module.exports = { setupAllIpcHandlers };