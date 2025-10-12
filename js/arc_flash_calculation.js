/**
 * arc_flash_calculation.js
 * IEEE 1584-2018 Arc Flash Hazard Calculations
 * Includes incident energy, arc flash boundary, and equipment-specific calculations
 */

/**
 * IEEE 1584-2018 Constants and Configuration
 */
const IEEE_1584_2018 = {
    // Voltage range applicability
    voltageRange: {
        min: 208,
        max: 15000
    },
    // Equipment types and configurations
    equipmentTypes: {
        VCB: { name: 'Vertical Conductors in a Box', typical: true },
        VCBB: { name: 'Vertical Conductors Barrier', typical: false },
        HCB: { name: 'Horizontal Conductors in a Box', typical: false },
        VOA: { name: 'Vertical Conductors Open Air', typical: false },
        HOA: { name: 'Horizontal Conductors Open Air', typical: false }
    },
    // Electrode configuration factors
    electrodeConfig: {
        VCB: { k1: -0.792, k2: 0 },
        VCBB: { k1: -0.555, k2: 0 },
        HCB: { k1: -0.723, k2: 0 },
        VOA: { k1: -0.113, k2: 0 },
        HOA: { k1: 0.022, k2: 0 }
    }
};

/**
 * Calculate arcing current using IEEE 1584-2018
 */
function calculateArcingCurrent(voltage, boltedFaultCurrent, gap) {
    // IEEE 1584-2018 equation for arcing current
    // Iarc = 10^k + 0.662 × log10(Ibf) + 0.0966 × V + 0.000526 × G + 0.5588 × V × log10(Ibf) - 0.00304 × G × log10(Ibf)
    
    const voltageKV = voltage / 1000;
    const Ibf = boltedFaultCurrent;
    const G = gap;
    
    // For voltage < 1kV
    if (voltage < 1000) {
        const k = -0.153;
        const logIarc = k + 0.662 * Math.log10(Ibf) + 0.0966 * voltageKV + 
                       0.000526 * G + 0.5588 * voltageKV * Math.log10(Ibf) - 
                       0.00304 * G * Math.log10(Ibf);
        return Math.pow(10, logIarc);
    } else {
        // For voltage >= 1kV
        const k = -0.097;
        const logIarc = k + 0.662 * Math.log10(Ibf) + 0.0966 * voltageKV + 
                       0.000526 * G + 0.5588 * voltageKV * Math.log10(Ibf) - 
                       0.00304 * G * Math.log10(Ibf);
        return Math.pow(10, logIarc);
    }
}

/**
 * Calculate incident energy using IEEE 1584-2018
 */
function calculateIncidentEnergy(params) {
    const {
        voltage,
        boltedFaultCurrent,
        workingDistance,
        arcDuration,
        equipmentGap,
        enclosureType = 'VCB'
    } = params;
    
    // Get electrode configuration factors
    const config = IEEE_1584_2018.electrodeConfig[enclosureType] || IEEE_1584_2018.electrodeConfig.VCB;
    
    // Calculate arcing current
    const arcingCurrent = calculateArcingCurrent(voltage, boltedFaultCurrent, equipmentGap);
    
    // Calculate incident energy
    // E = 4.184 × Cf × 10^K × (t/0.2) × ((610^x)/D^x)
    // where K = k1 + k2 + 1.081 × log10(Iarc) + 0.0011 × G
    
    const voltageKV = voltage / 1000;
    const Iarc = arcingCurrent;
    const G = equipmentGap;
    const D = workingDistance;
    const t = arcDuration;
    
    // Calculate K
    const K = config.k1 + config.k2 + 1.081 * Math.log10(Iarc) + 0.0011 * G;
    
    // Calculate x (for distance exponent)
    let x;
    if (voltage < 1000) {
        x = 0.973 + 0.0919 * G;
    } else {
        x = 0.973 + 0.0919 * G;
    }
    
    // Working distance correction factor
    const Cf = 1.0; // Correction factor (typically 1.0 for standard calculations)
    
    // Calculate incident energy (J/cm²)
    const E = 4.184 * Cf * Math.pow(10, K) * (t / 0.2) * Math.pow(610, x) / Math.pow(D, x);
    
    return {
        incidentEnergy: E,
        arcingCurrent: Iarc,
        workingDistance: D,
        arcDuration: t,
        equipmentGap: G,
        enclosureType: enclosureType
    };
}

/**
 * Calculate arc flash boundary
 */
function calculateArcFlashBoundary(incidentEnergy, workingDistance) {
    // Arc Flash Boundary is the distance at which incident energy = 5 J/cm² (1.2 cal/cm²)
    // Using the inverse relationship: AFB = D × (E/5)^(1/x)
    
    const E = incidentEnergy;
    const D = workingDistance;
    const E_threshold = 5; // J/cm² (1.2 cal/cm²)
    
    // Approximate x factor (typical value for calculations)
    const x = 2.0;
    
    if (E <= E_threshold) {
        // If incident energy at working distance is already below threshold
        return workingDistance;
    }
    
    // Calculate arc flash boundary
    const AFB = D * Math.pow(E / E_threshold, 1 / x);
    
    return AFB;
}

/**
 * Calculate arc flash using IEEE 1584-2018 method (comprehensive)
 */
