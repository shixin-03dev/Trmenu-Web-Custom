import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import dayjs from 'dayjs';

export const WeekendWidget = () => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    const now = dayjs();
    const dayOfWeek = now.day(); // 0 is Sunday, 6 is Saturday
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      setMessage("享受你的周末! 🎉");
    } else {
      const daysUntilWeekend = 6 - dayOfWeek;
      setMessage(`距离周末还有 ${daysUntilWeekend} 天 🚀`);
    }
  }, []);

  return (
    <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full backdrop-blur-sm border border-border/50">
      <Calendar className="w-4 h-4" />
      <span>{message}</span>
    </div>
  );
};
