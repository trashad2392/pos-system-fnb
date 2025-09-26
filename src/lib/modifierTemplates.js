// src/lib/modifierTemplates.js

const modifierTemplates = [
  {
    name: 'Single Choice (Required)',
    description: 'User must pick exactly one item. e.g., Milk for coffee.',
    config: { minSelection: 1, selectionBudget: 1, maxSelections: 1, allowRepeatedSelections: false, exactBudgetRequired: true, maxSelectionsSyncedToOptionCount: false }
  },
  {
    name: 'Optional Add-ons',
    description: 'User can pick any number of items. e.g., Extra sauces.',
    config: { minSelection: 0, selectionBudget: 100, maxSelections: null, allowRepeatedSelections: false, exactBudgetRequired: false, maxSelectionsSyncedToOptionCount: true }
  },
  {
    name: 'Toppings with Repeats',
    description: 'User can add multiple toppings, including repeats like "Double Pepperoni".',
    config: { minSelection: 0, selectionBudget: 100, maxSelections: null, allowRepeatedSelections: true, exactBudgetRequired: false, maxSelectionsSyncedToOptionCount: true }
  },
  {
    name: 'Build-a-Meal (Fixed #)',
    description: 'User must pick a specific number of items. e.g., "1 main + 2 sides".',
    config: { minSelection: 3, selectionBudget: 3, maxSelections: 3, allowRepeatedSelections: false, exactBudgetRequired: true, maxSelectionsSyncedToOptionCount: false }
  },
  {
    name: 'The "1KG Grill" Special',
    description: 'Complex rule where items have different points and an exact budget must be met.',
    config: { minSelection: 3, selectionBudget: 12, maxSelections: 4, allowRepeatedSelections: false, exactBudgetRequired: true, maxSelectionsSyncedToOptionCount: false }
  },
  {
    name: 'Create Your Own',
    description: 'Start with a blank slate and configure all the rules yourself.',
    config: { minSelection: 0, selectionBudget: 1, maxSelections: null, allowRepeatedSelections: false, exactBudgetRequired: false, maxSelectionsSyncedToOptionCount: false }
  }
];

module.exports = { modifierTemplates };