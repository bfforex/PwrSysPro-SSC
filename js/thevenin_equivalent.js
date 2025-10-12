/**
 * thevenin_equivalent.js
 * Thevenin equivalent calculations for power system simplification
 * Supports impedance matrix calculations
 */

/**
 * Calculate Thevenin equivalent for a bus
 */
function calculateTheveninEquivalent(bus, sourceVoltage) {
    const impedance = bus.calculateTotalImpedance();
    
    return {
        voltage: sourceVoltage,
        impedance: impedance,
        equivalentSource: {
            voltage: sourceVoltage,
            r: impedance.r,
            x: impedance.x,
            z: impedance.magnitude
        }
    };
}

/**
 * Calculate Thevenin equivalent for multiple buses
 */
function calculateMultiBusThevenin(buses, sourceVoltage) {
    const equivalents = [];
    
    buses.forEach(bus => {
        const thevenin = calculateTheveninEquivalent(bus, sourceVoltage);
        equivalents.push({
            busId: bus.id,
            busName: bus.name,
            voltage: bus.voltage,
            thevenin: thevenin
        });
    });
    
    return equivalents;
}

/**
 * Build impedance matrix (Z-bus)
 */
function buildImpedanceMatrix(busSystem) {
    const buses = busSystem.getAllBuses();
    const n = buses.length;
    
    // Initialize Z-bus matrix
    const zMatrix = Array(n).fill(null).map(() => Array(n).fill({ r: 0, x: 0 }));
    
    // Diagonal elements (self-impedances)
    buses.forEach((bus, i) => {
        const impedance = bus.calculateTotalImpedance();
        zMatrix[i][i] = impedance;
    });
    
    // Off-diagonal elements (mutual impedances)
    buses.forEach((bus1, i) => {
        bus1.connections.forEach(conn => {
            const bus2 = conn.bus;
            const j = buses.findIndex(b => b.id === bus2.id);
            
            if (j !== -1 && conn.impedance) {
                zMatrix[i][j] = conn.impedance;
            }
        });
    });
    
    return {
        matrix: zMatrix,
        buses: buses.map(b => ({ id: b.id, name: b.name }))
    };
}

/**
 * Calculate fault current using Z-bus method
 */
function calculateFaultCurrentZBus(zMatrix, busIndex, voltage) {
    // Fault current at bus i: I_fault = V / Z_ii
    const zii = zMatrix[busIndex][busIndex];
    const zMagnitude = Math.sqrt(zii.r * zii.r + zii.x * zii.x);
    
    const faultCurrent = voltage / (Math.sqrt(3) * zMagnitude);
    
    return {
        faultCurrent: faultCurrent,
        impedance: zii,
        busIndex: busIndex
    };
}

/**
 * Perform impedance reduction
 */
function reduceImpedanceNetwork(impedances) {
    // Series impedance combination
    const seriesZ = impedances.reduce((acc, z) => ({
        r: acc.r + z.r,
        x: acc.x + z.x
    }), { r: 0, x: 0 });
    
    return {
        r: seriesZ.r,
        x: seriesZ.x,
        magnitude: Math.sqrt(seriesZ.r * seriesZ.r + seriesZ.x * seriesZ.x)
    };
}

/**
 * Combine parallel impedances
 */
function combineParallelImpedances(z1, z2) {
    // Parallel combination: Z = (Z1 × Z2) / (Z1 + Z2)
    const z1Mag = Math.sqrt(z1.r * z1.r + z1.x * z1.x);
    const z2Mag = Math.sqrt(z2.r * z2.r + z2.x * z2.x);
    
    // Convert to complex form
    const z1Complex = { r: z1.r, x: z1.x };
    const z2Complex = { r: z2.r, x: z2.x };
    
    // Numerator: Z1 × Z2
    const numR = z1Complex.r * z2Complex.r - z1Complex.x * z2Complex.x;
    const numX = z1Complex.r * z2Complex.x + z1Complex.x * z2Complex.r;
    
    // Denominator: Z1 + Z2
    const denR = z1Complex.r + z2Complex.r;
    const denX = z1Complex.x + z2Complex.x;
    const denMag = Math.sqrt(denR * denR + denX * denX);
    
    // Result
    const resultR = (numR * denR + numX * denX) / (denMag * denMag);
    const resultX = (numX * denR - numR * denX) / (denMag * denMag);
    
    return {
        r: resultR,
        x: resultX,
        magnitude: Math.sqrt(resultR * resultR + resultX * resultX)
    };
}

/**
 * Transform impedance to different voltage level
 */
function transformImpedanceToVoltageLevel(impedance, voltage1, voltage2) {
    // Z2 = Z1 × (V2/V1)²
    const ratio = voltage2 / voltage1;
    const factor = ratio * ratio;
    
    return {
        r: impedance.r * factor,
        x: impedance.x * factor,
        magnitude: Math.sqrt((impedance.r * factor) ** 2 + (impedance.x * factor) ** 2),
        originalVoltage: voltage1,
        newVoltage: voltage2
    };
}

/**
 * Calculate Norton equivalent
 */
function calculateNortonEquivalent(theveninVoltage, theveninImpedance) {
    const zMag = Math.sqrt(theveninImpedance.r ** 2 + theveninImpedance.x ** 2);
    
    // Norton current: I_N = V_th / Z_th
    const nortonCurrent = theveninVoltage / zMag;
    
    // Norton impedance is same as Thevenin impedance
    const nortonImpedance = theveninImpedance;
    
    return {
        current: nortonCurrent,
        impedance: nortonImpedance
    };
}

/**
 * Simplify system to single Thevenin equivalent
 */
function simplifySystemToThevenin(busSystem, sourceBusId) {
    const sourceBus = busSystem.getBus(sourceBusId);
    if (!sourceBus) {
        throw new Error('Source bus not found');
    }
    
    // Calculate total system impedance
    let totalR = 0;
    let totalX = 0;
    
    busSystem.getAllBuses().forEach(bus => {
        const impedance = bus.calculateTotalImpedance();
        totalR += impedance.r;
        totalX += impedance.x;
    });
    
    return {
        voltage: sourceBus.voltage,
        impedance: {
            r: totalR,
            x: totalX,
            magnitude: Math.sqrt(totalR * totalR + totalX * totalX)
        },
        shortCircuitCurrent: sourceBus.voltage / (Math.sqrt(3) * Math.sqrt(totalR * totalR + totalX * totalX))
    };
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateTheveninEquivalent,
        calculateMultiBusThevenin,
        buildImpedanceMatrix,
        calculateFaultCurrentZBus,
        reduceImpedanceNetwork,
        combineParallelImpedances,
        transformImpedanceToVoltageLevel,
        calculateNortonEquivalent,
        simplifySystemToThevenin
    };
}
