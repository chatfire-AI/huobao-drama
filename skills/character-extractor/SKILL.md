---
name: character_extractor
description: A dedicated tool for extracting the full cast of characters from novel content. It accurately identifies every person in the text, deconstructing them into identity tags, descriptions, visual specs (clothing/physique/features), and personality traits, while simultaneously outputting a comprehensive social relationship map.
---


## Goals

1. **Total Entity Capture**: Conduct a comprehensive scan of all characters mentioned in the text (including protagonists, antagonists, supporting roles, and background groups) to ensure no omissions.
2. **Multi-dimensional Attribute Decoupling**: Deconstruct each character into four core dimensions: Identity Tag, Identity Description, Visual Specifications, and Personality Traits.
3. **Relational Dynamics Modeling**: Construct a dynamic relationship map to quantify power hierarchies, emotional orientations, and interest conflicts.
4. **Visual Standardization**: Convert prose descriptions into high-recognition visual tags, filtering out transient actions to preserve stable physical attributes.

## Skill Capabilities

### 1. Character Dimension Decomposition Standards

* **Identity Tag**: A single-sentence definition of the character's social attribute or narrative function (e.g., Reborn Avenger, Violent Man-child).
* **Identity Description**: A brief overview of the character's background, their primary mission in the text, and their deep logical connection to the protagonist.
* **Visual Specs**:
* **Clothing**: Material, style, degree of wear, and specific accessories.
* **Physique**: Height/weight perception, habitual posture, and overall silhouette.
* **Facial Features**: Facial details, skin condition, eye characteristics, and distinctive marks (e.g., scars).


* **Personality Traits**: Core behavioral logic, emotional triggers, and typical psychological inclinations.

### 2. Social Matrix Analysis

* **Power Hierarchy**: Identify the dominant vs. subordinate characters in the current scene.
* **Emotional Vector**: Define the nature of interactions (e.g., Hostile, Exploitative, Protective, Indifferent).
* **Relationship Visualization**: Output the logical connections between characters using structured mapping.

## Constraints & Rules

### 1. Extraction Protocols (Fidelity Protocols)

* **Data-Driven**: All information must be based on the source text or strictly logical inferences; fabrication is strictly prohibited.
* **Static Priority**: Visual features must focus on relatively stable states. Transient actions (e.g., "running") must not be confused with physical traits.
* **Precision over Subjectivity**: Prohibit vague terms like "looks mean." Use concrete terms such as "fleshy face" or "slanting eyes."

### 2. Output Standard

* **Character Card**:
* **Name**: [Name]
* **Identity Tag**: [Tag]
* **Identity Description**: [Description]
* **Visual Specs**: [Clothing / Physique / Facial Features]
* **Personality**: [Traits]


* **Relationship Map**: Use the structure `[Character A] <-> [Interaction Nature] <-> [Character B]`.
* **Prohibitions**: The use of emojis is strictly forbidden throughout the entire document.

## Logic & Workflow

1. **Global Census**: Scan the text to identify all entities with agency or those mentioned in the narrative.
2. **Multidimensional Analysis**: Fill the profiles according to the [Identity/Description/Visual/Personality] framework.
3. **Relational Networking**: Analyze character interactions, dialogues, and points of contention over resources/interests.
4. **Conflict Modeling**: Summarize the social structure and the central conflict focus of the scene.
5. **Compliance Audit**: Verify that no details were missed and no transient actions were incorrectly categorized as permanent traits.