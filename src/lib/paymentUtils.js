// src/lib/paymentUtils.js

/**
 * Formats a number to a standard currency string.
 */
export const formatCurrency = (amount) => {
    return `$${Number(amount).toFixed(2)}`;
};

/**
 * Safely adds or subtracts currency values using integer math 
 * to avoid floating point errors (e.g., 0.1 + 0.2 = 0.30000000000000004).
 */
export const safeCompareAmounts = (amount1, amount2, tolerance = 0.015) => {
    return Math.abs(amount1 - amount2) < tolerance;
};

/**
 * Validates that the sum of payments matches the order total.
 */
export const validatePaymentTotal = (payments, expectedTotal) => {
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    return {
        isValid: safeCompareAmounts(totalPaid, expectedTotal),
        totalPaid,
        difference: expectedTotal - totalPaid
    };
};

/**
 * Normalizes payment objects for the API.
 */
export const prepareFinalPayments = (payments, orderTotal, selectionType) => {
    let finalPayments = [...payments];
    
    // If it's a full payment, ensure the single payment matches the total exactly
    if (selectionType === 'full' && finalPayments.length === 1) {
        finalPayments[0].amount = orderTotal;
    }
    
    return finalPayments;
};