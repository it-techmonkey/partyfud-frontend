
'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api/admin.api';
import { Header } from '@/components/layout/Header';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface OrderDetail {
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
        company_name: string | null;
    };
    items: Array<{
        id: string;
        package: {
            name: string;
            caterer: {
                company_name: string | null;
                first_name: string;
                last_name: string;
                catererinfo: {
                    business_name: string | null;
                } | null;
            };
        };
        add_ons: Array<{
            id: string;
            quantity: number;
            price_at_time: number;
            add_on: {
                name: string;
            };
        }>;
        price_at_time: number;
        quantity: number;
        guests: number | null;
        date: string | null;
        location: string | null;
    }>;
}

export default function OrderDetailPage() {
    const router = useRouter();
    const params = useParams();
    const [order, setOrder] = useState<OrderDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (params.id) {
            fetchOrder(params.id as string);
        }
    }, [params.id]);

    const fetchOrder = async (id: string) => {
        setLoading(true);
        try {
            const response = await adminApi.getOrderById(id);
            if (response && response.data && response.data.data) {
                setOrder(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching order:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'CONFIRMED': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'PAID': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
            case 'PREPARING': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'OUT_FOR_DELIVERY': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'DELIVERED': return 'bg-green-100 text-green-800 border-green-200';
            case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (loading) {
        return (
            <>
                <Header showAddButton={false} />
                <main className="flex-1 p-6 pt-24 bg-gray-50 min-h-screen">
                    <div className="max-w-7xl mx-auto flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#268700]"></div>
                    </div>
                </main>
            </>
        );
    }

    if (!order) {
        return (
            <>
                <Header showAddButton={false} />
                <main className="flex-1 p-6 pt-24 bg-gray-50 min-h-screen">
                    <div className="max-w-7xl mx-auto text-center py-20">
                        <h2 className="text-2xl font-semibold text-gray-900">Order not found</h2>
                        <Link href="/admin/orders" className="text-green-600 hover:underline mt-4 inline-block">
                            Back to Orders
                        </Link>
                    </div>
                </main>
            </>
        );
    }

    return (
        <>
            <Header showAddButton={false} />
            <main className="flex-1 p-6 pt-24 bg-gray-50 min-h-screen">
                <div className="max-w-5xl mx-auto space-y-6">

                    {/* Breadcrumb / Back */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                        <Link href="/admin/orders" className="hover:text-green-600 transition-colors">Orders</Link>
                        <span>/</span>
                        <span className="text-gray-900 font-medium">#{order.id.slice(0, 8)}</span>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Order Details</h1>
                            <p className="text-gray-500 mt-1">Placed on {new Date(order.created_at).toLocaleString()}</p>
                        </div>
                        <div className={`px-4 py-2 rounded-full border text-sm font-semibold tracking-wide uppercase ${getStatusColor(order.status)}`}>
                            {order.status.replace(/_/g, ' ')}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Left Column - Order Items */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                    <h2 className="font-semibold text-gray-900">Order Items</h2>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {order.items.map((item) => (
                                        <div key={item.id} className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900">{item.package.name}</h3>
                                                    <p className="text-sm text-gray-500">
                                                        Caterer: <span className="text-gray-900 font-medium font-medium">{item.package.caterer.catererinfo?.business_name || item.package.caterer.company_name || `${item.package.caterer.first_name} ${item.package.caterer.last_name}`}</span>
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-gray-900">{order.currency} {item.price_at_time.toLocaleString()}</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm bg-gray-50 p-4 rounded-lg">
                                                <div>
                                                    <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-1">Date & Time</p>
                                                    <p className="font-medium text-gray-900">
                                                        {item.date ? new Date(item.date).toLocaleDateString(undefined, {
                                                            weekday: 'long',
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        }) : 'Not specified'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-1">Guests</p>
                                                    <p className="font-medium text-gray-900">{item.guests || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs uppercase tracking-wide font-semibold mb-1">Location</p>
                                                    <p className="font-medium text-gray-900">{item.location || 'Not specified'}</p>
                                                </div>
                                            </div>

                                            {item.add_ons && item.add_ons.length > 0 && (
                                                <div className="mt-4 border-t border-gray-100 pt-4">
                                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Add-ons</p>
                                                    <ul className="space-y-2">
                                                        {item.add_ons.map((addon) => (
                                                            <li key={addon.id} className="flex justify-between text-sm">
                                                                <span className="text-gray-700">
                                                                    {addon.quantity}x {addon.add_on.name}
                                                                </span>
                                                                <span className="text-gray-900 font-medium">
                                                                    {order.currency} {(addon.price_at_time * addon.quantity).toLocaleString()}
                                                                </span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-gray-50 px-6 py-4 border-t border-gray-100">
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600 font-medium">Total Amount</span>
                                        <span className="text-2xl font-bold text-[#268700]">{order.currency} {order.total_price.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Customer Info */}
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                    <h2 className="font-semibold text-gray-900">Customer Details</h2>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                                            {order.user.first_name[0]}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{order.user.first_name} {order.user.last_name}</p>
                                            {order.user.company_name && (
                                                <p className="text-xs text-gray-500">{order.user.company_name}</p>
                                            )}
                                        </div>
                                    </div>

                                    <hr className="border-gray-100" />

                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Email</p>
                                            <a href={`mailto:${order.user.email}`} className="text-sm font-medium text-green-700 hover:underline break-all">
                                                {order.user.email}
                                            </a>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">Phone</p>
                                            <a href={`tel:${order.user.phone}`} className="text-sm font-medium text-gray-900 hover:text-green-700">
                                                {order.user.phone}
                                            </a>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-1">User ID</p>
                                            <p className="text-xs font-mono text-gray-400 select-all">
                                                {order.user.id}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </>
    );
}
