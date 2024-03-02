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
    //Retrive assistant
    const assistant = await openai.beta.assistants.retrieve(
      process.env.ASSISTANT_ID,
      "name",
      "model",
      "instructions",
      "tools"
    );

    assistantDetails = {
      assistantId: assistant.id,
      assistantName: assistant.name,
      assistantInstructions: assistant.instructions,
      assistantModel: assistant.model,
      assistantTools: assistant.tools,
      response_format: { type: "json_object" },
    };
    console.log(assistantDetails);

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
    const assistantDetails = await getOrCreateAssistant();

    const prompt =
      `Using the 'hero, villain, passion' storytelling framework, create a brand story for the selected target audience.\n\n` +
      `Target Audience: ${targetAudience}\n` +
      `Hero: The specific group of people targeted, aiming to build a connection with.\n` +
      `Villain: The main obstacle or challenge faced by the hero, preventing them from achieving their goals.\n` +
      `Passion: The deepest desires and aspirations of the hero, their dream state, or ideal vision of success.\n\n` +
      `Business Details:\n` +
      `Business Name: ${businessName}\n` +
      `Nature of Business: ${natureOfBusiness}\n` +
      `Unique Selling Proposition: ${uniqueSellingProposition}\n` +
      `Positive Impact: ${positiveImpact}\n` +
      `Core Business Values: ${coreValues}\n` +
      `Focus on Regeneration and Ethics: ${regenerationFocus}\n` +
      `Pricing Strategy: ${pricingStrategy}\n\n` +
      `Write a 100-word story incorporating these elements.`;

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

      heroVillanPassion(lastMessageForRun.content[0].text.value);
    } else {
      res.status(500).send("No response received from the assistant.");
    }
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res
        .status(500)
        .send("An error occurred while generating the brand story.");
    }
  }
});

// Endpoint to get 10 potential target audiences
app.get("/target-audiences", async (req, res) => {
  try {
    const targetAudiences = await generateRealisticTargetAudiences();

    targetAudiences = targetAudiences.targetAudience;

    res.json({ targetAudiences });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send("An error occurred while generating target audiences.");
  }
});

// Endpoint to handle form submission and generate target audiences
app.post("/submit-business-form", async (req, res) => {
  try {
    const businessDetails = req.body;
    console.log("Received Business Details: ", businessDetails);

    const targetAudiences = await generateTargetAudiences(businessDetails);

    res.json(targetAudiences);
  } catch (error) {
    console.error("Error in generating target audiences: ", error);
    if (!res.headersSent) {
      res
        .status(500)
        .send("An error occurred while generating the brand story.");
    }
  }
});

//eendpoint to handle the selected target audience and generate the hero,villan and passion story
app.post("/brand-story-part1", async (req, res) => {
  try {
    const {
      businessName,
      natureOfBusiness,
      uniqueSellingProposition,
      positiveImpact,
      coreValues,
      regenerationFocus,
      pricingStrategy,
      selectedTargetAudience,
    } = req.body;

    const heroVillanPassionStory = await heroVillanPassion(
      selectedTargetAudience,
      businessName,
      natureOfBusiness,
      uniqueSellingProposition,
      positiveImpact,
      coreValues,
      regenerationFocus,
      pricingStrategy
    );

    res.json(heroVillanPassionStory);
  } catch (error) {
    console.error("Error in generating hero,villan and passion story: ", error);
    if (!res.headersSent) {
      res
        .status(500)
        .send(
          "An error occurred while generating the hero,villan and passion story."
        );
    }
  }
});

