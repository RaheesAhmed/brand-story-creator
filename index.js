import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import fs from "fs";
import { promises as fsPromises } from "fs";
import OpenAI from "openai";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

// Initialize OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Multer for file upload
const upload = multer({ dest: "uploads/" });

// Async function to create or get existing assistant
async function getOrCreateAssistant() {
  const assistantFilePath = "./assistant.json";
  let assistantDetails;

  try {
    // Check if the assistant.json file exists
    const assistantData = await fsPromises.readFile(assistantFilePath, "utf8");
    assistantDetails = JSON.parse(assistantData);
  } catch (error) {
    // If file does not exist, create a new assistant
    const assistantConfig = {
      name: "Conscious Brand Sage",
      instructions:
        "Conscious Brand Sage is a conversational and approachable GPT, specializing in branding for regenerative, conscious businesses. It excels in identifying target audiences and crafting brand stories in the hero, villain, passion format, aligned with sustainability and ethical principles. This GPT offers advice on creating impactful brand narratives and visual identities, infused with regenerative values. It asks for more details to provide precise, helpful advice, steering clear of strategies that contradict ethical or sustainability goals. Conscious Brand Sage uses language that is familiar and engaging to the regenerative business community, making complex concepts more relatable and accessible. Its approach is to offer personalized, context-specific guidance in a friendly and conversational manner, ensuring users feel supported in aligning their branding with their values and business goals.",
      tools: [{ type: "retrieval" }, { type: "code_interpreter" }],
      model: "gpt-4-1106-preview",
    };

    const assistant = await openai.beta.assistants.create(assistantConfig);
    assistantDetails = { assistantId: assistant.id, ...assistantConfig };

    // Save the assistant details to assistant.json
    await fsPromises.writeFile(
      assistantFilePath,
      JSON.stringify(assistantDetails, null, 2)
    );
  }

  return assistantDetails;
}

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

// POST endpoint for file upload
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const assistantDetails = await getOrCreateAssistant();
    const file = await openai.files.create({
      file: fs.createReadStream(req.file.path),
      purpose: "assistants",
    });

    // Retrieve existing file IDs from assistant.json to not overwrite
    let existingFileIds = assistantDetails.file_ids || [];

    // Update the assistant with the new file ID
    await openai.beta.assistants.update(assistantDetails.assistantId, {
      file_ids: [...existingFileIds, file.id],
    });

    // Update local assistantDetails and save to assistant.json
    assistantDetails.file_ids = [...existingFileIds, file.id];
    await fsPromises.writeFile(
      "./assistant.json",
      JSON.stringify(assistantDetails, null, 2)
    );

    res.send("File uploaded and successfully added to assistant");
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred during file upload");
  }
});

// Endpoint to generate a brand story
app.post("/generate-story", async (req, res) => {
  try {
    // Extracting data from the request body
    const {
      businessName,
      natureOfBusiness,
      uniqueSellingProposition,
      positiveImpact,
      targetAudience,
      coreValues,
      regenerationFocus,
      pricingStrategy,
    } = req.body;

    console.log("Data Recieved", req.body);

    // Get or create the assistant
    const assistantDetails = await getOrCreateAssistant();

    // Formulate the prompt for the assistant
    const prompt = `Generate a brand story for a business with the following details:
      Business Name: ${businessName}
      Nature of Business and Services: ${natureOfBusiness}
      Unique Selling Proposition: ${uniqueSellingProposition}
      Positive Impact: ${positiveImpact}
      Target Audience: ${targetAudience}
      Core Business Values: ${coreValues}
      Focus on Regeneration and Ethics: ${regenerationFocus}
      Pricing Strategy: ${pricingStrategy}
      Use the 'hero, villain, passion' storytelling framework. The target audience is the hero. Identify the villain (main challenge they face) and passion (their deepest desires).`;

    // Create a thread using the assistantId
    const thread = await openai.beta.threads.create();

    // Pass the prompt into the existing thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: prompt,
    });

    // Create a run using the assistantId
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantDetails.assistantId,
    });

    // Fetch run-status
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

    // Polling mechanism to check if runStatus is completed
    while (runStatus.status !== "completed") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    // Get the last assistant message from the messages array
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessageForRun = messages.data
      .filter(
        (message) => message.run_id === run.id && message.role === "assistant"
      )
      .pop();

    if (lastMessageForRun) {
      res.json({ brandStory: lastMessageForRun.content[0].text.value });
    } else {
      res.status(500).send("No response received from the assistant.");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("An error occurred while generating the brand story.");
  }
});
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
