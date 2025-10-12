/**
 * standard_specific_calcs.js
 * Standards-specific calculation factors and methods
 * Implements IEC 60909-0, IEEE, and ANSI calculation standards
 */

/**
 * IEC 60909-0 Voltage Factors
 */
const IEC_VOLTAGE_FACTORS = {
    // cmax factors for maximum short-circuit current
    cmax: {
        LV: {
            '230V': 1.05,
            '400V': 1.05,
            '690V': 1.05,
            default: 1.05
        },
        MV: {
            range: [1, 35], // kV
            factor: 1.10
        },
        HV: {
            range: [35, 230], // kV
            factor: 1.10
        }
    },
    // cmin factors for minimum short-circuit current
    cmin: {
        LV: {
            '230V': 0.95,
            '400V': 0.95,
            '690V': 0.95,
            default: 0.95
        },
        MV: {
            range: [1, 35], // kV
            factor: 1.00
        },
        HV: {
            range: [35, 230], // kV
            factor: 1.00
        }
    }
};

/**
 * IEEE/ANSI Multiplying Factors
 */
const IEEE_MULTIPLYING_FACTORS = {
    // Multiplication factors for different fault types
    symmetrical: {
        threephase: 1.0,
        lineToLine: 0.866, // √3/2
        lineToGround: 1.0 // depends on grounding
    },
    // Asymmetry factors based on X/R ratio
    asymmetryFactors: {
        // X/R ratio ranges and corresponding multiplying factors
        ranges: [
            { xrMin: 0, xrMax: 4.9, factor: 1.0 },
            { xrMin: 5, xrMax: 9.9, factor: 1.1 },
            { xrMin: 10, xrMax: 14.9, factor: 1.2 },
            { xrMin: 15, xrMax: 19.9, factor: 1.25 },
            { xrMin: 20, xrMax: 29.9, factor: 1.3 },
            { xrMin: 30, xrMax: 44.9, factor: 1.4 },
            { xrMin: 45, xrMax: 59.9, factor: 1.5 },
            { xrMin: 60, xrMax: Infinity, factor: 1.6 }
        ]
    },
    // C37 standard multiplying factors for circuit breaker ratings
    c37Factors: {
        local: 1.0,
        remote: 1.5,
        nearGenerator: 1.2
    }
};

/**
 * ANSI C37 Standards
 */
const ANSI_C37_STANDARDS = {
    // Circuit breaker voltage ratings
    voltageRatings: [
        { nominal: 4.16, max: 4.76, BIL: 60 },
        { nominal: 4.8, max: 5.5, BIL: 60 },
        { nominal: 6.9, max: 7.2, BIL: 60 },
        { nominal: 13.8, max: 15, BIL: 95 },
        { nominal: 23, max: 25.8, BIL: 150 },
        { nominal: 34.5, max: 38, BIL: 200 },
        { nominal: 46, max: 48.3, BIL: 250 },
        { nominal: 69, max: 72.5, BIL: 350 }
    ],
    // Standard interrupting times (cycles at 60Hz)
    interruptingTimes: {
        standard: 3, // 3 cycles = 0.05s at 60Hz
        fast: 2,
        slow: 5
    }
};

/**
 * Get IEC voltage factor (cmax or cmin)
 */
function getIECVoltageFactor(voltage, factorType = 'cmax') {
    const voltageKV = voltage / 1000;
    const factors = IEC_VOLTAGE_FACTORS[factorType];
    
    // Low voltage
    if (voltage <= 1000) {
        return factors.LV.default;
    }
    
    // Medium voltage
    if (voltageKV >= factors.MV.range[0] && voltageKV < factors.MV.range[1]) {
        return factors.MV.factor;
    }
    
    // High voltage
    if (voltageKV >= factors.HV.range[0] && voltageKV <= factors.HV.range[1]) {
        return factors.HV.factor;
    }
    
    // Default
    return 1.0;
}

/**
 * Calculate IEC impedance correction factor
 */
function calculateIECImpedanceCorrection(voltage, impedanceOhm, faultType = 'max') {
    const cFactor = getIECVoltageFactor(voltage, faultType === 'max' ? 'cmax' : 'cmin');
    const correctedVoltage = voltage * cFactor / Math.sqrt(3);
    return { cFactor, correctedVoltage };
}

/**
 * Get IEEE asymmetry factor based on X/R ratio
 */
function getIEEEAsymmetryFactor(xrRatio) {
    const ranges = IEEE_MULTIPLYING_FACTORS.asymmetryFactors.ranges;
    
    for (const range of ranges) {
        if (xrRatio >= range.xrMin && xrRatio <= range.xrMax) {
            return range.factor;
        }
    }
    
    return 1.0; // default
}

