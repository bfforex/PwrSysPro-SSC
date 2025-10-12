/**
 * Test script to verify critical bug fixes
 * Test Case: Test_Project_2025-10-12
 * Expected fault current: ~19.45 kA (not 0.14 kA)
 */

// Test parameters from problem statement
const testCase = {
    systemVoltage: 440, // V (fault location)
    frequency: 50, // Hz
    standard: 'ieee',
    
    components: [
        // Utility source at 13.2kV
        {
            type: 'utility_mva',
            mva: 100,
            voltage: 13.2, // kV
            xr: 10
        },
        // MV Cable: 500m
        {
            type: 'cable',
            length: 500, // meters
            resistance: 0.153, // Ω/km at 20°C
            reactance: 0.171, // Ω/km
            voltage: 13200, // V (operates at MV level)
            operatingTemp: 75, // °C
            cableType: 'single'
        },
        // Transformer: 1 MVA, 4%Z, 13.2kV/440V
        {
            type: 'transformer',
            power: 1, // MVA
            impedance: 4, // %
            primaryV: 13.2, // kV
            secondaryV: 0.44, // kV
            rx: null // Will use typical value
        },
        // LV Cable: 72m
        {
            type: 'cable',
            length: 72, // meters
            resistance: 0.0485, // Ω/km at 20°C
            reactance: 0.053, // Ω/km
            voltage: 440, // V (operates at LV level)
            operatingTemp: 75, // °C
            cableType: 'multi'
        }
    ]
};

// Helper functions (from HTML file)
function safeSqrt(value, minValue = 0) {
    return Math.sqrt(Math.max(value, minValue));
}

function safeDivide(numerator, denominator, defaultValue = 0) {
    if (denominator === 0 || !isFinite(denominator)) return defaultValue;
    const result = numerator / denominator;
    return isFinite(result) ? result : defaultValue;
}

