/**
 * voltage_drop_calculations.js
 * Comprehensive voltage drop calculations
 * Supports NEC, IEEE standards and includes conductor database
 */

/**
 * NEC Voltage Drop Requirements
 */
const NEC_VOLTAGE_DROP_LIMITS = {
    feeder: {
        recommended: 3, // percent
        maximum: 5 // percent (combined with branch circuit)
    },
    branchCircuit: {
        recommended: 3, // percent
        maximum: 5 // percent (combined with feeder)
    },
    combined: {
        maximum: 5 // percent
    }
};

/**
 * IEEE Voltage Drop Recommendations
 */
const IEEE_VOLTAGE_DROP_RECOMMENDATIONS = {
    lighting: {
        steady: 3,
        starting: 5
    },
    power: {
        steady: 5,
        starting: 15
    },
    motors: {
        steady: 5,
        starting: 20
    }
};

/**
 * Conductor Data Table (Resistance and Reactance per unit length)
 * Based on copper conductors at 75°C
 */
const CONDUCTOR_DATABASE = {
    // AWG/kcmil size: { resistance (Ω/km), reactance (Ω/km), ampacity }
    copper: {
        '14': { resistance: 10.2, reactance: 0.157, ampacity: 20 },
        '12': { resistance: 6.40, reactance: 0.154, ampacity: 25 },
        '10': { resistance: 4.02, reactance: 0.151, ampacity: 35 },
        '8': { resistance: 2.53, reactance: 0.148, ampacity: 50 },
        '6': { resistance: 1.59, reactance: 0.145, ampacity: 65 },
        '4': { resistance: 1.00, reactance: 0.142, ampacity: 85 },
        '3': { resistance: 0.795, reactance: 0.141, ampacity: 100 },
        '2': { resistance: 0.630, reactance: 0.139, ampacity: 115 },
        '1': { resistance: 0.500, reactance: 0.138, ampacity: 130 },
        '1/0': { resistance: 0.397, reactance: 0.137, ampacity: 150 },
        '2/0': { resistance: 0.315, reactance: 0.135, ampacity: 175 },
        '3/0': { resistance: 0.249, reactance: 0.134, ampacity: 200 },
        '4/0': { resistance: 0.198, reactance: 0.132, ampacity: 230 },
        '250': { resistance: 0.169, reactance: 0.131, ampacity: 255 },
        '300': { resistance: 0.141, reactance: 0.130, ampacity: 285 },
        '350': { resistance: 0.121, reactance: 0.128, ampacity: 310 },
        '400': { resistance: 0.106, reactance: 0.127, ampacity: 335 },
        '500': { resistance: 0.085, reactance: 0.125, ampacity: 380 },
        '600': { resistance: 0.071, reactance: 0.123, ampacity: 420 },
        '750': { resistance: 0.057, reactance: 0.121, ampacity: 475 },
        '1000': { resistance: 0.043, reactance: 0.118, ampacity: 545 }
    },
    aluminum: {
        '14': { resistance: 16.7, reactance: 0.157, ampacity: 15 },
        '12': { resistance: 10.5, reactance: 0.154, ampacity: 20 },
        '10': { resistance: 6.60, reactance: 0.151, ampacity: 25 },
        '8': { resistance: 4.15, reactance: 0.148, ampacity: 40 },
        '6': { resistance: 2.61, reactance: 0.145, ampacity: 50 },
        '4': { resistance: 1.64, reactance: 0.142, ampacity: 65 },
        '3': { resistance: 1.30, reactance: 0.141, ampacity: 75 },
        '2': { resistance: 1.03, reactance: 0.139, ampacity: 90 },
        '1': { resistance: 0.820, reactance: 0.138, ampacity: 100 },
        '1/0': { resistance: 0.650, reactance: 0.137, ampacity: 120 },
        '2/0': { resistance: 0.515, reactance: 0.135, ampacity: 135 },
        '3/0': { resistance: 0.409, reactance: 0.134, ampacity: 155 },
        '4/0': { resistance: 0.324, reactance: 0.132, ampacity: 180 },
        '250': { resistance: 0.277, reactance: 0.131, ampacity: 205 },
        '300': { resistance: 0.231, reactance: 0.130, ampacity: 230 },
        '350': { resistance: 0.198, reactance: 0.128, ampacity: 250 },
        '400': { resistance: 0.173, reactance: 0.127, ampacity: 270 },
        '500': { resistance: 0.139, reactance: 0.125, ampacity: 310 },
        '600': { resistance: 0.116, reactance: 0.123, ampacity: 340 },
        '750': { resistance: 0.093, reactance: 0.121, ampacity: 385 },
        '1000': { resistance: 0.070, reactance: 0.118, ampacity: 445 }
    }
};

