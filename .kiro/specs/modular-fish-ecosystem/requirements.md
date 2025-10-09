# Requirements Document

## Introduction

This feature enhances the existing sandspiel simulation into a comprehensive mapmaker tool for designing fish ecosystem game scenarios. The mapmaker will use SVG-based rendering, support specialized game elements, provide testing functionality with team mechanics, and allow export of game configurations. The focus is on creating the authoring tool rather than the full multiplayer game.

## Requirements

### Requirement 1: SVG-Based Tile System

**User Story:** As a game developer, I want to replace the current pixel rendering system with an efficient SVG-based tile system, so that I can use custom graphics for different game elements while maintaining performance.

#### Acceptance Criteria

1. WHEN the game renders elements THEN the system SHALL use SVG tiles instead of pixels for all game elements
2. WHEN rendering SVG tiles THEN the system SHALL implement efficient rounded corners for sharp tile SVGs
3. WHEN displaying the first 5 elements THEN the system SHALL show city, harbor, homeharbor, homeisland, and island SVGs in that order
4. WHEN rendering SVG elements THEN each tile SHALL be the same size as the current pixel system
5. WHEN processing SVG tiles THEN the internal code SHALL use the same logic as the existing wall element
6. WHEN rendering fish elements THEN they SHALL appear as circles with diameter matching the hole of harbor.svg
7. WHEN displaying fish THEN they SHALL support variable hex color values in a modular system

### Requirement 2: Map Editor with Specialized Elements

**User Story:** As a map creator, I want to place specialized game elements with specific properties, so that I can design strategic gameplay scenarios.

#### Acceptance Criteria

1. WHEN placing an island element THEN it SHALL render as pure black and function as a wall
2. WHEN placing a harbor element THEN it SHALL serve as a clickable spawn point during planning stage
3. WHEN placing a city element THEN it SHALL function as a location where players can sell caught fish
4. WHEN placing a home harbor element THEN it SHALL allow team respawning in future rounds
5. WHEN placing a home island element THEN it SHALL render in lime color and provide team-specific spawning
6. WHEN the first team clicks a harbor THEN only that team SHALL be able to spawn from that harbor
7. WHEN fish are added to the map THEN they SHALL remain as circles with variable hex values

### Requirement 3: Dynamic Map Size and Camera System

**User Story:** As a game designer, I want to create maps of custom dimensions with independent camera controls, so that I can design varied gameplay experiences with proper navigation.

#### Acceptance Criteria

1. WHEN adjusting world size THEN the system SHALL allow custom width and height dimensions instead of preset options
2. WHEN viewing the map area THEN it SHALL have an independent camera system for scrolling and zooming
3. WHEN panning outside the map THEN the system SHALL display empty white space
4. WHEN viewing the map border THEN it SHALL show a thin pure RGB blue outline
5. WHEN using rectangle map sizes THEN the sand simulation SHALL work correctly with non-square dimensions
6. WHEN changing map dimensions THEN the rendering system SHALL adapt efficiently to the new size

### Requirement 4: Fish Elements with Preset Behaviors

**User Story:** As a mapmaker, I want fish to be integrated as elements in the existing system with modular behaviors, so that they work seamlessly with the current simulation architecture.

#### Acceptance Criteria

1. WHEN fish are implemented THEN they SHALL be coded as elements within the existing element system
2. WHEN fish are created THEN each SHALL have preset actions coded within the element framework
3. WHEN fish interact THEN they SHALL follow proper predator-prey mechanics using the existing element interaction system
4. WHEN displaying default fish elements THEN the system SHALL include Pearl (Orca - light blue), Sea lion (purple), Octopus (Pink), Sea otter (Yellow), Sea urchin (orange), Cod (gold), Squid (lime), and Crab (Red)
5. WHEN fish behave THEN they SHALL implement game of life mechanics using the existing simulation tick system
6. WHEN fish elements are added THEN they SHALL maintain full modularity with other elements

### Requirement 5: Ship Element Mechanics

**User Story:** As a mapmaker, I want ships to be implemented as elements that interact with fish elements, so that they integrate seamlessly with the existing simulation system.

#### Acceptance Criteria

1. WHEN ships are implemented THEN they SHALL be coded as elements within the existing element system
2. WHEN ship elements move THEN they SHALL create trail elements behind them
3. WHEN trail elements are created THEN they SHALL appear as white walls named "trail" in the element system
4. WHEN ship elements move over fish elements THEN they SHALL capture fish instantly using element interaction logic
5. WHEN the simulation tick occurs THEN ship elements SHALL remove adjacent fish elements (cells only, not walls or lines)
6. WHEN fish elements are captured or removed THEN the team score SHALL increase per fish
7. WHEN ship elements create closed loops THEN the loop SHALL remain and other trail elements SHALL be erased
8. WHEN multiple loops are created THEN all loops SHALL be preserved using element system logic
9. WHEN ship elements operate THEN they SHALL use the same tick timing as other elements in the simulation

### Requirement 6: Map Export and Standalone Player

**User Story:** As a mapmaker, I want to export my created scenarios and run them in a standalone player, so that I can share complete game experiences without the editing interface.

#### Acceptance Criteria

1. WHEN exporting map data THEN the system SHALL include initial starting map content and all element properties
2. WHEN exporting THEN it SHALL create a complete game configuration file
3. WHEN creating a standalone player THEN it SHALL run exported maps without editor functionality
4. WHEN running in standalone mode THEN it SHALL support SVG sprites and game camera controls
5. WHEN playing exported maps THEN all fish behaviors and ship mechanics SHALL function identically to the mapmaker
6. WHEN viewing in standalone mode THEN it SHALL include proper camera panning and zooming

### Requirement 7: Testing Interface and Team Selection

**User Story:** As a mapmaker, I want to test my created scenarios with different team perspectives, so that I can validate the gameplay mechanics and balance.

#### Acceptance Criteria

1. WHEN testing scenarios THEN the mapmaker SHALL provide team selection for testing purposes
2. WHEN testing with teams THEN ship mechanics SHALL function correctly for validation
3. WHEN testing fish behaviors THEN the ecosystem SHALL respond appropriately to interactions
4. WHEN testing is complete THEN the mapmaker SHALL allow easy return to editing mode
5. WHEN win conditions are needed THEN they SHALL be configurable within the mapmaker interface
6. WHEN testing different scenarios THEN the mapmaker SHALL support rapid iteration and testing