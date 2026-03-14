import React, { useState, useRef, useEffect } from 'react';

const TWIN_AVATAR_STORAGE_KEY = 'twin_avatar';

interface Option {
    id: string;
    label: string;
    avatar: string;
}

export const TWIN_OPTIONS: Option[] = [
    { id: 't-001', label: '数字永生分身', avatar: '🧬' }
];

interface TwinSelectorProps {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    options?: Option[];
}

function getDisplayAvatar(opt: Option, storedAvatar: string | null): string {
    if (opt.id === 't-001' && storedAvatar) return storedAvatar;
    return opt.avatar;
}

function AvatarCell({ avatar }: { avatar: string }) {
    const isImg = avatar.startsWith('/') || avatar.startsWith('data:');
    return (
        <span className="gts-item-avatar">
            {isImg ? (
                <img src={avatar} alt="" className="gts-item-avatar-img" />
            ) : (
                <span className="gts-item-avatar-emoji">{avatar}</span>
            )}
        </span>
    );
}

export const TwinSelector: React.FC<TwinSelectorProps> = ({ value, onChange, disabled, options = TWIN_OPTIONS }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [storedAvatar, setStoredAvatar] = useState<string | null>(() => {
        try {
            return window.localStorage.getItem(TWIN_AVATAR_STORAGE_KEY);
        } catch {
            return null;
        }
    });

    const selectedOpt = options.find(o => o.id === value) || options[0];
    const displayAvatar = getDisplayAvatar(selectedOpt, storedAvatar);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        try {
            setStoredAvatar(window.localStorage.getItem(TWIN_AVATAR_STORAGE_KEY));
        } catch { /* ignore */ }
    }, [isOpen]);

    return (
        <div className={`google-twin-selector ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`} ref={containerRef}>
            <div className="gts-inner">
                <button
                    className="gts-trigger"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    disabled={disabled}
                >
                    <div className="gts-left">
                        <AvatarCell avatar={displayAvatar} />
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
                                <AvatarCell avatar={getDisplayAvatar(opt, storedAvatar)} />
                                <span className="gts-item-text">{opt.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
