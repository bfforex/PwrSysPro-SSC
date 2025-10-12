/**
 * calculation_orchestrator.js
 * Unified Calculation Pipeline Orchestrator
 * Coordinates: Input validation → Topology → Thevenin → SC → Voltage Drop → Arc Flash → Persistence → Report
 */

/**
 * Calculation Orchestrator Class
 * Manages the unified calculation pipeline
 */
class CalculationOrchestrator {
    constructor() {
        this.state = {
            validated: false,
            topology: null,
            thevenin: null,
            shortCircuit: null,
            voltageDrop: null,
            arcFlash: null,
            motorContribution: null,
            results: null,
            calculationLog: [],
            assumptions: []
        };
        this.projectData = null;
    }
    
    /**
     * Run complete analysis pipeline
     */
    async runAllAnalysis(projectData) {
        this.reset();
        this.projectData = projectData;
        
        try {
            this.logStep('Starting unified calculation pipeline');
            
            // Step 1: Input validation
            this.logStep('Step 1: Input validation');
            const validation = this.validateInputs(projectData);
            if (!validation.valid) {
                throw new Error('Input validation failed: ' + validation.errors.join(', '));
            }
            this.state.validated = true;
            
            // Step 2: Build topology (bus graph with fromBus/toBus)
            this.logStep('Step 2: Building topology');
            this.state.topology = this.buildTopology(projectData);
            
            // Step 3: Calculate Thevenin equivalents per bus
            this.logStep('Step 3: Calculating Thevenin equivalents');
            this.state.thevenin = this.calculateTheveninEquivalents(this.state.topology);
            
            // Step 4: Short circuit analysis (all fault types)
            this.logStep('Step 4: Short circuit analysis');
            this.state.shortCircuit = this.calculateShortCircuit(this.state.topology, this.state.thevenin);
            
            // Step 5: Motor contribution (if motors present)
            if (this.hasMotors(projectData)) {
                this.logStep('Step 5: Motor contribution analysis');
                this.state.motorContribution = this.calculateMotorContribution(projectData, this.state.topology);
                this.integrateMotorContribution();
            }
            
            // Step 6: Voltage drop analysis
            this.logStep('Step 6: Voltage drop analysis');
            this.state.voltageDrop = this.calculateVoltageDrop(this.state.topology);
            
            // Step 7: Arc flash analysis
            this.logStep('Step 7: Arc flash analysis');
            this.state.arcFlash = this.calculateArcFlash(this.state.shortCircuit);
            
            // Step 8: Persist results
            this.logStep('Step 8: Persisting results');
            this.state.results = this.persistResults();
            
            this.logStep('Pipeline completed successfully');
            
            return {
                success: true,
                results: this.state.results,
                log: this.state.calculationLog,
                assumptions: this.state.assumptions
            };
            
        } catch (error) {
            this.logStep('ERROR: ' + error.message);
            return {
                success: false,
                error: error.message,
                log: this.state.calculationLog
            };
        }
    }
    
    /**
     * Run short circuit analysis only
     */
    async runShortCircuitAnalysis(projectData) {
        this.reset();
        this.projectData = projectData;
        
        try {
            this.logStep('Running short circuit analysis');
            
            const validation = this.validateInputs(projectData);
            if (!validation.valid) {
                throw new Error('Input validation failed: ' + validation.errors.join(', '));
            }
            
            this.state.topology = this.buildTopology(projectData);
            this.state.thevenin = this.calculateTheveninEquivalents(this.state.topology);
            this.state.shortCircuit = this.calculateShortCircuit(this.state.topology, this.state.thevenin);
            
            if (this.hasMotors(projectData)) {
                this.state.motorContribution = this.calculateMotorContribution(projectData, this.state.topology);
                this.integrateMotorContribution();
            }
            
            return {
                success: true,
                shortCircuit: this.state.shortCircuit,
                motorContribution: this.state.motorContribution,
                log: this.state.calculationLog,
                assumptions: this.state.assumptions
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                log: this.state.calculationLog
            };
        }
    }
    
