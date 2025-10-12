/**
 * improved_validation.js
 * Enhanced input validation with physical constraints for PowerSys Pro
 * Implements validation for different voltage levels (LV, MV, HV)
 */

// Physical constraints for different voltage levels
const VOLTAGE_LEVELS = {
    LV: { min: 100, max: 1000, name: 'Low Voltage' },
    MV: { min: 1000, max: 52000, name: 'Medium Voltage' },
    HV: { min: 52000, max: 230000, name: 'High Voltage' },
    EHV: { min: 230000, max: 800000, name: 'Extra High Voltage' }
};

// Physical constraints for various parameters
const PHYSICAL_CONSTRAINTS = {
    voltage: {
        min: 100,
        max: 800000,
        unit: 'V',
        description: 'System voltage must be between 100V and 800kV'
    },
    frequency: {
        min: 50,
        max: 60,
        unit: 'Hz',
        description: 'Frequency must be 50Hz or 60Hz'
    },
    impedance: {
        min: 0.0001,
        max: 1000,
        unit: 'Ω',
        description: 'Impedance must be positive and reasonable'
    },
    impedancePercent: {
        min: 0.1,
        max: 30,
        unit: '%',
        description: 'Transformer impedance typically 0.1% to 30%'
    },
    powerMVA: {
        min: 0.001,
        max: 5000,
        unit: 'MVA',
        description: 'Power rating must be between 1kVA and 5000MVA'
    },
    faultCurrent: {
        min: 0.1,
        max: 1000,
        unit: 'kA',
        description: 'Fault current must be between 100A and 1000kA'
    },
    cableLength: {
        min: 0.1,
        max: 100000,
        unit: 'm',
        description: 'Cable length must be between 0.1m and 100km'
    },
    workingDistance: {
        min: 100,
        max: 10000,
        unit: 'mm',
        description: 'Working distance must be between 100mm and 10m'
    },
    arcDuration: {
        min: 0.01,
        max: 2,
        unit: 's',
        description: 'Arc duration typically 0.01s to 2s'
    },
    xrRatio: {
        min: 0.1,
        max: 100,
        unit: 'ratio',
        description: 'X/R ratio typically 0.1 to 100'
    },
    powerFactor: {
        min: 0.1,
        max: 1.0,
        unit: 'p.u.',
        description: 'Power factor must be between 0.1 and 1.0'
    },
    efficiency: {
        min: 50,
        max: 99.9,
        unit: '%',
        description: 'Efficiency typically 50% to 99.9%'
    },
    current: {
        min: 0.1,
        max: 100000,
        unit: 'A',
        description: 'Current must be positive and reasonable'
    }
};

/**
 * Determine voltage level category
 */
function getVoltageLevel(voltage) {
    if (voltage < VOLTAGE_LEVELS.LV.max) return 'LV';
    if (voltage < VOLTAGE_LEVELS.MV.max) return 'MV';
    if (voltage < VOLTAGE_LEVELS.HV.max) return 'HV';
    return 'EHV';
}

/**
 * Validate input value against physical constraints
 */
function validatePhysicalConstraint(value, constraintType) {
    const constraint = PHYSICAL_CONSTRAINTS[constraintType];
    
    if (!constraint) {
        return { 
            valid: true, 
            warning: null, 
            error: null 
        };
    }
    
    const numValue = parseFloat(value);
    
    // Check if valid number
    if (isNaN(numValue)) {
        return {
            valid: false,
            error: `Invalid number for ${constraintType}`,
            warning: null
        };
    }
    
    // Check minimum
    if (numValue < constraint.min) {
        return {
            valid: false,
            error: `${constraintType} must be at least ${constraint.min} ${constraint.unit}`,
            warning: null
        };
    }
    
    // Check maximum
    if (numValue > constraint.max) {
        return {
            valid: false,
            error: `${constraintType} must be at most ${constraint.max} ${constraint.unit}`,
            warning: null
        };
    }
    
    // Generate warnings for unusual values
    let warning = null;
    const range = constraint.max - constraint.min;
    const typicalMin = constraint.min + range * 0.1;
    const typicalMax = constraint.max - range * 0.1;
    
    if (numValue < typicalMin) {
        warning = `${constraintType} is unusually low. Please verify.`;
    } else if (numValue > typicalMax) {
        warning = `${constraintType} is unusually high. Please verify.`;
    }
    
    return {
        valid: true,
        error: null,
        warning: warning
    };
}

