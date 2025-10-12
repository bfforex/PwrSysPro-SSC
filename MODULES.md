# PowerSys Pro - Enhanced Modules Documentation

## Overview

This document provides an overview of the enhanced modules added to PowerSys Pro Short Circuit Calculator. These modules implement comprehensive power system analysis capabilities compliant with international standards.

## Module Structure

### JavaScript Modules (js/ directory)

#### 1. improved_validation.js
**Purpose**: Enhanced input validation with physical constraints

**Key Features**:
- Voltage-level specific validation (LV, MV, HV, EHV)
- Physical constraint checking for all parameters
- Real-time validation feedback
- Warning generation for unusual values

**Main Functions**:
- `validatePhysicalConstraint(value, constraintType)` - Validates input against physical limits
- `validateVoltageLevelSpecific(voltage, parameters)` - Voltage-level specific validation
- `validateAllInputs(inputs)` - Comprehensive validation of all inputs
- `setupRealtimeValidation(inputId, constraintType)` - Setup real-time validation

#### 2. standard_specific_calcs.js
**Purpose**: Standards-specific calculation factors and methods

**Standards Implemented**:
- IEC 60909-0: Voltage factors (cmax, cmin), kappa factors
- IEEE/ANSI: Asymmetry factors, C37 multiplying factors

**Key Features**:
- IEC voltage factor calculation
- IEEE asymmetry factor determination
- Peak current calculations (IEC and IEEE methods)
- Standards comparison

**Main Functions**:
- `calculateIECShortCircuit(params)` - IEC 60909-0 calculations
- `calculateIEEEShortCircuit(params)` - IEEE/ANSI calculations
- `getIECVoltageFactor(voltage, factorType)` - Get IEC voltage factors
- `compareStandards(iecResults, ieeeResults)` - Compare calculation results

#### 3. calculation_verification.js
**Purpose**: Calculation verification and cross-checking

**Key Features**:
- Fault current verification against voltage level limits
- Peak to symmetrical ratio verification
- Impedance validation
- Transformer calculation verification
- Voltage drop compliance checking

**Main Functions**:
- `performComprehensiveVerification(calculationData)` - Complete verification
- `verifyFaultCurrent(voltage, faultCurrent, voltageLevel)` - Fault current checks
- `verifyTransformerCalculation(transformer, calculatedImpedance)` - Transformer verification
- `crossValidateResults(results1, results2, method1, method2)` - Cross-validation

#### 4. arc_flash_calculation.js
**Purpose**: IEEE 1584-2018 arc flash hazard calculations

**Key Features**:
- IEEE 1584-2018 compliant incident energy calculations
- Arc flash boundary determination
- Equipment-specific configurations (VCB, VCBB, HCB, VOA, HOA)
- Legacy IEEE 1584-2002 support for comparison

**Main Functions**:
- `calculateArcFlashIEEE1584_2018(params)` - Main arc flash calculation
- `calculateArcingCurrent(voltage, boltedFaultCurrent, gap)` - Arcing current
- `calculateArcFlashBoundary(incidentEnergy, workingDistance)` - AFB calculation

#### 5. ppe_selection.js
**Purpose**: NFPA 70E-2024 PPE category determination

**Key Features**:
- NFPA 70E-2024 PPE categories (0-4)
- PPE equipment requirements
- Approach boundary calculations (limited, restricted, prohibited)
- Detailed PPE recommendations

**Main Functions**:
- `getPPECategory(incidentEnergyCalCm2)` - Determine PPE category
- `getDetailedPPERecommendations(incidentEnergyCalCm2)` - Full PPE recommendations
- `calculateNFPA70EBoundaries(voltage)` - Shock protection boundaries
- `generatePPEReport(arcFlashResults)` - Generate complete PPE report

#### 6. voltage_drop_calculations.js
**Purpose**: Comprehensive voltage drop calculations

**Standards Implemented**:
- NEC (Article 210.19, 215.2)
- IEEE 141 (Red Book)

**Key Features**:
- Single-phase and three-phase calculations
- Conductor database (copper and aluminum)
- NEC compliance checking
- IEEE recommendations verification
- Required conductor size calculation

