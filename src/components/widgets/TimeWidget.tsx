import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import dayjs from 'dayjs';

export const TimeWidget = () => {
  const [time, setTime] = useState(dayjs());

  useEffect(() => {
    const timer = setInterval(() => setTime(dayjs()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-full backdrop-blur-sm border border-border/50">
      <Clock className="w-4 h-4" />
      <span>{time.format('HH:mm:ss')}</span>
    </div>
  );
};
