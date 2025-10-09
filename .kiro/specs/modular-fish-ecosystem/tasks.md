# Implementation Plan

- [-] 1. Integrate specialized elements and ship mechanics

  - Add specialized tile elements and ship system to element framework
  - Implement keyboard-controlled ship movement with blue trail system
  - Create team management with one ship per team restriction
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 8.1, 8.2, 8.3, 8.4, 8.5_




- [ ] 1.2 Add ship and trail elements

  - Create ship element in element system with keyboard control capability
  - Implement blue trail element as wall type in element system
  - Configure ship element for team assignment and real-time movement

  - Set up trail element for automatic blue trail creation behind ship movement

  - Enforce one player ship per team restriction (unlike other mapmaking elements)


  - _Requirements: 5.1, 5.2, 5.3, 5.4, 8.1, 8.4_



- [ ] 1.3 Implement keyboard-controlled ship movement

  - Add arrow key event listeners for ship control (up, down, left, right)
  - Implement diagonal movement when two arrow keys are pressed simultaneously


  - Configure ships to operate outside cellular automata tick system for responsive control
  - Make currently non-operational ships fully operational with player controls
  - _Requirements: 5.1, 5.2, 5.3, 5.8_


- [ ] 1.4 Create blue trail system




  - Implement blue trail creation that follows behind ship movement
  - Add trail bending logic when ship changes direction


  - Configure trail elements to act like walls and interfere with cellular automata simulation
  - Ensure trail elements have proper interaction with cell system without using same tick timing
  - _Requirements: 5.4, 5.5, 5.6, 5.7_



- [ ] 1.5 Implement fish capture and scoring


  - Add instant fish capture when ship moves over fish elements
  - Create team scoring system for captured fish
  - Ensure proper interaction between ships and fish elements
  - _Requirements: 5.9, 5.10_

- [ ] 1.6 Create team management system

  - Implement one ship per team restriction
  - Add team selector UI underneath pause/play buttons with matching style
  - Create team identification system for ship ownership
  - Prevent multiple ship placement for same team
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 1.7 Implement harbor and city functionality

  - Add harbor element as clickable spawn point during planning stage
  - Implement city element as fish selling location
  - Add team-based harbor claiming system
  - _Requirements: 2.2, 2.3, 2.6_

- [ ] 1.8 Configure home elements

  - Implement home harbor for team respawning mechanics
  - Add home island element with lime color
  - Set up team-specific spawning logic
  - _Requirements: 2.4, 2.5_

- [ ]* 1.9 Write tests for specialized elements and ship mechanics
  - Create unit tests for harbor spawn point functionality
  - Write tests for city fish selling mechanics
  - Add tests for team-based element claiming
  - Add tests for ship and trail element creation
  - Create unit tests for keyboard controls and arrow key handling
  - Write tests for diagonal movement functionality
  - Add tests for blue trail creation and bending
  - Add tests for team management and ship restrictions
  - _Requirements: 2.2, 2.3, 2.6, 5.1, 5.2, 5.4, 5.5, 8.1, 8.2_
\



- [ ] 2. Implement fish elements and behaviors
  - Add 8 fish types as elements in the existing system
  - Implement fish as circles with variable hex colors
  - Create modular fish behavior system using existing element framework
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

- [ ] 2.1 Create fish elements in element system
  - Add Pearl, Sea lion, Octopus, Sea otter, Sea urchin, Cod, Squid, Crab as elements
  - Implement fish rendering as circles with diameter matching harbor.svg hole
  - Add variable hex color system for fish elements
  - _Requirements: 4.1, 4.4, 1.6, 1.7_

- [ ] 2.2 Implement fish behavior engine
  - Create fish behavior functions within existing element updater system
  - Implement predator-prey mechanics using existing element interaction methods
  - Add game of life mechanics using current simulation tick system
  - _Requirements: 4.2, 4.3, 4.5_

- [ ] 2.3 Configure fish ecosystem relationships
  - Set up predator-prey relationships between fish types
  - Implement population dynamics within element behavior functions
  - Add ecosystem balance mechanics to fish behaviors
  - _Requirements: 4.2, 4.3, 4.5_

- [ ]* 2.4 Write fish behavior tests
  - Create unit tests for predator-prey interactions
  - Write tests for fish population dynamics
  - Add tests for ecosystem balance mechanics
  - _Requirements: 4.2, 4.3, 4.5_



- [ ] 3. Implement dynamic map sizing and camera system
  - Replace preset world sizes with custom width/height controls
  - Add independent camera system for map area
  - Implement map border visualization and empty space display
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [ ] 3.1 Create custom map dimension controls
  - Replace WorldSizeButtons dropdown with width/height input fields
  - Update map sizing logic to support rectangle dimensions
  - Fix sand simulation to work correctly with non-square maps
  - _Requirements: 3.1, 3.6_

- [ ] 3.2 Implement independent camera system
  - Create GameCamera class for map area navigation
  - Add pan and zoom controls for map viewport
  - Implement smooth camera movement and zoom transitions
  - _Requirements: 3.2_

- [ ] 3.3 Add map boundary visualization
  - Display empty white space outside map boundaries
  - Add thin pure RGB blue outline for map border
  - Implement viewport culling for performance optimization
  - _Requirements: 3.3, 3.4_

