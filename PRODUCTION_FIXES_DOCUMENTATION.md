# Production-Impacting Fixes Documentation

## Overview

This document describes the production-impacting fixes implemented to address critical calculation errors in the short-circuit calculator.

## Issues Fixed

### 1. Utility A/kA Mix-up in Short Circuit Calculator.HTML

**Problem:**
Line 3799 calculated ISC in amperes (A), but line 3800 treated it as kiloamperes (kA) by multiplying by 1000 again, resulting in utility source impedance being underestimated by a factor of 1000.

**Root Cause:**
```javascript
// OLD (WRONG):
const isc = safeDivide(comp.mva * 1000, safeSqrt(3) * comp.voltage, 0.001);
// This gives ISC in A (not kA), but was treated as kA below
const z = safeDivide(utilityVoltage, safeSqrt(3) * isc * 1000, 0.001);
// Multiplying by 1000 assumes isc is in kA, creating 1000x error
```

**Fix:**
```javascript
// NEW (CORRECT):
// ISC in kA: ISC = MVA_sc / (√3 × V_kV)
const isc = safeDivide(comp.mva, safeSqrt(3) * comp.voltage, 0.001);
// Zsource in Ω: Z = V_line / (√3 × ISC_A) = V_line / (√3 × ISC_kA × 1000)
const z = safeDivide(utilityVoltage, safeSqrt(3) * isc * 1000, 0.001);
```

**Impact:**
- Utility sources with 100 MVA @ 13.2 kV now correctly calculate Zsource ≈ 1.742 Ω instead of 0.001742 Ω
- After transformer referral to LV (e.g., 440V), this prevents utility impedance from being effectively zeroed out
- Fault current calculations now include proper contribution from utility source impedance

### 2. Transformer Power Unit Enforcement

**Problem:**
Transformer power ratings lacked explicit units (kVA vs MVA). LV studies often specify transformers in kVA (e.g., "150 kVA"), but the system interpreted all values as MVA, causing a 1000x error in transformer impedance calculations.

**Solution:**

#### A. Transformer Schema Extension
Added `powerUnit` field to Transformer class:
- Accepts: `"kVA"` or `"MVA"`
- Migration heuristic when `powerUnit` is not specified:
  - If `secondaryVoltage ≤ 1000V` → default to `"kVA"`
  - If `secondaryVoltage > 1000V` → default to `"MVA"`

#### B. Implementation in transformer_model.js
```javascript
class Transformer {
    constructor(config) {
        // ...
        this.powerUnit = config.powerUnit; // 'kVA' or 'MVA'
        
        // Backward compatibility: if powerMVA is specified directly, use it
        if (config.powerMVA !== undefined && !config.power) {
            this.powerValue = config.powerMVA;
            if (!this.powerUnit) {
                this.powerUnit = 'MVA';
                this.defaultedPowerUnit = false;
            }
        } else {
            this.powerValue = config.power || config.powerMVA || 1.0;
        }
        
        // Apply migration heuristic if powerUnit not specified
        if (!this.powerUnit) {
            const secondaryV = config.secondaryVoltage || config.secondaryV || 480;
            this.powerUnit = (secondaryV <= 1000) ? 'kVA' : 'MVA';
            this.defaultedPowerUnit = true;
        }
        
        // Convert to MVA for internal calculations
        this.powerMVA = this.powerUnit === 'kVA' ? this.powerValue / 1000 : this.powerValue;
    }
}
```

#### C. Integration in topology_manager.js
Added `getTransformerPowerMVA()` method that:
- Respects explicit `powerUnit` field
- Applies migration heuristic for legacy data
- Logs warning when defaulting:
  ```
  Transformer "XYZ" missing powerUnit field. 
  Defaulting to kVA based on secondary voltage 440V. 
  Interpreted as 150 kVA. Add "powerUnit": "kVA" to override.
  ```

#### D. Example Usage
```json
{
  "type": "transformer",
  "name": "150 kVA LV Transformer",
  "power": 150,
  "powerUnit": "kVA",
  "secondaryV": 0.44,
  "impedance": 4.0
}
```

**Impact:**
- 150 kVA transformer @ 240V now calculates Z_base = 240²/150000 = 0.384 Ω (correct)
- Previously: Z_base = 240²/150000000 = 0.000384 Ω (1000x too small)
- Fault currents for LV systems now in reasonable range (8-10 kA) instead of implausible (8000-10000 kA)

### 3. Utility Source Impedance Guardrails

**Problem:**
Very small utility source impedances (< 1e-6 Ω) at HV levels can indicate unit confusion, but went undetected.

