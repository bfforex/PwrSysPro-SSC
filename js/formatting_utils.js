/**
 * formatting_utils.js
 * Numeric formatting utilities for power system calculations
 * Ensures proper significant digits and prevents misleading "0.00" displays
 */

/**
 * Format current value with appropriate precision
 * Ensures at least 3 significant digits and prevents "0.00 kA" for non-zero values
 * 
 * @param {number} currentKA - Current in kA
 * @param {number} minSigFigs - Minimum significant figures (default: 3)
 * @returns {string} Formatted current value
 */
function formatCurrent(currentKA, minSigFigs = 3) {
    if (currentKA === 0 || !isFinite(currentKA) || isNaN(currentKA)) {
        return '0.00';
    }
    
    const absValue = Math.abs(currentKA);
    
    // For very small values that would round to 0.00, use scientific notation
    if (absValue < 0.005) {
        return currentKA.toExponential(minSigFigs - 1);
    }
    
    // For values < 1 kA, show more decimal places
    if (absValue < 1) {
        return currentKA.toFixed(3);
    }
    
    // For values 1-10 kA, show 2 decimal places
    if (absValue < 10) {
        return currentKA.toFixed(2);
    }
    
    // For values >= 10 kA, show 1 decimal place
    if (absValue < 100) {
        return currentKA.toFixed(1);
    }
    
    // For very large values, show no decimals
    return currentKA.toFixed(0);
}

/**
 * Format impedance value with appropriate precision
 * 
 * @param {number} impedanceOhm - Impedance in Ω
 * @param {number} minSigFigs - Minimum significant figures (default: 4)
 * @returns {string} Formatted impedance value
 */
function formatImpedance(impedanceOhm, minSigFigs = 4) {
    if (impedanceOhm === 0 || !isFinite(impedanceOhm) || isNaN(impedanceOhm)) {
        return '0.0000';
    }
    
    const absValue = Math.abs(impedanceOhm);
    
    // For very small values, use scientific notation
    if (absValue < 0.00001) {
        return impedanceOhm.toExponential(minSigFigs - 1);
    }
    
    // For small impedances (< 0.001 Ω), show 6 decimals
    if (absValue < 0.001) {
        return impedanceOhm.toFixed(6);
    }
    
    // For impedances < 0.1 Ω, show 5 decimals
    if (absValue < 0.1) {
        return impedanceOhm.toFixed(5);
    }
    
    // For impedances < 1 Ω, show 4 decimals
    if (absValue < 1) {
        return impedanceOhm.toFixed(4);
    }
    
    // For larger impedances, show 3 decimals
    if (absValue < 10) {
        return impedanceOhm.toFixed(3);
    }
    
    // For very large impedances
    return impedanceOhm.toFixed(2);
}

/**
 * Format voltage with appropriate precision
 * 
 * @param {number} voltage - Voltage in V
 * @returns {string} Formatted voltage value
 */
function formatVoltage(voltage) {
    if (voltage === 0 || !isFinite(voltage) || isNaN(voltage)) {
        return '0';
    }
    
    const absValue = Math.abs(voltage);
    
    // For voltages < 1000 V, show 1 decimal
    if (absValue < 1000) {
        return voltage.toFixed(1);
    }
    
    // For higher voltages, show no decimals
    return voltage.toFixed(0);
}

/**
 * Format power (MVA, MW, etc.) with appropriate precision
 * 
 * @param {number} powerMVA - Power in MVA
 * @returns {string} Formatted power value
 */
function formatPower(powerMVA) {
    if (powerMVA === 0 || !isFinite(powerMVA) || isNaN(powerMVA)) {
        return '0.00';
    }
    
    const absValue = Math.abs(powerMVA);
    
    // For small values < 0.01, use scientific notation
    if (absValue < 0.01) {
        return powerMVA.toExponential(2);
    }
    
    // For values < 1, show 3 decimals
    if (absValue < 1) {
        return powerMVA.toFixed(3);
    }
    
    // For values < 10, show 2 decimals
    if (absValue < 10) {
        return powerMVA.toFixed(2);
    }
    
    // For larger values, show 1 decimal
    return powerMVA.toFixed(1);
}

