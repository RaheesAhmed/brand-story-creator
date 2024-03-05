import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import multer from "multer";
import fs from "fs";
import { promises as fsPromises } from "fs";
import OpenAI from "openai";
import dotenv from "dotenv";
import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";
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

// Temporary storage for brand story part 1 data
const brandStoryPart1Data = {};

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

// Endpoint to generate a brand story
app.post("/generate-story", async (req, res) => {
  console.log("Data Recieved:", req.body);
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
      fullName,
    } = req.body;
    const assistantDetails = await getOrCreateAssistant();

    // Retrieve the data from brandStoryPart1Data
    const part1Data = brandStoryPart1Data.tempKey;
    const prompt =
      `Using the 'hero, villain, passion' from ${part1Data} , create a brand story for the selected target audience.\n\n` +
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
      const brandStory = lastMessageForRun.content[0].text.value;
      res.json({ brandStory: brandStory });

      heroVillanPassion(brandStory);
      // Call savetocsv with the appropriate data
      await savetocsv(fullName, targetAudience, brandStory);

      await handleCSVOnGoogleDrive(csvFilePath);
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

// Endpoint to generate target audiences
app.post("/target-audience", async (req, res) => {
  try {
    const businessDetails = req.body;
    console.log("Received Business Details: ", businessDetails);

    const targetAudiences = await generateTargetAudiences(businessDetails);
    console.log("Generating target audiences...");
    try {
      var savetargetesponse = await saveAndReadTargetAduience(targetAudiences);
    } catch (error) {
      console.error("Error in saving target audiences: ", error);
    }

    console.log("Target Audiences:", savetargetesponse);
    res.json({ targetAudiences: savetargetesponse });
  } catch (error) {
    console.error("Error in generating target audiences: ", error);
    res
      .status(500)
      .send("<p>Invalid response from OpenAI Please Try Again</p>");

    if (!res.headersSent) {
      res.status(500).send("An error occurred while generating  brand story.");
    }
  }
});

//endpoint to handle the selected target audience and generate the hero,villan and passion story
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
      fullName,
    } = req.body;
    console.log("Part1 Data:", req.body);
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
    // Store the data in brandStoryPart1Data
    brandStoryPart1Data.tempKey = heroVillanPassionStory;
    const savedheroVillanPassionStory = await saveBrandStoryPart1(
      heroVillanPassionStory
    );
    console.log(
      "Saved Hero, Villan, Passion Story:",
      savedheroVillanPassionStory
    );
    res.json({ response: savedheroVillanPassionStory });
  } catch (error) {
    console.error("Error in generating hero,villan and passion story: ", error);
    res.send("<p>Invalid response from OpenAI Please Try Again</p>");
    if (!res.headersSent) {
      res
        .status(500)
        .send(
          "An error occurred while generating the hero,villan and passion story."
        );
    }
  }
});

// Load the service account key JSON file
const serviceAccount = JSON.parse(
  fs.readFileSync("future4u-412121-9c3a9372690b.json")
);
const jwtClient = new google.auth.JWT(
  serviceAccount.client_email,
  null,
  serviceAccount.private_key,
  ["https://www.googleapis.com/auth/drive"]
);

// Initialize the Google Drive API client
const drive = google.drive({ version: "v3", auth: jwtClient });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvFilePath = path.join(__dirname, "BrandStory-Data.csv");

const handleCSVOnGoogleDrive = async (csvFilePath) => {
  const fileName = "BrandStory-Data.csv";
  const folderId = process.env.GOOGLE_FOLDER_ID;
  console.log("Uploading CSV to Google Drive. Folder ID:", folderId);

  try {
    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const media = {
      mimeType: "text/csv",
      body: fs.createReadStream(csvFilePath),
    };

    // Check if the file already exists
    const existingFiles = await drive.files.list({
      q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
      spaces: "drive",
      fields: "files(id, name)",
    });

    if (existingFiles.data.files.length > 0) {
      // File exists, update it
      const fileId = existingFiles.data.files[0].id;
      await drive.files.update({
        fileId: fileId,
        media: media,
      });
      console.log(`Updated existing file on Google Drive with ID: ${fileId}`);
    } else {
      // File doesn't exist, upload as new
      await drive.files.create({
        resource: fileMetadata,
        media: media,
      });
      console.log("Uploaded new file to Google Drive.");
    }
  } catch (error) {
    console.error("Error uploading CSV to Google Drive:", error);
  }
};

const savetocsv = async (fullName, targetAudience, brandStory) => {
  const headers = "First Name,Target Audience,Brand Story,\n";
  const data = `${fullName},${targetAudience},"${brandStory}",\n`;

  try {
    await fs.promises.access(csvFilePath, fs.constants.F_OK);
    console.log("CSV file exists. Appending data.");
    await fs.promises.appendFile(csvFilePath, data);
    console.log("Data appended to CSV file successfully.");
  } catch (error) {
    console.log("CSV file does not exist. Creating file.", error);
    await fs.promises.writeFile(csvFilePath, headers + data);
    console.log("CSV file created with headers and data.");
  }
};

