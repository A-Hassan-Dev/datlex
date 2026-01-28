import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Item, Location } from '../types';

interface StockValueHistogramProps {
    items: Item[];
    locations: Location[];
}

const StockValueHistogram: React.FC<StockValueHistogramProps> = ({ items, locations }) => {
    const data = useMemo(() => {
        const locationValues = new Map<string, number>();
        locations.forEach(loc => locationValues.set(loc.name, 0));

        locationValues.set('Unassigned', 0);

        items.forEach(item => {
            const cost = item.cost || 0;

            if (item.quantitiesByLocation) {
                Object.entries(item.quantitiesByLocation).forEach(([locId, qty]) => {
                    const location = locations.find(l => l.id === locId);
                    const locName = location ? location.name : 'Unassigned';
                    const currentVal = locationValues.get(locName) || 0;
                    locationValues.set(locName, currentVal + (Number(qty) * cost));
                });
            } else {
                const currentVal = locationValues.get('Unassigned') || 0;
                locationValues.set('Unassigned', currentVal + ((item.stockQuantity || 0) * cost));
            }
        });

        return Array.from(locationValues.entries())
            .map(([name, value]) => ({ name, value }))
            .filter(d => d.value > 0) // Optional: Hide 0 value locations to keep chart clean
            .sort((a, b) => b.value - a.value); // Sort descending
    }, [items, locations]);

    const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Stock Value by Location</h3>
            <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6b7280' }}
                            tickFormatter={(value) => `$${value.toLocaleString()}`}
                        />
                        <Tooltip
                            cursor={{ fill: '#f3f4f6' }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Total Value']}
                            contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default StockValueHistogram;
