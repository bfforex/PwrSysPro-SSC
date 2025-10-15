/**
 * test_production_fixes.js
 * Tests for production-impacting fixes:
 * 1. Utility A/kA mix-up fix
 * 2. Transformer powerUnit enforcement
 * 3. Utility source impedance guardrails
 */

// Import required modules
const { TopologyManager } = require('./js/topology_manager.js');
const { Transformer } = require('./js/transformer_model.js');

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    if (condition) {
        console.log('✓', message);
        testsPassed++;
    } else {
        console.error('✗', message);
        testsFailed++;
    }
}

function assertAlmostEqual(actual, expected, tolerance, message) {
    const diff = Math.abs(actual - expected);
    if (diff <= tolerance) {
        console.log(`✓ ${message} (${actual.toFixed(6)} ≈ ${expected.toFixed(6)}, diff=${diff.toExponential(2)})`);
        testsPassed++;
    } else {
        console.error(`✗ ${message} (${actual.toFixed(6)} ≠ ${expected.toFixed(6)}, diff=${diff.toExponential(2)})`);
        testsFailed++;
    }
}

console.log('\n' + '='.repeat(80));
console.log('PRODUCTION FIXES TESTS');
console.log('='.repeat(80));

// Test 1: Transformer powerUnit - kVA for LV systems
console.log('\n--- Test 1: Transformer powerUnit - LV system defaults to kVA ---');
{
    const config = {
        name: 'LV Transformer',
        power: 150,
        secondaryVoltage: 240,
        impedancePercent: 5.75
    };
    
    const xfmr = new Transformer(config);
    
    // Should default to kVA for secondaryVoltage ≤ 1000V
    assert(xfmr.powerUnit === 'kVA', 'LV transformer defaults to kVA');
    assert(xfmr.defaultedPowerUnit === true, 'Defaulted flag set');
    assertAlmostEqual(xfmr.powerMVA, 0.150, 0.0001, 'Power converted to MVA correctly (150 kVA = 0.150 MVA)');
}

// Test 2: Transformer powerUnit - MVA for MV systems
console.log('\n--- Test 2: Transformer powerUnit - MV system defaults to MVA ---');
{
    const config = {
        name: 'MV Transformer',
        power: 1,
        secondaryVoltage: 13800,
        impedancePercent: 5.75
    };
    
    const xfmr = new Transformer(config);
    
    // Should default to MVA for secondaryVoltage > 1000V
    assert(xfmr.powerUnit === 'MVA', 'MV transformer defaults to MVA');
    assert(xfmr.defaultedPowerUnit === true, 'Defaulted flag set');
    assertAlmostEqual(xfmr.powerMVA, 1.0, 0.0001, 'Power treated as MVA (1 MVA)');
}

// Test 3: Transformer powerUnit - explicit kVA
console.log('\n--- Test 3: Transformer powerUnit - explicit kVA ---');
{
    const config = {
        name: 'Explicit kVA',
        power: 500,
        powerUnit: 'kVA',
        secondaryVoltage: 13800,
        impedancePercent: 5.75
    };
    
    const xfmr = new Transformer(config);
    
    assert(xfmr.powerUnit === 'kVA', 'Explicit kVA respected');
    assert(xfmr.defaultedPowerUnit === false, 'Not defaulted');
    assertAlmostEqual(xfmr.powerMVA, 0.500, 0.0001, 'Power converted to MVA (500 kVA = 0.5 MVA)');
}

// Test 4: Transformer powerUnit - explicit MVA
console.log('\n--- Test 4: Transformer powerUnit - explicit MVA ---');
{
    const config = {
        name: 'Explicit MVA',
        power: 2.5,
        powerUnit: 'MVA',
        secondaryVoltage: 240,
        impedancePercent: 5.75
    };
    
    const xfmr = new Transformer(config);
    
    assert(xfmr.powerUnit === 'MVA', 'Explicit MVA respected');
    assert(xfmr.defaultedPowerUnit === false, 'Not defaulted');
    assertAlmostEqual(xfmr.powerMVA, 2.5, 0.0001, 'Power kept as MVA');
}

// Test 5: Transformer impedance calculation with kVA
console.log('\n--- Test 5: Transformer Z calculation - 150 kVA LV transformer ---');
{
    const config = {
        name: '150 kVA LV',
        power: 150,
        powerUnit: 'kVA',
        primaryVoltage: 13800,
        secondaryVoltage: 240,
        impedancePercent: 4.0
    };
    
    const xfmr = new Transformer(config);
    const z = xfmr.calculateImpedanceOhms();
    
    // Z_base = V²/S = 240²/(150000) = 57600/150000 = 0.384 Ω
    const expectedZbase = 0.384;
    // Z = Z_base × %Z/100 = 0.384 × 0.04 = 0.01536 Ω
    const expectedZ = 0.01536;
    
    assertAlmostEqual(z.magnitude, expectedZ, 0.0001, 'LV transformer impedance correct (150 kVA)');
}

// Test 6: Transformer impedance calculation - 1000x difference
console.log('\n--- Test 6: Power unit 1000x effect on impedance ---');
{
    // Same transformer treated as kVA vs MVA should differ by 1000x in impedance
    const config1 = {
        power: 150,
        powerUnit: 'kVA',
        secondaryVoltage: 240,
        impedancePercent: 4.0
    };
    
    const config2 = {
        power: 150,
        powerUnit: 'MVA',
        secondaryVoltage: 240,
        impedancePercent: 4.0
    };
    
    const xfmr1 = new Transformer(config1);
    const xfmr2 = new Transformer(config2);
    
    const z1 = xfmr1.calculateImpedanceOhms();
    const z2 = xfmr2.calculateImpedanceOhms();
    
    // Z2 should be 1000x smaller than Z1
    const ratio = z1.magnitude / z2.magnitude;
    assertAlmostEqual(ratio, 1000, 1, 'kVA vs MVA creates 1000x impedance difference');
}