const generateTargetAudiences = async (businessDetails) => {
  console.log("Generating target audiences...", businessDetails);
  const assistantDetails = await getOrCreateAssistant();
  console.log("Generating target audiences...");
  const prompt =
    `Please list 12 different target audiences suited for my new emerging dream business. The description of my dream business is as follows:\n` +
    `Business Name: ${businessDetails.businessName}\n` +
    `Nature of Business: ${businessDetails.natureOfBusiness}\n` +
    `Unique Selling Proposition: ${businessDetails.uniqueSellingProposition}\n` +
    `Positive Impact: ${businessDetails.positiveImpact}\n` +
    `Core Business Values: ${businessDetails.coreValues}\n` +
    `Focus on Regeneration and Ethics: ${businessDetails.regenerationFocus}\n` +
    `Pricing Strategy: ${businessDetails.pricingStrategy}\n` +
    `Based on this information, I need a clean array of objects detailing target audiences in this format: {"TargetAudiences": [{Title:'add title here',Description:'add Description heere'}...]}. Ensure there are no extra characters, unnecessary formatting, or syntax errors in the response.`;
  console.log("prompt loaded ....");
  const thread = await openai.beta.threads.create();
  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: prompt,
  });
  console.log("message sent ....");
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistantDetails.assistantId,
  });
  console.log("run created ....");
  let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
  console.log("run status retrieved ....");
  while (runStatus.status !== "completed") {
    console.log("run not completed ....");
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Increase timeout if necessary
    console.log("waiting for run to complete ....");
    runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    console.log("run status retrieved ....");
  }
  console.log("run completed ....");
  const messages = await openai.beta.threads.messages.list(thread.id);
  const lastMessageForRun = messages.data
    .filter(
      (message) => message.run_id === run.id && message.role === "assistant"
    )
    .pop();

  if (lastMessageForRun) {
    const cleanedResponse = lastMessageForRun.content[0].text.value
      .replace(/```json\n|\n```/g, "")
      .replace(/'}\n|\n'/g, "");
    const targetAudiences = JSON.parse(cleanedResponse);
    console.log("Target Audiences Generated ");
    return targetAudiences;
  } else {
    throw new Error("No response received from the assistant.");
  }
};

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
  const assistantDetails = await getOrCreateAssistant();
  const prompt = `Help me to identify the hero, villain and passion in my business brand story based on my selected target audience: ${selectedTargetAudience}
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
    give the response in this format {[{"Hero":"The hero is..."},{"Villain":"The villain is..."},{"Passion":"The passion is..."}]}`;

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
    const response = JSON.parse(
      lastMessageForRun.content[0].text.value.replace(/```json\n|\n```/g, "")
    );
    console.log("Hero, Villain, Passion:", response);
    const savedResponse = await saveBrandStoryPart1(response);

    return savedResponse;
  } else {
    throw new Error("No response received from the assistant.");
  }
};
const saveBrandStoryPart1 = async (response) => {
  // Convert object to JSON string
  // const data = response;
  // const parsedData = JSON.parse(data); // Parse the saved response
  // return parsedData;

  try {
    console.log("saving brand story part 1 ");
    try {
      console.log("Removing Unwanted format...");
      // Remove backticks '`' and ```json ``` markers from the response
      const cleanedResponse = JSON.stringify(response).replace(
        /`|```[object Obj]|```/g,
        ""
      );

      var cresponse = cleanedResponse;
      console.log("File Saved"); // Convert object to JSON string
    } catch (error) {
      console.error("Error in saving brand story part 1: ", error);
    }

    try {
      var data = cresponse;
    } catch (error) {
      console.error("Error in saving brand story part 1: ", error);
    }
    const brandStoryPart1 = JSON.parse(data); // Parse the saved response
    console.log("brand story part 1 saved ");
    return brandStoryPart1;
  } catch (error) {
    console.error("Error in saving brand story part 1: ", error);
  }
};

const saveAndReadTargetAduience = async (response) => {
  try {
    console.log("saving targetAudience ");
    try {
      console.log("Removing Unwanted format...");
      // Remove backticks '`' and ```json ``` markers from the response
      const cleanedResponse = JSON.stringify(response)
        .replace(/`|```json|```/g, "")
        .replace(/'}\n|\n'/g, "")
        .replace(/\\n/g, "");

      var cresponse = cleanedResponse;
      console.log("File Saved"); // Convert object to JSON string
    } catch (error) {
      console.error("Error in saving target audiences: ", error);
    }

    try {
      var data = cresponse;
    } catch (error) {
      console.error("Error in saving target audiences: ", error);
    }
    const targetAudiences = JSON.parse(data); // Parse the saved response
    console.log("targetAudience saved ");
    return targetAudiences;
  } catch (error) {
    console.error("Error in saving target audiences: ", error);
  }
};

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