/**
 * Validate voltage level specific parameters
 */
function validateVoltageLevelSpecific(voltage, parameters) {
    const level = getVoltageLevel(voltage);
    const warnings = [];
    const errors = [];
    
    // LV specific validations
    if (level === 'LV') {
        if (parameters.faultCurrent && parameters.faultCurrent > 200) {
            warnings.push('LV fault current exceeds 200kA - verify calculation');
        }
        if (parameters.impedancePercent && parameters.impedancePercent < 2) {
            warnings.push('LV transformer impedance below 2% is unusual');
        }
    }
    
    // MV specific validations
    if (level === 'MV') {
        if (parameters.faultCurrent && parameters.faultCurrent > 100) {
            warnings.push('MV fault current exceeds 100kA - verify calculation');
        }
        if (parameters.impedancePercent && parameters.impedancePercent < 4) {
            warnings.push('MV transformer impedance below 4% is unusual for this voltage');
        }
    }
    
    // HV specific validations
    if (level === 'HV') {
        if (parameters.faultCurrent && parameters.faultCurrent > 63) {
            warnings.push('HV fault current exceeds 63kA - verify calculation');
        }
        if (parameters.impedancePercent && parameters.impedancePercent < 8) {
            warnings.push('HV transformer impedance below 8% is unusual');
        }
    }
    
    return {
        level: level,
        warnings: warnings,
        errors: errors
    };
}

/**
 * Comprehensive validation function
 */
function validateAllInputs(inputs) {
    const results = {
        valid: true,
        errors: [],
        warnings: [],
        details: {}
    };
    
    // Validate each input
    for (const [key, value] of Object.entries(inputs)) {
        if (PHYSICAL_CONSTRAINTS[key]) {
            const validation = validatePhysicalConstraint(value, key);
            results.details[key] = validation;
            
            if (!validation.valid) {
                results.valid = false;
                if (validation.error) {
                    results.errors.push(`${key}: ${validation.error}`);
                }
            }
            
            if (validation.warning) {
                results.warnings.push(`${key}: ${validation.warning}`);
            }
        }
    }
    
    // Voltage level specific validation
    if (inputs.voltage) {
        const levelValidation = validateVoltageLevelSpecific(inputs.voltage, inputs);
        results.warnings.push(...levelValidation.warnings);
        results.errors.push(...levelValidation.errors);
    }
    
    return results;
}

/**
 * Display validation feedback in UI
 */
function displayValidationFeedback(elementId, validation) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Remove existing feedback
    const existingFeedback = element.parentNode.querySelector('.validation-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    // Create feedback element
    const feedback = document.createElement('div');
    feedback.className = 'validation-feedback';
    feedback.style.cssText = 'margin-top: 5px; font-size: 12px;';
    
    if (validation.error) {
        element.style.borderColor = '#ef4444';
        feedback.innerHTML = `<span style="color: #ef4444;">✗ ${validation.error}</span>`;
    } else if (validation.warning) {
        element.style.borderColor = '#f59e0b';
        feedback.innerHTML = `<span style="color: #f59e0b;">⚠ ${validation.warning}</span>`;
    } else if (validation.valid) {
        element.style.borderColor = '#10b981';
        feedback.innerHTML = '<span style="color: #10b981;">✓ Valid</span>';
    }
    
    element.parentNode.appendChild(feedback);
}

/**
 * Real-time validation helper
 */
function setupRealtimeValidation(inputId, constraintType) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    input.addEventListener('input', function() {
        const validation = validatePhysicalConstraint(this.value, constraintType);
        displayValidationFeedback(inputId, validation);
    });
    
    input.addEventListener('blur', function() {
        const validation = validatePhysicalConstraint(this.value, constraintType);
        displayValidationFeedback(inputId, validation);
    });
}

// Export functions for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        VOLTAGE_LEVELS,
        PHYSICAL_CONSTRAINTS,
        getVoltageLevel,
        validatePhysicalConstraint,
        validateVoltageLevelSpecific,
        validateAllInputs,
        displayValidationFeedback,
        setupRealtimeValidation
    };
}