function calculateArcFlashIEEE1584_2018(params) {
    const {
        voltage,
        boltedFaultCurrent,
        workingDistance = 450, // mm
        arcDuration = 0.1, // seconds
        equipmentGap = 32, // mm
        enclosureType = 'VCB'
    } = params;
    
    // Validate input parameters
    if (voltage < IEEE_1584_2018.voltageRange.min || voltage > IEEE_1584_2018.voltageRange.max) {
        return {
            error: `Voltage ${voltage}V is outside IEEE 1584-2018 applicable range (${IEEE_1584_2018.voltageRange.min}V - ${IEEE_1584_2018.voltageRange.max}V)`,
            applicable: false
        };
    }
    
    // Calculate incident energy
    const energyResults = calculateIncidentEnergy({
        voltage,
        boltedFaultCurrent,
        workingDistance,
        arcDuration,
        equipmentGap,
        enclosureType
    });
    
    // Calculate arc flash boundary
    const arcFlashBoundary = calculateArcFlashBoundary(energyResults.incidentEnergy, workingDistance);
    
    // Convert to cal/cm²
    const incidentEnergyCalCm2 = energyResults.incidentEnergy / 4.184;
    
    return {
        method: 'IEEE 1584-2018',
        voltage: voltage,
        boltedFaultCurrent: boltedFaultCurrent,
        arcingCurrent: energyResults.arcingCurrent,
        incidentEnergy: energyResults.incidentEnergy, // J/cm²
        incidentEnergyCalCm2: incidentEnergyCalCm2, // cal/cm²
        workingDistance: workingDistance,
        arcDuration: arcDuration,
        equipmentGap: equipmentGap,
        enclosureType: enclosureType,
        arcFlashBoundary: arcFlashBoundary,
        applicable: true
    };
}

/**
 * Calculate arc flash using IEEE 1584-2002 method (legacy, for comparison)
 */
function calculateArcFlashIEEE1584_2002(params) {
    const {
        voltage,
        boltedFaultCurrent,
        workingDistance = 450,
        arcDuration = 0.1,
        equipmentGap = 32,
        enclosureType = 'VCB'
    } = params;
    
    const voltageKV = voltage / 1000;
    const If = boltedFaultCurrent;
    const G = equipmentGap;
    const D = workingDistance;
    const t = arcDuration;
    
    // Calculate arcing current factor
    let lgIarc;
    if (voltageKV <= 1) {
        lgIarc = 0.00402 + 0.983 * Math.log10(If);
    } else {
        lgIarc = -0.153 + 0.662 * Math.log10(If) + 0.0966 * voltageKV + 0.000526 * G + 0.5588 * voltageKV * Math.log10(If) - 0.00304 * G * Math.log10(If);
    }
    const Iarc = Math.pow(10, lgIarc);
    
    // Calculate incident energy
    const logE = -0.555 + 0.662 * Math.log10(Iarc) + 0.0966 * voltageKV + 0.000526 * G + 0.5588 * voltageKV - 0.00304 * G * voltageKV + Math.log10(t * 1000 / 0.2) - 1.473 * Math.log10(D);
    const E = 4.184 * Math.pow(10, logE);
    
    const AFB = calculateArcFlashBoundary(E, D);
    const incidentEnergyCalCm2 = E / 4.184;
    
    return {
        method: 'IEEE 1584-2002',
        voltage: voltage,
        boltedFaultCurrent: If,
        arcingCurrent: Iarc,
        incidentEnergy: E,
        incidentEnergyCalCm2: incidentEnergyCalCm2,
        workingDistance: D,
        equipmentGap: G,
        arcFlashBoundary: AFB,
        arcDuration: t
    };
}

/**
 * Calculate simplified arc flash (for very low voltage or simplified analysis)
 */
function calculateSimplifiedArcFlash(params) {
    const {
        voltage,
        faultCurrent,
        clearingTime = 0.1
    } = params;
    
    // Simplified method based on available fault current
    const power = Math.sqrt(3) * voltage * faultCurrent * 1000; // VA
    const energy = power * clearingTime; // Joules
    
    // Very rough approximation
    const incidentEnergy = energy / 10000; // J/cm² (very approximate)
    const incidentEnergyCalCm2 = incidentEnergy / 4.184;
    
    return {
        method: 'Simplified',
        voltage: voltage,
        faultCurrent: faultCurrent,
        incidentEnergy: incidentEnergy,
        incidentEnergyCalCm2: incidentEnergyCalCm2,
        clearingTime: clearingTime,
        note: 'This is a simplified calculation. Use IEEE 1584 for accurate results.'
    };
}

/**
 * Determine which arc flash method to use based on system parameters
 */
function selectArcFlashMethod(voltage, systemType) {
    if (voltage >= IEEE_1584_2018.voltageRange.min && voltage <= IEEE_1584_2018.voltageRange.max) {
        return 'IEEE 1584-2018';
    } else if (voltage < IEEE_1584_2018.voltageRange.min) {
        return 'Simplified';
    } else {
        return 'IEEE 1584-2002'; // For higher voltages
    }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        IEEE_1584_2018,
        calculateArcingCurrent,
        calculateIncidentEnergy,
        calculateArcFlashBoundary,
        calculateArcFlashIEEE1584_2018,
        calculateArcFlashIEEE1584_2002,
        calculateSimplifiedArcFlash,
        selectArcFlashMethod
    };
}
