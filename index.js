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

const assistantID = process.env.ASSISTANT_ID;
// Multer for file upload
const upload = multer({ dest: "uploads/" });

// Temporary storage for brand story part 1 data
const brandStoryPart1Data = {};
// Load the service account key JSON file
const serviceAccount = JSON.parse(fs.readFileSync("google-authencation.json"));
const jwtClient = new google.auth.JWT(
  serviceAccount.client_email,
  null,
  serviceAccount.private_key,
  ["https://www.googleapis.com/auth/drive"]
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const csvFilePath = path.join(__dirname, "BrandStory-Data.csv");

// Initialize the Google Drive API client
const drive = google.drive({ version: "v3", auth: jwtClient });
// Async function to create or get existing assistant
async function getOrCreateAssistant(content) {
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "You are Conscious Brand Sage,Conscious Brand Sage is a conversational and approachable GPT, specializing in branding for regenerative, conscious businesses. It excels in identifying target audiences and crafting brand stories in the hero, villain, passion format, aligned with sustainability and ethical principles. This GPT offers advice on creating impactful brand narratives and visual identities, infused with regenerative values. It asks for more details to provide precise, helpful advice, steering clear of strategies that contradict ethical or sustainability goals. Conscious Brand Sage uses language that is familiar and engaging to the regenerative business community, making complex concepts more relatable and accessible. Its approach is to offer personalized, context-specific guidance in a friendly and conversational manner, ensuring users feel supported in aligning their branding with their values and business goals.while generating response for target audience and Hero Villian passion use the below format:Give target audiences in this format: {'TargetAudiences': [{Title:'add title here',Description:'add Description heere'}...]}.Ensure there are no extra characters, unnecessary formatting, or syntax errors in the response For Hero,Villain and Passion use this format while generating response {[{'Hero':'The hero is...'},{'Villain':'The villain is...'},{'Passion':'The passion is...'}]}.",
        },
        { role: "system", content: content },
      ],
      model: "gpt-4o-mini",
    });

    const response = completion.choices[0].message.content;

    return response;
  } catch (error) {
    console.error("Error in creating assistant: ", error);
  }
}

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
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

// Endpoint to generate a brand story
app.post("/generate-story-part2", async (req, res) => {
  console.log("Data Recieved:", req.body);
  try {
    const {
      businessName,
      natureOfBusiness,
      uniqueSellingProposition,
      positiveImpact,
      selectedTargetAudience,
      coreValues,
      regenerationFocus,
      pricingStrategy,
      fullName,
      targetAudience,
      email,
    } = req.body;

    // Retrieve the data from brandStoryPart1Data
    const part1Data = brandStoryPart1Data.tempKey;

    const prompt =
      `Write a 100-word brand story using  ${part1Data} as reference ,for the selected target audience.${selectedTargetAudience}` +
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
      `use this format for response {"BrandStory":"The brand story is..."}\n do not use the json with the response just give a clean json` +
      `
      `;
    const response = await getOrCreateAssistant(prompt);
    const parsedData = JSON.parse(response);
    console.log("Parsed Data", parsedData);
    const brandStory = parsedData.BrandStory;

    res.json({ brandStory: brandStory });
    console.log("Brand Story Generated", brandStory);
    const brandStoryPart1 = await heroVillanPassion(brandStory);

    // Call savetocsv with the appropriate data
    await saveToCSV({
      fullName,
      email,
      businessName,
      natureOfBusiness,
      uniqueSellingProposition,
      positiveImpact,
      targetAudience,
      coreValues,
      regenerationFocus,
      pricingStrategy,
      selectedTargetAudience,
      brandStory1: brandStoryPart1,
      brandStory2: brandStory,
    });

    await handleCSVOnGoogleDrive(csvFilePath);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      res
        .status(500)
        .send("An error occurred while generating the brand story.");
    }
  }
});

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

