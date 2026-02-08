'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api/admin.api';

interface CatererFinancialsProps {
    catererId: string;
}

interface FinancialData {
    totalRevenue: number;
    commissionRate: number;
    platformFee: number;
    netPayout: number;
    completedOrdersCount: number;
    cancelledOrdersCount: number;
    pendingOrdersCount: number;
}

// Default empty financial data
const defaultFinancials: FinancialData = {
    totalRevenue: 0,
    commissionRate: 0,
    platformFee: 0,
    netPayout: 0,
    completedOrdersCount: 0,
    cancelledOrdersCount: 0,
    pendingOrdersCount: 0
};

export default function CatererFinancials({ catererId }: CatererFinancialsProps) {
    const [financials, setFinancials] = useState<FinancialData>(defaultFinancials);
    const [loading, setLoading] = useState(true);

    const fetchFinancials = useCallback(async () => {
        if (!catererId) {
            console.warn('[CatererFinancials] No catererId provided, using defaults');
            setFinancials(defaultFinancials);
            setLoading(false);
            return;
        }

        setLoading(true);
        
        try {
            console.log(`[CatererFinancials] ==========================================`);
            console.log(`[CatererFinancials] Starting fetch for catererId: ${catererId}`);
            console.log(`[CatererFinancials] CatererId type: ${typeof catererId}`);
            console.log(`[CatererFinancials] CatererId length: ${catererId?.length}`);
            
            const response = await adminApi.getCatererFinancials(catererId);
            
            console.log('[CatererFinancials] ==========================================');
            console.log('[CatererFinancials] Response from adminApi:', response);
            console.log('[CatererFinancials] Response type:', typeof response);
            console.log('[CatererFinancials] Response keys:', Object.keys(response || {}));
            console.log('[CatererFinancials] response.error:', response.error);
            console.log('[CatererFinancials] response.data:', response.data);
            console.log('[CatererFinancials] response.data type:', typeof response.data);
            
            // adminApi.getCatererFinancials returns { data: {...} } or { error: "..." }
            // The data extraction is already done in the API function
            
            if (response.error) {
                console.warn('[CatererFinancials] ❌ API Error (using defaults):', response.error);
                setFinancials(defaultFinancials);
                setLoading(false);
                return;
            }

            if (response.data && typeof response.data === 'object') {
                // Validate that we have the required fields
                const data = response.data as any;
                console.log('[CatererFinancials] Data object keys:', Object.keys(data));
                console.log('[CatererFinancials] totalRevenue type:', typeof data.totalRevenue);
                console.log('[CatererFinancials] totalRevenue value:', data.totalRevenue);
                
                if (typeof data.totalRevenue === 'number') {
                    const financialData = {
                        totalRevenue: Number(data.totalRevenue) || 0,
                        commissionRate: Number(data.commissionRate) || 0,
                        platformFee: Number(data.platformFee) || 0,
                        netPayout: Number(data.netPayout) || 0,
                        completedOrdersCount: Number(data.completedOrdersCount) || 0,
                        cancelledOrdersCount: Number(data.cancelledOrdersCount) || 0,
                        pendingOrdersCount: Number(data.pendingOrdersCount) || 0,
                    };
                    console.log('[CatererFinancials] ✅ Financial data received and set:', financialData);
                    setFinancials(financialData);
                } else {
                    console.warn('[CatererFinancials] ⚠️ Invalid data structure - totalRevenue is not a number');
                    console.warn('[CatererFinancials] Data received:', JSON.stringify(data, null, 2));
                    setFinancials(defaultFinancials);
                }
            } else {
                console.warn('[CatererFinancials] ⚠️ No data in response or data is not an object');
                console.warn('[CatererFinancials] Response:', JSON.stringify(response, null, 2));
                setFinancials(defaultFinancials);
            }
            
            console.log('[CatererFinancials] ==========================================');
        } catch (err: any) {
            console.warn('[CatererFinancials] Exception occurred (using defaults):', err);
            // Use default values instead of showing error
            setFinancials(defaultFinancials);
        } finally {
            setLoading(false);
        }
    }, [catererId]);

    useEffect(() => {
        if (catererId) {
            fetchFinancials();
        }
    }, [catererId, fetchFinancials]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#268700]"></div>
            </div>
        );
    }

    // Always show the UI, even if there's an error or no data
    // The financials state will always have default values (zeros)

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-gray-300 rounded-full"></span>
                Financial Overview
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Revenue */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-green-50 rounded-lg">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">
                            AED {financials.totalRevenue.toLocaleString()}
                        </h3>
                    </div>
                </div>

                {/* Net Payout */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Net Payout</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">
                            AED {financials.netPayout.toLocaleString()}
                        </h3>
                    </div>
                </div>

                {/* Platform Fees */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {financials.commissionRate}%
                        </span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Platform Fees</p>
                        <h3 className="text-2xl font-bold text-gray-900 mt-1">
                            AED {financials.platformFee.toLocaleString()}
                        </h3>
                    </div>
                </div>

                {/* Orders Summary */}
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                        </div>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Orders</p>
                        <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Completed:</span>
                                <span className="font-semibold text-green-600">{financials.completedOrdersCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Pending:</span>
                                <span className="font-semibold text-yellow-600">{financials.pendingOrdersCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Cancelled:</span>
                                <span className="font-semibold text-red-600">{financials.cancelledOrdersCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