/**
 * Calculate peak fault current using IEC method
 */
function calculateIECPeakCurrent(symmetricalCurrent, xrRatio) {
    // IEC 60909-0 equation: ip = κ × √2 × I"k
    // where κ = 1.02 + 0.98 × e^(-3R/X)
    const kappa = 1.02 + 0.98 * Math.exp(-3 / xrRatio);
    const peakCurrent = kappa * Math.sqrt(2) * symmetricalCurrent;
    
    return {
        kappa: kappa,
        peakCurrent: peakCurrent,
        method: 'IEC 60909-0'
    };
}

/**
 * Calculate first-cycle RMS asymmetrical current multiplier
 * Per ANSI/IEEE C37.010 and IEEE 141
 * 
 * This function calculates the multiplier to convert symmetrical RMS current
 * to first-cycle (momentary) RMS asymmetrical current.
 * 
 * Formula: Multiplier = √(1 + 2e^(-4π/(X/R)))
 * 
 * Note: This is an approximation. For more precise values, use table lookup
 * from IEEE standards or the simplified range-based factors.
 * 
 * References:
 * - IEEE Std 141-1993 (Red Book), Section 4.3
 * - ANSI C37.010-1999, Section 5.4.1
 * - IEEE Std 242-2001 (Buff Book), Chapter 2
 * 
 * @param {number} xrRatio - X/R ratio at fault location
 * @returns {number} First-cycle RMS asymmetrical multiplier (typically 1.0 to 1.6)
 */
function calculateFirstCycleAsymmetricalMultiplier(xrRatio) {
    // IEEE C37.010 approximation formula for first-cycle asymmetrical RMS
    // This accounts for the DC offset component during the first cycle
    // Factor = √(1 + 2e^(-4π/(X/R)))
    // The -4π term represents approximately 2 cycles at 60 Hz
    const multiplier = Math.sqrt(1 + 2 * Math.pow(Math.E, -4 * Math.PI / xrRatio));
    
    // Validate result is within reasonable bounds
    // For X/R = 0, multiplier ≈ 1.0 (purely resistive, no asymmetry)
    // For X/R → ∞, multiplier ≈ 1.732 (√3, maximum theoretical)
    return Math.max(1.0, Math.min(1.732, multiplier));
}

/**
 * Calculate peak fault current using IEEE method
 */
function calculateIEEEPeakCurrent(symmetricalCurrent, xrRatio) {
    // IEEE method: Ip = 2 × √2 × Irms × multiplying factor
    // For momentary duty rating (first cycle), use table-based factor
    const asymmetryFactor = getIEEEAsymmetryFactor(xrRatio);
    const peakCurrent = 2 * Math.sqrt(2) * symmetricalCurrent * asymmetryFactor;
    
    return {
        asymmetryFactor: asymmetryFactor,
        peakCurrent: peakCurrent,
        method: 'IEEE/ANSI'
    };
}

/**
 * Calculate short circuit current per IEC 60909-0
 */
function calculateIECShortCircuit(params) {
    const {
        voltage,
        impedanceR,
        impedanceX,
        faultType = 'max'
    } = params;
    
    // Get voltage factor
    const { cFactor, correctedVoltage } = calculateIECImpedanceCorrection(voltage, 0, faultType);
    
    // Calculate impedance
    const impedanceTotal = Math.sqrt(impedanceR * impedanceR + impedanceX * impedanceX);
    const xrRatio = impedanceR > 0 ? impedanceX / impedanceR : 20;
    
    // Calculate initial symmetrical short-circuit current
    const initialCurrent = (correctedVoltage / Math.sqrt(3)) / impedanceTotal;
    
    // Calculate peak short-circuit current
    const peak = calculateIECPeakCurrent(initialCurrent, xrRatio);
    
    return {
        standard: 'IEC 60909-0',
        voltageFactor: cFactor,
        correctedVoltage: correctedVoltage,
        symmetricalCurrent: initialCurrent,
        peakCurrent: peak.peakCurrent,
        kappa: peak.kappa,
        xrRatio: xrRatio,
        impedanceTotal: impedanceTotal
    };
}

/**
 * Calculate short circuit current per IEEE/ANSI standards
 */
