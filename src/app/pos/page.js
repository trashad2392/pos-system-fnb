// src/app/pos/page.js
"use client";

import { Loader, Center } from '@mantine/core';
import { usePosData } from '../../hooks/usePosData';
import { usePosLogic } from '../../hooks/usePosLogic';
import TableSelectView from './components/TableSelectView';
import OrderView from './components/OrderView';
import ModifierModal from './components/ModifierModal';
import PaymentModal from './components/PaymentModal';
import DraftListView from './components/DraftListView';
import PosHomeView from './components/PosHomeView';
import OrderTypeHubView from './components/OrderTypeHubView';

export default function PosPage() {
  const { tables, menu, isLoading, refreshData } = usePosData();
  const {
    posView, activeOrder, activeOrderType, draftedOrders,
    customizingProduct, modifierModalOpened, paymentModalOpened,
    selectedItemId, actions
  } = usePosLogic({ tables, refreshData });
  
  if (isLoading) {
    return <Center style={{ height: '100vh' }}><Loader /></Center>;
  }

  const renderView = () => {
    switch(posView) {
      case 'order-view':
        return <OrderView 
          order={activeOrder} 
          onBack={actions.handleGoBack}
          menu={menu} 
          onProductSelect={actions.handleProductSelect}
          onUpdateQuantity={actions.handleUpdateItemQuantity}
          onRemoveItem={actions.handleRemoveItem}
          onFinalize={actions.openPaymentModal}
          onSaveAsDraft={actions.handleSaveAsDraft}
          selectedItemId={selectedItemId}
          onSelectItem={actions.handleSelectItem}
        />;
      case 'draft-list':
        return <DraftListView
          drafts={draftedOrders}
          onResume={actions.handleResumeDraft}
          onBack={actions.handleGoBack}
          orderType={activeOrderType}
          onDeleteDraft={actions.handleDeleteDraft} // <-- THIS IS THE FIX
        />;
      case 'order-type-hub':
        return <OrderTypeHubView
          orderType={activeOrderType}
          onNewOrder={() => actions.startOrder({ tableId: null, orderType: activeOrderType })}
          onShowDrafts={() => actions.handleShowDrafts(activeOrderType)}
          onBack={actions.handleGoBack}
        />;
      case 'table-select':
         return <TableSelectView 
          tables={tables} 
          onTableSelect={actions.handleTableSelect}
          onBack={actions.handleGoBack}
        />;
      case 'home':
      default:
        return <PosHomeView 
          onSelectDineIn={actions.handleSelectDineIn}
          onSelectOrderType={actions.handleSelectOrderType}
        />;
    }
  }

  return (
    <div>
      {renderView()}
      
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