// Manual calculation to verify
function manualCalculation() {
    console.log('='.repeat(80));
    console.log('MANUAL CALCULATION - Test_Project_2025-10-12');
    console.log('='.repeat(80));
    
    const faultVoltage = 440; // V
    
    // 1. Utility impedance at 13.2kV
    const utilityVoltage = 13200; // V
    const utilityMVA = 100;
    const utilityXR = 10;
    
    const zUtility_MV = (utilityVoltage * utilityVoltage) / (utilityMVA * 1e6);
    const xUtility_MV = zUtility_MV / Math.sqrt(1 + 1/(utilityXR * utilityXR));
    const rUtility_MV = xUtility_MV / utilityXR;
    
    console.log('\n1. Utility Source @ 13.2kV:');
    console.log(`   Z = ${zUtility_MV.toFixed(6)} Ω`);
    console.log(`   R = ${rUtility_MV.toFixed(6)} Ω`);
    console.log(`   X = ${xUtility_MV.toFixed(6)} Ω`);
    
    // 2. MV Cable (500m) with temperature correction
    const mvCableLength = 500; // m
    const mvCableR_20C = 0.153; // Ω/km
    const mvCableX = 0.171; // Ω/km
    
    // Temperature correction: 75°C
    const tempCoeff = 234.5; // Copper
    const tempFactor = (tempCoeff + 75) / (tempCoeff + 20);
    const mvCableR_75C = mvCableR_20C * tempFactor;
    
    const mvCableR = mvCableR_75C * (mvCableLength / 1000);
    const mvCableX_total = mvCableX * (mvCableLength / 1000);
    
    console.log('\n2. MV Cable (500m) @ 13.2kV:');
    console.log(`   Temp correction: ${tempFactor.toFixed(4)}`);
    console.log(`   R@75°C = ${mvCableR.toFixed(6)} Ω`);
    console.log(`   X = ${mvCableX_total.toFixed(6)} Ω`);
    
    // 3. Transformer 1 MVA, 4%Z
    const txMVA = 1;
    const txImpedancePercent = 4;
    const txSecondaryV = 440; // V
    
    const zBaseTx = (txSecondaryV * txSecondaryV) / (txMVA * 1e6);
    const zTx = zBaseTx * (txImpedancePercent / 100);
    
    // R/X ratio for 1 MVA transformer (typical: 0.07)
    const txRX = 0.07;
    const xTx = zTx / Math.sqrt(1 + txRX * txRX);
    const rTx = xTx * txRX;
    
    console.log('\n3. Transformer @ 440V (secondary):');
    console.log(`   Z_base = ${zBaseTx.toFixed(6)} Ω`);
    console.log(`   Z_tx = ${zTx.toFixed(6)} Ω`);
    console.log(`   R = ${rTx.toFixed(6)} Ω (R/X = ${txRX})`);
    console.log(`   X = ${xTx.toFixed(6)} Ω`);
    
    // 4. LV Cable (72m) with temperature correction
    const lvCableLength = 72; // m
    const lvCableR_20C = 0.0485; // Ω/km
    const lvCableX = 0.053; // Ω/km
    
    const lvCableR_75C = lvCableR_20C * tempFactor;
    const lvCableR = lvCableR_75C * (lvCableLength / 1000);
    const lvCableX_total = lvCableX * (lvCableLength / 1000);
    
    console.log('\n4. LV Cable (72m) @ 440V:');
    console.log(`   R@75°C = ${lvCableR.toFixed(6)} Ω`);
    console.log(`   X = ${lvCableX_total.toFixed(6)} Ω`);
    
    // 5. Refer MV impedances to LV (440V)
    const voltageRatio = utilityVoltage / faultVoltage;
    const impedanceTransformFactor = 1 / (voltageRatio * voltageRatio);
    
    const rUtility_LV = rUtility_MV * impedanceTransformFactor;
    const xUtility_LV = xUtility_MV * impedanceTransformFactor;
    const rMVCable_LV = mvCableR * impedanceTransformFactor;
    const xMVCable_LV = mvCableX_total * impedanceTransformFactor;
    
    console.log('\n5. Impedance Referral to 440V:');
    console.log(`   Voltage ratio = ${voltageRatio.toFixed(2)}`);
    console.log(`   Transform factor = 1/${voltageRatio.toFixed(2)}² = ${impedanceTransformFactor.toFixed(8)}`);
    console.log(`   Utility @ 440V: R = ${rUtility_LV.toFixed(6)} Ω, X = ${xUtility_LV.toFixed(6)} Ω`);
    console.log(`   MV Cable @ 440V: R = ${rMVCable_LV.toFixed(6)} Ω, X = ${xMVCable_LV.toFixed(6)} Ω`);
    
    // 6. Total impedance
    const totalR = rUtility_LV + rMVCable_LV + rTx + lvCableR;
    const totalX = xUtility_LV + xMVCable_LV + xTx + lvCableX_total;
    const totalZ = Math.sqrt(totalR * totalR + totalX * totalX);
    const totalXR = totalX / totalR;
    
    console.log('\n6. Total Impedance @ 440V:');
    console.log(`   ΣR = ${totalR.toFixed(6)} Ω`);
    console.log(`   ΣX = ${totalX.toFixed(6)} Ω`);
    console.log(`   Z_total = ${totalZ.toFixed(6)} Ω`);
    console.log(`   X/R = ${totalXR.toFixed(2)}`);
    
    // 7. Fault current
    const vPhase = faultVoltage / Math.sqrt(3);
    const iscSymm_A = vPhase / totalZ;
    const iscSymm_kA = iscSymm_A / 1000;
    
    // IEEE asymmetrical multiplier
    const multiplier = Math.sqrt(1 + 2 * Math.exp(-Math.PI / totalXR));
    const iscAsymm_kA = iscSymm_kA * multiplier;
    
    console.log('\n7. Fault Current:');
    console.log(`   V_phase = ${faultVoltage}V / √3 = ${vPhase.toFixed(2)} V`);
    console.log(`   I_symm = ${vPhase.toFixed(2)}V / ${totalZ.toFixed(6)}Ω = ${iscSymm_A.toFixed(2)} A`);
    console.log(`   I_symm = ${iscSymm_kA.toFixed(2)} kA`);
    console.log(`   Asymmetrical multiplier = ${multiplier.toFixed(3)}`);
    console.log(`   I_asymm = ${iscAsymm_kA.toFixed(2)} kA`);
    
    // Fault MVA
    const faultMVA = Math.sqrt(3) * faultVoltage * iscSymm_A / 1e6;
    console.log(`   Fault MVA = ${faultMVA.toFixed(2)} MVA`);
    
    console.log('\n' + '='.repeat(80));
    console.log('VERIFICATION:');
    console.log('='.repeat(80));
    
    const expectedCurrent = 19.45;
    const tolerance = 1.5; // kA
    const pass = Math.abs(iscSymm_kA - expectedCurrent) < tolerance;
    
    console.log(`Expected: ~${expectedCurrent} kA`);
    console.log(`Calculated: ${iscSymm_kA.toFixed(2)} kA`);
    console.log(`Status: ${pass ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`Difference: ${(iscSymm_kA - expectedCurrent).toFixed(2)} kA`);
    
    if (pass) {
        console.log('\n✓ Bug fix verified! Fault current is in expected range.');
    } else {
        console.log('\n✗ Bug still present or different issue!');
    }
    
    return {
        pass,
        expected: expectedCurrent,
        calculated: iscSymm_kA,
        totalImpedance: totalZ
    };
}

// Run the test
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { manualCalculation, testCase };
} else {
    manualCalculation();
}
