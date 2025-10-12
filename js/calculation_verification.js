/**
 * calculation_verification.js
 * Calculation verification and cross-checking against standards
 * Ensures calculation accuracy and detects anomalies
 */

/**
 * Verification thresholds and limits
 */
const VERIFICATION_LIMITS = {
    faultCurrent: {
        LV: { min: 0.1, max: 200, typical: [1, 100] },
        MV: { min: 0.1, max: 100, typical: [1, 50] },
        HV: { min: 0.1, max: 63, typical: [1, 40] }
    },
    peakToSymmetricalRatio: {
        min: 1.4,
        max: 3.0,
        typical: [2.0, 2.8]
    },
    impedance: {
        min: 0.0001,
        max: 1000,
        typical: [0.01, 10]
    },
    voltageDropPercent: {
        acceptable: 5,
        warning: 3,
        critical: 10
    }
};

/**
 * Verify fault current calculation
 */
function verifyFaultCurrent(voltage, faultCurrent, voltageLevel) {
    const results = {
        valid: true,
        warnings: [],
        errors: [],
        info: []
    };
    
    // Determine voltage level if not provided
    if (!voltageLevel) {
        if (voltage <= 1000) voltageLevel = 'LV';
        else if (voltage <= 52000) voltageLevel = 'MV';
        else voltageLevel = 'HV';
    }
    
    const limits = VERIFICATION_LIMITS.faultCurrent[voltageLevel];
    
    // Check if within absolute limits
    if (faultCurrent < limits.min) {
        results.errors.push(`Fault current ${faultCurrent.toFixed(2)} kA is below minimum ${limits.min} kA for ${voltageLevel}`);
        results.valid = false;
    }
    
    if (faultCurrent > limits.max) {
        results.errors.push(`Fault current ${faultCurrent.toFixed(2)} kA exceeds maximum ${limits.max} kA for ${voltageLevel}`);
        results.valid = false;
    }
    
    // Check if within typical range
    if (faultCurrent < limits.typical[0]) {
        results.warnings.push(`Fault current ${faultCurrent.toFixed(2)} kA is below typical range for ${voltageLevel}`);
    }
    
    if (faultCurrent > limits.typical[1]) {
        results.warnings.push(`Fault current ${faultCurrent.toFixed(2)} kA is above typical range for ${voltageLevel}`);
    }
    
    return results;
}

/**
 * Verify peak to symmetrical current ratio
 */
function verifyPeakToSymmetricalRatio(peakCurrent, symmetricalCurrent, xrRatio) {
    const results = {
        valid: true,
        warnings: [],
        errors: [],
        info: []
    };
    
    const ratio = peakCurrent / symmetricalCurrent;
    const limits = VERIFICATION_LIMITS.peakToSymmetricalRatio;
    
    // Check ratio limits
    if (ratio < limits.min || ratio > limits.max) {
        results.errors.push(`Peak to symmetrical ratio ${ratio.toFixed(2)} is outside valid range (${limits.min}-${limits.max})`);
        results.valid = false;
    }
    
    // Check against typical range
    if (ratio < limits.typical[0] || ratio > limits.typical[1]) {
        results.warnings.push(`Peak to symmetrical ratio ${ratio.toFixed(2)} is outside typical range (${limits.typical[0]}-${limits.typical[1]})`);
    }
    
    // Verify consistency with X/R ratio
    if (xrRatio) {
        // Expected kappa for IEC: κ = 1.02 + 0.98 × e^(-3R/X)
        const expectedKappa = 1.02 + 0.98 * Math.exp(-3 / xrRatio);
        const expectedRatio = expectedKappa * Math.sqrt(2);
        
        const deviation = Math.abs(ratio - expectedRatio) / expectedRatio * 100;
        if (deviation > 15) {
            results.warnings.push(`Peak ratio deviates ${deviation.toFixed(1)}% from expected value based on X/R ratio`);
        } else {
            results.info.push(`Peak ratio is consistent with X/R ratio of ${xrRatio.toFixed(2)}`);
        }
    }
    
    return results;
}

/**
 * Verify impedance values
 */