**Main Functions**:
- `calculateThreePhaseVoltageDrop(params)` - Three-phase voltage drop
- `calculateSinglePhaseVoltageDrop(params)` - Single-phase voltage drop
- `checkNECCompliance(voltageDropPercent, circuitType)` - NEC compliance
- `performVoltageDropAnalysis(params)` - Complete analysis

#### 7. bus_model.js
**Purpose**: Bus modeling for power system analysis

**Key Features**:
- Bus class for connection points
- Multi-voltage level support
- Component management per bus
- Fault current calculation per bus
- System-wide bus management

**Main Classes/Functions**:
- `class Bus` - Individual bus representation
- `class BusSystem` - System-wide bus management
- `buildBusModelFromComponents(components)` - Build bus model from components

#### 8. thevenin_equivalent.js
**Purpose**: Thevenin equivalent calculations

**Key Features**:
- Thevenin equivalent for individual buses
- Impedance matrix (Z-bus) construction
- Fault current calculation using Z-bus method
- Impedance reduction and combination
- Voltage level transformation

**Main Functions**:
- `calculateTheveninEquivalent(bus, sourceVoltage)` - Thevenin equivalent
- `buildImpedanceMatrix(busSystem)` - Z-bus matrix construction
- `transformImpedanceToVoltageLevel(impedance, voltage1, voltage2)` - Voltage transformation
- `simplifySystemToThevenin(busSystem, sourceBusId)` - System simplification

#### 9. transformer_model.js
**Purpose**: Transformer modeling with impedance referencing

**Key Features**:
- Transformer impedance calculation (primary and secondary)
- Voltage transformation with tap position
- Voltage regulation calculation
- Transformer losses and efficiency
- Inrush current calculation
- Multi-transformer banks

**Main Classes/Functions**:
- `class Transformer` - Transformer model
- `class TransformerBank` - Parallel transformer configuration
- `referImpedanceBetweenLevels(impedance, fromVoltage, toVoltage)` - Impedance referencing
- `calculateShortCircuitWithstand(transformer)` - SC withstand capability

#### 10. power_system.js
**Purpose**: Overall system coordination

**Key Features**:
- PowerSystem class for system-wide management
- Comprehensive system analysis (short circuit, arc flash, voltage drop)
- System summary generation
- Integration of all calculation modules

**Main Classes/Functions**:
- `class PowerSystem` - Main system coordinator
- `coordinateCalculations(systemData, calculationType)` - Coordinate calculations
- `integrateValidation(inputData)` - Integrated validation
- `generateIntegratedReport(powerSystem)` - Generate report

#### 11. visualization.js
**Purpose**: System diagram visualization and results display

**Key Features**:
- SVG-based system diagram generation
- Chart.js integration for charts
- Fault current profile charts
- Voltage drop profile charts
- Arc flash hazard charts
- Expandable calculation steps display
- Standards comparison tables

**Main Functions**:
- `drawSystemDiagram(busSystem, containerId)` - Draw system diagram
- `createFaultCurrentChart(faultData, canvasId)` - Fault current chart
- `createVoltageDropChart(voltageData, canvasId)` - Voltage drop chart
- `displayCalculationSteps(steps, containerId)` - Display calculation steps

#### 12. system_ui_interaction.js
**Purpose**: UI interaction handlers

**Key Features**:
- Real-time validation handlers
- Bus management UI interactions
- Calculation trigger handlers
- Export functionality
- Loading indicators and toast notifications
- Results display functions

**Main Functions**:
- `initializeUIInteractions()` - Initialize all UI handlers
- `handleAddBus()` - Add bus handler
- `handleShortCircuitCalculation()` - Short circuit calculation handler
- `handleArcFlashCalculation()` - Arc flash calculation handler
- `handleVoltageDropCalculation()` - Voltage drop calculation handler

### CSS Styling (css/ directory)

#### system_diagram.css
**Purpose**: Styling for interactive system diagrams and visualizations

**Key Features**:
- System diagram container styling
- Bus element styling (source, load, junction)
- Connection line animations
- Calculation steps display styling
- Comparison table styling
- Chart container styling
- Bus management panel styling
- Responsive design
- Print styles

### HTML Templates (templates/ directory)

