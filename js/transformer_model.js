/**
 * transformer_model.js
 * Transformer modeling with impedance referencing and voltage transformation
 * Supports multi-winding transformers and various connection types
 */

/**
 * Transformer Class
 */
class Transformer {
    constructor(config) {
        this.id = config.id || Date.now();
        this.name = config.name || 'Transformer';
        this.powerMVA = config.powerMVA || 1.0;
        this.primaryVoltage = config.primaryVoltage || 13800;
        this.secondaryVoltage = config.secondaryVoltage || 480;
        this.impedancePercent = config.impedancePercent || 5.75;
        this.xrRatio = config.xrRatio || 10;
        this.connectionType = config.connectionType || 'Dyn11'; // Delta-Wye
        this.tapPosition = config.tapPosition || 0; // ± percent
    }
    
    /**
     * Calculate transformer impedance in ohms (referred to secondary)
     */
    calculateImpedanceOhms() {
        // Base impedance on secondary side
        const zBase = (this.secondaryVoltage * this.secondaryVoltage) / (this.powerMVA * 1e6);
        
        // Transformer impedance in ohms
        const zOhms = zBase * (this.impedancePercent / 100);
        
        // Calculate R and X from Z and X/R ratio
        const r = zOhms / Math.sqrt(1 + this.xrRatio * this.xrRatio);
        const x = r * this.xrRatio;
        
        return {
            r: r,
            x: x,
            magnitude: zOhms,
            referredTo: 'secondary'
        };
    }
    
    /**
     * Calculate transformer impedance referred to primary
     */
    calculateImpedancePrimary() {
        const secondaryZ = this.calculateImpedanceOhms();
        const ratio = this.primaryVoltage / this.secondaryVoltage;
        const factor = ratio * ratio;
        
        return {
            r: secondaryZ.r * factor,
            x: secondaryZ.x * factor,
            magnitude: secondaryZ.magnitude * factor,
            referredTo: 'primary'
        };
    }
    
    /**
     * Transform voltage from primary to secondary
     */
    transformVoltage(primaryVoltage) {
        const ratio = this.secondaryVoltage / this.primaryVoltage;
        const actualRatio = ratio * (1 + this.tapPosition / 100);
        
        return {
            secondaryVoltage: primaryVoltage * actualRatio,
            ratio: actualRatio,
            nominalRatio: ratio
        };
    }
    
    /**
     * Calculate voltage regulation
     */
    calculateVoltageRegulation(loadCurrent, powerFactor) {
        const z = this.calculateImpedanceOhms();
        const sinPF = Math.sqrt(1 - powerFactor * powerFactor);
        
        // Voltage drop = I × (R × cos(φ) + X × sin(φ))
        const voltageDrop = loadCurrent * (z.r * powerFactor + z.x * sinPF);
        
        // Regulation = (V_no_load - V_load) / V_load × 100%
        const regulation = (voltageDrop / this.secondaryVoltage) * 100;
        
        return {
            regulation: regulation,
            voltageDrop: voltageDrop,
            loadVoltage: this.secondaryVoltage - voltageDrop
        };
    }
    
    /**
     * Calculate transformer losses
     */
    calculateLosses(loadPercent) {
        // Typical losses (approximate)
        const noLoadLosses = this.powerMVA * 1000 * 0.001; // 0.1% of rating
        const loadLosses = this.powerMVA * 1000 * 0.01 * (loadPercent / 100) ** 2; // 1% at full load
        
        return {
            noLoadLosses: noLoadLosses,
            loadLosses: loadLosses,
            totalLosses: noLoadLosses + loadLosses
        };
    }
    
    /**
     * Calculate transformer efficiency
     */
    calculateEfficiency(loadKVA, powerFactor) {
        const loadPercent = (loadKVA / (this.powerMVA * 1000)) * 100;
        const losses = this.calculateLosses(loadPercent);
        
        const outputPower = loadKVA * powerFactor;
        const inputPower = outputPower + losses.totalLosses / 1000;
        
        const efficiency = (outputPower / inputPower) * 100;
        
        return {
            efficiency: efficiency,
            losses: losses,
            loadPercent: loadPercent
        };
    }
}

/**
 * Calculate impedance referred between voltage levels
 */