function verifyImpedance(impedanceR, impedanceX, impedanceTotal) {
    const results = {
        valid: true,
        warnings: [],
        errors: [],
        info: []
    };
    
    // Check individual components
    if (impedanceR < 0 || impedanceX < 0) {
        results.errors.push('Impedance components cannot be negative');
        results.valid = false;
        return results;
    }
    
    // Verify Pythagorean relationship
    const calculatedTotal = Math.sqrt(impedanceR * impedanceR + impedanceX * impedanceX);
    const difference = Math.abs(calculatedTotal - impedanceTotal);
    
    if (difference > 0.001 * impedanceTotal) {
        results.warnings.push(`Impedance components do not match total impedance (diff: ${(difference/impedanceTotal*100).toFixed(2)}%)`);
    }
    
    // Check X/R ratio
    if (impedanceR > 0) {
        const xrRatio = impedanceX / impedanceR;
        if (xrRatio < 0.1 || xrRatio > 100) {
            results.warnings.push(`X/R ratio ${xrRatio.toFixed(2)} is outside typical range (0.1-100)`);
        }
    }
    
    // Check if impedance is in typical range
    const limits = VERIFICATION_LIMITS.impedance;
    if (impedanceTotal < limits.typical[0] || impedanceTotal > limits.typical[1]) {
        results.info.push(`Total impedance ${impedanceTotal.toFixed(4)} Ω is outside typical range`);
    }
    
    return results;
}

/**
 * Verify transformer calculations
 */
function verifyTransformerCalculation(transformer, calculatedImpedance) {
    const results = {
        valid: true,
        warnings: [],
        errors: [],
        info: []
    };
    
    // Check impedance percentage range
    if (transformer.impedancePercent) {
        if (transformer.impedancePercent < 0.1 || transformer.impedancePercent > 30) {
            results.errors.push(`Transformer impedance ${transformer.impedancePercent}% is outside valid range (0.1%-30%)`);
            results.valid = false;
        }
        
        // Typical ranges based on transformer size
        const powerMVA = transformer.power;
        if (powerMVA < 1 && transformer.impedancePercent > 8) {
            results.warnings.push('Small transformer with high impedance - verify rating');
        }
        if (powerMVA > 10 && transformer.impedancePercent < 5) {
            results.warnings.push('Large transformer with low impedance - verify rating');
        }
    }
    
    // Verify voltage ratio
    if (transformer.primaryV && transformer.secondaryV) {
        const ratio = transformer.primaryV / transformer.secondaryV;
        if (ratio < 0.1 || ratio > 1000) {
            results.warnings.push(`Unusual voltage ratio: ${ratio.toFixed(2)}`);
        }
    }
    
    // Cross-check calculated impedance
    if (calculatedImpedance && transformer.power && transformer.secondaryV) {
        const baseZ = (transformer.secondaryV * transformer.secondaryV * 1000) / (transformer.power * 1e6);
        const expectedZ = baseZ * transformer.impedancePercent / 100;
        const deviation = Math.abs(calculatedImpedance - expectedZ) / expectedZ * 100;
        
        if (deviation > 5) {
            results.warnings.push(`Calculated impedance deviates ${deviation.toFixed(1)}% from expected value`);
        }
    }
    
    return results;
}

/**
 * Verify voltage drop calculations
 */
function verifyVoltageDrop(voltage, voltageDrop, circuitType) {
    const results = {
        valid: true,
        warnings: [],
        errors: [],
        info: []
    };
    
    const dropPercent = (voltageDrop / voltage) * 100;
    const limits = VERIFICATION_LIMITS.voltageDropPercent;
    
    // Check against NEC requirements
    if (dropPercent > limits.critical) {
        results.errors.push(`Voltage drop ${dropPercent.toFixed(2)}% exceeds critical limit of ${limits.critical}%`);
        results.valid = false;
    } else if (dropPercent > limits.acceptable) {
        results.warnings.push(`Voltage drop ${dropPercent.toFixed(2)}% exceeds NEC recommended limit of ${limits.acceptable}%`);
    } else if (dropPercent > limits.warning) {
        results.info.push(`Voltage drop ${dropPercent.toFixed(2)}% is within acceptable range but approaching limit`);
    } else {
        results.info.push(`Voltage drop ${dropPercent.toFixed(2)}% is within recommended limits`);
    }
    
    return results;
}

/**
 * Cross-validate between calculation methods
 */
