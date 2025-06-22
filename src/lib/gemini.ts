import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.GEMINI_API_KEY as string;

if(!API_KEY){
    throw new Error('GEMINI_API_KEY is not defined in environment variables.')
}

const genAI = new GoogleGenerativeAI(API_KEY);

const gemini = genAI.getGenerativeModel({ model: 'gemini-1.5-flash'});

export default gemini;