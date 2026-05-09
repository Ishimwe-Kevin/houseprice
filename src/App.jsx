import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000/predict';

const DISTRICTS = [
  'Gasabo', 'Kicukiro', 'Nyarugenge',
  'Bugesera', 'Gatsibo', 'Kayonza', 'Kirehe', 'Ngoma', 'Nyagatare', 'Rwamagana',
  'Burera', 'Gakenke', 'Gicumbi', 'Musanze', 'Rulindo',
  'Gisagara', 'Huye', 'Kamonyi', 'Muhanga', 'Nyamagabe', 'Nyanza', 'Nyaruguru', 'Ruhango',
  'Karongi', 'Ngororero', 'Nyabihu', 'Nyamasheke', 'Rubavu', 'Rusizi', 'Rutsiro',
];

// ---------- Custom Combobox Component ----------
function Combobox({ value, onChange, options, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [filtered.length]);

  // Sync internal search term with external value
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  const selectOption = (option) => {
    onChange(option);
    setSearchTerm(option);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        setHighlightedIndex((prev) => (prev + 1) % filtered.length);
        e.preventDefault();
        break;
      case 'ArrowUp':
        setHighlightedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
        e.preventDefault();
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
          selectOption(filtered[highlightedIndex]);
        }
        e.preventDefault();
        break;
      case 'Escape':
        setIsOpen(false);
        inputRef.current?.blur();
        break;
      default:
        break;
    }
  };

  // Scroll the highlighted option into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex];
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onChange(e.target.value); // allow free text
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          autoComplete="off"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              onChange('');
              inputRef.current?.focus();
              setIsOpen(true);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear selection"
          >
            ✕
          </button>
        )}
      </div>
      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-48 overflow-auto"
          role="listbox"
        >
          {filtered.map((option, index) => (
            <li
              key={option}
              id={`option-${index}`}
              role="option"
              aria-selected={value === option}
              className={`px-3 py-2 cursor-pointer text-sm ${
                index === highlightedIndex
                  ? 'bg-blue-100 text-blue-800'
                  : value === option
                  ? 'bg-blue-50'
                  : 'hover:bg-gray-100'
              }`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onMouseDown={() => selectOption(option)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
      {isOpen && filtered.length === 0 && searchTerm && (
        <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg py-2 px-3 text-sm text-gray-500">
          No district found
        </div>
      )}
    </div>
  );
}

// ---------- Main App ----------
function App() {
  const [formData, setFormData] = useState({
    size: '',
    bedrooms: '',
    bathrooms: '',
    location: '',
  });
  const [predictedPrice, setPredictedPrice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setError('');
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLocationChange = (location) => {
    setError('');
    setFormData((prev) => ({ ...prev, location }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.size <= 0 || formData.bedrooms < 0 || formData.bathrooms < 0) {
      setError('Please enter valid positive numbers for size, bedrooms, and bathrooms.');
      return;
    }
    if (!formData.location.trim()) {
      setError('Please select or enter a valid district.');
      return;
    }

    setLoading(true);
    setError('');
    setPredictedPrice(null);

    try {
      const response = await axios.post(API_URL, formData);
      setPredictedPrice(response.data.predicted_price);
    } catch (err) {
      console.error('Prediction error:', err);
      setError(
        err.response?.data?.message ||
        'Unable to get prediction. Please check your input and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount) =>
    new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="bg-blue-600 px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Rwanda House Price Predictor</h1>
          <p className="text-blue-100 text-sm mt-1">
            Estimate the market value of a property based on key features
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6" noValidate>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Size */}
            <div>
              <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-1">
                Size (sq ft)
              </label>
              <input
                id="size"
                type="number"
                name="size"
                value={formData.size}
                onChange={handleChange}
                min="1"
                step="any"
                placeholder="e.g. 1500"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                required
              />
            </div>

            {/* Bedrooms */}
            <div>
              <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700 mb-1">
                Bedrooms
              </label>
              <input
                id="bedrooms"
                type="number"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                min="0"
                step="1"
                placeholder="e.g. 3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                required
              />
            </div>

            {/* Bathrooms */}
            <div>
              <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700 mb-1">
                Bathrooms
              </label>
              <input
                id="bathrooms"
                type="number"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                min="0"
                step="any"
                placeholder="e.g. 2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                required
              />
            </div>

            {/* Location Combobox */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                District
              </label>
              <Combobox
                value={formData.location}
                onChange={handleLocationChange}
                options={DISTRICTS}
                placeholder="Search district..."
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Predicting...
              </>
            ) : (
              'Predict Price'
            )}
          </button>
        </form>

        {/* Result */}
        {predictedPrice !== null && !error && (
          <div className="border-t border-gray-200 px-6 py-4 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 font-medium">Estimated Price</span>
              <span className="text-2xl font-bold text-green-600">
                {formatPrice(predictedPrice)}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              This is an AI‑based estimate. Actual market price may vary.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;