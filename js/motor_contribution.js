/**
 * motor_contribution.js
 * Motor Contribution to Short Circuit Calculations (IEEE 141)
 * Calculates first-cycle, interrupting, and sustained motor contributions
 */

/**
 * Motor types and typical characteristics
 */
const MOTOR_CHARACTERISTICS = {
    induction: {
        lockedRotorMultiplier: 6.0,  // Typical 6x FLA
        xrLockedRotor: 15,            // Typical X/R at locked rotor
        decayFactorInterrupting: 0.75, // Decay to ~75% at interrupting time
        decayFactorSustained: 4.0     // Sustained ~4x FLA
    },
    synchronous: {
        lockedRotorMultiplier: 5.5,
        xrLockedRotor: 20,
        decayFactorInterrupting: 0.85,
        decayFactorSustained: 5.0
    }
};

/**
 * Calculate motor full load amps (FLA)
 */
function calculateMotorFLA(motor) {
    const hp = motor.hp || motor.power || 100;
    const voltage = motor.voltage || 480;
    const efficiency = motor.efficiency || 0.90;
    const powerFactor = motor.powerFactor || motor.pf || 0.85;
    const phases = motor.phases || 3;
    
    // Convert HP to watts (1 HP = 746 W)
    const powerW = hp * 746;
    
    // Calculate FLA
    let fla;
    if (phases === 3) {
        fla = powerW / (voltage * Math.sqrt(3) * efficiency * powerFactor);
    } else {
        fla = powerW / (voltage * efficiency * powerFactor);
    }
    
    return fla;
}

/**
 * Calculate locked rotor current (LRA)
 */
function calculateMotorLRA(motor, fla) {
    const motorType = motor.motorType || 'induction';
    const characteristics = MOTOR_CHARACTERISTICS[motorType] || MOTOR_CHARACTERISTICS.induction;
    
    // Use specified multiplier or typical value
    const multiplier = motor.lockedRotorMultiplier || characteristics.lockedRotorMultiplier;
    
    const lra = fla * multiplier;
    
    return lra;
}

/**
 * Calculate motor impedance at locked rotor
 */
function calculateMotorImpedance(motor, lra) {
    const voltage = motor.voltage || 480;
    const phases = motor.phases || 3;
    const motorType = motor.motorType || 'induction';
    const characteristics = MOTOR_CHARACTERISTICS[motorType] || MOTOR_CHARACTERISTICS.induction;
    
    // Motor impedance Z = V / (√3 × I_LR) for 3-phase
    let zMotor;
    if (phases === 3) {
        zMotor = voltage / (Math.sqrt(3) * lra);
    } else {
        zMotor = voltage / lra;
    }
    
    // Split into R and X using typical X/R ratio
    const xr = motor.xr || characteristics.xrLockedRotor;
    const rMotor = zMotor / Math.sqrt(1 + xr * xr);
    const xMotor = rMotor * xr;
    
    return {
        r: rMotor,
        x: xMotor,
        z: zMotor,
        xr: xr
    };
}

/**
 * Calculate motor contribution at different time points
 */
function calculateMotorContributionTimeline(motor, fla, lra) {
    const motorType = motor.motorType || 'induction';
    const characteristics = MOTOR_CHARACTERISTICS[motorType] || MOTOR_CHARACTERISTICS.induction;
    
    // First cycle (½ cycle or 0.00833s for 60Hz) - maximum contribution
    const firstCycle = lra;
    
    // Interrupting time (typically 3-8 cycles, ~0.05-0.13s for 60Hz)
    // Motor contribution decays due to demagnetization
    const interruptingTime = motor.interruptingTime || 0.05; // 3 cycles default
    const interruptingFactor = motor.interruptingDecay || characteristics.decayFactorInterrupting;
    const interrupting = lra * interruptingFactor;
    
    // Sustained (after ~30 cycles or 0.5s) - steady state contribution
    const sustainedFactor = motor.sustainedMultiplier || characteristics.decayFactorSustained;
    const sustained = fla * sustainedFactor;
    
    return {
        firstCycle: firstCycle,
        firstCycleKA: firstCycle / 1000,
        interrupting: interrupting,
        interruptingKA: interrupting / 1000,
        sustained: sustained,
        sustainedKA: sustained / 1000,
        timeline: {
            halfCycle: firstCycle,
            threeCycles: interrupting,
            thirtyCycles: sustained
        }
    };
}

/**
 * Calculate motor contribution per IEEE 141
 */
function calculateMotorContributionIEEE141(motors, topology) {
    if (!motors || motors.length === 0) {
        return null;
    }
    
    const motorResults = [];
    
    motors.forEach((motor, index) => {
        // Calculate FLA
        const fla = calculateMotorFLA(motor);
        
        // Calculate LRA
        const lra = calculateMotorLRA(motor, fla);
        
        // Calculate impedance
        const impedance = calculateMotorImpedance(motor, lra);
        
        // Calculate contribution timeline
        const contribution = calculateMotorContributionTimeline(motor, fla, lra);
        
        // Refer impedance to fault voltage if needed
        let referredImpedance = impedance;
        if (motor.faultVoltage && motor.voltage && motor.faultVoltage !== motor.voltage) {
            const voltageRatio = motor.faultVoltage / motor.voltage;
            const factor = voltageRatio * voltageRatio;
            referredImpedance = {
                r: impedance.r * factor,
                x: impedance.x * factor,
                z: impedance.z * factor,
                xr: impedance.xr
            };
        }
        
        motorResults.push({
            index: index + 1,
            name: motor.name || `Motor ${index + 1}`,
            type: motor.motorType || 'induction',
            hp: motor.hp || motor.power || 100,
            voltage: motor.voltage || 480,
            fla: fla,
            lra: lra,
            impedance: impedance,
            referredImpedance: referredImpedance,
            contribution: contribution,
            busConnection: motor.fromBus || motor.bus || 'Unknown'
        });
    });
    
    // Aggregate contributions
    const totals = {
        firstCycle: motorResults.reduce((sum, m) => sum + m.contribution.firstCycle, 0),
        interrupting: motorResults.reduce((sum, m) => sum + m.contribution.interrupting, 0),
        sustained: motorResults.reduce((sum, m) => sum + m.contribution.sustained, 0)
    };
    
    totals.firstCycleKA = totals.firstCycle / 1000;
    totals.interruptingKA = totals.interrupting / 1000;
    totals.sustainedKA = totals.sustained / 1000;
    
    return {
        motors: motorResults,
        totals: totals,
        count: motorResults.length,
        aggregateImpedance: calculateAggregateMotorImpedance(motorResults)
    };
}

