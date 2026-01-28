import React, { useMemo } from 'react';
import { BreakdownRecord } from '../types';
import { Clock, Activity, BarChart2, AlertCircle } from 'lucide-react';

interface KPICardsProps {
    breakdowns: BreakdownRecord[];
}

const KPICards: React.FC<KPICardsProps> = ({ breakdowns }) => {
    const metrics = useMemo(() => {
        const closedBreakdowns = breakdowns.filter(b => b.status === 'Closed' || b.status === 'Resolved' && b.endTime);
        const failureCount = breakdowns.length;

        if (failureCount === 0) {
            return { mttr: 0, mtbf: 0, oee: 100 };
        }

        let totalDowntimeMinutes = 0;

        closedBreakdowns.forEach(b => {
            if (b.durationMinutes) {
                totalDowntimeMinutes += Number(b.durationMinutes);
            } else if (b.startTime && b.endTime) {
                const start = new Date(b.startTime).getTime();
                const end = new Date(b.endTime).getTime();
                totalDowntimeMinutes += (end - start) / (1000 * 60);
            }
        });

        const mttrHours = closedBreakdowns.length > 0
            ? (totalDowntimeMinutes / 60) / closedBreakdowns.length
            : 0;


        let mtbfHours = 0;
        let oee = 0;

        if (breakdowns.length > 0) {
            const sortedDates = [...breakdowns].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
            const firstMs = new Date(sortedDates[0].startTime).getTime();
            const lastMs = new Date().getTime(); // Until now
            const totalTimeMinutes = (lastMs - firstMs) / (1000 * 60);

            const totalDowntimeAll = totalDowntimeMinutes; // simplified, ideally include open downtime
            const totalUptimeMinutes = Math.max(0, totalTimeMinutes - totalDowntimeAll);

            mtbfHours = (totalUptimeMinutes / 60) / failureCount;

            oee = totalTimeMinutes > 0 ? (totalUptimeMinutes / totalTimeMinutes) * 100 : 100;
        }

        return {
            mttr: mttrHours,
            mtbf: mtbfHours,
            oee: oee
        };

    }, [breakdowns]);

    const cards = [
        {
            title: 'MTTR',
            value: `${metrics.mttr.toFixed(1)}h`,
            label: 'Mean Time To Repair',
            icon: Clock,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            title: 'MTBF',
            value: `${metrics.mtbf.toFixed(1)}h`,
            label: 'Mean Time Between Failures',
            icon: Activity,
            color: 'text-green-600',
            bg: 'bg-green-50'
        },
        {
            title: 'OEE (Availability)',
            value: `${metrics.oee.toFixed(1)}%`,
            label: 'Overall Equipment Effectiveness',
            icon: BarChart2,
            color: 'text-purple-600',
            bg: 'bg-purple-50'
        },
        {
            title: 'Total Failures',
            value: breakdowns.length.toString(),
            label: 'Recorded Breakdowns',
            icon: AlertCircle,
            color: 'text-red-600',
            bg: 'bg-red-50'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {cards.map((card, index) => (
                <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">{card.title}</p>
                        <h3 className="text-2xl font-bold text-gray-900">{card.value}</h3>
                        <p className="text-xs text-gray-400 mt-1">{card.label}</p>
                    </div>
                    <div className={`p-3 rounded-md ${card.bg}`}>
                        <card.icon className={`h-6 w-6 ${card.color}`} />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default KPICards;