function crossValidateResults(results1, results2, method1, method2) {
    const comparison = {
        compatible: true,
        differences: [],
        recommendations: []
    };
    
    // Compare symmetrical currents
    if (results1.symmetricalCurrent && results2.symmetricalCurrent) {
        const diff = Math.abs(results1.symmetricalCurrent - results2.symmetricalCurrent);
        const percentDiff = (diff / Math.max(results1.symmetricalCurrent, results2.symmetricalCurrent)) * 100;
        
        comparison.differences.push({
            parameter: 'Symmetrical Current',
            method1: results1.symmetricalCurrent,
            method2: results2.symmetricalCurrent,
            percentDiff: percentDiff
        });
        
        if (percentDiff > 10) {
            comparison.compatible = false;
            comparison.recommendations.push(`${method1} and ${method2} differ significantly in symmetrical current (${percentDiff.toFixed(1)}%)`);
        }
    }
    
    // Compare peak currents
    if (results1.peakCurrent && results2.momentaryCurrent) {
        const diff = Math.abs(results1.peakCurrent - results2.momentaryCurrent);
        const percentDiff = (diff / Math.max(results1.peakCurrent, results2.momentaryCurrent)) * 100;
        
        comparison.differences.push({
            parameter: 'Peak/Momentary Current',
            method1: results1.peakCurrent,
            method2: results2.momentaryCurrent,
            percentDiff: percentDiff
        });
        
        if (percentDiff > 15) {
            comparison.recommendations.push(`${method1} and ${method2} differ in peak current (${percentDiff.toFixed(1)}%) - this is expected due to different methodologies`);
        }
    }
    
    return comparison;
}

/**
 * Comprehensive calculation verification
 */
function performComprehensiveVerification(calculationData) {
    const verification = {
        overall: true,
        sections: {},
        summary: {
            errors: [],
            warnings: [],
            info: []
        }
    };
    
    // Verify fault current
    if (calculationData.faultCurrent && calculationData.voltage) {
        const faultVerification = verifyFaultCurrent(
            calculationData.voltage,
            calculationData.faultCurrent,
            calculationData.voltageLevel
        );
        verification.sections.faultCurrent = faultVerification;
        verification.overall = verification.overall && faultVerification.valid;
        verification.summary.errors.push(...faultVerification.errors);
        verification.summary.warnings.push(...faultVerification.warnings);
    }
    
    // Verify peak to symmetrical ratio
    if (calculationData.peakCurrent && calculationData.symmetricalCurrent) {
        const ratioVerification = verifyPeakToSymmetricalRatio(
            calculationData.peakCurrent,
            calculationData.symmetricalCurrent,
            calculationData.xrRatio
        );
        verification.sections.peakRatio = ratioVerification;
        verification.overall = verification.overall && ratioVerification.valid;
        verification.summary.errors.push(...ratioVerification.errors);
        verification.summary.warnings.push(...ratioVerification.warnings);
        verification.summary.info.push(...ratioVerification.info);
    }
    
    // Verify impedance
    if (calculationData.impedanceR !== undefined && calculationData.impedanceX !== undefined) {
        const impedanceVerification = verifyImpedance(
            calculationData.impedanceR,
            calculationData.impedanceX,
            calculationData.impedanceTotal
        );
        verification.sections.impedance = impedanceVerification;
        verification.overall = verification.overall && impedanceVerification.valid;
        verification.summary.errors.push(...impedanceVerification.errors);
        verification.summary.warnings.push(...impedanceVerification.warnings);
    }
    
    // Verify transformers
    if (calculationData.transformers && Array.isArray(calculationData.transformers)) {
        calculationData.transformers.forEach((transformer, index) => {
            const transformerVerification = verifyTransformerCalculation(transformer, transformer.calculatedZ);
            verification.sections[`transformer_${index}`] = transformerVerification;
            verification.overall = verification.overall && transformerVerification.valid;
            verification.summary.errors.push(...transformerVerification.errors);
            verification.summary.warnings.push(...transformerVerification.warnings);
        });
    }
    
    // Verify voltage drop if present
    if (calculationData.voltageDrop && calculationData.voltage) {
        const voltageDropVerification = verifyVoltageDrop(
            calculationData.voltage,
            calculationData.voltageDrop,
            calculationData.circuitType
        );
        verification.sections.voltageDrop = voltageDropVerification;
        verification.overall = verification.overall && voltageDropVerification.valid;
        verification.summary.errors.push(...voltageDropVerification.errors);
        verification.summary.warnings.push(...voltageDropVerification.warnings);
        verification.summary.info.push(...voltageDropVerification.info);
    }
    
    return verification;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        VERIFICATION_LIMITS,
        verifyFaultCurrent,
        verifyPeakToSymmetricalRatio,
        verifyImpedance,
        verifyTransformerCalculation,
        verifyVoltageDrop,
        crossValidateResults,
        performComprehensiveVerification
    };
}