    /**
     * Run voltage drop analysis only
     */
    async runVoltageDropAnalysis(projectData) {
        this.reset();
        this.projectData = projectData;
        
        try {
            this.logStep('Running voltage drop analysis');
            
            const validation = this.validateInputs(projectData);
            if (!validation.valid) {
                throw new Error('Input validation failed');
            }
            
            this.state.topology = this.buildTopology(projectData);
            this.state.voltageDrop = this.calculateVoltageDrop(this.state.topology);
            
            return {
                success: true,
                voltageDrop: this.state.voltageDrop,
                log: this.state.calculationLog
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                log: this.state.calculationLog
            };
        }
    }
    
    /**
     * Run arc flash analysis only
     */
    async runArcFlashAnalysis(projectData) {
        this.reset();
        this.projectData = projectData;
        
        try {
            this.logStep('Running arc flash analysis');
            
            const validation = this.validateInputs(projectData);
            if (!validation.valid) {
                throw new Error('Input validation failed');
            }
            
            this.state.topology = this.buildTopology(projectData);
            this.state.thevenin = this.calculateTheveninEquivalents(this.state.topology);
            this.state.shortCircuit = this.calculateShortCircuit(this.state.topology, this.state.thevenin);
            this.state.arcFlash = this.calculateArcFlash(this.state.shortCircuit);
            
            return {
                success: true,
                arcFlash: this.state.arcFlash,
                log: this.state.calculationLog,
                assumptions: this.state.assumptions
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message,
                log: this.state.calculationLog
            };
        }
    }
    
    /**
     * Reset orchestrator state
     */
    reset() {
        this.state = {
            validated: false,
            topology: null,
            thevenin: null,
            shortCircuit: null,
            voltageDrop: null,
            arcFlash: null,
            motorContribution: null,
            results: null,
            calculationLog: [],
            assumptions: []
        };
    }
    
    /**
     * Log calculation step
     */
    logStep(message) {
        const timestamp = new Date().toISOString();
        this.state.calculationLog.push({
            timestamp: timestamp,
            message: message
        });
        console.log(`[${timestamp}] ${message}`);
    }
    
    /**
     * Add assumption
     */
    addAssumption(category, description) {
        this.state.assumptions.push({
            category: category,
            description: description
        });
    }
    
