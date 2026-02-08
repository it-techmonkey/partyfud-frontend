'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api/admin.api';
import { Header } from '@/components/layout/Header';
import OrdersList from '@/components/admin/orders/OrdersList';

export default function AdminOrders() {
    return (
        <>
            <Header showAddButton={false} />
            <main className="flex-1 p-6 pt-24 bg-gray-50 min-h-screen">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">Orders</h1>
                            <p className="text-gray-600">Manage and view all orders on the platform</p>
                        </div>
                    </div>

                    <OrdersList />
                </div>
            </main>
        </>
    );
}