/**
 * Calculate single-phase voltage drop
 */
function calculateSinglePhaseVoltageDrop(params) {
    const {
        voltage,
        current,
        length,
        conductorSize,
        conductorMaterial = 'copper',
        powerFactor = 1.0,
        circuitType = 'AC' // AC or DC
    } = params;
    
    const conductor = CONDUCTOR_DATABASE[conductorMaterial][conductorSize];
    if (!conductor) {
        return { error: 'Conductor size not found in database' };
    }
    
    // Convert length to km if in meters
    const lengthKm = length / 1000;
    
    // Get conductor resistance and reactance
    const R = conductor.resistance * lengthKm; // Ω
    const X = conductor.reactance * lengthKm; // Ω
    
    let voltageDrop;
    
    if (circuitType === 'DC') {
        // DC voltage drop: Vd = 2 × I × R × L
        voltageDrop = 2 * current * R;
    } else {
        // AC voltage drop: Vd = 2 × I × (R × cos(φ) + X × sin(φ)) × L
        const sinPF = Math.sqrt(1 - powerFactor * powerFactor);
        voltageDrop = 2 * current * (R * powerFactor + X * sinPF);
    }
    
    const voltageDropPercent = (voltageDrop / voltage) * 100;
    
    return {
        voltageDrop: voltageDrop,
        voltageDropPercent: voltageDropPercent,
        resistance: R,
        reactance: X,
        voltage: voltage,
        current: current,
        conductorSize: conductorSize,
        conductorMaterial: conductorMaterial,
        circuitType: circuitType,
        length: length
    };
}

/**
 * Calculate three-phase voltage drop
 */
function calculateThreePhaseVoltageDrop(params) {
    const {
        voltage,
        current,
        length,
        conductorSize,
        conductorMaterial = 'copper',
        powerFactor = 0.85,
        circuitType = 'balanced' // balanced or unbalanced
    } = params;
    
    const conductor = CONDUCTOR_DATABASE[conductorMaterial][conductorSize];
    if (!conductor) {
        return { error: 'Conductor size not found in database' };
    }
    
    // Convert length to km if in meters
    const lengthKm = length / 1000;
    
    // Get conductor resistance and reactance
    const R = conductor.resistance * lengthKm; // Ω
    const X = conductor.reactance * lengthKm; // Ω
    
    // Three-phase voltage drop: Vd = √3 × I × (R × cos(φ) + X × sin(φ)) × L
    const sinPF = Math.sqrt(1 - powerFactor * powerFactor);
    const voltageDrop = Math.sqrt(3) * current * (R * powerFactor + X * sinPF);
    
    const voltageDropPercent = (voltageDrop / voltage) * 100;
    
    return {
        voltageDrop: voltageDrop,
        voltageDropPercent: voltageDropPercent,
        resistance: R,
        reactance: X,
        voltage: voltage,
        current: current,
        conductorSize: conductorSize,
        conductorMaterial: conductorMaterial,
        circuitType: 'three-phase',
        length: length,
        powerFactor: powerFactor
    };
}

/**
 * Check NEC compliance
 */
function checkNECCompliance(voltageDropPercent, circuitType) {
    const limits = NEC_VOLTAGE_DROP_LIMITS[circuitType] || NEC_VOLTAGE_DROP_LIMITS.feeder;
    
    const compliance = {
        compliant: true,
        level: 'good',
        messages: []
    };
    
    if (voltageDropPercent <= limits.recommended) {
        compliance.level = 'good';
        compliance.messages.push(`✓ Within NEC recommended limit of ${limits.recommended}%`);
    } else if (voltageDropPercent <= limits.maximum) {
        compliance.level = 'warning';
        compliance.messages.push(`⚠ Exceeds NEC recommended ${limits.recommended}% but within maximum ${limits.maximum}%`);
    } else {
        compliance.compliant = false;
        compliance.level = 'critical';
        compliance.messages.push(`✗ Exceeds NEC maximum limit of ${limits.maximum}%`);
    }
    
    return compliance;
}

/**
 * Check IEEE compliance
 */