- [ ]* 3.4 Write camera system tests
  - Create unit tests for camera pan and zoom functionality
  - Write tests for map boundary detection
  - Add performance tests for viewport culling
  - _Requirements: 3.2, 3.3, 3.4_

- [ ] 4. Implement default brush size and UI improvements
  - Set default brush size to 1x1 when application starts
  - Ensure brush size remains independent of world size changes
  - Integrate team selector with existing UI controls
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 4.1 Configure default brush size
  - Set brush size to default to 1x1 when application starts
  - Ensure brush size doesn't change when world size is modified
  - Maintain single-cell precision for element placement
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ]* 4.2 Write UI component tests
  - Create unit tests for default brush size functionality
  - Add tests for UI styling consistency
  - _Requirenit tests for default brush size functionality
  - Add tests for UI styling consistency
  - _Requirements: 7.1, 7.2_

- [ ] 6. Create testing interface and team selection
  - Add team selection controls for mapmaker testing
  - Implement testing mode with ship mechanics validation
  - Create easy toggle between editing and testing modes
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 6.1 Implement team selection interface
  - Add team selection dropdown/buttons for testing purposes
  - Create team color coding system for visual identification
  - Implement team-specific ship spawning for testing
  - _Requirements: 7.1_

- [ ] 6.2 Create testing mode functionality
  - Add testing mode toggle that enables ship mechanics
  - Implement fish behavior validation during testing
  - Create testing controls for scenario validation
  - _Requirements: 7.2, 7.3_

- [ ] 6.3 Add win condition configuration interface
  - Create configurable win condition settings within mapmaker
  - Add UI controls for setting victory objectives
  - Implement win condition validation system
  - _Requirements: 7.5_

- [ ]* 6.4 Write testing interface tests
  - Create unit tests for team selection functionality
  - Write tests for testing mode mechanics
  - Add tests for win condition configuration
  - _Requirements: 7.1, 7.2, 7.5_

- [ ] 7. Build map export and standalone player
  - Create map data export functionality with all element properties
  - Build standalone player component for exported maps
  - Implement game configuration import/export system
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 7.1 Implement map export system
  - Create export function that captures all map elements and properties
  - Add metadata export including fish populations and team spawns
  - Generate complete game configuration file for standalone play
  - _Requirements: 6.1, 6.2_

- [ ] 7.2 Build standalone player component
  - Create standalone game player that runs without editor interface
  - Implement map import functionality for exported configurations
  - Add SVG sprite support and camera controls for standalone mode
  - _Requirements: 6.3, 6.4, 6.5_

- [ ] 7.3 Ensure feature parity between modes
  - Verify all fish behaviors work identically in standalone mode
  - Ensure ship mechanics function correctly in exported games
  - Add proper camera panning and zooming in standalone player
  - _Requirements: 6.5, 6.6_

- [ ]* 7.4 Write export/import tests
  - Create unit tests for map export data integrity
  - Write tests for standalone player import functionality
  - Add tests for feature parity between mapmaker and player
  - _Requirements: 6.1, 6.3, 6.5_

- [ ] 8. Integration and performance optimization
  - Integrate all systems with existing simulation architecture
  - Optimize rendering performance for large maps and fish populations
  - Add error handling and graceful degradation
  - _Requirements: All requirements integration_

- [ ] 8.1 Integrate with existing simulation loop
  - Ensure new elements work with existing tick system and update schemes
  - Integrate SVG rendering with current animation frame loop
  - Maintain compatibility with existing element system and controls
  - Ensure ship keyboard controls work independently of cellular automata ticks
  - _Requirements: 4.5, 5.3, 5.7_

- [ ] 8.2 Optimize performance for scale
  - Implement viewport culling for off-screen elements
  - Add efficient fish population management for large ecosystems
  - Optimize SVG rendering for smooth performance with many elements
  - Ensure responsive ship movement performance
  - _Requirements: 1.4, 3.2, 5.3_

- [ ] 8.3 Add comprehensive error handling
  - Implement fallback rendering for missing SVG files
  - Add graceful degradation for performance issues
  - Create error logging and user feedback systems
  - Add error handling for keyboard input and ship movement
  - _Requirements: All requirements robustness_

- [ ]* 8.4 Write integration tests
  - Create end-to-end tests for complete mapmaker workflow
  - Write performance tests for large-scale scenarios
  - Add compatibility tests with existing simulation features
  - Add tests for ship movement integration with cellular automata
  - _Requirements: All requirements validation_

- [ ] 9. Polish SVG rendering system (lowest priority)
  - Implement advanced SVG rendering features for visual polish
  - Add rounded corner system for seamless tile connections
  - Create comprehensive SVG rendering test suite
  - _Requirements: 1.2_

- [ ] 9.1 Implement efficient rounded corners system
  - Create corner detection algorithm for adjacent tiles
  - Write rounded corner rendering logic for sharp SVG tiles
  - Add neighbor analysis for seamless tile connections
  - _Requirements: 1.2_

- [ ]* 9.2 Write unit tests for SVG rendering
  - Create tests for SvgTileRenderer tile accuracy
  - Write tests for rounded corner calculations
  - Add performance benchmarks for rendering system
  - _Requirements: 1.1, 1.2_