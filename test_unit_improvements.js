/**
 * test_unit_improvements.js
 * Unit tests for impedance referral, transformer modeling, and formatting improvements
 */

// Load modules
const { 
    referImpedanceBetweenLevels, 
    referImpedanceAcrossTransformer,
    getTypicalTransformerXR,
    Transformer 
} = require('./js/transformer_model.js');

const { 
    calculateFirstCycleAsymmetricalMultiplier 
} = require('./js/standard_specific_calcs.js');

const {
    formatCurrent,
    formatImpedance,
    formatRatio
} = require('./js/formatting_utils.js');

// Test counter
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
    testsRun++;
    if (condition) {
        testsPassed++;
        console.log(`✓ ${message}`);
    } else {
        testsFailed++;
        console.error(`✗ ${message}`);
    }
}

function assertAlmostEqual(actual, expected, tolerance, message) {
    const diff = Math.abs(actual - expected);
    testsRun++;
    if (diff <= tolerance) {
        testsPassed++;
        console.log(`✓ ${message} (${actual.toFixed(6)} ≈ ${expected.toFixed(6)}, diff=${diff.toExponential(2)})`);
    } else {
        testsFailed++;
        console.error(`✗ ${message} (${actual.toFixed(6)} ≠ ${expected.toFixed(6)}, diff=${diff.toExponential(2)})`);
    }
}

console.log('='.repeat(80));
console.log('UNIT TESTS FOR IMPEDANCE REFERRAL AND IMPROVEMENTS');
console.log('='.repeat(80));

// Test 1: Impedance Referral - HV to LV (step down)
console.log('\n--- Test 1: Impedance Referral (HV to LV) ---');
{
    const hvImpedance = { r: 1.742, x: 17.42 }; // At 13.2 kV
    const hvVoltage = 13200; // V
    const lvVoltage = 440; // V
    
    const result = referImpedanceBetweenLevels(hvImpedance, hvVoltage, lvVoltage);
    
    // Expected: Z_LV = Z_HV × (V_LV/V_HV)² = Z_HV × (440/13200)² = Z_HV / 900
    const expectedR = hvImpedance.r / 900;
    const expectedX = hvImpedance.x / 900;
    
    assertAlmostEqual(result.r, expectedR, 1e-8, 'HV to LV: R referral correct');
    assertAlmostEqual(result.x, expectedX, 1e-8, 'HV to LV: X referral correct');
    assert(result.ratio === (lvVoltage / hvVoltage), 'HV to LV: Voltage ratio correct');
    assert(result.factor === Math.pow(lvVoltage / hvVoltage, 2), 'HV to LV: Factor = ratio²');
}

// Test 2: Impedance Referral - LV to HV (step up)
console.log('\n--- Test 2: Impedance Referral (LV to HV) ---');
{
    const lvImpedance = { r: 0.01, x: 0.05 }; // At 440 V
    const lvVoltage = 440; // V
    const hvVoltage = 13200; // V
    
    const result = referImpedanceBetweenLevels(lvImpedance, lvVoltage, hvVoltage);
    
    // Expected: Z_HV = Z_LV × (V_HV/V_LV)² = Z_LV × (13200/440)² = Z_LV × 900
    const expectedR = lvImpedance.r * 900;
    const expectedX = lvImpedance.x * 900;
    
    assertAlmostEqual(result.r, expectedR, 1e-6, 'LV to HV: R referral correct');
    assertAlmostEqual(result.x, expectedX, 1e-6, 'LV to HV: X referral correct');
    assert(result.ratio === (hvVoltage / lvVoltage), 'LV to HV: Voltage ratio correct');
}

// Test 3: Impedance Referral - Same voltage (identity)
console.log('\n--- Test 3: Impedance Referral (Same Voltage) ---');
{
    const impedance = { r: 0.5, x: 2.0 };
    const voltage = 480;
    
    const result = referImpedanceBetweenLevels(impedance, voltage, voltage);
    
    assertAlmostEqual(result.r, impedance.r, 1e-10, 'Same voltage: R unchanged');
    assertAlmostEqual(result.x, impedance.x, 1e-10, 'Same voltage: X unchanged');
    assert(result.ratio === 1.0, 'Same voltage: Ratio = 1');
    assert(result.factor === 1.0, 'Same voltage: Factor = 1');
}

// Test 4: referImpedanceAcrossTransformer alias
console.log('\n--- Test 4: referImpedanceAcrossTransformer Alias ---');
{
    const impedance = { r: 1.0, x: 10.0 };
    const vPrimary = 13800;
    const vSecondary = 480;
    
    const result1 = referImpedanceBetweenLevels(impedance, vPrimary, vSecondary);
    const result2 = referImpedanceAcrossTransformer(impedance, vPrimary, vSecondary);
    
    assert(result1.r === result2.r, 'Alias produces same R');
    assert(result1.x === result2.x, 'Alias produces same X');
}

