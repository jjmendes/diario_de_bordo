import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = "", title }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-slate-200 ${className}`}>
    {title && <div className="px-6 py-4 border-b border-slate-100 font-bold text-[#404040] rounded-t-lg">{title}</div>}
    <div className="p-6">{children}</div>
  </div>
);

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' }> = ({
  children, className = "", variant = 'primary', ...props
}) => {
  const variants = {
    primary: 'bg-[#940910] hover:bg-[#7a060c] text-white shadow-sm',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-[#404040] border border-slate-200',
    danger: 'bg-red-50 hover:bg-red-100 text-[#940910] border border-red-200',
    outline: 'border border-slate-300 hover:bg-slate-50 text-[#404040]',
    ghost: 'hover:bg-slate-50 text-[#404040]'
  };

  return (
    <button
      className={`px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Badge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, string> = {
    REGISTRADA: 'bg-slate-100 text-slate-600 border border-slate-200',
    EM_ANALISE: 'bg-[#F6B700]/10 text-[#b38600] border border-[#F6B700]/20',
    DEVOLVIDA: 'bg-orange-50 text-orange-700 border border-orange-200',
    CONCLUIDA: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    CANCELADA: 'bg-red-50 text-[#940910] border border-red-200'
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide font-bold ${colors[status] || colors['REGISTRADA']}`}>
      {status}
    </span>
  );
};

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#404040]/20 backdrop-blur-sm p-4 transition-all">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h3 className="text-lg font-bold text-[#940910]">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-[#940910] transition-colors bg-slate-50 hover:bg-slate-100 p-1 rounded-full">
            &times;
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

// --- CUSTOM DATE RANGE PICKER ---
interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse YYYY-MM-DD to Date object (local time safe)
  const parseDate = (str: string) => {
    if (!str) return new Date();
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const [viewDate, setViewDate] = useState(parseDate(startDate || new Date().toISOString().split('T')[0]));

  // Formatters
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Selecione';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const toISODate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calendar Logic
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const clickedStr = toISODate(clickedDate);

    if (!startDate || (startDate && endDate)) {
      // Start new range
      onChange(clickedStr, '');
    } else if (startDate && !endDate) {
      // Complete range
      if (clickedStr < startDate) {
        onChange(clickedStr, startDate);
      } else {
        onChange(startDate, clickedStr);
      }
      // Optional: Close on selection complete? 
      // setIsOpen(false); 
    }
  };

  const handlePreset = (type: 'TODAY' | 'YESTERDAY' | 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_7' | 'LAST_30') => {
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch (type) {
      case 'TODAY':
        break; // start/end are today
      case 'YESTERDAY':
        start.setDate(today.getDate() - 1);
        end.setDate(today.getDate() - 1);
        break;
      case 'THIS_MONTH':
        start.setDate(1);
        break;
      case 'LAST_MONTH':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0); // Last day of previous month
        break;
      case 'LAST_7':
        start.setDate(today.getDate() - 6);
        break;
      case 'LAST_30':
        start.setDate(today.getDate() - 29);
        break;
    }
    onChange(toISODate(start), toISODate(end));
    setViewDate(start); // Jump view to start
    setIsOpen(false);
  };

  const changeMonth = (delta: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1);
    setViewDate(newDate);
  };

  // Render Grid
  const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const firstDay = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());
  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="relative w-full md:w-auto" ref={containerRef}>
      {/* Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-3 bg-white border px-3 py-2 rounded-md cursor-pointer transition-all h-[38px] min-w-[240px] ${isOpen ? 'ring-2 ring-[#940910]/20 border-[#940910]' : 'border-slate-300 hover:border-[#940910]/50'}`}
      >
        <div className="flex items-center gap-2 text-sm text-[#404040]">
          <Calendar size={16} className="text-[#940910]" />
          <span className="font-medium">{formatDateDisplay(startDate)}</span>
          <span className="text-slate-400 text-xs">até</span>
          <span className="font-medium">{formatDateDisplay(endDate)}</span>
        </div>
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-xl z-50 flex flex-col md:flex-row overflow-hidden animate-in fade-in zoom-in-95 duration-100 w-[320px] md:w-[550px]">

          {/* Sidebar Presets */}
          <div className="bg-slate-50 p-2 border-b md:border-b-0 md:border-r border-slate-100 flex flex-row md:flex-col gap-1 overflow-x-auto md:w-[140px] shrink-0">
            <button onClick={() => handlePreset('TODAY')} className="text-xs text-left px-3 py-2 rounded hover:bg-white hover:shadow-sm text-[#404040] font-medium transition-colors">Hoje</button>
            <button onClick={() => handlePreset('YESTERDAY')} className="text-xs text-left px-3 py-2 rounded hover:bg-white hover:shadow-sm text-[#404040] font-medium transition-colors">Ontem</button>
            <button onClick={() => handlePreset('LAST_7')} className="text-xs text-left px-3 py-2 rounded hover:bg-white hover:shadow-sm text-[#404040] font-medium transition-colors">Últimos 7 dias</button>
            <button onClick={() => handlePreset('THIS_MONTH')} className="text-xs text-left px-3 py-2 rounded hover:bg-white hover:shadow-sm text-[#404040] font-medium transition-colors">Este Mês</button>
            <button onClick={() => handlePreset('LAST_MONTH')} className="text-xs text-left px-3 py-2 rounded hover:bg-white hover:shadow-sm text-[#404040] font-medium transition-colors">Mês Passado</button>
          </div>

          {/* Calendar Area */}
          <div className="p-4 flex-1">
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500"><ChevronLeft size={18} /></button>
              <span className="text-sm font-bold text-[#404040] uppercase tracking-wider">{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
              <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded-full text-slate-500"><ChevronRight size={18} /></button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => (
                <div key={d} className="text-[10px] font-bold text-slate-400">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {days.map((day, idx) => {
                if (day === null) return <div key={idx}></div>;

                const currentDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                const currentStr = toISODate(currentDate);

                // Selection Logic
                const isStart = currentStr === startDate;
                const isEnd = currentStr === endDate;
                const isInRange = startDate && endDate && currentStr > startDate && currentStr < endDate;
                const isToday = currentStr === toISODate(new Date());

                let classes = "w-8 h-8 flex items-center justify-center text-xs rounded-full cursor-pointer transition-all ";

                if (isStart || isEnd) {
                  classes += "bg-[#940910] text-white font-bold shadow-md transform scale-105";
                } else if (isInRange) {
                  classes += "bg-red-50 text-[#940910] font-medium rounded-none first:rounded-l-full last:rounded-r-full mx-[-2px] w-[calc(100%+4px)]";
                } else {
                  classes += "text-[#404040] hover:bg-slate-100 hover:text-[#940910]";
                  if (isToday) classes += " ring-1 ring-[#940910] font-bold";
                }

                return (
                  <div key={idx} className="flex justify-center items-center">
                    <div onClick={() => handleDateClick(day)} className={classes}>
                      {day}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
              <button
                onClick={() => {
                  onChange('', '');
                  setIsOpen(false);
                }}
                className="text-xs text-slate-500 hover:text-[#940910] font-medium hover:underline transition-colors"
              >
                Limpar Filtros
              </button>
              <button onClick={() => setIsOpen(false)} className="text-xs text-[#940910] font-bold hover:underline">Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// --- CUSTOM SELECT COMPONENT ---
interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  helperText?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({ label, value, onChange, options, placeholder = "Selecione...", disabled = false, required = false, helperText }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  const filteredOptions = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-[#404040] mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div
        className={`w-full border rounded-md bg-white flex items-center justify-between px-3 py-2 text-sm cursor-pointer transition-all ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' :
          isOpen ? 'ring-2 ring-[#940910]/20 border-[#940910]' : 'border-slate-300 hover:border-[#940910]/50'
          }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={value ? 'text-[#404040] font-medium' : 'text-slate-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {helperText && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-[500px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          {/* Optional: Search Input for long lists */}
          {options.length > 8 && (
            <div className="p-2 sticky top-0 bg-white border-b border-slate-100">
              <input
                autoFocus
                className="w-full border rounded px-2 py-1 text-xs outline-none focus:border-[#940910]"
                placeholder="Filtrar opções..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          <ul className="py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <li
                  key={option.value}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${option.value === value
                    ? 'bg-red-50 text-[#940910] font-bold'
                    : 'text-[#404040] hover:bg-red-50 hover:text-[#940910] transition-colors' // BRAND HOVER COLOR
                    }`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  {option.label}
                  {option.value === value && <Check size={14} />}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-xs text-slate-400 italic text-center">Nenhuma opção encontrada</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

// --- INPUT COMPONENT ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  endAdornment?: React.ReactNode;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  icon: Icon,
  endAdornment,
  error,
  helperText,
  className = "",
  ...props
}) => {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-[#404040] mb-1">
          {label} {props.required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && <Icon size={18} className="absolute left-3 top-3 text-slate-400" />}
        <input
          className={`w-full ${Icon ? 'pl-10' : 'pl-4'} ${endAdornment ? 'pr-10' : 'pr-4'} py-2 border rounded-md bg-white focus:ring-2 focus:ring-[#940910] outline-none text-[#404040] ${error ? 'border-red-500' : 'border-slate-300'} ${className}`}
          {...props}
        />
        {endAdornment && (
          <div className="absolute right-3 top-2.5 text-slate-400">
            {endAdornment}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
    </div>
  );
};

// --- TEXTAREA COMPONENT ---
interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  helperText,
  className = "",
  ...props
}) => {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-[#404040] mb-1">
          {label} {props.required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        className={`w-full px-4 py-2 border rounded-md bg-white focus:ring-2 focus:ring-[#940910] outline-none text-[#404040] ${error ? 'border-red-500' : 'border-slate-300'} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      {helperText && !error && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}
    </div>
  );
};