const saveToCSV = async (data) => {
  const csvHeaders =
    "Full Name,Email,Business Name,Nature of Business,Unique Selling Proposition,Positive Impact,Target Audience,Core Business Values,Regeneration Focus,Pricing Strategy,Selected Target Audience,Brand Story Part1,Brand Story Part2\n";

  const brandStory1 = JSON.stringify(data.brandStory1).replace(/"/g, '""'); // Double quotes for CSV format
  const brandStory2 = JSON.stringify(data.brandStory2).replace(/"/g, '""');

  const csvLine = `"${data.fullName}","${data.email}","${data.businessName}","${data.natureOfBusiness}","${data.uniqueSellingProposition}","${data.positiveImpact}","${data.targetAudience}","${data.coreValues}","${data.regenerationFocus}","${data.pricingStrategy}","${data.selectedTargetAudience}","${brandStory1}","${brandStory2}"\n`;

  try {
    await fs.promises.access(csvFilePath, fs.constants.F_OK);
    await fs.promises.appendFile(csvFilePath, csvLine);
    console.log("Data appended to CSV file successfully.");
  } catch (error) {
    console.log("CSV file does not exist. Creating file with headers.");
    await fs.promises.writeFile(csvFilePath, csvHeaders + csvLine);
    console.log("CSV file created and data written successfully.");
  }
};

const generateTargetAudiences = async (businessDetails) => {
  console.log("Generating target audiences...", businessDetails);

  const prompt =
    `Please list 12 different target audiences suited for my new emerging dream business. The description of my dream business is as follows:\n` +
    `Business Name: ${businessDetails.businessName}\n` +
    `Nature of Business: ${businessDetails.natureOfBusiness}\n` +
    `Unique Selling Proposition: ${businessDetails.uniqueSellingProposition}\n` +
    `Positive Impact: ${businessDetails.positiveImpact}\n` +
    `Core Business Values: ${businessDetails.coreValues}\n` +
    `Focus on Regeneration and Ethics: ${businessDetails.regenerationFocus}\n` +
    `Pricing Strategy: ${businessDetails.pricingStrategy}\n` +
    `Based on this information, provide a clean array of objects detailing target audiences in following format: {"TargetAudiences": [{Title:'add title here',Description:'add Description heere'}...]}.Ensure there are no extra characters, unnecessary formatting, or syntax errors in the response.`;
  console.log("prompt loaded ....");
  const res = await getOrCreateAssistant(prompt);

  const targetAudiences = JSON.parse(res);
  console.log("Target Audiences Generated ");
  return targetAudiences;
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
  const prompt = `Help me to identify  Hero, Villain and Passion in my business brand story based on my selected target audience: ${selectedTargetAudience}
    Write 100 words about each one of them: the hero, the villain and the passion.
    Hero, villain, passion brand story format is a storytelling framework often used in marketing and branding to engage and connect with audiences on an emotional level. It follows a narrative structure that features three key elements:
    Hero represents my selected target audience with whom I am aiming to build a connection with. They are the individuals I want to engage and serve.
    Villain in this context refers to the obstacle or challenge that the hero faces, which is preventing them from achieving their goals or desired outcomes. It could be a problem, frustration, or barrier that hinders their progress or limits their potential.
    Passion in this story format represents the deepest desires and aspirations of the hero. It is what they want more than anything else, their dream state or ideal vision of success. It embodies their hopes, dreams, and aspirations that drive them forward.
    Here is a description of my dream business:
    Business Name: ${businessName}\n 
    Nature of Business: ${natureOfBusiness}\n
    Unique Selling Proposition: ${uniqueSellingProposition}\n
    Positive Impact: ${positiveImpact}\n
    Core Business Values: ${coreValues}\n
    Focus on Regeneration and Ethics: ${regenerationFocus}\n
    Pricing Strategy: ${pricingStrategy} \n
    response format:
    [{"Hero":"The hero is..."},{"Villain":"The villain is..."},{"Passion":"The passion is..."}]`;

  const res = await getOrCreateAssistant(prompt);
  const response = JSON.parse(res.replace(/```json\n|\n```/g, ""));
  //console.log("Hero, Villain, Passion:", response);
  const savedResponse = await saveBrandStoryPart1(response);

  return savedResponse;
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

        .replace(/\\n/g, "");

      var cresponse = cleanedResponse;
      console.log("File Saved", cresponse); // Convert object to JSON string
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
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});
