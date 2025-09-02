// src/app/pos/page.js
"use client";

import TableSelectView from './components/TableSelectView';
import OrderView from './components/OrderView';
import ModifierModal from './components/ModifierModal';
import PaymentModal from './components/PaymentModal';
import { usePosLogic } from '../../hooks/usePosLogic';

export default function PosPage() {
  const {
    activeOrder,
    tables,
    menu,
    activeTab,
    customizingProduct,
    modifierModalOpened,
    paymentModalOpened,
    selectedItemId, // <-- The state we need
    actions
  } = usePosLogic();
  
  return (
    <div>
      {activeOrder ? (
        <OrderView 
          order={activeOrder} 
          onBack={actions.handleBackToMainScreen} 
          menu={menu} 
          onProductSelect={actions.handleProductSelect}
          onUpdateQuantity={actions.handleUpdateItemQuantity}
          onRemoveItem={actions.handleRemoveItem}
          onFinalize={actions.openPaymentModal}
          // --- THESE TWO PROPS ARE THE FIX ---
          selectedItemId={selectedItemId}
          onSelectItem={actions.handleSelectItem}
        />
      ) : (
        <TableSelectView 
          tables={tables} 
          activeTab={activeTab}
          onTabChange={actions.setActiveTab}
          onTableSelect={actions.handleTableSelect}
          onTakeaway={() => actions.startOrder({ tableId: null, orderType: 'Takeaway'})}
          onDelivery={() => actions.startOrder({ tableId: null, orderType: 'Delivery'})}
          onDriveThrough={() => actions.startOrder({ tableId: null, orderType: 'Drive-Through'})}
        />
      )}

      <ModifierModal
        product={customizingProduct}
        opened={modifierModalOpened}
        onClose={actions.closeModifierModal}
        onConfirm={actions.handleConfirmModifiers}
      />
      
      <PaymentModal
        order={activeOrder}
        opened={paymentModalOpened}
        onClose={actions.closePaymentModal}
        onConfirmPayment={actions.handleFinalizeOrder}
      />
    </div>
  );
}