'use client';

import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { useEffect } from 'react';

export const DayjsReg = () => {
  useEffect(() => {
    dayjs.locale('zh-cn');
  }, []);
  return null;
};