function referImpedanceBetweenLevels(impedance, fromVoltage, toVoltage) {
    const ratio = toVoltage / fromVoltage;
    const factor = ratio * ratio;
    
    return {
        r: impedance.r * factor,
        x: impedance.x * factor,
        magnitude: Math.sqrt((impedance.r * factor) ** 2 + (impedance.x * factor) ** 2),
        fromVoltage: fromVoltage,
        toVoltage: toVoltage,
        ratio: ratio
    };
}

/**
 * Calculate transformer inrush current
 */
function calculateInrushCurrent(transformer) {
    // Typical inrush current is 8-12 times rated current
    const ratedCurrent = (transformer.powerMVA * 1e6) / (Math.sqrt(3) * transformer.secondaryVoltage);
    const inrushCurrent = ratedCurrent * 10; // 10× rated
    
    return {
        ratedCurrent: ratedCurrent,
        inrushCurrent: inrushCurrent,
        peakInrush: inrushCurrent * Math.sqrt(2),
        duration: 0.1 // seconds (typical)
    };
}

/**
 * Determine transformer connection type impact
 */
function getConnectionTypeImpact(connectionType) {
    const impacts = {
        'Dyn11': {
            description: 'Delta-Wye, 30° phase shift',
            zeroSequence: 'blocks',
            applications: 'Distribution, grounding'
        },
        'Yyn0': {
            description: 'Wye-Wye, no phase shift',
            zeroSequence: 'passes',
            applications: 'Transmission'
        },
        'Dd0': {
            description: 'Delta-Delta, no phase shift',
            zeroSequence: 'blocks',
            applications: 'Industrial'
        },
        'Yd11': {
            description: 'Wye-Delta, 30° phase shift',
            zeroSequence: 'blocks',
            applications: 'Step-down'
        }
    };
    
    return impacts[connectionType] || impacts['Dyn11'];
}

/**
 * Calculate transformer short circuit withstand capability
 */
function calculateShortCircuitWithstand(transformer) {
    // Typical withstand capability
    const asymmetricalFactor = 2.5;
    const ratedCurrent = (transformer.powerMVA * 1e6) / (Math.sqrt(3) * transformer.secondaryVoltage);
    
    // Short circuit withstand (approximate)
    const symmetricalWithstand = ratedCurrent * 25; // 25× rated
    const asymmetricalWithstand = symmetricalWithstand * asymmetricalFactor;
    
    return {
        ratedCurrent: ratedCurrent,
        symmetricalWithstand: symmetricalWithstand,
        asymmetricalWithstand: asymmetricalWithstand,
        duration: 2 // seconds (typical)
    };
}

/**
 * Multi-transformer configuration
 */
class TransformerBank {
    constructor() {
        this.transformers = [];
    }
    
    addTransformer(transformer) {
        this.transformers.push(transformer);
    }
    
    /**
     * Calculate parallel transformer impedance
     */
    calculateParallelImpedance() {
        if (this.transformers.length === 0) return null;
        if (this.transformers.length === 1) return this.transformers[0].calculateImpedanceOhms();
        
        // Parallel combination
        let parallelR = 0;
        let parallelX = 0;
        
        this.transformers.forEach(xfmr => {
            const z = xfmr.calculateImpedanceOhms();
            const zMag = z.magnitude * z.magnitude;
            parallelR += z.r / zMag;
            parallelX += z.x / zMag;
        });
        
        const resultR = 1 / parallelR;
        const resultX = 1 / parallelX;
        
        return {
            r: resultR,
            x: resultX,
            magnitude: Math.sqrt(resultR * resultR + resultX * resultX),
            configuration: 'parallel'
        };
    }
    
    /**
     * Calculate total capacity
     */
    getTotalCapacity() {
        return this.transformers.reduce((sum, xfmr) => sum + xfmr.powerMVA, 0);
    }
}

/**
 * Tap changer calculation
 */
function calculateTapChangerEffect(nominalVoltage, tapStep, tapPosition) {
    // Typical tap step is ±2.5% per step
    const voltageChange = nominalVoltage * (tapStep / 100) * tapPosition;
    const actualVoltage = nominalVoltage + voltageChange;
    
    return {
        nominalVoltage: nominalVoltage,
        tapStep: tapStep,
        tapPosition: tapPosition,
        voltageChange: voltageChange,
        actualVoltage: actualVoltage,
        percentChange: (voltageChange / nominalVoltage) * 100
    };
}

// Export classes and functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Transformer,
        TransformerBank,
        referImpedanceBetweenLevels,
        calculateInrushCurrent,
        getConnectionTypeImpact,
        calculateShortCircuitWithstand,
        calculateTapChangerEffect
    };
}