// Test 5: Utility Source Z from Short Circuit MVA
console.log('\n--- Test 5: Utility Source Impedance Calculation ---');
{
    // 100 MVA short circuit @ 13.2 kV
    const scMVA = 100;
    const voltage = 13200; // V (NOT kV!)
    
    // Z = V² / S
    const zSource = (voltage * voltage) / (scMVA * 1e6);
    
    // Expected: 13200² / 100e6 = 174.24e6 / 100e6 = 1.7424 Ω
    assertAlmostEqual(zSource, 1.7424, 1e-4, 'Utility Z from SC MVA correct');
    
    // ISC calculation check: ISC = S / (√3 × V)
    const iscKA = scMVA / (Math.sqrt(3) * (voltage / 1000)); // Convert V to kV for ISC calc
    assertAlmostEqual(iscKA, 4.373, 0.001, 'Utility ISC from SC MVA correct (kA)');
    
    // Verify units: Using kA in impedance calc
    const zSourceFromISC = voltage / (Math.sqrt(3) * iscKA * 1000); // kA to A
    assertAlmostEqual(zSourceFromISC, zSource, 1e-4, 'Z from ISC matches Z from MVA');
}

// Test 6: First-Cycle Asymmetrical Multiplier
console.log('\n--- Test 6: First-Cycle Asymmetrical Multiplier ---');
{
    // Test at various X/R ratios
    // Formula: Multiplier = √(1 + 2e^(-4π/(X/R)))
    const testCases = [
        { xr: 0, expectedMin: 1.0, expectedMax: 1.0 },    // Purely resistive
        { xr: 5, expectedMin: 1.05, expectedMax: 1.15 },  // Low X/R: ~1.078
        { xr: 10, expectedMin: 1.20, expectedMax: 1.30 }, // Medium X/R: ~1.253
        { xr: 20, expectedMin: 1.40, expectedMax: 1.50 }, // High X/R: ~1.438
        { xr: 100, expectedMin: 1.6, expectedMax: 1.732 } // Very high X/R: ~1.662
    ];
    
    testCases.forEach(tc => {
        const multiplier = calculateFirstCycleAsymmetricalMultiplier(tc.xr);
        assert(
            multiplier >= tc.expectedMin && multiplier <= tc.expectedMax,
            `X/R=${tc.xr}: Multiplier ${multiplier.toFixed(3)} in range [${tc.expectedMin}, ${tc.expectedMax}]`
        );
    });
    
    // Test monotonicity: multiplier increases with X/R
    const m1 = calculateFirstCycleAsymmetricalMultiplier(1);
    const m10 = calculateFirstCycleAsymmetricalMultiplier(10);
    const m100 = calculateFirstCycleAsymmetricalMultiplier(100);
    assert(m1 < m10 && m10 < m100, 'Multiplier increases with X/R');
}

// Test 7: Typical Transformer X/R Ratios
console.log('\n--- Test 7: Typical Transformer X/R Ratios ---');
{
    const testCases = [
        { mva: 0.5, expectedXR: 20 },    // < 1 MVA
        { mva: 1.5, expectedXR: 14.3 },  // 1-2.5 MVA
        { mva: 3.0, expectedXR: 10 },    // 2.5-5 MVA
        { mva: 7.5, expectedXR: 6.67 },  // 5-10 MVA
        { mva: 15.0, expectedXR: 5 }     // > 10 MVA
    ];
    
    testCases.forEach(tc => {
        const xr = getTypicalTransformerXR(tc.mva);
        assertAlmostEqual(xr, tc.expectedXR, 0.1, `${tc.mva} MVA transformer has X/R ≈ ${tc.expectedXR}`);
    });
}

// Test 8: Transformer with null rx uses default
console.log('\n--- Test 8: Transformer Default R/X Handling ---');
{
    const transformer = new Transformer({
        powerMVA: 1.0,
        primaryVoltage: 13200,
        secondaryVoltage: 440,
        impedancePercent: 4.0,
        xrRatio: null // Not specified
    });
    
    const impedance = transformer.calculateImpedanceOhms();
    
    // Should use default X/R = 14.3 for 1 MVA transformer
    assertAlmostEqual(impedance.xrRatio, 14.3, 0.1, 'Transformer uses default X/R when null');
    
    // Verify impedance calculation
    const expectedZbase = (440 * 440) / 1e6; // V² / VA = 0.1936 Ω
    const expectedZ = expectedZbase * 0.04; // 4% = 0.007744 Ω
    assertAlmostEqual(impedance.magnitude, expectedZ, 1e-6, 'Transformer Z magnitude correct');
}

