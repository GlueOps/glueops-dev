import React, { useState, useRef, useEffect } from 'react';
import { useCaptainDomain, DEFAULT_DOMAIN } from '@site/src/contexts/CaptainDomainContext';

export default function CaptainDomainInput() {
  const { captainDomain, setCaptainDomain, isDefault } = useCaptainDomain();
  const [inputValue, setInputValue] = useState(captainDomain);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setInputValue(captainDomain);
    }
  }, [captainDomain, isEditing]);

  const handleSubmit = () => {
    setCaptainDomain(inputValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Escape') {
      setInputValue(captainDomain);
      setIsEditing(false);
    }
  };

  const handleFocus = () => {
    setIsEditing(true);
    if (isDefault) {
      setInputValue('');
    }
  };

  const handleClear = () => {
    setCaptainDomain('');
    setInputValue('');
    setIsEditing(false);
  };

  return (
    <div className="captain-domain-input-wrapper">
      <label className="captain-domain-label" htmlFor="captain-domain-input">
        Captain Domain
      </label>
      <div className="captain-domain-input-container">
        <input
          ref={inputRef}
          id="captain-domain-input"
          className="captain-domain-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
          placeholder={DEFAULT_DOMAIN}
          spellCheck={false}
          autoComplete="off"
        />
        {!isDefault && (
          <button
            className="captain-domain-clear"
            onClick={handleClear}
            title="Reset to default"
            aria-label="Reset captain domain to default"
            tabIndex={-1}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