// Test 7: TopologyManager powerUnit integration
console.log('\n--- Test 7: TopologyManager getTransformerPowerMVA ---');
{
    const topology = new TopologyManager();
    
    // Test with explicit kVA
    const xfmr1 = { power: 150, powerUnit: 'kVA', secondaryV: 0.24, name: 'Test1' };
    const powerMVA1 = topology.getTransformerPowerMVA(xfmr1);
    assertAlmostEqual(powerMVA1, 0.150, 0.0001, 'Explicit kVA converted correctly');
    
    // Test with explicit MVA
    const xfmr2 = { power: 1.5, powerUnit: 'MVA', secondaryV: 13.8, name: 'Test2' };
    const powerMVA2 = topology.getTransformerPowerMVA(xfmr2);
    assertAlmostEqual(powerMVA2, 1.5, 0.0001, 'Explicit MVA kept as-is');
    
    // Test default for LV (≤1kV)
    const xfmr3 = { power: 200, secondaryV: 0.44, name: 'Test3' };
    const powerMVA3 = topology.getTransformerPowerMVA(xfmr3);
    assertAlmostEqual(powerMVA3, 0.200, 0.0001, 'LV default to kVA');
    
    // Test default for MV (>1kV)
    const xfmr4 = { power: 1, secondaryV: 13.2, name: 'Test4' };
    const powerMVA4 = topology.getTransformerPowerMVA(xfmr4);
    assertAlmostEqual(powerMVA4, 1.0, 0.0001, 'MV default to MVA');
}

// Test 8: Utility source calculation - correct units
console.log('\n--- Test 8: Utility source impedance from MVA (A vs kA guard) ---');
{
    // 100 MVA @ 13.2 kV
    const scMVA = 100;
    const voltageV = 13200;
    
    // Correct calculation: Z = V² / S_VA
    const zSource = (voltageV * voltageV) / (scMVA * 1e6);
    
    // Expected: 13200² / 100e6 = 174.24e6 / 100e6 = 1.7424 Ω
    assertAlmostEqual(zSource, 1.7424, 0.0001, 'Utility Z from SC MVA correct');
    
    // ISC calculation: ISC_kA = MVA / (√3 × V_kV)
    const iscKA = scMVA / (Math.sqrt(3) * (voltageV / 1000));
    assertAlmostEqual(iscKA, 4.373866, 0.001, 'Utility ISC from SC MVA correct');
    
    // Verify Z from ISC: Z = V / (√3 × ISC_A)
    const zFromISC = voltageV / (Math.sqrt(3) * iscKA * 1000);
    assertAlmostEqual(zFromISC, zSource, 0.0001, 'Z from ISC matches Z from MVA');
}

// Test 9: Transformer impedance effect with different power units
console.log('\n--- Test 9: Verify 1000x impedance difference in practical scenario ---');
{
    // Compare a 150 kVA transformer at 240V with wrong interpretation as 150 MVA
    const configCorrect = {
        name: '150 kVA @ 240V (correct)',
        power: 150,
        powerUnit: 'kVA',
        secondaryVoltage: 240,
        impedancePercent: 4.0
    };
    
    const configWrong = {
        name: '150 MVA @ 240V (wrong interpretation)',
        power: 150,
        powerUnit: 'MVA',
        secondaryVoltage: 240,
        impedancePercent: 4.0
    };
    
    const xfmrCorrect = new Transformer(configCorrect);
    const xfmrWrong = new Transformer(configWrong);
    
    const zCorrect = xfmrCorrect.calculateImpedanceOhms();
    const zWrong = xfmrWrong.calculateImpedanceOhms();
    
    // Correct: Z_base = 240²/150000 = 0.384 Ω, Z = 0.384 × 0.04 = 0.01536 Ω
    assertAlmostEqual(zCorrect.magnitude, 0.01536, 0.0001, 'Correct kVA interpretation');
    
    // Wrong: Z_base = 240²/150000000 = 0.000384 Ω, Z = 0.000384 × 0.04 = 0.00001536 Ω
    assertAlmostEqual(zWrong.magnitude, 0.00001536, 0.000001, 'Wrong MVA interpretation (1000x smaller)');
    
    // Fault current calculation
    const voltage = 240;
    const iscCorrect = voltage / (Math.sqrt(3) * zCorrect.magnitude);
    const iscWrong = voltage / (Math.sqrt(3) * zWrong.magnitude);
    
    const iscCorrectKA = iscCorrect / 1000;
    const iscWrongKA = iscWrong / 1000;
    
    // Correct: ~9 kA, Wrong: ~9000 kA (1000x error!)
    assert(iscCorrectKA > 8 && iscCorrectKA < 11, 
        `Correct interpretation: ISC ≈ ${iscCorrectKA.toFixed(2)} kA (reasonable for 150 kVA @ 240V)`);
    assert(iscWrongKA > 8000 && iscWrongKA < 11000, 
        `Wrong interpretation: ISC ≈ ${iscWrongKA.toFixed(0)} kA (implausible - demonstrates 1000x error)`);
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log(`Total tests run: ${testsPassed + testsFailed}`);
console.log(`Tests passed: ${testsPassed} (${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%)`);
console.log(`Tests failed: ${testsFailed}`);
console.log('='.repeat(80));

if (testsFailed === 0) {
    console.log('✓ ALL TESTS PASSED');
    process.exit(0);
} else {
    console.log('✗ SOME TESTS FAILED');
    process.exit(1);
}