    /**
     * Validate inputs
     */
    validateInputs(projectData) {
        const errors = [];
        
        if (!projectData) {
            errors.push('No project data provided');
            return { valid: false, errors };
        }
        
        // Validate voltage
        if (!projectData.voltage || projectData.voltage <= 0) {
            errors.push('Invalid system voltage');
        }
        
        // Validate components
        if (!projectData.components || projectData.components.length === 0) {
            errors.push('No components defined');
        }
        
        // Validate component units
        projectData.components?.forEach((comp, index) => {
            if (comp.type === 'cable') {
                if (!comp.length || comp.length <= 0) {
                    errors.push(`Cable ${index + 1}: Invalid length`);
                }
                if (!comp.resistance || !comp.reactance) {
                    errors.push(`Cable ${index + 1}: Missing impedance data (Ω/km)`);
                }
            }
            
            if (comp.type === 'transformer') {
                if (!comp.power || comp.power <= 0) {
                    errors.push(`Transformer ${index + 1}: Invalid power rating (MVA)`);
                }
                if (!comp.impedance || comp.impedance <= 0) {
                    errors.push(`Transformer ${index + 1}: Invalid impedance (%Z)`);
                }
            }
            
            if (comp.type === 'utility') {
                if (!comp.faultCurrent && !comp.shortCircuitMVA) {
                    errors.push(`Utility ${index + 1}: Must specify fault current (kA) or SC MVA`);
                }
            }
        });
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
    
    /**
     * Build topology with fromBus/toBus connectivity
     */
    buildTopology(projectData) {
        // Use topology manager if available, otherwise use bus model
        if (typeof TopologyManager !== 'undefined') {
            const topologyManager = new TopologyManager();
            return topologyManager.buildFromProject(projectData);
        }
        
        // Fallback to bus model
        const busSystem = buildBusModelFromComponents(projectData.components || []);
        
        return {
            busSystem: busSystem,
            buses: busSystem.getAllBuses(),
            connections: this.extractConnections(busSystem)
        };
    }
    
    /**
     * Extract connections from bus system
     */
    extractConnections(busSystem) {
        const connections = [];
        const buses = busSystem.getAllBuses();
        
        buses.forEach(bus => {
            bus.connections.forEach(conn => {
                // Only add once (from lower ID to higher ID)
                if (bus.id < conn.bus.id) {
                    connections.push({
                        fromBus: bus.id,
                        fromBusName: bus.name,
                        toBus: conn.bus.id,
                        toBusName: conn.bus.name,
                        impedance: conn.impedance
                    });
                }
            });
        });
        
        return connections;
    }
    
    /**
     * Calculate Thevenin equivalents for all buses
     */
    calculateTheveninEquivalents(topology) {
        const buses = topology.buses || topology.busSystem.getAllBuses();
        const theveninEquivalents = [];
        
        buses.forEach(bus => {
            const impedance = bus.calculateTotalImpedance();
            const xr = impedance.x / (impedance.r || 0.001);
            
            theveninEquivalents.push({
                busId: bus.id,
                busName: bus.name,
                voltage: bus.voltage,
                r: impedance.r,
                x: impedance.x,
                z: impedance.magnitude,
                xr: xr
            });
        });
        
        return theveninEquivalents;
    }
    
    /**
     * Calculate short circuit for all fault types
     */
    calculateShortCircuit(topology, thevenin) {
        const buses = topology.buses || topology.busSystem.getAllBuses();
        const results = [];
        
        buses.forEach((bus, index) => {
            const th = thevenin[index];
            const voltage = bus.voltage;
            const z = th.z || 0.001;
            
            // Three-phase fault (maximum)
            const i3phase = voltage / (Math.sqrt(3) * z);
            
            // Other fault types (approximations per IEEE)
            const iLG = i3phase * 0.80;  // Line-to-ground ~80%
            const iLL = i3phase * 0.87;  // Line-to-line ~87% (√3/2)
            const i2LG = i3phase * 0.95; // Double line-to-ground ~95%
            
            // X/R ratio and asymmetric component
            const xr = th.xr || 10;
            const asymFactor = Math.sqrt(1 + 2 * Math.pow(Math.E, -4 * Math.PI / xr));
            const iPeak = i3phase * Math.sqrt(2) * asymFactor;
            
            results.push({
                busId: bus.id,
                busName: bus.name,
                voltage: voltage,
                impedance: {
                    r: th.r,
                    x: th.x,
                    z: th.z,
                    xr: xr
                },
                faultCurrents: {
                    threePhase: i3phase,
                    lineToGround: iLG,
                    lineToLine: iLL,
                    doubleLineToGround: i2LG,
                    symmetrical: i3phase,
                    asymmetrical: i3phase * asymFactor,
                    peak: iPeak
                },
                faultCurrentsKA: {
                    threePhase: i3phase / 1000,
                    lineToGround: iLG / 1000,
                    lineToLine: iLL / 1000,
                    doubleLineToGround: i2LG / 1000,
                    symmetrical: i3phase / 1000,
                    asymmetrical: (i3phase * asymFactor) / 1000,
                    peak: iPeak / 1000
                }
            });
        });
        
        return results;
    }
    
    /**
     * Check if project has motors
     */
    hasMotors(projectData) {
        return projectData.components?.some(c => c.type === 'motor' || c.type === 'motor_load');
    }
    
    /**
     * Calculate motor contribution
     */
    calculateMotorContribution(projectData, topology) {
        const motors = projectData.components.filter(c => c.type === 'motor' || c.type === 'motor_load');
        
        if (motors.length === 0) {
            return null;
        }
        
        // Use motor contribution module if available
        if (typeof calculateMotorContributionIEEE141 !== 'undefined') {
            return calculateMotorContributionIEEE141(motors, topology);
        }
        
        // Fallback: basic motor contribution calculation
        const motorResults = [];
        
        motors.forEach(motor => {
            const hp = motor.hp || motor.power || 100;
            const voltage = motor.voltage || 480;
            const efficiency = motor.efficiency || 0.90;
            const pf = motor.powerFactor || 0.85;
            
            // FLA calculation
            const fla = (hp * 746) / (voltage * Math.sqrt(3) * efficiency * pf);
            
            // Locked rotor current (typically 6x FLA)
            const lra = fla * (motor.lockedRotorMultiplier || 6);
            
            // Motor impedance at locked rotor
            const zMotor = voltage / (Math.sqrt(3) * lra);
            
            // Typical motor X/R = 15 at locked rotor
            const motorXR = 15;
            const xMotor = zMotor / Math.sqrt(1 + 1 / (motorXR * motorXR));
            const rMotor = xMotor / motorXR;
            
            // Contribution decays over time
            const firstCycle = lra;
            const interrupting = lra * 0.75;  // ~75% at breaker interrupting time
            const sustained = fla * 4;        // ~4x FLA sustained
            
            motorResults.push({
                name: motor.name || 'Motor',
                hp: hp,
                voltage: voltage,
                fla: fla,
                lra: lra,
                impedance: { r: rMotor, x: xMotor, z: zMotor },
                contribution: {
                    firstCycle: firstCycle,
                    interrupting: interrupting,
                    sustained: sustained
                }
            });
            
            this.addAssumption('Motor Contribution', `Motor X/R assumed ${motorXR} at locked rotor`);
        });
        
        // Aggregate contributions
        const totalFirstCycle = motorResults.reduce((sum, m) => sum + m.contribution.firstCycle, 0);
        const totalInterrupting = motorResults.reduce((sum, m) => sum + m.contribution.interrupting, 0);
        const totalSustained = motorResults.reduce((sum, m) => sum + m.contribution.sustained, 0);
        
        return {
            motors: motorResults,
            totals: {
                firstCycle: totalFirstCycle,
                interrupting: totalInterrupting,
                sustained: totalSustained
            }
        };
    }
    
    /**
     * Integrate motor contribution into short circuit results
     */
    integrateMotorContribution() {
        if (!this.state.motorContribution || !this.state.shortCircuit) {
            return;
        }
        
        const motorTotals = this.state.motorContribution.totals;
        
        // Add motor contribution to each bus (assuming motors at low voltage)
        this.state.shortCircuit.forEach(busResult => {
            // Add motor contribution to first-cycle current
            busResult.faultCurrents.threePhaseWithMotors = 
                busResult.faultCurrents.threePhase + motorTotals.firstCycle;
            busResult.faultCurrentsKA.threePhaseWithMotors = 
                busResult.faultCurrentsKA.threePhase + motorTotals.firstCycle / 1000;
            
            // Motor contribution percentage
            busResult.motorContributionPercent = 
                (motorTotals.firstCycle / busResult.faultCurrents.threePhase) * 100;
        });
    }
    
    /**
     * Calculate voltage drop
     */
    calculateVoltageDrop(topology) {
        const buses = topology.buses || topology.busSystem.getAllBuses();
        const results = [];
        
        buses.forEach((bus, index) => {
            if (index === 0) {
                // Source bus - no voltage drop
                results.push({
                    busId: bus.id,
                    busName: bus.name,
                    voltage: bus.voltage,
                    voltageDropPercent: 0,
                    voltageAtBus: bus.voltage
                });
            } else {
                // Calculate voltage drop from source
                const impedance = bus.calculateTotalImpedance();
                
                // Assume typical load current (can be enhanced with actual load data)
                const loadCurrent = bus.components.reduce((sum, comp) => {
                    if (comp.current) return sum + comp.current;
                    if (comp.power && comp.voltage) {
                        return sum + (comp.power * 1e6) / (Math.sqrt(3) * comp.voltage * 0.85);
                    }
                    return sum;
                }, 0) || 100; // Default 100A if no load specified
                
                const powerFactor = 0.85;
                const voltageDropV = Math.sqrt(3) * loadCurrent * 
                    (impedance.r * powerFactor + impedance.x * Math.sin(Math.acos(powerFactor)));
                
                const voltageDropPercent = (voltageDropV / bus.voltage) * 100;
                const voltageAtBus = bus.voltage - voltageDropV;
                
                results.push({
                    busId: bus.id,
                    busName: bus.name,
                    nominalVoltage: bus.voltage,
                    impedance: impedance,
                    loadCurrent: loadCurrent,
                    voltageDropV: voltageDropV,
                    voltageDropPercent: voltageDropPercent,
                    voltageAtBus: voltageAtBus,
                    compliance: {
                        nec: voltageDropPercent <= 5,
                        recommended: voltageDropPercent <= 3
                    }
                });
                
                if (voltageDropPercent > 3) {
                    this.addAssumption('Voltage Drop', 
                        `${bus.name}: ${voltageDropPercent.toFixed(2)}% exceeds recommended 3% limit`);
                }
            }
        });
        
        return results;
    }
    
    /**
     * Calculate arc flash
     */
    calculateArcFlash(shortCircuitResults) {
        const results = [];
        
        shortCircuitResults.forEach(scResult => {
            const boltedFaultKA = scResult.faultCurrentsKA.threePhase;
            const voltage = scResult.voltage;
            
            // Check if arc flash calculation is applicable
            const applicable = voltage >= 208 && voltage <= 15000;
            
            if (!applicable) {
                results.push({
                    busId: scResult.busId,
                    busName: scResult.busName,
                    applicable: false,
                    reason: `Voltage ${voltage}V outside IEEE 1584-2018 range (208-15000V)`
                });
                return;
            }
            
            // Use arc flash calculation module if available
            if (typeof calculateArcFlashIEEE1584_2018 !== 'undefined') {
                const arcFlash = calculateArcFlashIEEE1584_2018({
                    voltage: voltage,
                    boltedFaultCurrent: boltedFaultKA,
                    workingDistance: 450, // mm, default
                    arcDuration: 0.1, // seconds, default 6 cycles
                    equipmentGap: voltage < 1000 ? 32 : 104, // mm
                    enclosureType: 'VCB'
                });
                
                // Get PPE recommendations
                let ppe = null;
                if (typeof generatePPEReport !== 'undefined' && arcFlash.applicable) {
                    ppe = generatePPEReport(arcFlash).ppe;
                }
                
                results.push({
                    busId: scResult.busId,
                    busName: scResult.busName,
                    voltage: voltage,
                    boltedFaultCurrent: boltedFaultKA,
                    applicable: true,
                    ...arcFlash,
                    ppe: ppe
                });
                
                // Add assumptions
                this.addAssumption('Arc Flash', 
                    `Working distance: 450mm, Arc duration: 100ms (6 cycles), Equipment: VCB`);
            } else {
                // Fallback: basic arc flash estimation
                const arcingCurrent = boltedFaultKA * 0.85; // Typical 85% of bolted
                const workingDistance = 450; // mm
                const arcDuration = 0.1; // seconds
                
                // Simplified incident energy calculation
                const incidentEnergy = (arcingCurrent * voltage * arcDuration) / 
                    (4.184 * Math.pow(workingDistance / 1000, 2));
                
                // Arc flash boundary (distance where E = 1.2 cal/cm²)
                const afbMm = workingDistance * Math.sqrt(incidentEnergy / 1.2);
                
                results.push({
                    busId: scResult.busId,
                    busName: scResult.busName,
                    voltage: voltage,
                    boltedFaultCurrent: boltedFaultKA,
                    applicable: true,
                    arcingCurrent: arcingCurrent,
                    incidentEnergy: incidentEnergy,
                    arcFlashBoundary: afbMm,
                    workingDistance: workingDistance,
                    arcDuration: arcDuration
                });
                
                this.addAssumption('Arc Flash', 'Simplified calculation used - IEEE 1584-2018 module not available');
            }
        });
        
        return results;
    }
    
    /**
     * Persist results
     */
    persistResults() {
        const results = {
            timestamp: new Date().toISOString(),
            projectData: this.projectData,
            calculationLog: this.state.calculationLog,
            assumptions: this.state.assumptions,
            topology: {
                buses: this.state.topology.buses.map(b => ({
                    id: b.id,
                    name: b.name,
                    voltage: b.voltage,
                    type: b.type
                })),
                connections: this.state.topology.connections || []
            },
            thevenin: this.state.thevenin,
            shortCircuit: this.state.shortCircuit,
            motorContribution: this.state.motorContribution,
            voltageDrop: this.state.voltageDrop,
            arcFlash: this.state.arcFlash,
            summary: {
                maxFaultCurrent: Math.max(...this.state.shortCircuit.map(r => r.faultCurrentsKA.threePhase)),
                minFaultCurrent: Math.min(...this.state.shortCircuit.map(r => r.faultCurrentsKA.threePhase)),
                maxVoltageDropPercent: Math.max(...this.state.voltageDrop.map(r => r.voltageDropPercent || 0)),
                maxIncidentEnergy: this.state.arcFlash ? 
                    Math.max(...this.state.arcFlash.filter(r => r.applicable).map(r => r.incidentEnergy || 0)) : 0
            }
        };
        
        return results;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CalculationOrchestrator
    };
}
