import { GoogleGenerativeAI } from "@google/generative-ai";

  console.log('#####################################################');
  console.log('### INICIO DE VERIFICACIÓN DE VARIABLES DE ENTORNO ###');
  console.log('#####################################################');

  // Accede a cada variable de entorno que quieres verificar
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'DEFINIDA (no se muestra el valor completo por seguridad)' : 'NO DEFINIDA');
  console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'DEFINIDA (no se muestra el valor completo por seguridad)' : 'NO DEFINIDA');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('PORT:', process.env.PORT);
  console.log('TEST:', process.env.TEST);

  console.log('#####################################################');
  console.log('### FIN DE VERIFICACIÓN DE VARIABLES DE ENTORNO ###');
  console.log('#####################################################');

const API_KEY = process.env.GEMINI_API_KEY as string;

if(!API_KEY){
    throw new Error('GEMINI_API_KEY is not defined in environment variables.')
}

const genAI = new GoogleGenerativeAI(API_KEY);

const gemini = genAI.getGenerativeModel({ model: 'gemini-1.5-flash'});

export default gemini;