const heroVillanPassion = async (
  selectedTargetAudience,
  businessName,
  natureOfBusiness,
  uniqueSellingProposition,
  positiveImpact,
  coreValues,
  regenerationFocus,
  pricingStrategy
) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-4-1106-preview",
    max_tokens: 2000,
    messages: [
      {
        role: "system",
        content:
          "Conscious Brand Sage is a conversational and approachable GPT, specializing in branding for regenerative, conscious businesses. It excels in identifying target audiences and crafting brand stories in the hero, villain, passion format, aligned with sustainability and ethical principles. This GPT offers advice on creating impactful brand narratives and visual identities, infused with regenerative values. It asks for more details to provide precise, helpful advice, steering clear of strategies that contradict ethical or sustainability goals. Conscious Brand Sage uses language that is familiar and engaging to the regenerative business community, making complex concepts more relatable and accessible. Its approach is to offer personalized, context-specific guidance in a friendly and conversational manner, ensuring users feel supported in aligning their branding with their values and business goals.",
      },
      {
        role: "system",
        content: `Help me to identify the hero, villain and passion in my business brand story based on my selected target audience: ${selectedTargetAudience}
Write 100 words about each one of them: the hero, the villain and the passion.
The hero, villain, passion brand story format is a storytelling framework often used in marketing and branding to engage and connect with audiences on an emotional level. It follows a narrative structure that features three key elements:
The hero represents my selected target audience with whom I am aiming to build a connection with. They are the individuals I want to engage and serve.
The villain in this context refers to the obstacle or challenge that the hero faces, which is preventing them from achieving their goals or desired outcomes. It could be a problem, frustration, or barrier that hinders their progress or limits their potential.
The passion in this story format represents the deepest desires and aspirations of the hero. It is what they want more than anything else, their dream state or ideal vision of success. It embodies their hopes, dreams, and aspirations that drive them forward.
Here is a description of my dream business:
Business Name: ${businessName}\n 
Nature of Business: ${natureOfBusiness}\n
Unique Selling Proposition: ${uniqueSellingProposition}\n
Positive Impact: ${positiveImpact}\n
Core Business Values: ${coreValues}\n
Focus on Regeneration and Ethics: ${regenerationFocus}\n
Pricing Strategy: ${pricingStrategy} \n
give the response in this format {[{"Hero":"The hero is..."},{"Villain":"The villain is..."},{"Passion":"The passion is..."}]}`,
      },
    ],
  });

  const response = completion.choices[0].message.content;
  console.log("RESPONSE", response);

  return { response: response };
};

const generateTargetAudiences = async (businessDetails) => {
  console.log("Generating target audiences for business details...");
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `Conscious Brand Sage is a conversational and approachable GPT, specializing in branding for regenerative, conscious businesses. It excels in identifying target audiences and crafting brand stories in the hero, villain, passion format, aligned with sustainability and ethical principles. This GPT offers advice on creating impactful brand narratives and visual identities, infused with regenerative values. It asks for more details to provide precise, helpful advice, steering clear of strategies that contradict ethical or sustainability goals. Conscious Brand Sage uses language that is familiar and engaging to the regenerative business community, making complex concepts more relatable and accessible. Its approach is to offer personalized, context-specific guidance in a friendly and conversational manner, ensuring users feel supported in aligning their branding with their values and business goals.`,
      },
      {
        role: "user",
        content:
          `Please list 12 different target audiences suited for my new emerging dream business. The description of my dream business is as follows::\n` +
          `Business Name: ${businessDetails.businessName}\n` +
          `Nature of Business: ${businessDetails.natureOfBusiness}\n` +
          `Unique Selling Proposition: ${businessDetails.uniqueSellingProposition}\n` +
          `Positive Impact: ${businessDetails.positiveImpact}\n` +
          `Core Business Values: ${businessDetails.coreValues}\n` +
          `Focus on Regeneration and Ethics: ${businessDetails.regenerationFocus}\n` +
          `Pricing Strategy: ${businessDetails.pricingStrategy} \n` +
          `Based on this information, I need a clean array of objects detailing target audiences use this format {"TargetAudiences": [
            {
                "Name": "Eco-Conscious Consumers",
                "Characteristics": "Individuals who prioritize sustainability and are willing to pay more for organic, eco-friendly products."
              },
              ...
]
      }
            .Ensure there are no extra characters, unnecessary formatting, or syntax errors in the response also just give the response object.
    `,
      },
    ],
    model: "gpt-4-1106-preview",
    max_tokens: 5000,
  });
  console.log("OPENAI RESPONSE: ", completion);
  let targetAudiencesString = completion.choices[0].message.content;

  // Save the response and get the parsed data
  const targetAudiences = await saveAndReadResponse(targetAudiencesString);
  console.log("SENDED DATA", targetAudiences);

  return targetAudiences;
};

const saveAndReadResponse = async (response) => {
  await fsPromises.writeFile("./response.json", response); // Save the raw response
  const data = await fsPromises.readFile("./response.json", "utf8");
  const targetAudiences = JSON.parse(data); // Parse the saved response
  return targetAudiences;
};

//replace the old response with new response
const replaceResponse = async (response) => {
  await fsPromises.writeFile(
    "./response.json",
    JSON.stringify(response, null, 2)
  );
};

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
