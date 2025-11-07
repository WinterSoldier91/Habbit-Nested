
import { GoogleGenAI, Type } from "@google/genai";
import { Task, TaskType } from '../types';

// This function enhances the raw AI response by adding necessary app-specific fields.
const addAppSpecificFields = (task: any): Task => {
    return {
        ...task,
        id: crypto.randomUUID(),
        completed: false,
        collapsed: false,
        type: task.type === 'habit' ? TaskType.Habit : TaskType.Todo, // Ensure type safety
        children: task.children ? task.children.map(addAppSpecificFields) : [],
    };
};

export const breakdownTaskWithAI = async (prompt: string): Promise<Task[]> => {
    if (!process.env.API_KEY) {
        throw new Error("API_KEY environment variable not set");
    }
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const taskSchema = {
      type: Type.OBJECT,
      properties: {
        title: {
          type: Type.STRING,
          description: "The title of the task or subtask.",
        },
        type: {
          type: Type.STRING,
          enum: ["todo", "habit"],
          description: "The type of task. Use 'habit' for recurring actions and 'todo' for one-off tasks.",
        },
        children: {
          type: Type.ARRAY,
          description: "An array of nested subtasks.",
          items: {
            // Recursive definition
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["todo", "habit"] },
                children: { 
                    type: Type.ARRAY, 
                    items: { type: Type.OBJECT } // Simplified for deeper nesting
                },
            },
          },
        },
      },
      required: ["title", "type"],
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Break down the following goal into a nested list of actionable tasks and habits: "${prompt}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: taskSchema,
                },
            },
        });

        const jsonText = response.text.trim();
        const parsedTasks = JSON.parse(jsonText);

        if (!Array.isArray(parsedTasks)) {
          console.error("AI response is not an array:", parsedTasks);
          return [];
        }

        return parsedTasks.map(addAppSpecificFields);

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to break down task with AI. Please check your API key and network connection.");
    }
};