#### calculation_steps.html
**Purpose**: Template for detailed calculation steps display

**Features**:
- Expandable/collapsible steps
- Formula display
- Calculation breakdown
- Result highlighting

#### comparison_table.html
**Purpose**: Template for standards comparison tables

**Features**:
- Side-by-side comparison
- Difference calculation
- Color-coded status indicators
- Summary statistics

#### bus_management_ui.html
**Purpose**: Template for bus management interface

**Features**:
- Add bus form
- Connect buses form
- Bus list display
- System diagram container
- Quick action buttons

## Integration with Main Application

The modules are integrated into `Short Circuit Calculator.HTML` via:

1. **Script References**: All 12 modules are loaded in the HTML head section
2. **CSS Link**: System diagram CSS is loaded for styling
3. **New Tabs**: Two new tabs added:
   - Bus Management tab - for system configuration
   - Voltage Drop tab - for voltage drop analysis
4. **Global Initialization**: BusSystem and PowerSystem initialized on page load
5. **Helper Functions**: UI interaction functions integrated into main script

## Usage Examples

### Example 1: Validate Input
```javascript
const validation = validatePhysicalConstraint(400, 'voltage');
if (validation.valid) {
    console.log('Voltage is valid');
} else {
    console.error(validation.error);
}
```

### Example 2: Calculate IEC Short Circuit
```javascript
const result = calculateIECShortCircuit({
    voltage: 13800,
    impedanceR: 0.5,
    impedanceX: 5.0,
    faultType: 'max'
});
console.log(`Fault current: ${result.symmetricalCurrent.toFixed(2)} A`);
```

### Example 3: Arc Flash Calculation
```javascript
const arcFlash = calculateArcFlashIEEE1584_2018({
    voltage: 480,
    boltedFaultCurrent: 25,
    workingDistance: 450,
    arcDuration: 0.1,
    equipmentGap: 32,
    enclosureType: 'VCB'
});

const ppeCategory = getPPECategory(arcFlash.incidentEnergyCalCm2);
console.log(`PPE Category: ${ppeCategory}`);
```

### Example 4: Bus System
```javascript
const busSystem = new BusSystem();
const bus1 = busSystem.addBus('Main Bus', 13800, 'source');
const bus2 = busSystem.addBus('Load Bus', 480, 'load');

busSystem.connectBuses(bus1.id, bus2.id, { r: 0.1, x: 1.0 });

const faultCurrents = busSystem.calculateSystemFaultCurrents();
```

### Example 5: Voltage Drop Analysis
```javascript
const analysis = performVoltageDropAnalysis({
    voltage: 400,
    current: 100,
    length: 50,
    conductorSize: '10',
    conductorMaterial: 'copper',
    phaseType: 'three-phase',
    powerFactor: 0.85
});

console.log(`Voltage drop: ${analysis.calculation.voltageDropPercent.toFixed(2)}%`);
console.log(`NEC compliance: ${analysis.compliance.nec.level}`);
```

## Testing

A test file `test_modules.html` is provided to verify module functionality. Open it in a web browser to run automated tests on:
- Module loading
- Validation functions
- Standards calculations
- Arc flash calculations
- Voltage drop calculations
- Bus system operations

## Standards Compliance

All modules are designed to comply with:
- **IEC 60909-0**: Short-circuit currents in three-phase a.c. systems
- **IEEE 1584-2018**: Guide for Performing Arc-Flash Hazard Calculations
- **IEEE 141 (Red Book)**: Recommended Practice for Electric Power Distribution
- **IEEE C37.010**: Application Guide for AC High-Voltage Circuit Breakers
- **ANSI C37.5**: Methods for determining values of sinusoidal current
- **NFPA 70E-2024**: Standard for Electrical Safety in the Workplace
- **NEC**: National Electrical Code (Article 210.19, 215.2)

## Future Enhancements

Potential areas for future development:
- Motor contribution to fault currents
- Distributed generation impacts
- Time-current curve coordination
- Enhanced reporting capabilities (PDF export with detailed reports)
- Dynamic impedance calculations for rotating machinery
- Harmonic analysis integration
- Load flow analysis

## Support and Contribution

For issues, suggestions, or contributions, please refer to the main repository documentation.
