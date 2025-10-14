// src/app/sales/page.js
"use client";

import { useState, useEffect } from 'react';
import { Title, Tabs, Loader, Center } from '@mantine/core';
import { startOfDay, endOfDay, subDays } from 'date-fns';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import Dashboard from './components/Dashboard';
import SalesReport from './components/SalesReport';
import VoidItemModal from './components/VoidItemModal';

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [voidModalOpened, { open: openVoidModal, close: closeVoidModal }] = useDisclosure(false);
  const [orderToVoid, setOrderToVoid] = useState(null);
  const [dashboardDateRange, setDashboardDateRange] = useState([subDays(new Date(), 6), new Date()]);
  const [stats, setStats] = useState(null);
  const [comparisonStats, setComparisonStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [reportDateRange, setReportDateRange] = useState([startOfDay(new Date()), endOfDay(new Date())]);
  const [sales, setSales] = useState([]);
  const [isReportLoading, setIsReportLoading] = useState(false);

  const handleOpenVoidModal = (orderId) => {
    const order = sales.find(s => s.id === orderId);
    if (order) {
      setOrderToVoid(order);
      openVoidModal();
    }
  };

  // --- START: FIX FOR UI LAG ---
  const handleVoidItem = async (orderItemId, voidType) => {
    try {
      // The API call returns the fully updated order object
      const updatedOrder = await window.api.voidOrderItem({ orderItemId, voidType });
      
      notifications.show({
        title: 'Success',
        message: 'Item has been voided.',
        color: 'green',
      });

      // Directly update the state for the modal and the sales list
      setOrderToVoid(updatedOrder);
      setSales(currentSales => 
        currentSales.map(sale => sale.id === updatedOrder.id ? updatedOrder : sale)
      );

      // Refresh dashboard data as it might have changed
      await fetchDashboardData();

    } catch (error) {
      console.error("Failed to void item:", error);
      notifications.show({
        title: 'Error',
        message: `Failed to void item: ${error.message}`,
        color: 'red',
      });
    }
  };
  // --- END: FIX FOR UI LAG ---

  const handleVoidFullOrder = async (orderId, voidType) => {
    try {
      await window.api.voidFullOrder({ orderId, voidType });
      notifications.show({
        title: 'Success',
        message: 'The entire order has been voided.',
        color: 'green',
      });
      // Refresh both lists after a full void
      await fetchSalesData();
      await fetchDashboardData();
      closeVoidModal(); 
    } catch (error) {
      console.error("Failed to void full order:", error);
      notifications.show({
        title: 'Error',
        message: `Failed to void full order: ${error.message}`,
        color: 'red',
      });
    }
  };

  const fetchDashboardData = async () => {
    if (!dashboardDateRange[0] || !dashboardDateRange[1]) return;
    setIsDashboardLoading(true);
    try {
      const range = {
        startDate: startOfDay(dashboardDateRange[0]).toISOString(),
        endDate: endOfDay(dashboardDateRange[1]).toISOString(),
      };
      const [statsData, comparisonData, dailyData] = await Promise.all([
        window.api.getSalesStats(range),
        window.api.getSalesComparison(range),
        window.api.getDailySalesForRange(range),
      ]);
      setStats(statsData);
      setComparisonStats(comparisonData);
      setChartData(dailyData);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsDashboardLoading(false);
    }
  };

  const fetchSalesData = async () => {
    if (!reportDateRange[0] || !reportDateRange[1]) return;
    setIsReportLoading(true);
    try {
      const salesData = await window.api.getSalesByDateRange({
        startDate: startOfDay(reportDateRange[0]).toISOString(),
        endDate: endOfDay(reportDateRange[1]).toISOString(),
      });
      setSales(salesData);
    } catch (error) {
      console.error("Failed to fetch sales for report:", error);
    } finally {
      setIsReportLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dashboardDateRange]);

  useEffect(() => {
    if (activeTab === 'report') {
      fetchSalesData();
    }
  }, [reportDateRange, activeTab]);

  return (
    <div>
      <Title order={1} mb="xl">Sales</Title>
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="dashboard">Dashboard</Tabs.Tab>
          <Tabs.Tab value="report">Detailed Report</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="dashboard" pt="md">
          {isDashboardLoading ? <Center><Loader /></Center> :
            <Dashboard
              stats={stats}
              comparisonStats={comparisonStats}
              chartData={chartData}
              dateRange={dashboardDateRange}
              onDateChange={setDashboardDateRange}
            />
          }
        </Tabs.Panel>

        <Tabs.Panel value="report" pt="xs">
          {isReportLoading ? <Center><Loader /></Center> :
            <SalesReport
              sales={sales}
              dateRange={reportDateRange}
              onDateChange={setReportDateRange}
              onOpenVoidModal={handleOpenVoidModal}
            />
          }
        </Tabs.Panel>
      </Tabs>

      <VoidItemModal
        opened={voidModalOpened}
        onClose={closeVoidModal}
        order={orderToVoid}
        onVoidItem={handleVoidItem}
        onVoidFullOrder={handleVoidFullOrder}
      />
    </div>
  );
}