# PowerSys Pro - Executive Short Circuit Calculator

![PowerSys Pro Logo](assets/logo.png)

**Professional Standards-Compliant Power System Analysis Tool**

*Last Updated: 2025-10-15*

## ⚡ Recent Production Fixes (2025-10-15)

**Critical fixes implemented for calculation accuracy:**

1. **Utility A/kA Mix-up Fixed** - Corrected 1000x error in utility source impedance calculation
2. **Transformer Power Unit Enforcement** - Added explicit `powerUnit` field (kVA/MVA) with migration logic
3. **Enhanced Guardrails** - Added validation for implausibly small utility impedances

See [PRODUCTION_FIXES_DOCUMENTATION.md](PRODUCTION_FIXES_DOCUMENTATION.md) for complete details.

## Overview

PowerSys Pro is a comprehensive web-based application for power system short circuit analysis, arc flash calculations, and voltage drop assessment. Built with modern web technologies, it provides engineers and electrical professionals with a powerful yet easy-to-use tool for power system analysis compliant with international standards.

## Key Features

### Short Circuit Calculations
- Multiple standards support: IEC 60909-0, IEEE 141, IEEE C37.010, ANSI C37.5
- Per-Unit and Point-to-Point calculation methods
- Calculation of symmetrical, asymmetrical, and peak fault currents
- X/R ratio determination and application of standard-specific multipliers

### Arc Flash Analysis
- IEEE 1584-2018 compliant calculations
- NFPA 70E-2024 PPE category determination
- Incident energy and arc flash boundary calculations
- Workplace safety compliance reporting

### Voltage Drop Calculations
- Single-phase and three-phase circuit support
- NEC and IEEE standards compliance checking
- Conductor database with impedance characteristics
- Voltage profile visualization

### Power System Modeling
- Bus modeling with Thevenin equivalent calculations
- Multi-voltage level system support
- Transformer modeling with impedance referencing and explicit power unit handling (kVA/MVA)
- Intelligent migration for legacy data with automatic unit detection
- Interactive system diagram visualization

### User Experience
- Modern, responsive user interface
- Step-by-step calculation display
- Result visualization with interactive charts
- Detailed reporting and export capabilities

## Technologies Used

- HTML5, CSS3, and JavaScript
- Chart.js for data visualization
- jsPDF and SheetJS for export functionality
- Dexie.js for client-side database management
- Modern web standards for responsive design

## Installation and Setup

### Local Installation
1. Clone the repository:
2. Navigate to the project directory:
3. Open `Short Circuit Calculator.HTML` in your modern web browser

### Requirements
- Modern web browser with JavaScript enabled (Chrome, Firefox, Edge, Safari)
- Internet connection for loading external libraries

## Usage Guide

### Short Circuit Calculation
1. Select calculation standard (IEC, IEEE, or ANSI)
2. Choose calculation method (Per-Unit or Point-to-Point)
3. Enter system parameters (voltage, frequency)
4. Add system components (buses, sources, transformers)
5. Select fault location and calculate
6. View and export results

### Arc Flash Analysis
1. Enter system parameters and short circuit current
2. Specify working distance and arc duration
3. Select equipment type and configuration
4. Calculate incident energy and flash boundary
5. Determine required PPE category

### Voltage Drop Assessment
1. Select circuit type (single or three-phase)
2. Enter conductor details and circuit length
3. Specify load current and power factor
4. Calculate voltage drop and verify compliance
5. Review recommendations for improvements

### System Diagram Management
1. Create system buses at various voltage levels
2. Add transformers between different voltage buses
3. Define sources and loads at appropriate buses
4. Generate visual system representation
5. Perform fault calculations at selected buses

## Standards Compliance

PowerSys Pro is designed to comply with the following standards:
- IEC 60909-0 for short circuit calculations
- IEEE 141 (Red Book) for power system analysis
- IEEE C37.010 for AC high-voltage circuit breakers
- ANSI C37.5 for short circuit calculations
- IEEE 1584-2018 for arc flash hazard calculations
- NFPA 70E-2024 for electrical safety requirements
- NEC for voltage drop recommendations

## Contributing

Contributions to PowerSys Pro are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- IEEE and IEC for providing calculation standards
- NFPA for electrical safety guidelines
- Open source libraries used in this project

## Contact

- Developer: bfforex
- GitHub: [https://github.com/bfforex](https://github.com/bfforex)
- Project Link: [https://github.com/bfforex/PwrSysPro-SSC](https://github.com/bfforex/PwrSysPro-SSC)
