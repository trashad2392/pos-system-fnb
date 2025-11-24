// src/main/handlers/customerHandlers.js
const { ipcMain } = require('electron');
const { prisma, Prisma } = require('../../lib/db');

function setupCustomerHandlers() {
    // --- Company Handlers ---
    ipcMain.handle('get-companies', () => 
        prisma.company.findMany({ 
          where: { isActive: true },
          orderBy: { name: 'asc' },
          include: { customers: { where: { isActive: true }, orderBy: { name: 'asc' } } } 
        })
    );

    ipcMain.handle('add-company', async (e, data) => {
        try {
          // 1. Check if an inactive company with this name already exists
          const existingInactive = await prisma.company.findFirst({
            where: { name: data.name, isActive: false },
          });

          if (existingInactive) {
            // 2. If found, reactivate it and update its properties
            return await prisma.company.update({
              where: { id: existingInactive.id },
              data: {
                ...data,
                isActive: true, // Ensure it is set to active
              },
            });
          }

          // 3. If not found or already active, create the new company
          return await prisma.company.create({ data });
        } catch (error) {
           // Handle unique constraint if a name already exists and is active (P2002)
           if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
                throw new Error(`A company with the name "${data.name}" already exists and is active.`);
           }
           throw error;
        }
    });

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
          // Since the name constraint is removed, we only need to CREATE the new customer.
          return await prisma.customer.create({ data });
        } catch (error) {
          // No P2002 check needed here anymore on the name field.
          throw error;
        }
    });

    ipcMain.handle('update-customer', (e, { id, data }) => 
        prisma.customer.update({ where: { id }, data })
    );
    
    ipcMain.handle('delete-customer', (e, id) =>
         prisma.customer.update({ 
             where: { id: parseInt(id, 10) }, 
             data: { isActive: false } 
         })
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
              orderId: null, // Explicitly set null for non-order payments
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

        // --- FIX: Use Infinity for calculation if the limit is 0 (i.e., no limit) ---
        const limitForCalculation = effectiveCreditLimit === 0 ? Infinity : effectiveCreditLimit;

        return {
          balance: customer.balance,
          creditLimit: effectiveCreditLimit,
          availableCredit: limitForCalculation - Math.abs(Math.min(0, customer.balance)),
          isOverdue: customer.balance < 0 && effectiveCreditLimit > 0 && Math.abs(customer.balance) > effectiveCreditLimit
        };
    });
}

module.exports = { setupCustomerHandlers };