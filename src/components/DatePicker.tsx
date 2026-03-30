'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ChevronDownIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type DatePickerProps = {
  value?: Date;
  onChange: (result: Date | undefined) => void;
  placeholder?: string;
  className?: string;
};

export function DatePicker({
  value,
  onChange,
  placeholder = '选择日期',
  className,
}: DatePickerProps) {
  const [date, setDate] = useState<Date>();

  const onDatePickerChange = (nextDate: Date | undefined) => {
    setDate(nextDate);
    onChange(nextDate);
  };

  useEffect(() => {
    setDate(value);
  }, [value]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!date}
          className={cn(
            'w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground',
            className,
          )}
        >
          {date ? format(date, 'yyyy-MM-dd') : <span>{placeholder}</span>}
          <ChevronDownIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDatePickerChange}
          defaultMonth={date}
        />
      </PopoverContent>
    </Popover>
  );
}