/**
 * Format ratio (X/R, R/X, etc.) with appropriate precision
 * 
 * @param {number} ratio - Ratio value
 * @returns {string} Formatted ratio value
 */
function formatRatio(ratio) {
    if (!isFinite(ratio) || isNaN(ratio)) {
        return 'N/A';
    }
    
    if (ratio === 0) {
        return '0.00';
    }
    
    const absValue = Math.abs(ratio);
    
    // For small ratios, show more precision
    if (absValue < 1) {
        return ratio.toFixed(3);
    }
    
    // For typical ratios, show 2 decimals
    return ratio.toFixed(2);
}

/**
 * Format percentage with appropriate precision
 * 
 * @param {number} percent - Percentage value
 * @returns {string} Formatted percentage value
 */
function formatPercent(percent) {
    if (!isFinite(percent) || isNaN(percent)) {
        return 'N/A';
    }
    
    if (percent === 0) {
        return '0.0';
    }
    
    const absValue = Math.abs(percent);
    
    // For small percentages, show 2 decimals
    if (absValue < 1) {
        return percent.toFixed(2);
    }
    
    // For typical percentages, show 1 decimal
    return percent.toFixed(1);
}

/**
 * Format time constant with appropriate precision
 * 
 * @param {number} tau_s - Time constant in seconds
 * @returns {string} Formatted time constant with unit
 */
function formatTimeConstant(tau_s) {
    if (!isFinite(tau_s) || isNaN(tau_s) || tau_s === 0) {
        return '0 ms';
    }
    
    const absValue = Math.abs(tau_s);
    
    // For very small values, show in microseconds
    if (absValue < 0.001) {
        return (tau_s * 1e6).toFixed(1) + ' μs';
    }
    
    // For small values, show in milliseconds
    if (absValue < 1) {
        return (tau_s * 1000).toFixed(2) + ' ms';
    }
    
    // For larger values, show in seconds
    return tau_s.toFixed(3) + ' s';
}

/**
 * Format number with engineering notation (k, M, G prefixes)
 * 
 * @param {number} value - Value to format
 * @param {string} unit - Unit symbol (e.g., 'A', 'V', 'Ω')
 * @param {number} decimals - Decimal places (default: 2)
 * @returns {string} Formatted value with unit
 */
function formatEngineering(value, unit = '', decimals = 2) {
    if (!isFinite(value) || isNaN(value)) {
        return 'N/A';
    }
    
    if (value === 0) {
        return `0${unit}`;
    }
    
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    // Giga (10^9)
    if (absValue >= 1e9) {
        return sign + (absValue / 1e9).toFixed(decimals) + ' G' + unit;
    }
    
    // Mega (10^6)
    if (absValue >= 1e6) {
        return sign + (absValue / 1e6).toFixed(decimals) + ' M' + unit;
    }
    
    // Kilo (10^3)
    if (absValue >= 1e3) {
        return sign + (absValue / 1e3).toFixed(decimals) + ' k' + unit;
    }
    
    // Base unit
    if (absValue >= 1) {
        return sign + absValue.toFixed(decimals) + ' ' + unit;
    }
    
    // Milli (10^-3)
    if (absValue >= 1e-3) {
        return sign + (absValue * 1e3).toFixed(decimals) + ' m' + unit;
    }
    
    // Micro (10^-6)
    if (absValue >= 1e-6) {
        return sign + (absValue * 1e6).toFixed(decimals) + ' μ' + unit;
    }
    
    // Nano (10^-9)
    return sign + (absValue * 1e9).toFixed(decimals) + ' n' + unit;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatCurrent,
        formatImpedance,
        formatVoltage,
        formatPower,
        formatRatio,
        formatPercent,
        formatTimeConstant,
        formatEngineering
    };
}

// Export to window for browser usage
if (typeof window !== 'undefined') {
    window.FormattingUtils = {
        formatCurrent,
        formatImpedance,
        formatVoltage,
        formatPower,
        formatRatio,
        formatPercent,
        formatTimeConstant,
        formatEngineering
    };
}
