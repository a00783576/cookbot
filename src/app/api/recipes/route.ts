import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const recipes = await prisma.recipe.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(recipes);
    } catch (error) {
        console.error('Error fetching recipes from API:', error);
        return NextResponse.json(
            { message: 'Failed to fetch recipes', error: (error as Error).message },
            { status: 500 }
        )
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { title, ingredients, instructions, notes, userId } = body;

        if (!title || !ingredients || !instructions || !userId) {
            return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
        }

        const newRecipe = await prisma.recipe.create({
            data: {
                userId,
                title,
                ingredients,
                instructions,
                notes,
            },
        });
        return NextResponse.json(newRecipe, { status: 201 });
    }
    catch (error) {
        console.error('Error creating recipe via API:', error);
        return NextResponse.json(
            { message: 'Failed to create recipe', error: (error as Error).message },
            { status: 500 }
        );
    }
}