function calculateIEEEShortCircuit(params) {
    const {
        voltage,
        impedanceR,
        impedanceX,
        faultLocation = 'remote'
    } = params;
    
    // Calculate impedance
    const impedanceTotal = Math.sqrt(impedanceR * impedanceR + impedanceX * impedanceX);
    const xrRatio = impedanceR > 0 ? impedanceX / impedanceR : 20;
    
    // Calculate symmetrical fault current
    const symmetricalCurrent = voltage / (Math.sqrt(3) * impedanceTotal);
    
    // Get multiplying factor
    const multiplyingFactor = IEEE_MULTIPLYING_FACTORS.c37Factors[faultLocation] || 1.0;
    
    // Calculate momentary duty (peak)
    const peak = calculateIEEEPeakCurrent(symmetricalCurrent, xrRatio);
    
    // Calculate interrupting duty
    const interruptingCurrent = symmetricalCurrent * multiplyingFactor;
    
    return {
        standard: 'IEEE/ANSI',
        symmetricalCurrent: symmetricalCurrent,
        interruptingCurrent: interruptingCurrent,
        momentaryCurrent: peak.peakCurrent,
        asymmetryFactor: peak.asymmetryFactor,
        multiplyingFactor: multiplyingFactor,
        xrRatio: xrRatio,
        impedanceTotal: impedanceTotal
    };
}

/**
 * Verify calculation results against standards
 */
function verifyCalculationResults(results, standard) {
    const warnings = [];
    const errors = [];
    
    // Check for NaN or Infinity
    for (const [key, value] of Object.entries(results)) {
        if (typeof value === 'number') {
            if (isNaN(value)) {
                errors.push(`Invalid calculation: ${key} is NaN`);
            }
            if (!isFinite(value)) {
                errors.push(`Invalid calculation: ${key} is Infinity`);
            }
        }
    }
    
    // Standard-specific checks
    if (standard === 'IEC') {
        if (results.kappa && (results.kappa < 1.0 || results.kappa > 2.0)) {
            warnings.push(`IEC kappa factor ${results.kappa.toFixed(2)} is outside typical range (1.0-2.0)`);
        }
        if (results.voltageFactor && (results.voltageFactor < 0.9 || results.voltageFactor > 1.15)) {
            warnings.push(`IEC voltage factor ${results.voltageFactor} is outside expected range`);
        }
    }
    
    if (standard === 'IEEE' || standard === 'ANSI') {
        if (results.asymmetryFactor && (results.asymmetryFactor < 1.0 || results.asymmetryFactor > 1.7)) {
            warnings.push(`IEEE asymmetry factor ${results.asymmetryFactor} is outside typical range (1.0-1.7)`);
        }
        if (results.momentaryCurrent && results.symmetricalCurrent) {
            const ratio = results.momentaryCurrent / results.symmetricalCurrent;
            if (ratio < 2.0 || ratio > 3.0) {
                warnings.push(`Momentary to symmetrical current ratio ${ratio.toFixed(2)} is unusual`);
            }
        }
    }
    
    // General checks
    if (results.xrRatio && (results.xrRatio < 0.1 || results.xrRatio > 100)) {
        warnings.push(`X/R ratio ${results.xrRatio.toFixed(2)} is outside typical range (0.1-100)`);
    }
    
    return {
        valid: errors.length === 0,
        errors: errors,
        warnings: warnings
    };
}

/**
 * Compare results between standards
 */
function compareStandards(iecResults, ieeeResults) {
    const comparison = {
        symmetricalCurrentDiff: 0,
        peakCurrentDiff: 0,
        acceptable: true,
        notes: []
    };
    
    // Compare symmetrical currents
    if (iecResults.symmetricalCurrent && ieeeResults.symmetricalCurrent) {
        const diff = Math.abs(iecResults.symmetricalCurrent - ieeeResults.symmetricalCurrent);
        const percentDiff = (diff / iecResults.symmetricalCurrent) * 100;
        comparison.symmetricalCurrentDiff = percentDiff;
        
        if (percentDiff > 10) {
            comparison.acceptable = false;
            comparison.notes.push(`Symmetrical current differs by ${percentDiff.toFixed(1)}% between standards`);
        }
    }
    
    // Compare peak currents
    if (iecResults.peakCurrent && ieeeResults.momentaryCurrent) {
        const diff = Math.abs(iecResults.peakCurrent - ieeeResults.momentaryCurrent);
        const percentDiff = (diff / iecResults.peakCurrent) * 100;
        comparison.peakCurrentDiff = percentDiff;
        
        if (percentDiff > 15) {
            comparison.notes.push(`Peak current differs by ${percentDiff.toFixed(1)}% between standards`);
        }
    }
    
    return comparison;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        IEC_VOLTAGE_FACTORS,
        IEEE_MULTIPLYING_FACTORS,
        ANSI_C37_STANDARDS,
        getIECVoltageFactor,
        calculateIECImpedanceCorrection,
        getIEEEAsymmetryFactor,
        calculateFirstCycleAsymmetricalMultiplier,
        calculateIECPeakCurrent,
        calculateIEEEPeakCurrent,
        calculateIECShortCircuit,
        calculateIEEEShortCircuit,
        verifyCalculationResults,
        compareStandards
    };
}
