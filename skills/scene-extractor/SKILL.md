---
name: script_scene_extractor
description: A tool designed to extract spatial assets and environmental logic from literary texts. Beyond recording physical materials and atmosphere, it focuses on the spatial layout and relative distances between elements, providing a logically grounded spatial model for narrative progression.
---

## Goals

1. **Physical Scene Modeling**: Extract physical parameters such as construction, materials, and layout of the scene.
2. **Spatial Layout Mapping**: Precisely define the relative distances and directional relationships between **Hero Props** (e.g., centered, by the window, 2 meters apart).
3. **Atmospheric Quantification**: Define lighting direction, color temperature tendencies, climatic textures, and visual visibility.
4. **Spatial Function Anchoring**: Identify the logical function of the scene within the narrative (e.g., Shelter, Confrontation Site, Supply Point).

## Skill Capabilities

### 1. Spatial & Layout Mapping

* **Scene Tag**: Name of the location.
* **Narrative Function**: Positioning of the scene's purpose in the story.
* **Physical Specs**: Architectural materials, terrain, and distribution of entrances/exits.
* **Spatial Layout & Proximity**:
* **Core Anchor**: Identify the central reference object in the scene.
* **Prop Spacing**: Detailed recording of the orientation and relative distance between key props and reference points (e.g., "The coal pile is on the left side of the backyard, approximately 5 meters from the back door").
* **Movement Logic**: Potential paths for characters moving between props.


* **Atmospheric Data**: Lighting, color temperature, and atmospheric medium (smoke/fog/snow).
* **Hero Props**: Core interactive objects that support the plot within the scene.

## Constraints & Rules

### 1. Extraction Protocols

* **Spatial Accuracy**: Relative positions must be extracted strictly based on the source text. If the description is vague, perform a logical inference based on common sense and mark it as an "Inference."
* **De-literary Language**: Prohibit the use of emotional adjectives; translate them into physical orientations (left-leaning, diagonal, vertical distance) and physical states.
* **Dynamic Evolution**: Record changes in prop positions or updates to the physical state of the scene as the plot progresses.

### 2. Output Standard

* **Scene Card**:
* **Scene Name**: [Name]
* **Narrative Function**: [Function]
* **Atmospheric Data**: [Lighting/Color/Weather]
* **Physical Specs**: [Structure/Material/Status]
* **Spatial Layout**: [Description of Hero Props and their relative distances/positions]
* **Hero Props**: [List of Core Props]


* **Prohibitions**: The use of emojis is strictly forbidden.

## Logic & Workflow

1. **Geographic Audit**: Identify all spatial coordinates mentioned in the text.
2. **Spatial Modeling**: Fill in the physical and environmental parameters of the scene.
3. **Layout Analysis**: Analyze and calculate the spatial relationships and distances between props, furniture, and obstacles mentioned.
4. **Function Logic**: Analyze how the scene supports character actions and narrative tension.