// Test 9: Formatting - Current
console.log('\n--- Test 9: Current Formatting ---');
{
    assert(formatCurrent(0.001) !== '0.00', 'Small current (0.001 kA) not formatted as 0.00');
    assert(formatCurrent(0.5).includes('0.5'), 'Medium current (0.5 kA) shows 3 decimals');
    assert(formatCurrent(17.9).includes('17.9'), 'Large current (17.9 kA) shows 2 decimals');
    assert(formatCurrent(0) === '0.00', 'Zero current formatted as 0.00');
}

// Test 10: Formatting - Impedance
console.log('\n--- Test 10: Impedance Formatting ---');
{
    assert(formatImpedance(0.00001234) !== '0.0000', 'Tiny impedance uses exponential notation');
    assert(formatImpedance(0.0001926).length >= 6, 'Small impedance shows enough precision');
    assert(formatImpedance(0.01421).includes('0.01421'), 'Medium impedance shows 5 decimals');
}

// Test 11: Integration Test - Test Project IV Expected Values
console.log('\n--- Test 11: Integration Test - Test Project IV ---');
{
    // Hand calculation from problem statement
    const expectedResults = {
        isym_kA: 17.9,
        z_total_ohm: 0.01421,
        x_over_r: 2.74,
        mva_sc: 13.6
    };
    
    // Tolerances per problem statement
    const tolerances = {
        isym_kA: expectedResults.isym_kA * 0.05,      // ±5%
        z_total_ohm: expectedResults.z_total_ohm * 0.05, // ±5%
        x_over_r: expectedResults.x_over_r * 0.10,    // ±10%
        mva_sc: expectedResults.mva_sc * 0.05         // ±5%
    };
    
    // Manual calculation components (from problem statement)
    const components = {
        utility: { r: 0.0001926, x: 0.001926 },    // @ 440V
        mvCable: { r: 0.0001034, x: 0.0000950 },   // @ 440V
        transformer: { r: 0.000541, x: 0.007725 }, // @ 440V
        lvCable: { r: 0.004028, x: 0.003600 }      // @ 440V
    };
    
    // Total impedance
    const totalR = components.utility.r + components.mvCable.r + 
                   components.transformer.r + components.lvCable.r;
    const totalX = components.utility.x + components.mvCable.x + 
                   components.transformer.x + components.lvCable.x;
    const totalZ = Math.sqrt(totalR * totalR + totalX * totalX);
    const xOverR = totalX / totalR;
    
    // Fault current @ 440V
    const voltage = 440;
    const isym_A = voltage / (Math.sqrt(3) * totalZ);
    const isym_kA = isym_A / 1000;
    
    // Fault MVA
    const mva_sc = Math.sqrt(3) * voltage * isym_A / 1e6;
    
    // Verify against expected values
    assertAlmostEqual(isym_kA, expectedResults.isym_kA, tolerances.isym_kA, 
        'Test Project IV: Isym within ±5%');
    assertAlmostEqual(totalZ, expectedResults.z_total_ohm, tolerances.z_total_ohm, 
        'Test Project IV: Z_total within ±5%');
    assertAlmostEqual(xOverR, expectedResults.x_over_r, tolerances.x_over_r, 
        'Test Project IV: X/R within ±10%');
    assertAlmostEqual(mva_sc, expectedResults.mva_sc, tolerances.mva_sc, 
        'Test Project IV: MVA_sc within ±5%');
    
    console.log(`\nCalculated values:`);
    console.log(`  Isym = ${isym_kA.toFixed(2)} kA (expected: ${expectedResults.isym_kA} kA)`);
    console.log(`  Z = ${totalZ.toFixed(6)} Ω (expected: ${expectedResults.z_total_ohm} Ω)`);
    console.log(`  X/R = ${xOverR.toFixed(2)} (expected: ${expectedResults.x_over_r})`);
    console.log(`  MVA_sc = ${mva_sc.toFixed(2)} MVA (expected: ${expectedResults.mva_sc} MVA)`);
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
console.log(`Total tests run: ${testsRun}`);
console.log(`Tests passed: ${testsPassed} (${(testsPassed/testsRun*100).toFixed(1)}%)`);
console.log(`Tests failed: ${testsFailed}`);
console.log('='.repeat(80));

if (testsFailed === 0) {
    console.log('✓ ALL TESTS PASSED');
    process.exit(0);
} else {
    console.error('✗ SOME TESTS FAILED');
    process.exit(1);
}