/**
 * Calculate aggregate motor impedance (parallel combination)
 */
function calculateAggregateMotorImpedance(motorResults) {
    if (motorResults.length === 0) {
        return null;
    }
    
    if (motorResults.length === 1) {
        return motorResults[0].impedance;
    }
    
    // For parallel impedances: 1/Z_total = 1/Z1 + 1/Z2 + ...
    // Simplified: use conductance for parallel combination
    let totalConductance = 0;
    let totalSusceptance = 0;
    
    motorResults.forEach(motor => {
        const z = motor.impedance;
        const zMagSquared = z.r * z.r + z.x * z.x;
        
        // Y = 1/Z = (R - jX)/(R² + X²)
        const conductance = z.r / zMagSquared;
        const susceptance = -z.x / zMagSquared;
        
        totalConductance += conductance;
        totalSusceptance += susceptance;
    });
    
    // Convert back to impedance
    const yMagSquared = totalConductance * totalConductance + totalSusceptance * totalSusceptance;
    const r = totalConductance / yMagSquared;
    const x = -totalSusceptance / yMagSquared;
    const z = Math.sqrt(r * r + x * x);
    const xr = x / (r || 0.001);
    
    return {
        r: r,
        x: x,
        z: z,
        xr: xr
    };
}

/**
 * Calculate motor contribution percentage relative to fault current
 */
function calculateMotorContributionPercentage(motorContribution, faultCurrent) {
    if (!motorContribution || !faultCurrent) {
        return {
            firstCycle: 0,
            interrupting: 0,
            sustained: 0
        };
    }
    
    return {
        firstCycle: (motorContribution.totals.firstCycle / faultCurrent) * 100,
        interrupting: (motorContribution.totals.interrupting / faultCurrent) * 100,
        sustained: (motorContribution.totals.sustained / faultCurrent) * 100
    };
}

/**
 * Validate motor input data
 */
function validateMotorData(motor) {
    const errors = [];
    const warnings = [];
    
    if (!motor.hp && !motor.power) {
        errors.push('Motor power (HP) not specified');
    }
    
    if (!motor.voltage) {
        warnings.push('Motor voltage not specified, using default 480V');
    }
    
    if (!motor.efficiency) {
        warnings.push('Motor efficiency not specified, using default 90%');
    }
    
    if (!motor.powerFactor && !motor.pf) {
        warnings.push('Motor power factor not specified, using default 0.85');
    }
    
    if (!motor.motorType) {
        warnings.push('Motor type not specified, assuming induction motor');
    }
    
    return {
        valid: errors.length === 0,
        errors: errors,
        warnings: warnings
    };
}

/**
 * Generate motor contribution report section
 */
function generateMotorContributionReport(motorContribution, shortCircuitResults) {
    if (!motorContribution || !motorContribution.motors || motorContribution.motors.length === 0) {
        return null;
    }
    
    let report = {
        title: 'Motor Contribution Analysis (IEEE 141)',
        summary: {
            motorCount: motorContribution.count,
            totalHP: motorContribution.motors.reduce((sum, m) => sum + m.hp, 0),
            contributionKA: motorContribution.totals
        },
        motors: [],
        totals: motorContribution.totals,
        percentageOfTotal: null
    };
    
    // Individual motor details
    motorContribution.motors.forEach(motor => {
        report.motors.push({
            name: motor.name,
            hp: motor.hp,
            voltage: motor.voltage,
            fla: motor.fla.toFixed(2),
            lra: motor.lra.toFixed(2),
            xr: motor.impedance.xr.toFixed(2),
            contribution: {
                firstCycle: motor.contribution.firstCycleKA.toFixed(2),
                interrupting: motor.contribution.interruptingKA.toFixed(2),
                sustained: motor.contribution.sustainedKA.toFixed(2)
            }
        });
    });
    
    // Calculate percentage relative to fault current if available
    if (shortCircuitResults && shortCircuitResults.length > 0) {
        const maxFaultCurrent = Math.max(...shortCircuitResults.map(r => r.faultCurrents.threePhase));
        report.percentageOfTotal = calculateMotorContributionPercentage(
            motorContribution, 
            maxFaultCurrent
        );
    }
    
    return report;
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MOTOR_CHARACTERISTICS,
        calculateMotorFLA,
        calculateMotorLRA,
        calculateMotorImpedance,
        calculateMotorContributionTimeline,
        calculateMotorContributionIEEE141,
        calculateAggregateMotorImpedance,
        calculateMotorContributionPercentage,
        validateMotorData,
        generateMotorContributionReport
    };
}
