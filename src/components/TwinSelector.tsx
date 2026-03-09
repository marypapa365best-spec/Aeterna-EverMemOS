import React, { useState, useRef, useEffect } from 'react';

interface Option {
    id: string;
    label: string;
    avatar: string;
}

export const TWIN_OPTIONS: Option[] = [
    { id: 't-001', label: '工作分身 (Evermind)', avatar: '👩🏻‍💻' },
    { id: 't-002', label: '娱乐分身 (Chill)', avatar: '😎' }
];

interface TwinSelectorProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    options?: Option[];
}

export const TwinSelector: React.FC<TwinSelectorProps> = ({ value, onChange, disabled, options = TWIN_OPTIONS }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOpt = options.find(o => o.id === value) || options[0];

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`google-twin-selector ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`} ref={containerRef}>
            <div className="gts-inner">
                <button
                    className="gts-trigger"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                >
                    <div className="gts-left">
                        <span className="gts-item-avatar" style={{ fontSize: '20px', lineHeight: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' }}>
                            {selectedOpt.avatar}
                        </span>
                        <span className="gts-text">{selectedOpt.label}</span>
                    </div>

                    <div className="gts-right">
                        {/* Removed per user request */}
                    </div>
                </button>

                {isOpen && (
                    <div className="gts-menu">
                        <div className="gts-divider"></div>
                        {options.map(opt => (
                            <div
                                key={opt.id}
                                className="gts-item"
                                onClick={() => {
                                    onChange(opt.id);
                                    setIsOpen(false);
                                }}
                            >
                                <span className="gts-item-avatar" style={{ fontSize: '20px', lineHeight: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' }}>{opt.avatar}</span>
                                <span className="gts-item-text">{opt.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
