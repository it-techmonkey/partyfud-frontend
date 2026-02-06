
'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api/admin.api';
import { Header } from '@/components/layout/Header';
import { useRouter } from 'next/navigation';

interface Order {
    id: string;
    user_id: string;
    total_price: number;
    currency: string;
    status: 'PENDING' | 'CONFIRMED' | 'PAID' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
    created_at: string;
    updated_at: string;
    user: {
        id: string;
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
    };
    items: Array<{
        id: string;
        package: {
            name: string;
            caterer: {
                company_name: string | null;
                first_name: string;
                last_name: string;
            };
        };
    }>;
}

export default function AdminOrders() {
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [caterers, setCaterers] = useState<any[]>([]);
    const [catererFilter, setCatererFilter] = useState('ALL');

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchOrders();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery, statusFilter, startDate, endDate, catererFilter]);

    useEffect(() => {
        fetchCaterers();
    }, []);

    const fetchCaterers = async () => {
        try {
            const response = await adminApi.getCatererInfo();
            if (response && response.data) {
                // Filter duplicated caterers if any or just allow all
                // The API returns { success, data: Array, count } wrapped in ApiResponse.data
                setCaterers(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching caterers:', error);
        }
    };

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params: any = {};
            if (statusFilter !== 'ALL') params.status = statusFilter;
            if (startDate) params.startDate = startDate;
            if (endDate) params.endDate = endDate;
            if (searchQuery) params.search = searchQuery;
            if (catererFilter !== 'ALL') params.catererId = catererFilter;

            const response = await adminApi.getAllOrders(params);
            if (response && response.data && response.data.data) {
                setOrders(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800';
            case 'CONFIRMED':
                return 'bg-blue-100 text-blue-800';
            case 'PAID':
                return 'bg-indigo-100 text-indigo-800';
            case 'PREPARING':
                return 'bg-purple-100 text-purple-800';
            case 'OUT_FOR_DELIVERY':
                return 'bg-orange-100 text-orange-800';
            case 'DELIVERED':
                return 'bg-green-100 text-green-800';
            case 'CANCELLED':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Client-side filtering is no longer needed as we do backend filtering
    const filteredOrders = orders;

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

                    {/* Filters Section */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            {/* Search */}
                            <div className="relative">
                                <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Order ID, Customer..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                    <svg
                                        className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Status Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                                >
                                    <option value="ALL">All Status</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="CONFIRMED">Confirmed</option>
                                    <option value="PAID">Paid</option>
                                    <option value="PREPARING">Preparing</option>
                                    <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                                    <option value="DELIVERED">Delivered</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>

                            {/* Caterer Filter */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Caterer</label>
                                <select
                                    value={catererFilter}
                                    onChange={(e) => setCatererFilter(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                                >
                                    <option value="ALL">All Caterers</option>
                                    {caterers.map((cat) => (
                                        <option key={cat.id} value={cat.caterer_id}>
                                            {cat.business_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Start Date */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                                />
                            </div>

                            {/* End Date */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                        {loading ? (
                            <div className="flex justify-center items-center py-20">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#268700]"></div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Order ID
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Customer
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Items
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Total Price
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredOrders.length > 0 ? (
                                            filteredOrders.map((order) => (
                                                <tr
                                                    key={order.id}
                                                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                                                    onClick={() => router.push(`/admin/orders/${order.id}`)}
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        #{order.id.slice(0, 8)}...
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {order.user.first_name} {order.user.last_name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">{order.user.email}</div>
                                                        <div className="text-sm text-gray-500">{order.user.phone}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm text-gray-900 max-w-xs break-words">
                                                            {order.items.map((item, idx) => (
                                                                <div key={idx} className="mb-1">
                                                                    <span className="font-medium">{item.package.name}</span>
                                                                    <span className="text-gray-500 text-xs block">
                                                                        by {item.package.caterer.company_name || `${item.package.caterer.first_name} ${item.package.caterer.last_name}`}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {order.currency} {order.total_price.toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                                            {order.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {new Date(order.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                                    No orders found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}
