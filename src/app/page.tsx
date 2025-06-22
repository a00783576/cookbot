// src/app/page.tsx
'use client'; // This is a Client Component due to its interactivity (useState, useEffect)

import { useState, useEffect } from 'react';
// Import useActionState from React (assuming Next.js exposes/supports it)
import { useActionState } from 'react'; // Or 'react-dom/client' if more explicit
import { createRecipe, generateAISuggestion } from './actions';

interface Recipe {
  id: string;
  title: string;
  ingredients: string;
  instructions: string;
  notes: string | null;
  aiSuggestions: string | null;
}

// Initial state for useActionState hooks
const initialActionState = {
  message: '',
  success: false,
  data: undefined,
  error: undefined,
};

// Reusable component for the submit button (adapted for useActionState)
function SubmitButton({ text, pending }: { text: string; pending: boolean }) {
  return (
    <button
      type="submit"
      className="w-full py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white transition-colors duration-200"
      disabled={pending}
      style={{ backgroundColor: pending ? '#60A5FA' : '#3B82F6' }} // bg-blue-400 / bg-blue-500
    >
      {pending ? 'Saving...' : text}
    </button>
  );
}

// Reusable component for the AI button (adapted for useActionState)
function AISuggestionButton({ text, pending }: { text: string; pending: boolean }) {
  return (
    <button
      type="submit"
      className="w-full py-2 px-4 rounded-md shadow-sm text-sm font-medium text-white transition-colors duration-200"
      disabled={pending}
      style={{ backgroundColor: pending ? '#4ADE80' : '#22C55E' }} // bg-green-400 / bg-green-500
    >
      {pending ? 'Generating...' : text}
    </button>
  );
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [aiResponse, setAiResponse] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');

  // 1. Hook for the recipe creation action
  const [createRecipeState, createRecipeFormAction, isCreatePending] = useActionState(
    createRecipe,
    initialActionState
  );

  // 2. Hook for the AI suggestion action
  const [generateAIState, generateAIFormAction, isAIPending] = useActionState(
    generateAISuggestion,
    initialActionState
  );

  // Effect to fetch recipes initially and when routes are revalidated
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        // Still using fetch for GET requests as they don't mutate data directly
        const res = await fetch('/api/recipes');
        if (res.ok) {
          const data = await res.json();
          setRecipes(data);
          // If no recipe is selected, set the first one as default if available
          if (!selectedRecipeId && data.length > 0) {
            setSelectedRecipeId(data[0].id);
          }
        }
      } catch (error) {
        console.error('Failed to fetch recipes:', error);
      }
    };
    // Re-fetch recipes when either action completes to update the UI
    fetchRecipes();
  }, [createRecipeState.success, generateAIState.success, selectedRecipeId]); // Trigger re-fetch on successful action completion

  // Effect to show messages from the create recipe action
  useEffect(() => {
    if (createRecipeState.message) {
      console.log('Create Recipe Message:', createRecipeState.message);
      // You can implement a toast or alert system here for better UX
    }
  }, [createRecipeState]);

  // Effect to show messages and the AI response from the AI suggestion action
  useEffect(() => {
    if (generateAIState.message) {
      console.log('Generate AI Message:', generateAIState.message);
    }
    if (generateAIState.success && generateAIState.data?.aiSuggestions) {
      setAiResponse(generateAIState.data.aiSuggestions); // Update local state to display AI suggestion
    } else {
      setAiResponse(''); // Clear if there was an error or no suggestion
    }
  }, [generateAIState]);


  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">CookBot 🍳🤖</h1>

        {/* Section for Creating Recipe */}
        <section className="mb-8 p-6 border rounded-lg bg-blue-50">
          <h2 className="text-2xl font-semibold mb-4 text-blue-800">Add New Recipe</h2>
          {/* action points to the function returned by useActionState */}
          <form action={createRecipeFormAction} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
              <input type="text" id="title" name="title" className="mt-1 block w-full px-3 py-2 border rounded-md" required />
            </div>
            <div>
              <label htmlFor="ingredients" className="block text-sm font-medium text-gray-700">Ingredients</label>
              <textarea id="ingredients" name="ingredients" rows={4} className="mt-1 block w-full px-3 py-2 border rounded-md" placeholder="List of ingredients, one per line." required></textarea>
            </div>
            <div>
              <label htmlFor="instructions" className="block text-sm font-medium text-gray-700">Instructions</label>
              <textarea id="instructions" name="instructions" rows={6} className="mt-1 block w-full px-3 py-2 border rounded-md" placeholder="Detailed preparation steps." required></textarea>
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (optional)</label>
              <textarea id="notes" name="notes" rows={2} className="mt-1 block w-full px-3 py-2 border rounded-md"></textarea>
            </div>
            <SubmitButton text="Save Recipe" pending={isCreatePending} />
            {createRecipeState.message && (
              <p className={`text-sm mt-2 ${createRecipeState.success ? 'text-green-600' : 'text-red-600'}`}>
                {createRecipeState.message}
              </p>
            )}
          </form>
        </section>

        {/* Section for AI Suggestions */}
        <section className="mb-8 p-6 border rounded-lg bg-green-50">
          <h2 className="text-2xl font-semibold mb-4 text-green-800">Ask the AI Chef</h2>
          {/* action points to the function returned by useActionState */}
          <form action={generateAIFormAction} className="space-y-4">
            <div>
              <label htmlFor="selectRecipe" className="block text-sm font-medium text-gray-700">Select Recipe (Optional, for specific suggestion)</label>
              <select
                id="selectRecipe"
                name="recipeId" // Important: 'name' matches what the action expects
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border rounded-md bg-white"
              >
                <option value="">(None - General Question)</option>
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="aiPrompt" className="block text-sm font-medium text-gray-700">Your Question or Recipe Idea</label>
              <textarea id="aiPrompt" name="aiPrompt" rows={4} className="mt-1 block w-full px-3 py-2 border rounded-md" placeholder="Ex: Suggest a vegan variation of mole poblano. Or: I have chicken and avocado, what can I cook?" required></textarea>
            </div>
            <AISuggestionButton text="Generate AI Suggestion" pending={isAIPending} />
            {generateAIState.message && (
              <p className={`text-sm mt-2 ${generateAIState.success ? 'text-green-600' : 'text-red-600'}`}>
                {generateAIState.message}
              </p>
            )}
          </form>
          {aiResponse && (
            <div className="mt-4 p-4 bg-white border rounded-md whitespace-pre-wrap text-gray-700 text-sm">
              <h3 className="font-medium mb-2">AI Chef Response:</h3>
              {aiResponse}
            </div>
          )}
        </section>

        {/* Section for Listing Recipes */}
        <section className="p-6 border rounded-lg bg-gray-50">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">My Recipes</h2>
          {recipes.length === 0 ? (
            <p className="text-gray-600">No recipes saved yet. Add one!</p>
          ) : (
            <ul className="space-y-4">
              {recipes.map((recipe) => (
                <li key={recipe.id} className="bg-white p-4 rounded-md shadow-sm border border-gray-200">
                  <h3 className="text-xl font-bold text-indigo-700 mb-2">{recipe.title}</h3>
                  <p className="text-sm text-gray-600">**Ingredients:** {recipe.ingredients}</p>
                  <p className="text-sm text-gray-600">**Instructions:** {recipe.instructions}</p>
                  {recipe.notes && <p className="text-sm text-gray-600">**Notes:** {recipe.notes}</p>}
                  {recipe.aiSuggestions && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded-md text-sm text-yellow-800 whitespace-pre-wrap">
                      <h4 className="font-medium">AI Suggestion for this recipe:</h4>
                      {recipe.aiSuggestions}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}