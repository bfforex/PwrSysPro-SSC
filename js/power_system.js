/**
 * power_system.js
 * Overall system coordination and integration of all calculation modules
 * Manages the complete power system analysis workflow
 */

/**
 * Power System Class - Main coordinator
 */
class PowerSystem {
    constructor() {
        this.busSystem = null;
        this.transformers = [];
        this.cables = [];
        this.sources = [];
        this.loads = [];
        this.calculationResults = {};
    }
    
    /**
     * Initialize system with configuration
     */
    initialize(config) {
        this.busSystem = new BusSystem();
        
        if (config.buses) {
            config.buses.forEach(busConfig => {
                this.busSystem.addBus(busConfig.name, busConfig.voltage, busConfig.type);
            });
        }
        
        if (config.transformers) {
            config.transformers.forEach(xfmrConfig => {
                this.addTransformer(xfmrConfig);
            });
        }
    }
    
    /**
     * Add transformer to system
     */
    addTransformer(config) {
        const transformer = new Transformer(config);
        this.transformers.push(transformer);
        return transformer;
    }
    
    /**
     * Perform comprehensive system analysis
     */
    performSystemAnalysis(analysisType = 'all') {
        const results = {
            timestamp: new Date().toISOString(),
            analysisType: analysisType,
            shortCircuit: null,
            arcFlash: null,
            voltageDrop: null,
            systemSummary: null
        };
        
        // Short circuit analysis
        if (analysisType === 'all' || analysisType === 'shortCircuit') {
            results.shortCircuit = this.performShortCircuitAnalysis();
        }
        
        // Arc flash analysis
        if (analysisType === 'all' || analysisType === 'arcFlash') {
            results.arcFlash = this.performArcFlashAnalysis();
        }
        
        // Voltage drop analysis
        if (analysisType === 'all' || analysisType === 'voltageDrop') {
            results.voltageDrop = this.performVoltageDropAnalysis();
        }
        
        // System summary
        results.systemSummary = this.generateSystemSummary();
        
        this.calculationResults = results;
        return results;
    }
    
    /**
     * Perform short circuit analysis
     */
    performShortCircuitAnalysis() {
        if (!this.busSystem) {
            return { error: 'Bus system not initialized' };
        }
        
        const faultCurrents = this.busSystem.calculateSystemFaultCurrents();
        
        return {
            buses: faultCurrents,
            maxFaultCurrent: Math.max(...faultCurrents.map(f => f.faultCurrent)),
            minFaultCurrent: Math.min(...faultCurrents.map(f => f.faultCurrent))
        };
    }
    
    /**
     * Perform arc flash analysis for all buses
     */
    performArcFlashAnalysis() {
        const arcFlashResults = [];
        
        if (!this.busSystem) {
            return { error: 'Bus system not initialized' };
        }
        
        this.busSystem.getAllBuses().forEach(bus => {
            const faultCurrent = bus.calculateFaultCurrent();
            
            // Calculate arc flash for this bus
            const arcFlash = calculateArcFlashIEEE1584_2018({
                voltage: bus.voltage,
                boltedFaultCurrent: faultCurrent / 1000, // Convert to kA
                workingDistance: 450,
                arcDuration: 0.1,
                equipmentGap: 32,
                enclosureType: 'VCB'
            });
            
            if (arcFlash.applicable) {
                // Get PPE recommendations
                const ppeReport = generatePPEReport(arcFlash);
                
                arcFlashResults.push({
                    busId: bus.id,
                    busName: bus.name,
                    voltage: bus.voltage,
                    arcFlash: arcFlash,
                    ppe: ppeReport.ppe
                });
            }
        });
        
        return arcFlashResults;
    }
    
    /**
     * Perform voltage drop analysis
     */
    performVoltageDropAnalysis() {
        const voltageDropResults = [];
        
        // Analyze each cable in the system
        this.cables.forEach(cable => {
            if (cable.current && cable.length) {
                const analysis = performVoltageDropAnalysis({
                    voltage: cable.voltage || 400,
                    current: cable.current,
                    length: cable.length,
                    conductorSize: cable.size || '10',
                    conductorMaterial: cable.material || 'copper',
                    phaseType: cable.phaseType || 'three-phase',
                    powerFactor: cable.powerFactor || 0.85
                });
                
                voltageDropResults.push({
                    cableId: cable.id,
                    analysis: analysis
                });
            }
        });
        
        return voltageDropResults;
    }
    
