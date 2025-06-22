// src/app/actions.ts
'use server'; // Marks this file as a Server Component and all its exports as Server Actions

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import gemini from '@/lib/gemini'

// Test user ID (in a real application, this would come from server-side authentication)
// Ensure this ID exists in your PostgreSQL 'User' table.
const TEST_SERVER_USER_ID = "91dedc7f-6bc7-42e1-a4fa-5633268069f8";

interface RecipeData {
    id?: string;
    title?: string;
    ingredients?: string;
    instructions?: string;
    notes?: string | null;
    aiSuggestions?: string | null;
}

interface ActionState {
    message: string;
    success: boolean;
    data?: RecipeData; // For any additional data we want to return
    error?: string;
}

export async function createRecipe(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const title = formData.get('title') as string;
    const ingredients = formData.get('ingredients') as string;
    const instructions = formData.get('instructions') as string;
    const notes = formData.get('notes') as string | null;

    if (!title || !ingredients || !instructions) {
        return { success: false, message: 'Missing required fields to create recipe.' };
    }

    try {
        const newRecipe = await prisma.recipe.create({
            data: {
                userId: TEST_SERVER_USER_ID,
                title,
                ingredients,
                instructions,
                notes,
            },
        });

        // Revalidate the path to update the displayed recipe list
        revalidatePath('/');
        return { success: true, message: 'Recipe created successfully!', data: newRecipe };

    } catch (error) {
        console.error('Error creating recipe with Server Action:', error);
        return { success: false, message: 'Failed to create recipe.', error: (error as Error).message };
    }
}

export async function generateAISuggestion(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const promptText = formData.get('aiPrompt') as string;
    const recipeId = formData.get('recipeId') as string; // Get recipeId from form data

    if (!promptText) {
        return { success: false, message: 'AI prompt cannot be empty.' };
    }

    try {
        const result = await gemini.generateContent([
            "You are an expert chef and a creative kitchen assistant. Answer recipe questions and suggest variations.",
            promptText
        ]);

        const response = await result.response;
        const suggestiongs = response.text();

        if (recipeId && suggestiongs) {
            await prisma.recipe.update({
                where: { id: recipeId },
                data: { aiSuggestions: suggestiongs }
            });
            revalidatePath('/');
        }

        return { success: true, message: 'AI suggerstions generated!', data: { aiSuggestions: suggestiongs } };

    } catch (error) {
        console.error('Error generating AI suggestions with Server Action:', error);
        return { success: false, message: 'Failed to generate AI suggestion.', error: (error as Error).message };
    }
}