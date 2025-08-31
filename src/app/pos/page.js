// src/app/pos/page.js
"use client";

import TableSelectView from './components/TableSelectView';
import OrderView from './components/OrderView';
import ModifierModal from './components/ModifierModal';
import { usePosLogic } from '../../hooks/usePosLogic';

export default function PosPage() {
  const {
    activeOrder,
    tables,
    menu,
    activeTab,
    customizingProduct,
    modifierModalOpened,
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

      {/* The Modifier Modal is always available but only shows when 'opened' is true */}
      <ModifierModal
        product={customizingProduct}
        opened={modifierModalOpened}
        onClose={actions.closeModifierModal}
        onConfirm={actions.handleConfirmModifiers}
      />
    </div>
  );
}