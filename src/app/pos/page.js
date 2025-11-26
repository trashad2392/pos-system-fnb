// src/app/pos/components/PosPage.js
"use client";

import { Loader, Center } from '@mantine/core';
import { usePosLogic } from '../../hooks/usePosLogic';
import PosHomeView from './components/PosHomeView';
import TableSelectView from './components/TableSelectView';
import OrderView from './components/OrderView';
import ModifierModal from './components/ModifierModal';
import PaymentModal from './components/PaymentModal';
import HeldOrdersModal from './components/HeldOrdersModal';
import CommentModal from './components/CommentModal';
import DiscountModal from './components/DiscountModal';

export default function PosPage() {
  const {
    posView, activeOrder, tables, menu, heldOrders, discounts,
    customizingProduct, modifierModalOpened, paymentModalOpened,
    selectedItemId, heldOrdersModalOpened, isLoading,
    commentModalOpened, commentTarget, keyboardVisible,
    discountTarget, discountModalOpened,
    selectedPaymentMethods,
    paymentModalInitialTab,
    actions
  } = usePosLogic();

  if (isLoading) {
    return <Center style={{ height: '100vh' }}><Loader /></Center>;
  }

  const renderView = () => {
    switch (posView) {
      case 'order-view':
        return <OrderView
          order={activeOrder}
          onBack={actions.handleGoHome}
          menu={menu}
          onProductSelect={actions.handleProductSelect}
          onUpdateQuantity={actions.handleUpdateItemQuantity}
          onRemoveItem={actions.handleRemoveItem}
          onFinalize={actions.handleFinalizeOrder}
          onHold={actions.handleHold}
          onClearOrder={actions.handleClearOrder}
          selectedItemId={selectedItemId}
          onSelectItem={actions.handleSelectItem}
          onOpenCommentModal={actions.handleOpenCommentModal}
          onFastCash={actions.handleFastCash}
          onOpenDiscountModal={actions.handleOpenDiscountModal}
          selectedPaymentMethods={selectedPaymentMethods}
          openPaymentModal={actions.openPaymentModal}
        />;
      case 'table-select':
        return <TableSelectView
          tables={tables}
          onTableSelect={actions.handleTableSelect}
          onBack={actions.handleGoHome}
        />;
      case 'home':
      default:
        return <PosHomeView
          onSelectDineIn={actions.handleSelectDineIn}
          onStartOrder={actions.startOrder}
        />;
    }
  }

  return (
    // 🛑 REVERT: Minimal wrapper. The vertical scroll issue is now definitively 
    // located in the 100px calculation or global browser margins/padding.
    <div style={{ position: 'relative' }}>
      {renderView()}

      <ModifierModal
        product={customizingProduct}
        opened={modifierModalOpened}
        onClose={actions.handleCloseModifierModal}
        onConfirm={actions.handleConfirmModifiers}
      />

      <PaymentModal
        order={activeOrder}
        opened={paymentModalOpened}
        onClose={actions.closePaymentModal}
        onSelectPayment={actions.handleSelectPayment}
        initialTab={paymentModalInitialTab}
      />

      <HeldOrdersModal
        opened={heldOrdersModalOpened}
        onClose={actions.closeHeldOrdersModal}
        heldOrders={heldOrders}
        onResume={actions.handleResumeHeldOrder}
        onDelete={actions.handleDeleteHeldOrder}
        orderType={activeOrder?.orderType}
      />

      <CommentModal
        opened={commentModalOpened}
        onClose={actions.handleCloseCommentModal}
        onSave={actions.handleSaveComment}
        target={commentTarget}
        keyboardVisible={keyboardVisible}
        onToggleKeyboard={actions.toggleKeyboard}
      />

      <DiscountModal
        opened={discountModalOpened}
        onClose={actions.handleCloseDiscountModal}
        onSelectDiscount={actions.handleSelectDiscount}
        target={discountTarget}
        discounts={discounts}
      />

    </div>
  );
}