function checkIEEECompliance(voltageDropPercent, loadType = 'power', condition = 'steady') {
    const limits = IEEE_VOLTAGE_DROP_RECOMMENDATIONS[loadType];
    if (!limits) {
        return { compliant: true, messages: ['Unknown load type'] };
    }
    
    const limit = limits[condition];
    const compliance = {
        compliant: voltageDropPercent <= limit,
        messages: []
    };
    
    if (compliance.compliant) {
        compliance.messages.push(`✓ Within IEEE ${limit}% limit for ${loadType} (${condition})`);
    } else {
        compliance.messages.push(`✗ Exceeds IEEE ${limit}% limit for ${loadType} (${condition})`);
    }
    
    return compliance;
}

/**
 * Calculate required conductor size for target voltage drop
 */
function calculateRequiredConductorSize(params) {
    const {
        voltage,
        current,
        length,
        targetVoltageDropPercent = 3,
        conductorMaterial = 'copper',
        phaseType = 'three-phase',
        powerFactor = 0.85
    } = params;
    
    const conductorDB = CONDUCTOR_DATABASE[conductorMaterial];
    const targetVoltageDrop = voltage * targetVoltageDropPercent / 100;
    
    let suitableConductors = [];
    
    for (const [size, conductor] of Object.entries(conductorDB)) {
        // Calculate voltage drop for this conductor size
        let calcParams = {
            voltage: voltage,
            current: current,
            length: length,
            conductorSize: size,
            conductorMaterial: conductorMaterial,
            powerFactor: powerFactor
        };
        
        let result;
        if (phaseType === 'single-phase') {
            result = calculateSinglePhaseVoltageDrop(calcParams);
        } else {
            result = calculateThreePhaseVoltageDrop(calcParams);
        }
        
        if (result.voltageDrop <= targetVoltageDrop && current <= conductor.ampacity) {
            suitableConductors.push({
                size: size,
                voltageDrop: result.voltageDrop,
                voltageDropPercent: result.voltageDropPercent,
                ampacity: conductor.ampacity
            });
        }
    }
    
    // Return the smallest suitable conductor
    if (suitableConductors.length > 0) {
        return {
            recommended: suitableConductors[0],
            alternatives: suitableConductors.slice(1, 3),
            targetVoltageDropPercent: targetVoltageDropPercent
        };
    } else {
        return {
            error: 'No suitable conductor size found for the specified parameters'
        };
    }
}

/**
 * Comprehensive voltage drop analysis
 */
function performVoltageDropAnalysis(params) {
    const {
        voltage,
        current,
        length,
        conductorSize,
        conductorMaterial = 'copper',
        phaseType = 'three-phase',
        powerFactor = 0.85,
        circuitType = 'feeder',
        loadType = 'power'
    } = params;
    
    // Calculate voltage drop
    let voltageDropResult;
    if (phaseType === 'single-phase') {
        voltageDropResult = calculateSinglePhaseVoltageDrop({
            voltage, current, length, conductorSize, conductorMaterial, powerFactor
        });
    } else {
        voltageDropResult = calculateThreePhaseVoltageDrop({
            voltage, current, length, conductorSize, conductorMaterial, powerFactor
        });
    }
    
    if (voltageDropResult.error) {
        return voltageDropResult;
    }
    
    // Check NEC compliance
    const necCompliance = checkNECCompliance(voltageDropResult.voltageDropPercent, circuitType);
    
    // Check IEEE compliance
    const ieeeCompliance = checkIEEECompliance(voltageDropResult.voltageDropPercent, loadType, 'steady');
    
    // Calculate required conductor size for 3% drop
    const requiredSize = calculateRequiredConductorSize({
        voltage, current, length,
        targetVoltageDropPercent: 3,
        conductorMaterial, phaseType, powerFactor
    });
    
    return {
        calculation: voltageDropResult,
        compliance: {
            nec: necCompliance,
            ieee: ieeeCompliance
        },
        recommendations: {
            currentConductor: conductorSize,
            requiredForThreePercent: requiredSize.recommended,
            alternatives: requiredSize.alternatives
        }
    };
}

/**
 * Get conductor data
 */
function getConductorData(size, material = 'copper') {
    const conductor = CONDUCTOR_DATABASE[material][size];
    return conductor || null;
}

/**
 * List available conductor sizes
 */
function getAvailableConductorSizes(material = 'copper') {
    return Object.keys(CONDUCTOR_DATABASE[material]);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NEC_VOLTAGE_DROP_LIMITS,
        IEEE_VOLTAGE_DROP_RECOMMENDATIONS,
        CONDUCTOR_DATABASE,
        calculateSinglePhaseVoltageDrop,
        calculateThreePhaseVoltageDrop,
        checkNECCompliance,
        checkIEEECompliance,
        calculateRequiredConductorSize,
        performVoltageDropAnalysis,
        getConductorData,
        getAvailableConductorSizes
    };
}