    /**
     * Generate system summary
     */
    generateSystemSummary() {
        return {
            buses: this.busSystem ? this.busSystem.getAllBuses().length : 0,
            transformers: this.transformers.length,
            cables: this.cables.length,
            sources: this.sources.length,
            loads: this.loads.length,
            voltag eLevels: this.getVoltageLevels()
        };
    }
    
    /**
     * Get unique voltage levels in system
     */
    getVoltageLevels() {
        if (!this.busSystem) return [];
        
        const voltages = new Set();
        this.busSystem.getAllBuses().forEach(bus => {
            voltages.add(bus.voltage);
        });
        
        return Array.from(voltages).sort((a, b) => b - a);
    }
    
    /**
     * Export system report
     */
    exportSystemReport() {
        return {
            systemConfiguration: {
                buses: this.busSystem ? this.busSystem.exportConfiguration() : null,
                transformers: this.transformers.map(t => ({
                    name: t.name,
                    power: t.powerMVA,
                    primaryV: t.primaryVoltage,
                    secondaryV: t.secondaryVoltage,
                    impedance: t.impedancePercent
                }))
            },
            calculationResults: this.calculationResults,
            summary: this.generateSystemSummary()
        };
    }
}

/**
 * Coordinate all calculation modules
 */
function coordinateCalculations(systemData, calculationType) {
    const results = {
        system: systemData,
        calculations: {},
        timestamp: new Date().toISOString()
    };
    
    switch (calculationType) {
        case 'shortCircuit':
            // Coordinate short circuit calculations
            if (systemData.standard === 'IEC') {
                results.calculations.iec = calculateIECShortCircuit(systemData);
            } else if (systemData.standard === 'IEEE') {
                results.calculations.ieee = calculateIEEEShortCircuit(systemData);
            }
            
            // Verify calculations
            if (results.calculations.iec || results.calculations.ieee) {
                const calcData = results.calculations.iec || results.calculations.ieee;
                results.verification = performComprehensiveVerification(calcData);
            }
            break;
            
        case 'arcFlash':
            // Coordinate arc flash calculations
            results.calculations.arcFlash = calculateArcFlashIEEE1584_2018(systemData);
            if (results.calculations.arcFlash.applicable) {
                results.calculations.ppe = generatePPEReport(results.calculations.arcFlash);
            }
            break;
            
        case 'voltageDrop':
            // Coordinate voltage drop calculations
            results.calculations.voltageDrop = performVoltageDropAnalysis(systemData);
            break;
            
        case 'comprehensive':
            // Perform all calculations
            results.calculations = coordinateCalculations(systemData, 'shortCircuit').calculations;
            Object.assign(results.calculations, 
                coordinateCalculations(systemData, 'arcFlash').calculations);
            Object.assign(results.calculations, 
                coordinateCalculations(systemData, 'voltageDrop').calculations);
            break;
    }
    
    return results;
}

/**
 * Integrate validation across modules
 */
function integrateValidation(inputData) {
    const validationResults = {
        overall: true,
        modules: {}
    };
    
    // Validate inputs
    const inputValidation = validateAllInputs(inputData);
    validationResults.modules.inputs = inputValidation;
    validationResults.overall = validationResults.overall && inputValidation.valid;
    
    // Validate voltage level specific parameters
    if (inputData.voltage) {
        const levelValidation = validateVoltageLevelSpecific(inputData.voltage, inputData);
        validationResults.modules.voltageLevel = levelValidation;
    }
    
    return validationResults;
}

/**
 * Generate integrated report
 */
function generateIntegratedReport(powerSystem) {
    const report = {
        header: {
            title: 'Power System Analysis Report',
            date: new Date().toISOString(),
            standard: 'IEEE/IEC/NFPA 70E'
        },
        systemConfiguration: powerSystem.exportSystemReport().systemConfiguration,
        analysisResults: powerSystem.calculationResults,
        summary: powerSystem.generateSystemSummary(),
        recommendations: []
    };
    
    // Add recommendations based on results
    if (powerSystem.calculationResults.shortCircuit) {
        const maxFault = powerSystem.calculationResults.shortCircuit.maxFaultCurrent;
        if (maxFault > 100) {
            report.recommendations.push({
                category: 'Short Circuit',
                priority: 'High',
                message: `Maximum fault current of ${maxFault.toFixed(2)} kA exceeds typical limits. Review breaker ratings.`
            });
        }
    }
    
    return report;
}

// Export classes and functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PowerSystem,
        coordinateCalculations,
        integrateValidation,
        generateIntegratedReport
    };
}