**Solution:**
Added validation in `topology_manager.js`:
```javascript
// Guardrail: detect implausibly small Zsource at HV
if (zSource > 0 && zSource < 1e-6 && voltage >= 4000 && voltage <= 35000) {
    console.warn(`⚠️ Utility source "${comp.name || 'Unnamed'}" has very small impedance ` +
        `(${zSource.toExponential(3)} Ω at ${voltage}V). ` +
        `This may indicate unit confusion. Check if fault current or MVA values are correct.`);
}
```

**Impact:**
- Warns engineers when utility impedance calculations produce implausibly small values
- Helps detect data entry errors (e.g., ISC entered in A instead of kA)
- Diagnostic message includes specific values for debugging

## Formulas and Standards

### Utility Source Impedance Calculation

**From Short-Circuit MVA:**
```
Z_source [Ω] = V_line² / S_sc
             = V_line² / (MVA_sc × 10⁶)

ISC [kA] = MVA_sc / (√3 × V_line_kV)
```

**From Short-Circuit Current (ISC):**
```
Z_source [Ω] = V_line / (√3 × ISC_A)
             = V_line / (√3 × ISC_kA × 1000)
```

**Splitting into R and X:**
```
Given X/R ratio:
Z = √(R² + X²)
X = R × (X/R)

Therefore:
R = Z / √(1 + (X/R)²)
X = R × (X/R)
```

### Transformer Impedance Calculation

**Base Impedance:**
```
Z_base [Ω] = V_secondary² / S_base
           = V_secondary² / (MVA × 10⁶)      if powerUnit = "MVA"
           = V_secondary² / (kVA × 10³)      if powerUnit = "kVA"
```

**Transformer Impedance:**
```
Z [Ω] = Z_base × (Z% / 100)
```

**With X/R Ratio:**
```
R [Ω] = Z / √(1 + (X/R)²)
X [Ω] = R × (X/R)
```

### Impedance Referral

**Across Transformer:**
```
Z_new = Z_old × (V_new / V_old)²
```

**Examples:**
- HV to LV: `Z_LV = Z_HV × (V_LV / V_HV)²`
- LV to HV: `Z_HV = Z_LV × (V_HV / V_LV)²`

## Migration Guide

### Updating Existing JSON Files

1. **Identify transformers with LV secondary (≤1 kV):**
   - If power value represents kVA, add `"powerUnit": "kVA"`
   - If power value represents MVA, add `"powerUnit": "MVA"`

2. **Example migration:**
   ```json
   // BEFORE (ambiguous):
   {
     "type": "transformer",
     "power": 150,
     "secondaryV": 0.44
   }
   
   // AFTER (explicit):
   {
     "type": "transformer",
     "power": 150,
     "powerUnit": "kVA",
     "secondaryV": 0.44
   }
   ```

3. **Default behavior (if not updated):**
   - System will default to kVA for secondaryV ≤ 1 kV
   - System will default to MVA for secondaryV > 1 kV
   - Warning logged to console with interpretation

### Checking for A/kA Issues

If you have existing studies showing:
- Utility fault currents in thousands of kA
- Utility source impedance < 0.001 Ω at HV levels
- Total impedance dominated by downstream components with utility contribution negligible

These are indicators the A/kA fix will significantly improve accuracy.

## Test Coverage

### New Tests (test_production_fixes.js)
- 25 tests covering:
  - Transformer powerUnit defaults (kVA for LV, MVA for MV)
  - Explicit powerUnit handling
  - Power unit effect on impedance (1000x difference)
  - TopologyManager integration
  - Utility source calculations (A vs kA)
  - Practical scenario validation

### Existing Tests Verified
- 40 unit tests in test_unit_improvements.js (100% pass rate)
- Backward compatibility confirmed
- No regressions introduced

## Standards References

- **IEEE Std 141-1993** (Red Book): Transformer X/R ratios, short-circuit calculations
- **ANSI C37.010-1999**: Asymmetrical current calculations
- **IEEE Std 242-2001** (Buff Book): Impedance and reactance data
- **IEC 60909**: Short-circuit current calculation methods

## Files Modified

1. **Short Circuit Calculator.HTML** (line 3799-3800)
   - Fixed utility ISC calculation to return kA
   - Added clarifying comments

2. **js/transformer_model.js**
   - Added powerUnit field with migration logic
   - Maintained backward compatibility

3. **js/topology_manager.js**
   - Added getTransformerPowerMVA() method
   - Integrated powerUnit handling in two locations
   - Added utility impedance guardrails

4. **test_production_fixes.js** (new)
   - Comprehensive test suite for all fixes

5. **PRODUCTION_FIXES_DOCUMENTATION.md** (this file)
   - Complete documentation of changes

## Support

For questions or issues:
1. Check warning messages in console output
2. Verify powerUnit field in transformer definitions
3. Ensure utility MVA/ISC values are in correct units
4. Review test_production_fixes.js for usage examples
