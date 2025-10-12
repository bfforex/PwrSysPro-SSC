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
        const warnings = [];
        
        if (!projectData) {
            errors.push('No project data provided');
            return { valid: false, errors, warnings };
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
                // Validate length
                if (!comp.length || comp.length <= 0) {
                    errors.push(`Cable ${index + 1}: Invalid length (must be positive)`);
                }
                if (comp.length < 0) {
                    errors.push(`Cable ${index + 1}: Negative length ${comp.length}m is impossible`);
                }
                
                // Validate impedance data
                if (!comp.resistance || !comp.reactance) {
                    errors.push(`Cable ${index + 1}: Missing impedance data (Ω/km)`);
                }
                if (comp.resistance < 0 || comp.reactance < 0) {
                    errors.push(`Cable ${index + 1}: Negative impedance values are impossible (R=${comp.resistance}, X=${comp.reactance})`);
                }
                
                // Validate voltage specification
                if (!comp.voltage) {
                    warnings.push(`Cable ${index + 1}: Voltage level not specified. Will use system voltage. Please specify voltage (in V, not kV) for accurate referral.`);
                    this.addAssumption('Cable Validation', `Cable ${index + 1} voltage not specified - using system voltage for impedance referral`);
                }
                
                // Check for kV vs V confusion
                if (comp.voltage && comp.voltage < 100) {
                    warnings.push(`Cable ${index + 1}: Voltage ${comp.voltage}V seems very low. Did you mean ${comp.voltage * 1000}V (i.e., ${comp.voltage} kV)? Please use V, not kV.`);
                }
                
                // Validate cable reactance - typical LV cable reactance is 0.03-0.1 Ω/km
                if (comp.reactance && comp.voltage && comp.voltage < 1000) {
                    // LV cable
                    if (comp.reactance > 0.2) {
                        warnings.push(`Cable ${index + 1}: Reactance ${comp.reactance} Ω/km is unusually high for LV cable (typical: 0.03-0.1 Ω/km). Please verify.`);
                        this.addAssumption('Cable Validation', `Cable ${index + 1} has high reactance (${comp.reactance} Ω/km). Typical LV cable: 0.03-0.1 Ω/km. Consider correcting if data error.`);
                    }
                    if (comp.reactance < 0.01) {
                        warnings.push(`Cable ${index + 1}: Reactance ${comp.reactance} Ω/km is unusually low. Please verify.`);
                    }
                }
            }
            
            if (comp.type === 'transformer') {
                if (!comp.power || comp.power <= 0) {
                    errors.push(`Transformer ${index + 1}: Invalid power rating (MVA)`);
                }
                if (comp.power < 0) {
                    errors.push(`Transformer ${index + 1}: Negative power rating ${comp.power} MVA is impossible`);
                }
                
                if (!comp.impedance || comp.impedance <= 0) {
                    errors.push(`Transformer ${index + 1}: Invalid impedance (%Z)`);
                }
                if (comp.impedance < 0) {
                    errors.push(`Transformer ${index + 1}: Negative impedance ${comp.impedance}% is impossible`);
                }
                
                // Typical transformer impedances: 3-7% for distribution transformers
                if (comp.impedance > 15) {
                    warnings.push(`Transformer ${index + 1}: Impedance ${comp.impedance}% is unusually high (typical: 3-7%). Please verify.`);
                }
                if (comp.impedance < 2) {
                    warnings.push(`Transformer ${index + 1}: Impedance ${comp.impedance}% is unusually low (typical: 3-7%). Please verify.`);
                }
                
                // Check for missing R/X ratio
                if (!comp.rx && comp.rx !== 0) {
                    this.addAssumption('Transformer', `Transformer ${index + 1} R/X ratio not specified - using IEEE 141 typical value based on ${comp.power} MVA rating`);
                }
                
                // Validate voltage specifications
                if (!comp.primaryV || comp.primaryV <= 0) {
                    warnings.push(`Transformer ${index + 1}: Primary voltage not specified or invalid`);
                }
                if (!comp.secondaryV || comp.secondaryV <= 0) {
                    warnings.push(`Transformer ${index + 1}: Secondary voltage not specified or invalid`);
                }
                
                // Check for kV vs V confusion
                if (comp.primaryV && comp.primaryV > 1000) {
                    warnings.push(`Transformer ${index + 1}: Primary voltage ${comp.primaryV} seems very high. Did you mean ${comp.primaryV / 1000} kV? Please use kV for transformer voltages.`);
                }
                if (comp.secondaryV && comp.secondaryV > 1000) {
                    // This is actually correct for many transformers (e.g., 13.2kV/480V)
                    // But warn if unusually high
                    if (comp.secondaryV > 10000) {
                        warnings.push(`Transformer ${index + 1}: Secondary voltage ${comp.secondaryV} seems very high. Please verify units (should be in kV).`);
                    }
                }
            }
            
            if (comp.type === 'utility' || comp.type === 'utility_isc') {
                // Validate ISC if provided
                if (comp.isc !== undefined) {
                    if (comp.isc <= 0) {
                        errors.push(`Utility ${index + 1}: Invalid fault current (must be positive)`);
                    }
                    
                    // Check for plausible ISC range based on voltage
                    if (comp.voltage && comp.isc) {
                        const voltageKV = comp.voltage;
                        // For MV systems (1-36 kV), typical ISC is 1-100 kA
                        // ISC > 1000 kA is implausible for most utility sources
                        if (comp.isc > 1000) {
                            // Suggest kA value with appropriate precision (1 decimal place)
                            const suggestedKA = (comp.isc / 1000).toFixed(1);
                            errors.push(`Utility ${index + 1}: ISC ${comp.isc.toFixed(0)} kA is implausibly high. Did you mean ${suggestedKA} kA? Please verify units (should be kA, not A).`);
                        }
                        
                        // Calculate implied MVA and check plausibility
                        const impliedMVA = Math.sqrt(3) * voltageKV * comp.isc;
                        if (impliedMVA > 10000) {
                            warnings.push(`Utility ${index + 1}: Implied fault MVA is ${impliedMVA.toFixed(0)} MVA (ISC=${comp.isc.toFixed(1)} kA @ ${voltageKV} kV). This is very high. Typical: 100-1000 MVA for distribution.`);
                        }
                    }
                }
                
                if (comp.type === 'utility' && !comp.faultCurrent && !comp.shortCircuitMVA && !comp.isc) {
                    errors.push(`Utility ${index + 1}: Must specify fault current (kA) or SC MVA`);
                }
            }
        });
        
        // Log warnings as assumptions
        warnings.forEach(warning => {
            this.logStep('WARNING: ' + warning);
        });
        
        return {
            valid: errors.length === 0,
            errors: errors,
            warnings: warnings
        };
    }
    
    /**
     * Build topology with fromBus/toBus connectivity
     */
    buildTopology(projectData) {
        // Use topology manager if available, otherwise use bus model
        if (typeof TopologyManager !== 'undefined') {
            const topologyManager = new TopologyManager();
            const topology = topologyManager.buildFromProject(projectData);
            
            // Validate topology connectivity
            const validation = topologyManager.validateTopology();
            if (!validation.valid) {
                const errorMsg = `Topology validation failed: ${validation.errors.join('; ')}`;
                this.logStep(`ERROR: ${errorMsg}`);
                throw new Error(errorMsg);
            }
            
            // Log warnings
            validation.warnings.forEach(warning => {
                this.logStep('WARNING: ' + warning);
                this.addAssumption('Topology', warning);
            });
            
            return topology;
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
        const buses = topology.busSystem.getAllBuses();
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
        const buses = topology.busSystem.getAllBuses();
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
            
            // First-cycle RMS asymmetrical current multiplier
            // Per ANSI/IEEE C37.010 and IEEE 141
            // Formula: Multiplier = √(1 + 2e^(-4π/(X/R)))
            // This accounts for DC offset component during first cycle
            const asymFactor = Math.sqrt(1 + 2 * Math.pow(Math.E, -4 * Math.PI / xr));
            
            // Peak current (instantaneous maximum)
            // Peak = √2 × Asymmetrical RMS
            const iPeak = i3phase * Math.sqrt(2) * asymFactor;
            
            // Calculate fault MVA
            const faultMVA = (Math.sqrt(3) * voltage * i3phase) / 1e6;
            
            // Calculate time constant τ = L/(ωR) = X/(2πfR)
            const frequency = this.projectData.frequency || 60; // Hz
            const omega = 2 * Math.PI * frequency;
            const tau_s = th.x / (omega * th.r); // seconds
            
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
                },
                // Enhanced results per problem statement requirements
                results: {
                    isym_kA: i3phase / 1000,
                    iasym_kA: (i3phase * asymFactor) / 1000,
                    z_total_ohm: th.z,
                    x_over_r: xr,
                    mva_sc: faultMVA,
                    tau_s: tau_s,
                    multiplier: asymFactor,
                    computed_at: new Date().toISOString()
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
        
        const motorData = this.state.motorContribution;
        
        // Group motors by bus
        const motorsByBus = {};
        motorData.motors.forEach(motor => {
            const busId = motor.busConnection || 'Unknown';
            if (!motorsByBus[busId]) {
                motorsByBus[busId] = {
                    firstCycle: 0,
                    interrupting: 0,
                    sustained: 0,
                    motors: []
                };
            }
            motorsByBus[busId].firstCycle += motor.contribution.firstCycle;
            motorsByBus[busId].interrupting += motor.contribution.interrupting;
            motorsByBus[busId].sustained += motor.contribution.sustained;
            motorsByBus[busId].motors.push(motor);
        });
        
        // Add motor contribution to each bus
        this.state.shortCircuit.forEach(busResult => {
            const busMotors = motorsByBus[busResult.busId] || motorsByBus[busResult.busName];
            
            if (busMotors) {
                // Add motor contribution as parallel current source (IEEE 141)
                // Motors contribute additional current, not series impedance
                const motorFirstCycleKA = busMotors.firstCycle / 1000;
                const motorInterruptingKA = busMotors.interrupting / 1000;
                const motorSustainedKA = busMotors.sustained / 1000;
                
                // Store motor contribution separately
                busResult.motorContribution = {
                    firstCycleKA: motorFirstCycleKA,
                    interruptingKA: motorInterruptingKA,
                    sustainedKA: motorSustainedKA,
                    count: busMotors.motors.length,
                    motors: busMotors.motors
                };
                
                // Add to fault currents (parallel source contribution)
                busResult.faultCurrentsKA.threePhaseWithMotors = 
                    busResult.faultCurrentsKA.threePhase + motorFirstCycleKA;
                busResult.faultCurrentsKA.interruptingWithMotors = 
                    busResult.faultCurrentsKA.threePhase + motorInterruptingKA;
                busResult.faultCurrentsKA.sustainedWithMotors = 
                    busResult.faultCurrentsKA.threePhase + motorSustainedKA;
                
                // Calculate motor contribution percentage
                busResult.motorContributionPercent = {
                    firstCycle: (motorFirstCycleKA / busResult.faultCurrentsKA.threePhase) * 100,
                    interrupting: (motorInterruptingKA / busResult.faultCurrentsKA.threePhase) * 100,
                    sustained: (motorSustainedKA / busResult.faultCurrentsKA.threePhase) * 100
                };
                
                this.logStep(`Bus ${busResult.busName}: Added motor contribution (${motorFirstCycleKA.toFixed(2)} kA first-cycle from ${busMotors.motors.length} motor(s))`);
            } else {
                // No motors at this bus
                busResult.faultCurrentsKA.threePhaseWithMotors = busResult.faultCurrentsKA.threePhase;
                busResult.motorContribution = null;
                busResult.motorContributionPercent = null;
            }
        });
        
        this.addAssumption('Motor Contribution', 'Motors modeled as parallel current sources per IEEE 141, not series impedances');
    }
    
    /**
     * Calculate voltage drop
     */
    calculateVoltageDrop(topology) {
        const buses = topology.busSystem.getAllBuses();
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
        
        // Get arc flash parameters from project data
        const arcFlashParams = this.projectData.arcFlashParams || {};
        const workingDistance = arcFlashParams.workingDistance || 450; // mm
        const arcDuration = arcFlashParams.arcDuration || 0.1; // seconds (6 cycles @ 60Hz)
        const enclosureType = arcFlashParams.enclosureType || 'VCB';
        const equipmentType = arcFlashParams.equipmentType || 'Switchgear';
        
        shortCircuitResults.forEach(scResult => {
            const boltedFaultKA = scResult.faultCurrentsKA.threePhaseWithMotors || 
                                  scResult.faultCurrentsKA.threePhase;
            const voltage = scResult.voltage;
            
            // Check if arc flash calculation is applicable
            const voltageInRange = voltage >= 208 && voltage <= 15000;
            
            // Check for required parameters
            const missingFields = [];
            if (!voltageInRange) {
                missingFields.push(`Voltage ${voltage}V outside IEEE 1584-2018 range (208-15000V)`);
            }
            if (!boltedFaultKA || boltedFaultKA <= 0) {
                missingFields.push('Valid bolted fault current required');
            }
            if (!workingDistance || workingDistance <= 0) {
                missingFields.push('Working distance not specified');
            }
            if (!arcDuration || arcDuration <= 0) {
                missingFields.push('Arc duration (clearing time) not specified');
            }
            
            if (missingFields.length > 0) {
                results.push({
                    busId: scResult.busId,
                    busName: scResult.busName,
                    voltage: voltage,
                    boltedFaultCurrent: boltedFaultKA,
                    applicable: false,
                    evaluated: false,
                    status: 'Not Evaluated',
                    missingFields: missingFields,
                    reason: 'Missing required parameters or out of range'
                });
                return;
            }
            
            // Use arc flash calculation module if available
            if (typeof calculateArcFlashIEEE1584_2018 !== 'undefined') {
                try {
                    const equipmentGap = voltage < 1000 ? 32 : 104; // mm, typical for enclosure type
                    
                    const arcFlash = calculateArcFlashIEEE1584_2018({
                        voltage: voltage,
                        boltedFaultCurrent: boltedFaultKA,
                        workingDistance: workingDistance,
                        arcDuration: arcDuration,
                        equipmentGap: equipmentGap,
                        enclosureType: enclosureType
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
                        evaluated: true,
                        status: 'Evaluated',
                        method: 'IEEE 1584-2018',
                        ...arcFlash,
                        ppe: ppe,
                        parameters: {
                            workingDistance: workingDistance,
                            arcDuration: arcDuration,
                            equipmentGap: equipmentGap,
                            enclosureType: enclosureType
                        }
                    });
                    
                    // Add assumptions
                    this.addAssumption('Arc Flash', 
                        `${scResult.busName}: Working distance ${workingDistance}mm, Arc duration ${(arcDuration*1000).toFixed(0)}ms, Equipment: ${enclosureType}`);
                } catch (error) {
                    results.push({
                        busId: scResult.busId,
                        busName: scResult.busName,
                        voltage: voltage,
                        boltedFaultCurrent: boltedFaultKA,
                        applicable: false,
                        evaluated: false,
                        status: 'Calculation Error',
                        error: error.message
                    });
                }
            } else {
                // Fallback: basic arc flash estimation
                const arcingCurrent = boltedFaultKA * 0.85; // Typical 85% of bolted
                
                // Simplified incident energy calculation (conservative)
                // Based on empirical formula: E ≈ (I × V × t) / (4.184 × d²)
                const incidentEnergy = (arcingCurrent * voltage * arcDuration) / 
                    (4.184 * Math.pow(workingDistance / 1000, 2));
                
                // Arc flash boundary (distance where E = 1.2 cal/cm²)
                const afbMm = workingDistance * Math.sqrt(incidentEnergy / 1.2);
                
                // Determine PPE category based on incident energy (NFPA 70E-2024)
                let ppeCategory = 0;
                if (incidentEnergy <= 1.2) ppeCategory = 0;
                else if (incidentEnergy <= 4) ppeCategory = 1;
                else if (incidentEnergy <= 8) ppeCategory = 2;
                else if (incidentEnergy <= 25) ppeCategory = 3;
                else if (incidentEnergy <= 40) ppeCategory = 4;
                else ppeCategory = '>4';
                
                results.push({
                    busId: scResult.busId,
                    busName: scResult.busName,
                    voltage: voltage,
                    boltedFaultCurrent: boltedFaultKA,
                    applicable: true,
                    evaluated: true,
                    status: 'Evaluated (Simplified)',
                    method: 'Simplified Empirical',
                    arcingCurrent: arcingCurrent,
                    incidentEnergy: incidentEnergy,
                    arcFlashBoundary: afbMm,
                    ppe: {
                        category: ppeCategory,
                        arcRating: Math.max(4, incidentEnergy)
                    },
                    parameters: {
                        workingDistance: workingDistance,
                        arcDuration: arcDuration
                    }
                });
                
                this.addAssumption('Arc Flash', 
                    `${scResult.busName}: Simplified calculation used (IEEE 1584-2018 module not available). Results are conservative estimates.`);
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
                buses: this.state.topology.busSystem.getAllBuses().map(b => ({
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
        
        // Save to ResultsStore
        if (typeof window !== 'undefined' && window.resultsStore) {
            window.resultsStore.saveResults(results);
            this.logStep('Results saved to ResultsStore');
        }
        
        return results;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CalculationOrchestrator
    };
}

// Export to window for browser usage
if (typeof window !== 'undefined') {
    window.CalculationOrchestrator = CalculationOrchestrator;
}
